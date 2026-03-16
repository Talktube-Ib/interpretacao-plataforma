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
function buildGridStyle(cols: number): CSSProperties {
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: '12px',
        width: '100%',
        height: '100%',
        alignContent: 'center',
        justifyContent: 'center',
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
    const totalTiles = finalDisplayItems.length + (isGhost ? 0 : 1)
    const cols = calcGridCols(totalTiles)
    const gridStyle = buildGridStyle(cols)

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

    // ─── SPEAKER VIEW ──────────────────────────────────────────────────────────
    if (mode === 'speaker' && featuredItem) {
        return (
            <div className="w-full h-full flex flex-col md:flex-row gap-3 overflow-hidden">

                {/* Tile principal — ocupa todo espaço disponível */}
                <div className="flex-1 min-h-0 min-w-0 relative rounded-2xl overflow-hidden bg-black/40 border border-white/5">
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
                    />
                    {pinnedSpeakerId === featuredItem.id && (
                        <div className="absolute top-3 right-3 bg-[#06b6d4] p-1.5 rounded-full z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                strokeLinejoin="round" className="text-white">
                                <line x1="12" x2="12" y1="17" y2="22" />
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Sidebar — horizontal no mobile, vertical no desktop */}
                <div className={cn(
                    // Mobile: faixa horizontal na base, altura fixa proporcional
                    "flex flex-row gap-2 overflow-x-auto overflow-y-hidden",
                    "h-[22vw] max-h-28 min-h-20",
                    // Desktop: coluna lateral, largura fixa
                    "md:flex-col md:overflow-y-auto md:overflow-x-hidden",
                    "md:h-full md:max-h-full md:min-h-0",
                    "md:w-52 md:shrink-0",
                    "no-scrollbar pb-1 md:pb-0",
                )}>
                    {/* Tile local na sidebar */}
                    {!isGhost && (
                        <div className="shrink-0 aspect-video h-full md:h-auto md:w-full md:aspect-video rounded-xl overflow-hidden border border-white/10">
                            <LocalVideo
                                stream={localStream}
                                name={`${localUserName} (Você)`}
                                role={currentRole}
                                micOff={!micOn}
                                cameraOff={!cameraOn}
                                handRaised={handRaised}
                                onPin={() => onSpeakerChange('local')}
                                isPinned={pinnedSpeakerId === 'local'}
                                showPinButton
                            />
                        </div>
                    )}

                    {stripItems.map(item => (
                        <div
                            key={item.id}
                            className="shrink-0 aspect-video h-full md:h-auto md:w-full md:aspect-video rounded-xl overflow-hidden border border-white/10"
                        >
                            <RemoteVideo
                                stream={item.stream}
                                name={item.name}
                                role={item.role}
                                micOff={!item.micOn}
                                cameraOff={!item.cameraOn}
                                handRaised={item.handRaised}
                                isSpeaking={item.isSpeaking}
                                onSpeakingChange={s => onPeerSpeaking(item.userId, s)}
                                volume={getPeerVolume(item)}
                                isPresentation={item.isScreen}
                                onMutePeer={onMutePeer ? () => onMutePeer!(item.userId) : undefined}
                                isLocalMuted={localMutedPeers.has(item.userId)}
                                individualVolume={localPeerVolumes[item.userId] ?? 1}
                                onIndividualVolumeChange={onLocalVolumeChange
                                    ? v => onLocalVolumeChange!(item.userId, v)
                                    : undefined}
                                connectionState={item.connectionState}
                                onPin={() => onSpeakerChange(item.id)}
                                isPinned={pinnedSpeakerId === item.id}
                                showPinButton
                            />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ─── GALLERY VIEW ──────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full overflow-hidden p-2">
            {/*
             * FIX: grid calculado dinamicamente por JS, não por classes Tailwind fixas.
             * Sem aspect-ratio nos tiles — eles preenchem a célula disponível.
             * Isso replica o comportamento do Google Meet onde os tiles se adaptam
             * ao espaço real sem transbordar nem ficar minúsculos.
             */}
            <div style={gridStyle}>
                <AnimatePresence mode="popLayout">

                    {/* Tile local */}
                    {!isGhost && (
                        <motion.div
                            layout
                            key="local"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            // FIX: sem aspect-video — tile preenche a célula do grid
                            // min-h garante que nunca some em telas pequenas
                            className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl min-h-[120px]"
                            style={{ aspectRatio: totalTiles === 1 ? '16/9' : undefined }}
                        >
                            <LocalVideo
                                stream={localStream}
                                name={`${localUserName} (Você)`}
                                role={currentRole}
                                micOff={!micOn}
                                cameraOff={!cameraOn}
                                handRaised={handRaised}
                                onPin={() => onSpeakerChange('local')}
                                isPinned={pinnedSpeakerId === 'local'}
                                showPinButton
                            />
                            {/* Label overlay */}
                            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
                                <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                                    {micOn
                                        ? <Mic className="h-3 w-3 text-cyan-400" />
                                        : <MicOff className="h-3 w-3 text-red-500" />}
                                    <span className="text-[10px] font-bold text-white truncate max-w-[120px]">
                                        {localUserName} (Você)
                                    </span>
                                </div>
                                {handRaised && (
                                    <div className="bg-yellow-500 text-black p-1 rounded-full animate-bounce">
                                        <Hand className="h-3 w-3 fill-current" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Tiles remotos */}
                    {finalDisplayItems.map(item => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                'relative rounded-2xl overflow-hidden min-h-[120px]',
                                pinnedSpeakerId === item.id && 'ring-2 ring-[#06b6d4]',
                                // FIX: speaker ativo tem borda sutil animada
                                item.isSpeaking && pinnedSpeakerId !== item.id && 'ring-1 ring-green-400/60',
                            )}
                            // FIX: tile único ocupa 16:9 centralizado; múltiplos preenchem o grid
                            style={{ aspectRatio: totalTiles === 1 ? '16/9' : undefined }}
                        >
                            <RemoteVideo
                                stream={item.stream}
                                name={item.name}
                                role={item.role}
                                micOff={!item.micOn}
                                cameraOff={!item.cameraOn}
                                handRaised={item.handRaised}
                                isSpeaking={item.isSpeaking}
                                onSpeakingChange={s => onPeerSpeaking(item.userId, s)}
                                volume={getPeerVolume(item)}
                                isPresentation={item.isScreen}
                                onMutePeer={onMutePeer ? () => onMutePeer!(item.userId) : undefined}
                                isLocalMuted={localMutedPeers.has(item.userId)}
                                individualVolume={localPeerVolumes[item.userId] ?? 1}
                                onIndividualVolumeChange={onLocalVolumeChange
                                    ? v => onLocalVolumeChange!(item.userId, v)
                                    : undefined}
                                connectionState={item.connectionState}
                                onPin={() => onSpeakerChange(item.id)}
                                isPinned={pinnedSpeakerId === item.id}
                                showPinButton
                            />
                        </motion.div>
                    ))}

                </AnimatePresence>
            </div>
        </div>
    )
}
