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

    // THEATER / SPEAKER MODE DETECTION
    const presentationPeer = peers.find(p => p.isPresentation === true) ||
        allParticipants.find(p => p.stream && p.stream.getVideoTracks().filter((t: any) => t.readyState === 'live').length > 1)

    // SPEAKER MODE LOGIC
    const isSpeakerMode = mode === 'speaker' && allParticipants.length > 1
    const activeSubject = isSpeakerMode
        ? (allParticipants.find(p => p.userId === pinnedSpeakerId) || allParticipants.find(p => p.userId === activeSpeakerId) || allParticipants.find(p => !p.isLocal) || allParticipants[0])
        : null

    const mainPeer = presentationPeer || activeSubject
    const isTheaterMode = !!mainPeer

    const galleryParticipants = isTheaterMode
        ? allParticipants.filter(p => p.userId !== mainPeer.userId && !p.isPresentation)
        : allParticipants

    const galleryLayout = useGalleryLayout(containerRef, galleryParticipants.length)

    const calcVolume = (p: any) => {
        if (p.isLocal) return 0
        const r = (p.role || '').toLowerCase()
        const isInt = r.includes('interpreter') || r.includes('admin') || p.isHost
        const isBroadcastingTranslation = isInt && p.language && p.language !== 'floor' && p.language !== 'original'

        // If listener wants "Original Audio"
        if (selectedLang === 'original' || selectedLang === 'floor') {
            // STRICT ISOLATION: Mute them completely if they are broadcasting a translation
            // This prevents the "bleeding" into the original floor audio.
            return isBroadcastingTranslation ? 0 : 1.0
        }

        // If listener selected a specific translation channel (e.g., English)
        if (isBroadcastingTranslation && p.language === selectedLang) {
            return volumeBalance / 100 // High volume for the correct translator
        }

        if (isBroadcastingTranslation && p.language !== selectedLang) {
            return 0 // Mute translators of other languages
        }

        // Floor audio (ducked if a translation is selected)
        return (100 - volumeBalance) / 100
    }

    const getPresentationStream = (p: any) => {
        if (!p || !p.stream) return null
        if (p.isPresentation) return p.stream
        const tracks = p.stream.getVideoTracks()
        return tracks.length > 1 ? new MediaStream([tracks[tracks.length - 1]]) : p.stream
    }

    return (
        <div ref={containerRef} className="w-full h-full p-2 md:p-4 flex flex-col items-center justify-center overflow-hidden relative">
            {isTheaterMode && mainPeer ? (
                <div className="w-full h-full flex flex-col lg:flex-row gap-4 lg:gap-6 p-1 md:p-2 overflow-hidden">
                    {/* MAIN STAGE */}
                    <div className="flex-[3] lg:flex-[4] h-full relative bg-zinc-950 rounded-2xl lg:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                        {mainPeer.isLocal && !isSpeakerMode ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 bg-zinc-900/90 backdrop-blur-xl z-20">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex flex-col items-center text-center px-8"
                                >
                                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-[#06b6d4]/10 flex items-center justify-center mb-4 md:mb-6">
                                        <Monitor className="h-8 w-8 md:h-10 md:w-10 text-[#06b6d4]" />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2">Sua tela está sendo compartilhada</h3>
                                    <p className="text-xs md:text-sm max-w-sm opacity-60">Para evitar o loop infinito, você vê este aviso enquanto os outros participantes vêem sua tela.</p>
                                </motion.div>
                            </div>
                        ) : (
                            mainPeer.isLocal ? (
                                <LocalVideo
                                    stream={mainPeer.stream}
                                    role={mainPeer.role}
                                    micOff={!mainPeer.micOn}
                                    cameraOff={!mainPeer.cameraOn}
                                    name={mainPeer.name}
                                    isSpeaking={activeSpeakerId === 'local'}
                                    handRaised={mainPeer.handRaised}
                                />
                            ) : (
                                <RemoteVideo
                                    stream={presentationPeer ? getPresentationStream(mainPeer) : mainPeer.stream}
                                    name={mainPeer.name || "Apresentação"}
                                    role={presentationPeer ? "presentation" : mainPeer.role}
                                    volume={presentationPeer ? 0 : calcVolume(mainPeer)}
                                    connectionState={mainPeer.connectionState || 'connected'}
                                    isPresentation={!!presentationPeer}
                                    isSpeaking={activeSpeakerId === mainPeer.userId}
                                    handRaised={mainPeer.handRaised}
                                />
                            )
                        )}
                    </div>

                    {/* SIDEBAR / STRIP (Responsive: Horizontal scroll on mobile/tablet, Vertical list on desktop lg+) */}
                    <div className="flex-1 lg:h-full overflow-x-auto lg:overflow-y-auto no-scrollbar flex flex-row lg:flex-col gap-3 lg:gap-4 min-h-[140px] lg:min-w-[280px]">
                        <AnimatePresence>
                            {galleryParticipants.map((p) => (
                                <motion.div
                                    key={p.userId}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="aspect-video h-full lg:h-auto lg:w-full shrink-0 cursor-pointer hover:ring-2 hover:ring-[#06b6d4]/50 rounded-xl transition-all"
                                    onClick={() => onSpeakerChange?.(p.userId)}
                                >
                                    {p.isLocal ? (
                                        <LocalVideo
                                            stream={p.stream}
                                            role={p.role}
                                            micOff={!p.micOn}
                                            cameraOff={!p.cameraOn}
                                            name={p.name}
                                            isSpeaking={activeSpeakerId === 'local'}
                                            handRaised={p.handRaised}
                                        />
                                    ) : (
                                        <RemoteVideo
                                            stream={p.stream}
                                            name={p.name || p.userId}
                                            role={p.role}
                                            micOff={!p.micOn}
                                            volume={calcVolume(p)}
                                            connectionState={p.connectionState}
                                            isSpeaking={activeSpeakerId === p.userId}
                                            handRaised={p.handRaised}
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                /* GALLERY */
                <div
                    className="grid gap-3 md:gap-4 justify-center content-center transition-all duration-700 w-full h-full"
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
                                className="box-border cursor-pointer group"
                                onClick={() => onSpeakerChange?.(p.userId)}
                            >
                                {p.isLocal ? (
                                    <LocalVideo stream={p.stream} role={p.role} micOff={!p.micOn} cameraOff={!p.cameraOn} name={p.name} isSpeaking={activeSpeakerId === 'local'} />
                                ) : (
                                    <RemoteVideo stream={p.stream} name={p.name || p.userId} role={p.role} micOff={!p.micOn} volume={calcVolume(p)} connectionState={p.connectionState} isSpeaking={activeSpeakerId === p.userId} />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
