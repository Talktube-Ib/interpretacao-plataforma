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
    mode: 'gallery' | 'speaker'
    onSpeakerChange?: (userId: string) => void
    activeSpeakerId?: string | null
    onPeerSpeaking?: (id: string, isSpeaking: boolean) => void
}

export function VideoGrid({
    peers,
    localStream,
    currentRole,
    micOn,
    mode,
    activeSpeakerId,
    onPeerSpeaking
}: VideoGridProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Total participants including self
    const allParticipants = [
        { userId: 'local', isLocal: true, stream: localStream, role: currentRole, micOn },
        ...peers.map(p => ({ ...p, isLocal: false }))
    ]

    const galleryLayout = useGalleryLayout(containerRef, allParticipants.length)

    // Find the main speaker for Speaker Mode
    // Default to first peer or local if activeSpeakerId is null
    const speakerData = allParticipants.find(p => p.userId === activeSpeakerId) || allParticipants[0]
    const others = allParticipants.filter(p => p.userId !== speakerData?.userId)

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
                                className="w-full h-full box-border"
                            >
                                {p.isLocal ? (
                                    <LocalVideo stream={p.stream} role={p.role} micOff={!p.micOn} onSpeakingChange={(s) => onPeerSpeaking?.('local', s)} />
                                ) : (
                                    <RemoteVideo
                                        stream={p.stream}
                                        name={p.userId}
                                        role={p.role}
                                        micOff={p.micOn === false}
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
                                    <LocalVideo stream={speakerData.stream} role={speakerData.role} micOff={!speakerData.micOn} onSpeakingChange={(s) => onPeerSpeaking?.('local', s)} />
                                ) : (
                                    <RemoteVideo
                                        stream={speakerData.stream}
                                        name={speakerData.userId}
                                        role={speakerData.role}
                                        micOff={speakerData.micOn === false}
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
                                    className="aspect-video w-48 md:w-full shrink-0"
                                >
                                    {p.isLocal ? (
                                        <LocalVideo stream={p.stream} role={p.role} micOff={!p.micOn} onSpeakingChange={(s) => onPeerSpeaking?.('local', s)} />
                                    ) : (
                                        <RemoteVideo
                                            stream={p.stream}
                                            name={p.userId}
                                            role={p.role}
                                            micOff={p.micOn === false}
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
