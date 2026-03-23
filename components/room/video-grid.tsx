'use client'

import React, { useMemo, CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LocalVideo, RemoteVideo } from '@/components/webrtc/video-player'
import { cn } from '@/lib/utils'
import { Mic, MicOff, Hand } from 'lucide-react'

export interface Peer {
    userId: string
    id: string
    name: string
    role: string
    language?: string
    micOn: boolean
    cameraOn: boolean
    stream: MediaStream | null
    screenStream?: MediaStream | null
    isSpeaking?: boolean
    handRaised?: boolean
    connectionState?: 'connecting' | 'connected' | 'failed' | 'disconnected' | 'closed'
    connectionQuality?: string
}

export interface DisplayItem extends Peer {
    isScreen: boolean
}

interface VideoGridProps {
    peers: Peer[]
    localStream: MediaStream | null
    currentRole: string
    micOn: boolean
    cameraOn: boolean
    mode: 'gallery' | 'speaker'
    activeSpeakerId: string | null
    pinnedSpeakerId: string | null
    onSpeakerChange: (id: string) => void
    onPeerSpeaking: (id: string, isSpeaking: boolean) => void
    localUserName: string
    selectedLang: string
    volumeBalance?: number
    handRaised: boolean
    masterVolume?: number
    localMutedPeers?: Set<string>
    onMutePeer?: (targetId: string) => void
    localPeerVolumes?: Record<string, number>
    onLocalVolumeChange?: (targetId: string, volume: number) => void
    localScreenStream?: MediaStream | null
    isGhost?: boolean
}

// ─── Layout engine (Google Meet logic) ────────────────────────────────────────
// Dado N tiles, calcula o número ideal de colunas para preencher o espaço
// sem deixar tiles minúsculos nem linhas com espaço vazio excessivo.
function calcGridCols(n: number): number {
    if (n <= 1) return 1
    if (n === 2) return 2
    if (n <= 4) return 2
    if (n <= 6) return 3
    if (n <= 9) return 3
    if (n <= 12) return 4
    return 4 // máximo de 4 colunas, paginação cuida do resto
}

// Gera o estilo CSS Grid dinamicamente, sem classes Tailwind fixas
// Os tiles NÃO usam aspect-ratio fixo — eles preenchem a célula disponível.
function buildGridStyle(cols: number, total: number): CSSProperties {
    const rows = Math.ceil(total / cols)
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap: '12px',
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        padding: '8px',
    }
}

export function VideoGrid({
    peers,
    localStream,
    currentRole,
    micOn,
    cameraOn,
    mode,
    activeSpeakerId,
    pinnedSpeakerId,
    onSpeakerChange,
    onPeerSpeaking,
    localUserName,
    selectedLang,
    volumeBalance = 0,
    handRaised,
    masterVolume = 1,
    localMutedPeers = new Set(),
    onMutePeer,
    localPeerVolumes = {},
    onLocalVolumeChange,
    localScreenStream,
    isGhost = false,
}: VideoGridProps) {

    // Expande screen shares como tiles separados
    const displayItems = useMemo<DisplayItem[]>(() => {
        return peers.flatMap(p => {
            const items: DisplayItem[] = [{ ...p, isScreen: false, id: p.userId }]
            if (p.screenStream) {
                items.push({
                    ...p,
                    stream: p.screenStream,
                    isScreen: true,
                    id: `${p.userId}-screen`,
                    name: `${p.name} (Tela)`,
                    micOn: false,
                    cameraOn: true,
                })
            }
            return items
        })
    }, [peers])

    // Adiciona screen share local se ativo
    const finalDisplayItems = useMemo<DisplayItem[]>(() => {
        if (!localScreenStream) return displayItems
        return [
            ...displayItems,
            {
                userId: 'local-screen',
                id: 'local-screen',
                name: 'Sua Tela',
                stream: localScreenStream,
                isScreen: true,
                micOn: false,
                cameraOn: true,
                role: currentRole,
                language: 'floor',
            } as DisplayItem,
        ]
    }, [displayItems, localScreenStream, currentRole])

    // Tile em destaque no speaker mode
    const featuredItemId = useMemo(() => {
        const screenItem = finalDisplayItems.find(p => p.isScreen)
        if (pinnedSpeakerId) return pinnedSpeakerId
        if (screenItem) return screenItem.id
        if (activeSpeakerId) return activeSpeakerId
        return finalDisplayItems[0]?.id ?? null
    }, [pinnedSpeakerId, finalDisplayItems, activeSpeakerId])

    const featuredItem = useMemo(
        () => finalDisplayItems.find(p => p.id === featuredItemId) ?? null,
        [finalDisplayItems, featuredItemId]
    )

    const stripItems = useMemo(
        () => (mode === 'speaker' && featuredItem
            ? finalDisplayItems.filter(p => p.id !== featuredItemId)
            : finalDisplayItems),
        [mode, featuredItem, finalDisplayItems, featuredItemId]
    )

    // FIX: conta corretamente incluindo o tile local
    const totalTiles = (mode === 'speaker' ? stripItems.length + 1 : finalDisplayItems.length) + (isGhost ? 0 : 1)
    const cols = calcGridCols(totalTiles)
    const gridStyle = buildGridStyle(cols, totalTiles)

    const getPeerVolume = (peer: DisplayItem) => {
        if (localMutedPeers.has(peer.userId)) return 0
        const peerRole = peer.role?.toLowerCase() || 'participant'
        const peerLang = peer.language || 'floor'
        const isInterpreter = peerRole.includes('interpreter')
        let vol = 1

        if (selectedLang === 'original') {
            vol = peerLang === 'floor' || !isInterpreter ? 1 : 0
        } else {
            if (isInterpreter && peerLang === selectedLang) {
                vol = volumeBalance / 100
            } else if (!isInterpreter || peerLang === 'floor') {
                vol = (100 - volumeBalance) / 100
            } else {
                vol = 0
            }
        }

        return vol * masterVolume * (localPeerVolumes[peer.userId] ?? 1)
    }

    // ─── SPEAKER VIEW (Mantido, mas com melhoria de height se necessário) ──────
    if (mode === 'speaker' && featuredItem) {
        return (
            <div className="w-full h-full flex flex-col md:flex-row gap-3 overflow-hidden p-2">
                <div className="flex-1 min-h-0 min-w-0 relative rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-2xl">
                    <RemoteVideo
                        stream={featuredItem.stream}
                        name={featuredItem.name}
                        role={featuredItem.role}
                        micOff={!featuredItem.micOn}
                        cameraOff={!featuredItem.cameraOn}
                        handRaised={featuredItem.handRaised}
                        isSpeaking={featuredItem.isSpeaking}
                        onSpeakingChange={s => onPeerSpeaking(featuredItem.userId, s)}
                        volume={getPeerVolume(featuredItem)}
                        isPresentation={featuredItem.isScreen}
                        onMutePeer={onMutePeer ? () => onMutePeer!(featuredItem.userId) : undefined}
                        isLocalMuted={localMutedPeers.has(featuredItem.userId)}
                        individualVolume={localPeerVolumes[featuredItem.userId] ?? 1}
                        onIndividualVolumeChange={onLocalVolumeChange
                            ? v => onLocalVolumeChange!(featuredItem.userId, v)
                            : undefined}
                        connectionState={featuredItem.connectionState}
                        connectionQuality={featuredItem.connectionQuality}
                    />
                    <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
                        <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10">
                            {featuredItem.micOn 
                                ? <Mic className="h-3.5 w-3.5 text-cyan-400" /> 
                                : <MicOff className="h-3.5 w-3.5 text-red-500" />}
                            <span className="text-xs font-bold text-white tracking-tight">{featuredItem.name}</span>
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "flex flex-row gap-2 overflow-x-auto overflow-y-hidden h-[22vw] max-h-28 min-h-20",
                    "md:flex-col md:overflow-y-auto md:overflow-x-hidden md:h-full md:max-h-full md:min-h-0 md:w-52 md:shrink-0 no-scrollbar pb-1 md:pb-0"
                )}>
                    {!isGhost && (
                        <div className="shrink-0 aspect-video h-full md:h-auto md:w-full rounded-xl overflow-hidden border border-white/10 relative">
                            <LocalVideo
                                stream={localStream}
                                name={`${localUserName} (Você)`}
                                role={currentRole}
                                micOff={!micOn}
                                cameraOff={!cameraOn}
                            />
                             <div className="absolute bottom-2 left-2 z-10">
                                <div className="bg-black/60 px-2 py-0.5 rounded text-[10px] text-white/90">Você</div>
                            </div>
                        </div>
                    )}
                    {stripItems.map(item => (
                        <div key={item.id} className="relative shrink-0 aspect-video h-full md:h-auto md:w-full rounded-xl overflow-hidden border border-white/10 group">
                            <RemoteVideo
                                stream={item.stream}
                                name={item.name}
                                role={item.role}
                                micOff={!item.micOn}
                                cameraOff={!item.cameraOn}
                                isSpeaking={item.isSpeaking}
                                onSpeakingChange={s => onPeerSpeaking(item.userId, s)}
                                volume={getPeerVolume(item)}
                                connectionState={item.connectionState}
                                connectionQuality={item.connectionQuality}
                                onMutePeer={onMutePeer ? () => onMutePeer!(item.userId) : undefined}
                                isLocalMuted={localMutedPeers.has(item.userId)}
                                individualVolume={localPeerVolumes[item.userId] ?? 1}
                                onIndividualVolumeChange={onLocalVolumeChange
                                    ? v => onLocalVolumeChange!(item.userId, v)
                                    : undefined}
                            />
                            <div className="absolute bottom-2 left-2 z-10 transition-opacity">
                                <div className="bg-black/60 px-2 py-0.5 rounded text-[10px] text-white/90">
                                    {item.name}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ─── GALLERY VIEW (Foco Original do Pedido) ───────────────────────────────
    return (
        <div className="w-full h-full overflow-hidden flex items-center justify-center p-2">
            <div style={gridStyle}>
                <AnimatePresence mode="popLayout">
                    {!isGhost && (
                        <motion.div
                            layout
                            key="local"
                            className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl"
                        >
                            <LocalVideo
                                stream={localStream}
                                name={`${localUserName} (Você)`}
                                role={currentRole}
                                micOff={!micOn}
                                cameraOff={!cameraOn}
                            />
                            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
                                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/5">
                                    {micOn
                                        ? <Mic className="h-3.5 w-3.5 text-cyan-400" />
                                        : <MicOff className="h-3.5 w-3.5 text-red-500" />}
                                    <span className="text-xs font-bold text-white">
                                        {localUserName} (Você)
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {finalDisplayItems.map(item => (
                        <motion.div
                            key={item.id}
                            layout
                            className={cn(
                                'relative rounded-2xl overflow-hidden',
                                pinnedSpeakerId === item.id && 'ring-2 ring-[#06b6d4]',
                                item.isSpeaking && pinnedSpeakerId !== item.id && 'ring-2 ring-green-400/60',
                            )}
                        >
                            <RemoteVideo
                                stream={item.stream}
                                name={item.name}
                                role={item.role}
                                micOff={!item.micOn}
                                cameraOff={!item.cameraOn}
                                isSpeaking={item.isSpeaking}
                                onSpeakingChange={s => onPeerSpeaking(item.userId, s)}
                                volume={getPeerVolume(item)}
                                connectionState={item.connectionState}
                                connectionQuality={item.connectionQuality}
                                onMutePeer={onMutePeer ? () => onMutePeer!(item.userId) : undefined}
                                isLocalMuted={localMutedPeers.has(item.userId)}
                                individualVolume={localPeerVolumes[item.userId] ?? 1}
                                onIndividualVolumeChange={onLocalVolumeChange
                                    ? v => onLocalVolumeChange!(item.userId, v)
                                    : undefined}
                            />
                            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
                                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/5">
                                    {item.micOn
                                        ? <Mic className="h-3.5 w-3.5 text-cyan-400" />
                                        : <MicOff className="h-3.5 w-3.5 text-red-500" />}
                                    <span className="text-xs font-bold text-white">
                                        {item.name}
                                    </span>
                                </div>
                                {item.handRaised && (
                                    <div className="bg-yellow-500 text-black p-1.5 rounded-full shadow-lg">
                                        <Hand className="h-3.5 w-3.5 fill-current" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
