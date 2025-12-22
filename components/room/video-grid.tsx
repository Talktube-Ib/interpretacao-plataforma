import React, { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RemoteVideo, LocalVideo } from '@/components/webrtc/video-player'
import { useGalleryLayout } from '@/hooks/use-gallery-layout'
import { cn } from '@/lib/utils'
import { Monitor } from 'lucide-react'

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

    // Filter out potential ghosts or presentation tracks that are not ready
    const allParticipants = [
        { userId: 'local', isLocal: true, stream: localStream, role: currentRole, micOn, cameraOn, handRaised, name: localUserName },
        ...peers.filter(p => !p.userId.endsWith('-presentation')).map(p => ({ ...p, isLocal: false }))
    ]

    // THEATER MODE DETECTION
    const presentationPeer = peers.find(p => p.isPresentation === true) || allParticipants.find(p => p.stream && p.stream.getVideoTracks().length > 1)
    const isTheaterMode = !!presentationPeer

    const galleryParticipants = isTheaterMode
        ? allParticipants.filter(p => p.userId !== presentationPeer.userId && !p.isPresentation)
        : allParticipants

    const galleryLayout = useGalleryLayout(containerRef, galleryParticipants.length)

    const calcVolume = (p: any) => {
        if (p.isLocal) return 0
        if (selectedLang === 'original' || selectedLang === 'floor') return p.role === 'interpreter' ? 0 : 1.0
        if (p.role === 'interpreter' && p.language === selectedLang) return volumeBalance / 100
        if (p.role === 'interpreter' && p.language !== selectedLang) return 0
        return (100 - volumeBalance) / 100
    }

    const getPresentationStream = (p: any) => {
        if (!p || !p.stream) return null
        if (p.isPresentation) return p.stream
        const tracks = p.stream.getVideoTracks()
        return tracks.length > 1 ? new MediaStream([tracks[tracks.length - 1]]) : p.stream
    }

    return (
        <div ref={containerRef} className="w-full h-full p-4 flex flex-col items-center justify-center overflow-hidden relative">
            {isTheaterMode && presentationPeer ? (
                <div className="w-full h-full flex flex-col md:flex-row gap-6 p-2 overflow-hidden">
                    {/* MAIN STAGE */}
                    <div className="flex-[4] h-full relative bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                        {presentationPeer.isLocal ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 bg-zinc-900/90 backdrop-blur-xl z-20">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex flex-col items-center text-center px-8"
                                >
                                    <div className="h-20 w-20 rounded-full bg-[#06b6d4]/10 flex items-center justify-center mb-6">
                                        <Monitor className="h-10 w-10 text-[#06b6d4]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Sua tela está sendo compartilhada</h3>
                                    <p className="text-sm max-w-sm opacity-60">Para evitar o loop infinito, você vê este aviso enquanto os outros participantes vêem sua tela.</p>
                                </motion.div>
                            </div>
                        ) : (
                            <RemoteVideo
                                stream={getPresentationStream(presentationPeer)}
                                name="Apresentação"
                                role="presentation"
                                volume={0}
                                connectionState="connected"
                                isPresentation={true}
                            />
                        )}
                    </div>

                    {/* SIDEBAR */}
                    <div className="flex-1 h-full overflow-y-auto no-scrollbar flex flex-col gap-4 min-w-[240px]">
                        <AnimatePresence>
                            {galleryParticipants.map((p) => (
                                <motion.div key={p.userId} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="aspect-video w-full shrink-0">
                                    {p.isLocal ? (
                                        <LocalVideo stream={p.stream} role={p.role} micOff={!p.micOn} cameraOff={!p.cameraOn} name={p.name} />
                                    ) : (
                                        <RemoteVideo stream={p.stream} name={p.name || p.userId} role={p.role} volume={calcVolume(p)} connectionState={p.connectionState} />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                /* GALLERY */
                <div
                    className="grid gap-4 justify-center content-center transition-all duration-700"
                    style={{
                        gridTemplateColumns: `repeat(${galleryLayout.cols}, ${galleryLayout.width}px)`,
                        gridTemplateRows: `repeat(${galleryLayout.rows}, ${galleryLayout.height}px)`,
                    }}
                >
                    <AnimatePresence mode="popLayout">
                        {galleryParticipants.map((p) => (
                            <motion.div
                                key={p.userId}
                                layout
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                style={{ width: galleryLayout.width, height: galleryLayout.height }}
                                className="box-border"
                            >
                                {p.isLocal ? (
                                    <LocalVideo stream={p.stream} role={p.role} micOff={!p.micOn} cameraOff={!p.cameraOn} name={p.name} />
                                ) : (
                                    <RemoteVideo stream={p.stream} name={p.name || p.userId} role={p.role} volume={calcVolume(p)} connectionState={p.connectionState} />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
