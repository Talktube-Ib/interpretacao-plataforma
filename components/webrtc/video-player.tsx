import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicOff, VideoOff, Maximize2, Loader2, User, Hand, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
    stream?: MediaStream | null
    name: string
    role?: string
    micOff?: boolean
    cameraOff?: boolean
    handRaised?: boolean
    isSpeaking?: boolean
    volume?: number
    connectionState?: 'connecting' | 'connected' | 'failed' | 'disconnected' | 'closed'
    onSpeakingChange?: (isSpeaking: boolean) => void
    isPresentation?: boolean
    onMutePeer?: () => void
}

export function RemoteVideo({ stream, name, role, micOff, cameraOff, handRaised, isSpeaking, volume = 1, connectionState = 'connected', onSpeakingChange, isPresentation, onMutePeer }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPaused, setIsPaused] = useState(false)
    const [isMutedAutoplay, setIsMutedAutoplay] = useState(false)
    const [isBuffering, setIsBuffering] = useState(false)

    // Watchdog State
    const stuckFrameCountRef = useRef(0)
    const lastTimeRef = useRef(0)

    useEffect(() => {
        const videoEl = videoRef.current
        if (videoEl && stream) {
            videoEl.srcObject = stream

            // Critical: Ensure playsInline is set
            videoEl.playsInline = true

            // Attempt 1: Play with Audio
            videoEl.play().catch(e => {
                console.warn("Autoplay with audio failed, trying muted:", e)

                // Attempt 2: Play Muted
                videoEl.muted = true
                videoEl.play().then(() => {
                    setIsMutedAutoplay(true)
                    setIsPaused(false)
                }).catch(e2 => {
                    console.error("Autoplay muted also failed:", e2)
                    setIsPaused(true)
                })
            })
        }
    }, [stream])

    // Sync Volume
    useEffect(() => {
        if (videoRef.current) {
            const vol = Math.max(0, Math.min(1, volume))
            videoRef.current.volume = vol
            if (vol === 0) videoRef.current.muted = true
            else if (!isMutedAutoplay) videoRef.current.muted = false
        }
    }, [volume, isMutedAutoplay])

    // Monitor Playback Health & Watchdog
    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl || !stream) return

        const handleWaiting = () => setIsBuffering(true)
        const handlePlaying = () => {
            setIsBuffering(false)
            setIsPaused(false)
        }
        const handlePause = () => !isBuffering && setIsPaused(true)
        const handleError = (e: any) => {
            console.error("Video Error:", e)
            // Try to recover
            setTimeout(() => {
                if (videoEl) {
                    videoEl.load()
                    videoEl.play().catch(console.error)
                }
            }, 1000)
        }

        videoEl.addEventListener('waiting', handleWaiting)
        videoEl.addEventListener('stalled', handleWaiting)
        videoEl.addEventListener('playing', handlePlaying)
        videoEl.addEventListener('pause', handlePause)
        videoEl.addEventListener('error', handleError)

        // WATCHDOG: Check for frozen video or 0x0 resolution
        const watchdogInterval = setInterval(() => {
            if (!videoEl || !stream) return

            const vTrack = stream.getVideoTracks()[0]
            if (!vTrack || vTrack.readyState !== 'live') return

            const hasZeroRes = videoEl.videoWidth === 0 || videoEl.videoHeight === 0
            const isStuck = videoEl.currentTime > 0 && videoEl.currentTime === lastTimeRef.current && !videoEl.paused

            if (hasZeroRes || isStuck) {
                stuckFrameCountRef.current++
                console.log(`Video Watchdog: Suspicious state (${stuckFrameCountRef.current}/10) - Res: ${videoEl.videoWidth}x${videoEl.videoHeight}, Time: ${videoEl.currentTime}`)
            } else {
                stuckFrameCountRef.current = 0
            }

            lastTimeRef.current = videoEl.currentTime

            // Trigger Recovery if stuck for ~5 seconds
            if (stuckFrameCountRef.current > 10) {
                console.warn("Video Watchdog: TRIGGERING RECOVERY")
                stuckFrameCountRef.current = 0

                // Force Reset
                const currentStream = videoEl.srcObject
                videoEl.srcObject = null
                setTimeout(() => {
                    videoEl.srcObject = currentStream
                    videoEl.play().catch(e => console.error("Watchdog recovery play failed:", e))
                }, 100)
            }

        }, 500)

        return () => {
            videoEl.removeEventListener('waiting', handleWaiting)
            videoEl.removeEventListener('stalled', handleWaiting)
            videoEl.removeEventListener('playing', handlePlaying)
            videoEl.removeEventListener('pause', handlePause)
            videoEl.removeEventListener('error', handleError)
            clearInterval(watchdogInterval)
        }
    }, [stream, isBuffering])

    const isConnecting = connectionState === 'connecting'

    const handleUnmute = () => {
        if (videoRef.current) {
            videoRef.current.muted = false
            setIsMutedAutoplay(false)
        }
    }

    const handleManualPlay = () => {
        if (videoRef.current) {
            videoRef.current.muted = false // Try to unmute on manual interaction
            videoRef.current.play()
                .then(() => {
                    setIsPaused(false)
                    setIsMutedAutoplay(false)
                })
                .catch(console.error)
        }
    }

    return (
        <div className={cn(
            "group relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500",
            isSpeaking && "ring-4 ring-[#06b6d4] ring-offset-4 ring-offset-zinc-950 shadow-[0_0_30px_-10px_rgba(6,182,212,0.5)]",
            (isPaused || isMutedAutoplay) && "ring-4 ring-amber-500" // Visual cue
        )}>
            {cameraOff || !stream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 backdrop-blur-3xl">
                    <div className="relative">
                        <div className="h-16 w-16 md:h-24 md:w-24 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                            <User className="h-8 w-8 md:h-12 md:w-12 text-zinc-600" />
                        </div>
                    </div>
                    <span className="mt-2 md:mt-4 text-zinc-400 font-medium tracking-tight text-xs md:text-base">{name}</span>
                </div>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        controls={false}
                        className={cn(
                            "w-full h-full object-contain bg-zinc-950",
                            isPresentation ? "object-contain" : "object-contain"
                        )}
                        onLoadedMetadata={(e) => {
                            // Initial play attempt handled by effect, but this is a backup
                        }}
                        onPause={() => setIsPaused(true)}
                        onPlay={() => setIsPaused(false)}
                    />

                    {/* OVERLAYS FOR INTERACTION */}
                    {(isPaused || isMutedAutoplay) && (
                        <div className="absolute inset-0 flex items-center justify-center z-[50] pointer-events-none">
                            {/* Buffering/Stalled Indicator */}
                            {(isBuffering && !isPaused) && (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                                        <span className="text-white text-xs font-bold">Carregando vídeo...</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            // Force re-attach
                                            if (videoRef.current && stream) {
                                                const s = stream
                                                videoRef.current.srcObject = null
                                                setTimeout(() => {
                                                    if (videoRef.current) {
                                                        videoRef.current.srcObject = s
                                                        videoRef.current.play().catch(console.error)
                                                        setIsBuffering(false)
                                                    }
                                                }, 200)
                                            }
                                        }}
                                        className="bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full pointer-events-auto transition-colors"
                                    >
                                        Forçar Recarregamento
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {isPaused && (
                        <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/40 backdrop-blur-sm transition-all">
                            <button
                                onClick={handleManualPlay}
                                className="group/play flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto"
                            >
                                <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover/play:bg-white/20 transition-all shadow-xl">
                                    <Maximize2 className="h-6 w-6 text-white translate-x-0.5" />
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-white font-medium text-sm tracking-wide shadow-black drop-shadow-md">Clique para ativar o vídeo</span>
                                </div>
                            </button>
                        </div>
                    )}

                    {!isPaused && isMutedAutoplay && (
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
                            <button
                                onClick={handleUnmute}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-medium rounded-full px-6 py-2 shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                            >
                                <MicOff className="h-4 w-4" />
                                <span>Ativar Áudio</span>
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Mute Peer Button (Host Only or Local Mute) */}
            {onMutePeer && (
                <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onMutePeer()
                        }}
                        className={cn(
                            "p-2 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95",
                            micOff
                                ? "bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white"
                                : "bg-zinc-800 text-white hover:bg-red-600 border border-white/10"
                        )}
                        title={micOff ? "Desmutar (Local)" : "Mutar (Local)"}
                    >
                        <MicOff className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* OVERLAYS */}
            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 right-3 md:right-6 flex items-center justify-between pointer-events-none z-10">
                <div className="flex items-center gap-2 md:gap-3 bg-black/40 backdrop-blur-xl px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-white/10">
                    <span className="text-white text-[10px] md:text-sm font-bold tracking-tight">{name}</span>
                    {(role?.toLowerCase().includes('interpreter') || role?.toLowerCase().includes('admin')) && (
                        <div className="bg-[#06b6d4] h-1 w-1 md:h-1.5 md:w-1.5 rounded-full animate-pulse" />
                    )}
                </div>

                <div className="flex gap-1.5 md:gap-2">
                    {handRaised && (
                        <div className="bg-amber-500/20 backdrop-blur-xl border border-amber-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <Hand className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 animate-bounce" />
                        </div>
                    )}
                    {micOff && (
                        <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <MicOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500" />
                        </div>
                    )}
                </div>
            </div>

            {/* CONNECTING OVERLAY */}
            <AnimatePresence>
                {isConnecting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[2.5rem]"
                    >
                        <Loader2 className="h-8 w-8 text-[#06b6d4] animate-spin mb-4" />
                        <span className="text-zinc-400 text-sm font-medium">Conectando...</span>
                    </motion.div>
                )}
                {connectionState === 'failed' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[2.5rem]"
                    >
                        <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                            <WifiOff className="h-6 w-6 text-red-500" />
                        </div>
                        <span className="text-red-200 text-sm font-medium text-center px-4">
                            Falha na Conexão P2P<br />
                            <span className="text-red-500/50 text-xs mt-1 block">Verifique o Firewall/Rede</span>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DEBUG OVERLAY REMOVED */}
        </div>
    )
}

export function LocalVideo({ stream, name, role, micOff, cameraOff, handRaised, isSpeaking, onSpeakingChange }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className={cn(
            "group relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500",
            isSpeaking && "ring-4 ring-[#06b6d4] shadow-lg",
        )}>
            {cameraOff || !stream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                    <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="h-10 w-10 text-zinc-600" />
                    </div>
                    <span className="mt-3 text-zinc-400 text-sm font-medium tracking-tight">Você</span>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    className="w-full h-full object-contain bg-zinc-950 mirror" // Changed to contain
                />
            )}

            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 right-3 md:right-6 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 bg-black/40 backdrop-blur-xl px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-white/10">
                    <span className="text-white text-[10px] md:text-sm font-bold tracking-tight">Você</span>
                    {(role?.toLowerCase().includes('interpreter') || role?.toLowerCase().includes('admin')) && (
                        <div className="bg-[#06b6d4] h-1 w-1 md:h-1.5 md:w-1.5 rounded-full animate-pulse" />
                    )}
                </div>
                <div className="flex gap-1.5 md:gap-2">
                    {handRaised && (
                        <div className="bg-amber-500/20 backdrop-blur-xl border border-amber-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <Hand className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 animate-bounce" />
                        </div>
                    )}
                    {micOff && (
                        <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <MicOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500" />
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .mirror { transform: scaleX(-1); }
            `}</style>
        </div>
    )
}
