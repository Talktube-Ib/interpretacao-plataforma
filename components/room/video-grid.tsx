'use client'

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LocalVideo, RemoteVideo } from '@/components/webrtc/video-player'
import { cn } from '@/lib/utils'

interface VideoGridProps {
    peers: any[]
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
    handRaised
}: VideoGridProps) {

    // Determine the "featured" speaker for Speaker Mode
    // Priority: Pinned > Active Speaker > First Peer
    const featuredPeerId = pinnedSpeakerId || activeSpeakerId || (peers.length > 0 ? peers[0].userId : null)

    const featuredPeer = peers.find(p => p.userId === featuredPeerId)

    // In Speaker Mode, we show others in a strip
    const otherPeers = mode === 'speaker' && featuredPeer
        ? peers.filter(p => p.userId !== featuredPeerId)
        : peers

    // Grid columns calculation for Gallery Mode
    const totalItems = peers.length + 1 // +1 for Local
    const getGridClass = (count: number) => {
        if (count === 1) return "grid-cols-1"
        if (count === 2) return "grid-cols-1 md:grid-cols-2"
        if (count <= 4) return "grid-cols-2"
        if (count <= 9) return "grid-cols-2 md:grid-cols-3"
        return "grid-cols-2 md:grid-cols-4"
    }

    // Determine audio volume based on language selection and balance
    const getPeerVolume = (peer: any) => {
        // Implementation logic for volume scaling
        // If listening to Original (Floor), everyone is 1.0 (unless muted locally? logic is in VideoPlayer)
        if (selectedLang === 'original') return 1

        // If listening to Interpretation
        // Interpreter for selected language -> High Volume (based on balance)
        if (peer.language === selectedLang) {
            return volumeBalance / 100
        }

        // Floor speakers (non-interpreters) -> Low Volume (based on balance)
        if (!peer.role.includes('interpreter')) {
            return (100 - volumeBalance) / 100
        }

        // Other interpreters -> Mute
        return 0
    }

    return (
        <div className="w-full h-full relative flex flex-col gap-4">

            {mode === 'speaker' && featuredPeer ? (
                // --- SPEAKER VIEW ---
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {/* Featured Video */}
                    <div className="flex-1 relative min-h-0 bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <RemoteVideo
                            stream={featuredPeer.stream}
                            name={featuredPeer.name}
                            role={featuredPeer.role}
                            micOff={!featuredPeer.micOn}
                            cameraOff={!featuredPeer.cameraOn}
                            handRaised={featuredPeer.handRaised}
                            isSpeaking={featuredPeer.isSpeaking}
                            onSpeakingChange={(isSpeaking) => onPeerSpeaking(featuredPeer.userId, isSpeaking)}
                            volume={getPeerVolume(featuredPeer)}
                        />
                        {/* Pin Indicator */}
                        {pinnedSpeakerId === featuredPeer.userId && (
                            <div className="absolute top-4 right-4 bg-[#06b6d4] p-1.5 rounded-full z-10">
                                <span className="sr-only">Pinned</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pin text-white"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                            </div>
                        )}
                    </div>

                    {/* Strip of others (including local) */}
                    <div className="h-32 md:h-40 flex gap-2 overflow-x-auto pb-2 px-1 snap-x no-scrollbar">
                        {/* Always show Local in the strip in Speaker Mode */}
                        <div className="w-40 md:w-56 shrink-0 snap-start">
                            <LocalVideo
                                stream={localStream}
                                name={localUserName + " (Você)"}
                                role={currentRole}
                                micOff={!micOn}
                                cameraOff={!cameraOn}
                                handRaised={handRaised}
                            />
                        </div>
                        {otherPeers.map(peer => (
                            <div
                                key={peer.userId}
                                className="w-40 md:w-56 shrink-0 snap-start cursor-pointer transition-transform hover:scale-105"
                                onClick={() => onSpeakerChange(peer.userId)}
                            >
                                <RemoteVideo
                                    stream={peer.stream}
                                    name={peer.name}
                                    role={peer.role}
                                    micOff={!peer.micOn}
                                    cameraOff={!peer.cameraOn}
                                    handRaised={peer.handRaised}
                                    isSpeaking={peer.isSpeaking}
                                    onSpeakingChange={(isSpeaking) => onPeerSpeaking(peer.userId, isSpeaking)}
                                    volume={getPeerVolume(peer)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // --- GALLERY VIEW (Default) ---
                <div className={cn(
                    "grid gap-2 md:gap-4 w-full h-full auto-rows-fr",
                    getGridClass(totalItems)
                )}>
                    {/* Local Video - Always first? Or last? Let's put first for now */}
                    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                        <LocalVideo
                            stream={localStream}
                            name={localUserName + " (Você)"}
                            role={currentRole}
                            micOff={!micOn}
                            cameraOff={!cameraOn}
                            handRaised={handRaised}
                        />
                    </motion.div>

                    <AnimatePresence>
                        {peers.map(peer => (
                            <motion.div
                                key={peer.userId}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cn(
                                    "relative cursor-pointer transition-all",
                                    pinnedSpeakerId === peer.userId ? "ring-2 ring-[#06b6d4] rounded-[2.5rem]" : ""
                                )}
                                onClick={() => onSpeakerChange(peer.userId)}
                            >
                                <RemoteVideo
                                    stream={peer.stream}
                                    name={peer.name}
                                    role={peer.role}
                                    micOff={!peer.micOn}
                                    cameraOff={!peer.cameraOn}
                                    handRaised={peer.handRaised}
                                    isSpeaking={peer.isSpeaking}
                                    onSpeakingChange={(isSpeaking) => onPeerSpeaking(peer.userId, isSpeaking)}
                                    volume={getPeerVolume(peer)}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
