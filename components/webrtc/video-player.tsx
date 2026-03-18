import { useEffect, useRef, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicOff, VideoOff, Maximize2, Loader2, User, Hand, WifiOff, VolumeX, Volume2 } from 'lucide-react'
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
    isLocalMuted?: boolean
    individualVolume?: number
    onIndividualVolumeChange?: (volume: number) => void
    onPin?: () => void
    isPinned?: boolean
    showPinButton?: boolean
}

export const RemoteVideo = memo(function RemoteVideo({ 
    stream, name, role, micOff, cameraOff, handRaised, isSpeaking, volume = 1, 
    connectionState = 'connected', onSpeakingChange, isPresentation, onMutePeer, 
    isLocalMuted, individualVolume = 1, onIndividualVolumeChange, onPin, isPinned, 
    showPinButton = true 
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPaused, setIsPaused] = useState(false)
    const [isMutedAutoplay, setIsMutedAutoplay] = useState(false)
    const [isBuffering, setIsBuffering] = useState(false)
    const [showSlider, setShowSlider] = useState(false)

    // Watchdog State
    const stuckFrameCountRef = useRef(0)
    const lastTimeRef = useRef(0)

    useEffect(() => {
        const videoEl = videoRef.current
        if (videoEl && stream) {
            videoEl.srcObject = stream
            videoEl.playsInline = true
            videoEl.play().catch(e => {
                console.warn("Autoplay with audio failed, trying muted:", e)
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

    useEffect(() => {
        if (videoRef.current) {
            const vol = Math.max(0, Math.min(1, volume))
            videoRef.current.volume = vol
            if (vol === 0) videoRef.current.muted = true
            else if (!isMutedAutoplay) videoRef.current.muted = false
        }
    }, [volume, isMutedAutoplay])

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

        const watchdogInterval = setInterval(() => {
            if (!videoEl || !stream) return
            const vTrack = stream.getVideoTracks()[0]
            if (!vTrack || vTrack.readyState !== 'live') return

            const hasZeroRes = videoEl.videoWidth === 0 || videoEl.videoHeight === 0
            const isStuck = videoEl.currentTime > 0 && videoEl.currentTime === lastTimeRef.current && !videoEl.paused

            if (hasZeroRes || isStuck) {
                stuckFrameCountRef.current++
            } else {
                stuckFrameCountRef.current = 0
            }
            lastTimeRef.current = videoEl.currentTime

            if (stuckFrameCountRef.current > 12) {
                console.warn("Video Watchdog: TRIGGERING SILENT RECOVERY")
                stuckFrameCountRef.current = 0
                const currentStream = videoEl.srcObject
                if (currentStream) {
                    videoEl.srcObject = null
                    setTimeout(() => {
                        if (videoEl && currentStream) {
                            videoEl.srcObject = currentStream
                            videoEl.play().catch(() => setIsPaused(true))
                        }
                    }, 50)
                }
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

    return (
        <div className={cn(
            "group relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500 z-10",
            isSpeaking && "ring-4 ring-[#06b6d4] ring-offset-4 ring-offset-zinc-950 shadow-[0_0_30px_-10px_rgba(6,182,212,0.5)] z-20",
            (isPaused || isMutedAutoplay) && "ring-4 ring-amber-500"
        )}>
            {cameraOff || !stream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 backdrop-blur-3xl">
                    <div className="h-16 w-16 md:h-24 md:w-24 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                        <User className="h-8 w-8 md:h-12 md:w-12 text-zinc-600" />
                    </div>
                    <span className="mt-2 md:mt-4 text-zinc-400 font-medium text-xs md:text-base">{name}</span>
                </div>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        controls={false}
                        className={cn("w-full h-full bg-zinc-950", isPresentation ? "object-contain" : "object-cover")}
                        onPause={() => setIsPaused(true)}
                        onPlay={() => setIsPaused(false)}
                    />
                    {(isPaused || isMutedAutoplay) && (
                        <div className="absolute inset-0 flex items-center justify-center z-[50] pointer-events-none">
                            {(isBuffering && !isPaused) && (
                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    <span className="text-white text-xs font-bold">Carregando...</span>
                                </div>
                            )}
                        </div>
                    )}
                    {isPaused && (
                        <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/40 backdrop-blur-sm">
                            <button onClick={() => videoRef.current?.play()} className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all pointer-events-auto">
                                <Maximize2 className="h-6 w-6 text-white translate-x-0.5" />
                            </button>
                        </div>
                    )}
                    {!isPaused && isMutedAutoplay && (
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
                            <button onClick={() => { if (videoRef.current) { videoRef.current.muted = false; setIsMutedAutoplay(false) } }} className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-medium rounded-full px-6 py-2 flex items-center gap-2">
                                <MicOff className="h-4 w-4" />
                                <span>Ativar Áudio</span>
                            </button>
                        </div>
                    )}
                </>
            )}

            {onIndividualVolumeChange && (
                <div 
                    className="absolute top-3 left-3 z-[110] flex flex-col gap-2 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 pointer-events-auto transition-all duration-300"
                    onMouseEnter={() => setShowSlider(true)}
                    onMouseLeave={() => setShowSlider(false)}
                >
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onMutePeer?.(); 
                            }} 
                            className={cn(
                                "p-1.5 rounded-lg transition-colors", 
                                (individualVolume === 0 || isLocalMuted) ? "text-red-500 bg-red-500/10" : "text-white hover:bg-white/10"
                            )}
                            title={(individualVolume === 0 || isLocalMuted) ? "Ativar Som" : "Silenciar Participante"}
                        >
                            {(individualVolume === 0 || isLocalMuted) ? (
                                <VolumeX className="h-4 w-4 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </button>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={individualVolume} 
                            onChange={(e) => onIndividualVolumeChange(parseFloat(e.target.value))} 
                            className={cn(
                                "h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#06b6d4] transition-all duration-300", 
                                showSlider ? "w-20 opacity-100" : "w-0 opacity-0 pointer-events-none"
                            )} 
                        />
                    </div>
                </div>
            )}

            {onPin && showPinButton && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onPin() }} className={cn("flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 text-white font-bold text-xs uppercase tracking-widest", isPinned ? "bg-[#06b6d4]" : "bg-black/40 hover:bg-black/60")}>
                        <Maximize2 className="h-3.5 w-3.5" />
                        {isPinned ? "Desafixar" : "Fixar Vídeo"}
                    </button>
                </div>
            )}

            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 right-3 md:right-6 flex items-center justify-between pointer-events-none z-10">
                <div className="bg-black/40 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/10">
                    <span className="text-white text-[10px] md:text-sm font-bold">{name}</span>
                </div>
                <div className="flex gap-1.5">
                    {handRaised && <Hand className="h-4 w-4 text-amber-500 animate-bounce" />}
                    {micOff && <MicOff className="h-4 w-4 text-red-500" />}
                </div>
            </div>

            <AnimatePresence>
                {isConnecting && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[2.5rem]">
                        <Loader2 className="h-8 w-8 text-[#06b6d4] animate-spin mb-4" />
                        <span className="text-zinc-400 text-sm">Conectando...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
})

export const LocalVideo = memo(function LocalVideo({ 
    stream, name, role, micOff, cameraOff, handRaised, isSpeaking, onPin, isPinned, showPinButton = true 
}: VideoPlayerProps) {
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
                    <div className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="h-7 w-7 text-zinc-600" />
                    </div>
                    <span className="mt-2 text-zinc-400 text-xs font-medium">Você</span>
                </div>
            ) : (
                <video ref={videoRef} autoPlay playsInline muted controls={false} className="w-full h-full object-cover bg-zinc-950 mirror" />
            )}

            {onPin && showPinButton && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onPin() }} className={cn("flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 text-white font-bold text-xs uppercase", isPinned ? "bg-[#06b6d4]" : "bg-black/40")}>
                        <Maximize2 className="h-3.5 w-3.5" />
                        {isPinned ? "Desafixar" : "Fixar Vídeo"}
                    </button>
                </div>
            )}

            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 flex items-center justify-between right-3 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-white/10">
                    <span className="text-white text-[9px] md:text-sm font-bold">Você</span>
                </div>
                <div className="flex gap-1">
                    {handRaised && <Hand className="h-3 w-3 text-amber-500 animate-bounce" />}
                    {micOff && <MicOff className="h-3 w-3 text-red-500" />}
                </div>
            </div>

            <style jsx>{` .mirror { transform: scaleX(-1); } `}</style>
        </div>
    )
})
