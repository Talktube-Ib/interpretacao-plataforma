'use client'

import React, { useEffect, useRef, useMemo } from 'react'
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
    volumeBalance?: number // 0-100 (0 = floor, 100 = interpreter)
    handRaised: boolean
    masterVolume?: number // 0-1 (Global Volume Control)
    localMutedPeers?: Set<string> // IDs of peers muted locally by me
    onMutePeer?: (targetId: string) => void
    localPeerVolumes?: Record<string, number>
    onLocalVolumeChange?: (targetId: string, volume: number) => void
    localScreenStream?: MediaStream | null
    isGhost?: boolean
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
    isGhost = false
}: VideoGridProps) {

    // Flatten peers to include Screen Shares as separate "Virtual Peers"
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
                    cameraOn: true
                })
            }
            return items
        })
    }, [peers])

    // Add Local Screen Share to display items if active
    const finalDisplayItems = useMemo(() => {
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
                language: 'floor'
            }
        ]
    }, [displayItems, localScreenStream, currentRole])

    // Determine the "featured" speaker for Speaker Mode
    const featuredItemId = useMemo(() => {
        const screenShareItem = finalDisplayItems.find(p => p.isScreen)
        return pinnedSpeakerId || (screenShareItem ? screenShareItem.id : (activeSpeakerId || (finalDisplayItems.length > 0 ? finalDisplayItems[0].id : null)))
    }, [pinnedSpeakerId, finalDisplayItems, activeSpeakerId])

    const featuredItem = useMemo(() => finalDisplayItems.find(p => p.id === featuredItemId), [finalDisplayItems, featuredItemId])

    // In Speaker Mode, we show others in a strip
    const otherItems = useMemo(() => {
        return mode === 'speaker' && featuredItem
            ? finalDisplayItems.filter(p => p.id !== featuredItemId)
            : finalDisplayItems
    }, [mode, featuredItem, finalDisplayItems, featuredItemId])

    // Grid columns calculation for Gallery Mode
    const totalItems = finalDisplayItems.length + (isGhost ? 0 : 1) // +1 for Local UNLESS ghost

    // Determine audio volume based on language selection and balance
    const getPeerVolume = (peer: DisplayItem) => {
        if (localMutedPeers.has(peer.userId)) return 0
        let vol = 1
        const peerRole = peer.role?.toLowerCase() || 'participant'
        const peerLang = peer.language || 'floor'

        if (selectedLang === 'original') {
            vol = 1
        } else if (peerLang === selectedLang) {
            vol = volumeBalance / 100
        } else if (!peerRole.includes('interpreter') || peerLang === 'floor') {
            vol = (100 - volumeBalance) / 100
        } else {
            vol = 0
        }
        const individualVol = localPeerVolumes[peer.userId] ?? 1
        return vol * masterVolume * individualVol
    }

    return (
        <div className="w-full h-full relative flex flex-col gap-4">

            {mode === 'speaker' && featuredItem ? (
                // --- SPEAKER VIEW ---
                <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden h-full">
                    {/* Featured Video (Presentation/Speaker) - Takes majority of space */}
                    <div className="flex-1 relative min-h-0 bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden w-full md:w-auto">
                        <RemoteVideo
                            stream={featuredItem.stream}
                            name={featuredItem.name}
                            role={featuredItem.role}
                            micOff={!featuredItem.micOn}
                            cameraOff={!featuredItem.cameraOn}
                            handRaised={featuredItem.handRaised}
                            isSpeaking={featuredItem.isSpeaking}
                            onSpeakingChange={(isSpeaking) => onPeerSpeaking(featuredItem.userId, isSpeaking)}
                            volume={getPeerVolume(featuredItem)}
                            isPresentation={featuredItem.isScreen}
                            onMutePeer={onMutePeer ? () => onMutePeer(featuredItem.userId) : undefined}
                            isLocalMuted={localMutedPeers.has(featuredItem.userId)}
                            individualVolume={localPeerVolumes[featuredItem.userId] ?? 1}
                            onIndividualVolumeChange={onLocalVolumeChange ? (v) => onLocalVolumeChange(featuredItem.userId, v) : undefined}
                            connectionState={featuredItem.connectionState}
                        />
                        {/* Pin Indicator */}
                        {pinnedSpeakerId === featuredItem.id && (
                            <div className="absolute top-4 right-4 bg-[#06b6d4] p-1.5 rounded-full z-10">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                            </div>
                        )}
                    </div>

                    {/* Sidebar of others */}
                    <div className={cn(
                        "flex gap-2 w-full h-24 md:h-full md:w-64 md:flex-col md:overflow-y-auto overflow-x-auto md:overflow-x-hidden pb-1 md:pb-0 px-1 snap-x md:snap-y no-scrollbar md:pr-1"
                    )}>
                        {/* Local Participant In Strip - Only if not GHOST */}
                        {!isGhost && (
                            <div className="w-28 md:w-full shrink-0 snap-start aspect-video rounded-xl overflow-hidden shadow-sm border border-white/10">
                                <LocalVideo
                                    stream={localStream}
                                    name={localUserName + " (Você)"}
                                    role={currentRole}
                                    micOff={!micOn}
                                    cameraOff={!cameraOn}
                                    handRaised={handRaised}
                                    onPin={() => onSpeakerChange('local')}
                                    isPinned={pinnedSpeakerId === 'local'}
                                    showPinButton={true}
                                />
                            </div>
                        )}

                        {otherItems.map(item => (
                            <div
                                key={item.id}
                                className="w-32 md:w-full shrink-0 snap-start aspect-video rounded-xl overflow-hidden shadow-sm border border-white/10 group relative"
                            >
                                <RemoteVideo
                                    stream={item.stream}
                                    name={item.name}
                                    role={item.role}
                                    micOff={!item.micOn}
                                    cameraOff={!item.cameraOn}
                                    handRaised={item.handRaised}
                                    isSpeaking={item.isSpeaking}
                                    onSpeakingChange={(isSpeaking) => onPeerSpeaking(item.userId, isSpeaking)}
                                    volume={getPeerVolume(item)}
                                    isPresentation={item.isScreen}
                                    onMutePeer={onMutePeer ? () => onMutePeer(item.userId) : undefined}
                                    isLocalMuted={localMutedPeers.has(item.userId)}
                                    individualVolume={localPeerVolumes[item.userId] ?? 1}
                                    onIndividualVolumeChange={onLocalVolumeChange ? (v) => onLocalVolumeChange(item.userId, v) : undefined}
                                    connectionState={item.connectionState}
                                    onPin={() => onSpeakerChange(item.id)}
                                    isPinned={pinnedSpeakerId === item.id}
                                    showPinButton={true}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // --- GALLERY VIEW ---
                <div className={cn(
                    "grid gap-2 md:gap-4 w-full h-full auto-rows-fr transition-all",
                    totalItems <= 1 ? "grid-cols-1" :
                        totalItems === 2 ? "grid-cols-1 sm:grid-cols-2" :
                            totalItems === 3 ? "grid-cols-2 lg:grid-cols-3" :
                                totalItems === 4 ? "grid-cols-2 md:grid-cols-2" :
                                    "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                )}>
                    {/* Local Participant In Gallery - Only if not GHOST */}
                    {!isGhost && (
                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl aspect-video">
                            <LocalVideo
                                stream={localStream}
                                name={localUserName + " (Você)"}
                                role={currentRole}
                                micOff={!micOn}
                                cameraOff={!cameraOn}
                                handRaised={handRaised}
                                onPin={() => onSpeakerChange('local')}
                                isPinned={pinnedSpeakerId === 'local'}
                                showPinButton={true}
                            />
                            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                                    {micOn ? <Mic className="h-3 w-3 text-cyan-400" /> : <MicOff className="h-3 w-3 text-red-500" />}
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{localUserName} (Você)</span>
                                </div>
                                {handRaised && (
                                    <div className="bg-yellow-500 text-black p-1.5 rounded-full animate-bounce shadow-lg shadow-yellow-500/20">
                                        <Hand className="h-3 w-3 fill-current" />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    <AnimatePresence>
                        {finalDisplayItems.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cn(
                                    "relative transition-all aspect-video",
                                    pinnedSpeakerId === item.id ? "ring-2 ring-[#06b6d4] rounded-2xl" : ""
                                )}
                            >
                                <RemoteVideo
                                    stream={item.stream}
                                    name={item.name}
                                    role={item.role}
                                    micOff={!item.micOn}
                                    cameraOff={!item.cameraOn}
                                    handRaised={item.handRaised}
                                    isSpeaking={item.isSpeaking}
                                    onSpeakingChange={(isSpeaking) => onPeerSpeaking(item.userId, isSpeaking)}
                                    volume={getPeerVolume(item)}
                                    isPresentation={item.isScreen}
                                    onMutePeer={onMutePeer ? () => onMutePeer(item.userId) : undefined}
                                    isLocalMuted={localMutedPeers.has(item.userId)}
                                    individualVolume={localPeerVolumes[item.userId] ?? 1}
                                    onIndividualVolumeChange={onLocalVolumeChange ? (v) => onLocalVolumeChange(item.userId, v) : undefined}
                                    connectionState={item.connectionState}
                                    onPin={() => onSpeakerChange(item.id)}
                                    isPinned={pinnedSpeakerId === item.id}
                                    showPinButton={true}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
