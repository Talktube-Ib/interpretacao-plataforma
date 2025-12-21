import React, { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RemoteVideo, LocalVideo } from '@/components/webrtc/video-player'
import { useGalleryLayout } from '@/hooks/use-gallery-layout'
import { cn } from '@/lib/utils'

interface VideoGridProps {
    peers: any[]
    localStream: MediaStream | null
    currentRole: string
    micOn: boolean
    cameraOn: boolean
    mode: 'gallery' | 'speaker'
    onSpeakerChange?: (userId: string) => void
    activeSpeakerId?: string | null
    pinnedSpeakerId?: string | null
    onPeerSpeaking?: (id: string, isSpeaking: boolean) => void
    localUserName?: string
    selectedLang?: string
    volumeBalance?: number
    handRaised?: boolean
}

export function VideoGrid({
    peers,
    localStream,
    currentRole,
    micOn,
    cameraOn,
    mode,
    onSpeakerChange,
    activeSpeakerId,
    pinnedSpeakerId,
    onPeerSpeaking,
    localUserName = "Você",
    selectedLang = 'original',
    volumeBalance = 80,
    handRaised
}: VideoGridProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Total participants including self
    const allParticipants = [
        { userId: 'local', isLocal: true, stream: localStream, role: currentRole, micOn, cameraOn, handRaised, name: localUserName },
        ...peers.map(p => ({ ...p, isLocal: false }))
    ]

    const galleryLayout = useGalleryLayout(containerRef, allParticipants.length)

    // Find presentation (virtual peer)
    const presentation = allParticipants.find(p => p.role === 'presentation')

    // Find the main speaker for Speaker Mode
    // Priority: Presentation > Pinned > Active Speaker > First participant
    const currentSpeakerId = presentation?.userId || pinnedSpeakerId || activeSpeakerId || allParticipants[0]?.userId
    const speakerData = allParticipants.find(p => p.userId === currentSpeakerId) || allParticipants[0]

    // Filter others: exclude the current speaker (presentation or other)
    // AND ensure we don't show the virtual presentation peer in the sidebar
    const others = allParticipants.filter(p => p.userId !== speakerData?.userId && p.role !== 'presentation')

    const calcVolume = (p: any) => {
        // 1. Always mute local user to prevent echo/feedback (redundant with video element muted prop but safe)
        if (p.isLocal) return 0

        // 2. If listening to "Original" (Floor)
        if (selectedLang === 'original' || selectedLang === 'floor') {
            // Hear everyone who is NOT an interpreter (Participants, Host, Presentation)
            if (p.role !== 'interpreter') return 1.0
            // Silence all interpreters
            return 0
        }

        // 3. If listening to a specific Language (Interpretation)

        // Target Interpreter Channel
        if (p.role === 'interpreter' && p.language === selectedLang) {
            return volumeBalance / 100 // e.g. 0.8 or 1.0
        }

        // Other Interpreters -> STRICT SILENCE (Prevent Bleed)
        if (p.role === 'interpreter' && p.language !== selectedLang) {
            return 0
        }

        // Floor (Original Speaker) -> Background Volume (Mix)
        // Only if they are NOT an interpreter
        if (p.role !== 'interpreter') {
            return (100 - volumeBalance) / 100
        }

        return 0
    }

    return (
        <div ref={containerRef} className="w-full h-full p-2 flex flex-col items-center justify-center overflow-hidden">
            {mode === 'gallery' ? (
                <div
                    className="grid gap-2 justify-center content-center transition-all duration-500"
                    style={{
                        gridTemplateColumns: `repeat(${galleryLayout.cols}, ${galleryLayout.width}px)`,
                        gridTemplateRows: `repeat(${galleryLayout.rows}, ${galleryLayout.height}px)`,
                    }}
                >
                    <AnimatePresence mode="popLayout">
                        {allParticipants.map((p) => (
                            <motion.div
                                key={p.userId}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                onClick={() => onSpeakerChange?.(p.userId)}
                                className={cn(
                                    "w-full h-full box-border cursor-pointer transition-transform active:scale-[0.98]",
                                    pinnedSpeakerId === p.userId && "ring-4 ring-amber-500 rounded-[2.5rem]"
                                )}
                            >
                                {p.isLocal ? (
                                    <LocalVideo stream={p.stream} role={p.role} micOff={!p.micOn} cameraOff={!p.cameraOn} name={p.name} handRaised={p.handRaised} onSpeakingChange={(s) => onPeerSpeaking?.('local', s)} />
                                ) : (
                                    <RemoteVideo
                                        stream={p.stream}
                                        name={p.userId}
                                        role={p.role}
                                        micOff={p.micOn === false}
                                        cameraOff={p.cameraOn === false}
                                        handRaised={p.handRaised}
                                        volume={calcVolume(p)}
                                        onSpeakingChange={(s) => onPeerSpeaking?.(p.userId, s)}
                                    />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                /* Speaker Mode: 80/20 Layout */
                <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2">
                    {/* Main Speaker (80%) */}
                    <div className="flex-[4] h-full relative">
                        {speakerData && (
                            <motion.div
                                layoutId={speakerData.userId}
                                className="w-full h-full"
                            >
                                {speakerData.isLocal ? (
                                    <LocalVideo stream={speakerData.stream} role={speakerData.role} micOff={!speakerData.micOn} cameraOff={!speakerData.cameraOn} name={speakerData.name} handRaised={speakerData.handRaised} onSpeakingChange={(s) => onPeerSpeaking?.('local', s)} />
                                ) : (
                                    <RemoteVideo
                                        stream={speakerData.stream}
                                        name={speakerData.userId}
                                        role={speakerData.role}
                                        micOff={speakerData.micOn === false}
                                        cameraOff={speakerData.cameraOn === false}
                                        handRaised={speakerData.handRaised}
                                        volume={calcVolume(speakerData)}
                                        onSpeakingChange={(s) => onPeerSpeaking?.(speakerData.userId, s)}
                                    />
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar / Topbar for Others (20%) */}
                    <div className="flex-1 min-w-[200px] flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar scroll-smooth">
                        <AnimatePresence mode="popLayout">
                            {others.map((p) => (
                                <motion.div
                                    key={p.userId}
                                    layoutId={p.userId}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => onSpeakerChange?.(p.userId)}
                                    className={cn(
                                        "aspect-video w-48 md:w-full shrink-0 cursor-pointer transition-transform active:scale-95",
                                        pinnedSpeakerId === p.userId && "ring-2 ring-amber-500 rounded-2xl"
                                    )}
                                >
                                    {p.isLocal ? (
                                        <LocalVideo stream={p.stream} role={p.role} micOff={!p.micOn} cameraOff={!p.cameraOn} name={p.name} handRaised={p.handRaised} onSpeakingChange={(s) => onPeerSpeaking?.('local', s)} />
                                    ) : (
                                        <RemoteVideo
                                            stream={p.stream}
                                            name={p.userId}
                                            role={p.role}
                                            micOff={p.micOn === false}
                                            cameraOff={p.cameraOn === false}
                                            handRaised={p.handRaised}
                                            volume={calcVolume(p)}
                                            onSpeakingChange={(s) => onPeerSpeaking?.(p.userId, s)}
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    )
}
