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
    masterVolume?: number // 0-1 (Global Volume Control)
    localMutedPeers?: Set<string> // IDs of peers muted locally by me
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
    localMutedPeers = new Set()
}: VideoGridProps) {

    // Flatten peers to include Screen Shares as separate "Virtual Peers"
    const displayItems = peers.flatMap(p => {
        const items = [{ ...p, isScreen: false, id: p.userId }]
        if (p.screenStream) {
            items.push({
                ...p,
                stream: p.screenStream,
                isScreen: true,
                id: `${p.userId}-screen`,
                name: `${p.name} (Tela)`,
                micOn: false, // Screen share usually doesn't have mic, or it's mixed. Visually hide mic icon.
                cameraOn: true // Always show as "video on"
            })
        }
        return items
    })

    // Determine the "featured" speaker for Speaker Mode
    // Priority: Pinned > Active Speaker > First Peer
    const featuredItemId = pinnedSpeakerId || activeSpeakerId || (displayItems.length > 0 ? displayItems[0].id : null)

    const featuredItem = displayItems.find(p => p.id === featuredItemId)

    // In Speaker Mode, we show others in a strip
    const otherItems = mode === 'speaker' && featuredItem
        ? displayItems.filter(p => p.id !== featuredItemId)
        : displayItems

    // Grid columns calculation for Gallery Mode
    const totalItems = displayItems.length + 1 // +1 for Local
    const getGridClass = (count: number) => {
        if (count === 1) return "grid-cols-1"
        if (count === 2) return "grid-cols-1 md:grid-cols-2"
        if (count <= 4) return "grid-cols-2"
        if (count <= 9) return "grid-cols-2 md:grid-cols-3"
        return "grid-cols-2 md:grid-cols-4"
    }

    // Determine audio volume based on language selection and balance
    const getPeerVolume = (peer: any) => {
        let vol = 1;

        // Implementation logic for volume scaling
        // If listening to Original (Floor), everyone is 1.0 (unless muted locally? logic is in VideoPlayer)
        if (localMutedPeers.has(peer.userId)) {
            return 0
        }

        if (selectedLang === 'original') {
            vol = 1
        }
        // If listening to Interpretation
        // Interpreter for selected language -> High Volume (based on balance)
        else if (peer.language === selectedLang) {
            vol = volumeBalance / 100
        }
        // Floor speakers (non-interpreters OR interpreters explicitly on 'floor') -> Low Volume (based on balance)
        else if (!peer.role.includes('interpreter') || peer.language === 'floor') {
            vol = (100 - volumeBalance) / 100
        }
        // Other interpreters (on different languages) -> Mute
        else {
            vol = 0
        }

        // Apply Master Volume
        return vol * masterVolume
    }

    return (
        <div className="w-full h-full relative flex flex-col gap-4">

            {mode === 'speaker' && featuredItem ? (
                // --- SPEAKER VIEW ---
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
                        />
                        {/* Pin Indicator */}
                        {pinnedSpeakerId === featuredItem.id && (
                            <div className="absolute top-4 right-4 bg-[#06b6d4] p-1.5 rounded-full z-10">
                                <span className="sr-only">Pinned</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pin text-white"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                            </div>
                        )}
                    </div>

                    {/* Sidebar of others (Right side on desktop, Bottom strip on mobile) */}
                    {/* Hiding scrollbar for cleaner look, but allowing scroll */}
                    <div className={cn(
                        "flex gap-4",
                        // Mobile: Horizontal Scroll Strip
                        "w-full h-32 md:h-full md:w-64 md:flex-col md:overflow-y-auto overflow-x-auto md:overflow-x-hidden pb-2 md:pb-0 px-1 snap-x md:snap-y no-scrollbar md:pr-1"
                    )}>
                        {/* Always show Local in the strip in Speaker Mode */}
                        <div className="w-40 md:w-full shrink-0 snap-start aspect-video rounded-2xl overflow-hidden">
                            <LocalVideo
                                stream={localStream}
                                name={localUserName + " (Você)"}
                                role={currentRole}
                                micOff={!micOn}
                                cameraOff={!cameraOn}
                                handRaised={handRaised}
                            />
                        </div>
                        {otherItems.map(item => (
                            <div
                                key={item.id}
                                className="w-40 md:w-full shrink-0 snap-start aspect-video cursor-pointer transition-transform hover:scale-105 rounded-2xl overflow-hidden"
                                onClick={() => onSpeakerChange(item.id)}
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
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // --- GALLERY VIEW (Default) ---
                <div className={cn(
                    "grid gap-2 md:gap-4 w-full h-full auto-rows-fr transition-all",
                    // Custom Responsive Grid Logic
                    // Custom Responsive Grid Logic
                    totalItems <= 1 ? "grid-cols-1" :
                        totalItems === 2 ? "grid-cols-1 sm:grid-cols-2" :
                            totalItems === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" :
                                totalItems === 4 ? "grid-cols-2 md:grid-cols-2" :
                                    "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
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
                        {displayItems.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={cn(
                                    "relative cursor-pointer transition-all",
                                    pinnedSpeakerId === item.id ? "ring-2 ring-[#06b6d4] rounded-[2.5rem]" : ""
                                )}
                                onClick={() => onSpeakerChange(item.id)}
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
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}


