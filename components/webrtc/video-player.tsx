import { useEffect, useRef, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, Maximize2, Loader2, User, Hand, WifiOff, VolumeX, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
    stream?: MediaStream | null
    name: string
    role?: string
    micOff?: boolean
    cameraOff?: boolean
    handRaised?: boolean
    isSpeaking?: boolean
    connectionQuality?: string
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
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPaused, setIsPaused] = useState(false)
    const [isMutedAutoplay, setIsMutedAutoplay] = useState(false)
    const [isBuffering, setIsBuffering] = useState(false)
    const [showSlider, setShowSlider] = useState(false)
    const [hasVideoTrack, setHasVideoTrack] = useState(false)
    const [hasAudioTrack, setHasAudioTrack] = useState(false)

    // Watchdog State
    const stuckFrameCountRef = useRef(0)
    const lastTimeRef = useRef(0)

    // Monitor de Tracks
    useEffect(() => {
        if (!stream) {
            setHasAudioTrack(false)
            return
        }
        const checkTracks = () => {
            const vTracks = stream.getVideoTracks()
            const aTracks = stream.getAudioTracks()
            console.log(`[VP] ${name} — stream tracks:`, {
                video: vTracks.map(t => ({ readyState: t.readyState, enabled: t.enabled })),
                audio: aTracks.map(t => ({ readyState: t.readyState, enabled: t.enabled })),
                cameraOff
            })
            setHasVideoTrack(vTracks.length > 0)
            setHasAudioTrack(aTracks.length > 0)
        }
        checkTracks()
        stream.onaddtrack = checkTracks
        stream.onremovetrack = checkTracks
        return () => {
            stream.onaddtrack = null
            stream.onremovetrack = null
        }
    }, [stream, cameraOff, name])

    // Video Sync
    useEffect(() => {
        const videoEl = videoRef.current
        if (videoEl && stream && hasVideoTrack) {
            videoEl.srcObject = stream
            videoEl.playsInline = true
            videoEl.play().catch(e => {
                // AbortError é esperado quando o React desmonta/remonta o elemento
                // durante uma re-renderização (ex: quando o stream atualiza)
                if (e.name === 'AbortError') return
                console.warn("[Video] Autoplay failed:", e)
                videoEl.muted = true
                videoEl.play().catch(e2 => {
                    if (e2.name !== 'AbortError')
                        console.error("[Video] Final play failure:", e2)
                })
            })
        }
    }, [stream, hasVideoTrack, cameraOff])

    // Audio Sync (Dedicado para evitar corte quando troca pra avatar)
    useEffect(() => {
        const audioEl = audioRef.current
        if (audioEl && stream && hasAudioTrack) {
            audioEl.srcObject = stream
            audioEl.play().catch(e => {
                if (e.name === 'AbortError') return
                console.warn("[Audio] Autoplay failed, trying muted for permission:", e)
                audioEl.muted = true
                audioEl.play().then(() => {
                    setIsMutedAutoplay(true)
                }).catch(e2 => {
                    if (e2.name !== 'AbortError')
                        console.error("[Audio] Final play failure:", e2)
                })
            })
        }
    }, [stream, hasAudioTrack, micOff])

    useEffect(() => {
        if (videoRef.current) {
            const vol = Math.max(0, Math.min(1, volume))
            videoRef.current.volume = vol
        }
        if (audioRef.current) {
            const vol = Math.max(0, Math.min(1, volume))
            audioRef.current.volume = vol
            if (vol === 0) audioRef.current.muted = true
            else if (!isMutedAutoplay) audioRef.current.muted = false
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

        return () => {
            videoEl.removeEventListener('waiting', handleWaiting)
            videoEl.removeEventListener('stalled', handleWaiting)
            videoEl.removeEventListener('playing', handlePlaying)
            videoEl.removeEventListener('pause', handlePause)
            videoEl.removeEventListener('error', handleError)
        }
    }, [stream, isBuffering])

    // Watchdog de Renderização
    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl || !stream || !hasVideoTrack || cameraOff) return

        let lastCheckTime = Date.now()
        let lastFrameTime = 0
        
        const watchdog = setInterval(() => {
            const now = Date.now()
            const { videoWidth, videoHeight, currentTime, paused, readyState } = videoEl

            // Diagnóstico periódico
            if (now - lastCheckTime > 5000) {
                console.log(`[VP-WATCHDOG] ${name}:`, {
                    dims: `${videoWidth}x${videoHeight}`,
                    currentTime,
                    paused,
                    readyState,
                    hasVideoTrack
                })
                lastCheckTime = now
            }

            // Se o vídeo deveria estar tocando mas as dimensões são 0 ou o tempo não avança
            if (readyState >= 2 && !paused) {
                if (videoWidth === 0 || videoHeight === 0) {
                    stuckFrameCountRef.current++
                } else if (currentTime === lastFrameTime) {
                    stuckFrameCountRef.current++
                } else {
                    stuckFrameCountRef.current = 0
                    lastFrameTime = currentTime
                }

                // Se travado por mais de 3 segundos (30 checks)
                if (stuckFrameCountRef.current > 30) {
                    console.warn(`[VP-WATCHDOG] ${name} parece travado (${videoWidth}x${videoHeight} @ ${currentTime}). Tentando recuperar...`)
                    stuckFrameCountRef.current = 0
                    
                    // "Kick" no srcObject
                    const s = videoEl.srcObject
                    videoEl.srcObject = null
                    setTimeout(() => {
                        if (videoEl && s) {
                            videoEl.srcObject = s
                            videoEl.play().catch(e => console.error("[VP-WATCHDOG] Erro ao re-iniciar:", e))
                        }
                    }, 100)
                }
            }
        }, 100)

        return () => clearInterval(watchdog)
    }, [stream, hasVideoTrack, cameraOff, name])

    const [showControls, setShowControls] = useState(false)

    const isConnecting = connectionState === 'connecting'

    return (
        <div 
            onClick={() => setShowControls(!showControls)}
            className={cn(
                "group relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500 z-10 cursor-pointer",
                isSpeaking && "ring-4 ring-[#06b6d4] ring-offset-4 ring-offset-zinc-950 shadow-[0_0_30px_-10px_rgba(6,182,212,0.5)] z-20",
                (isPaused || isMutedAutoplay) && "ring-4 ring-amber-500"
            )}
        >
            {/* Elemento de áudio persistente */}
            <audio ref={audioRef} autoPlay playsInline />

            {(cameraOff && !hasVideoTrack) || !stream || !hasVideoTrack ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 backdrop-blur-3xl">
                    <div className="h-16 w-16 md:h-24 md:w-24 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                        <User className="h-8 w-8 md:h-12 md:w-12 text-zinc-600" />
                    </div>
                    <div className="mt-2 md:mt-4 flex flex-col items-center gap-1">
                        <span className="text-zinc-400 font-medium text-xs md:text-base">{name}</span>
                        {!hasVideoTrack && stream && (
                            <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Apenas Áudio</span>
                        )}
                    </div>
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
                    onClick={(e) => e.stopPropagation()} 
                    className={cn(
                        "absolute top-3 left-3 z-[110] flex items-center gap-1.5 bg-black/70 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 pointer-events-auto transition-all duration-300",
                        showControls ? "opacity-100 scale-100" : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
                    )}
                >
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onMutePeer?.(); 
                        }} 
                        className={cn(
                            "p-2 rounded-xl transition-all", 
                            (individualVolume === 0 || isLocalMuted) ? "text-red-500 bg-red-500/10" : "text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20"
                        )}
                        title={(individualVolume === 0 || isLocalMuted) ? "Ativar Som" : "Silenciar Participante"}
                    >
                        {(individualVolume === 0 || isLocalMuted) ? (
                            <VolumeX className="h-4 w-4 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                        ) : (
                            <Volume2 className="h-4 w-4" />
                        )}
                    </button>
                    <div className="flex items-center w-0 group-hover:w-16 md:group-hover:w-24 px-0 group-hover:px-1 transition-all duration-300 overflow-hidden">
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.05" 
                            value={individualVolume} 
                            onChange={(e) => onIndividualVolumeChange(parseFloat(e.target.value))} 
                            className="h-1 w-full bg-white/20 rounded-full appearance-none cursor-pointer accent-cyan-400" 
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
    stream, name, role, micOff, cameraOff, handRaised, isSpeaking, onPin, isPinned, showPinButton = true, connectionQuality 
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const stuckFrameCountRef = useRef(0)

    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl || !stream || cameraOff) {
            if (videoEl) videoEl.srcObject = null
            return
        }

        // Atribuição crucial que foi removida
        videoEl.srcObject = stream
        videoEl.play().catch(err => {
            console.warn("[VP-LOCAL] Falha ao dar play inicial:", err)
        })

        let lastCheckTime = Date.now()
        
        const watchdog = setInterval(() => {
            const now = Date.now()
            const { videoWidth, videoHeight, currentTime, paused, readyState } = videoEl

            if (now - lastCheckTime > 5000) {
                console.log(`[VP-LOCAL-WATCHDOG]:`, {
                    dims: `${videoWidth}x${videoHeight}`,
                    currentTime,
                    paused,
                    readyState,
                    streamId: stream.id
                })
                lastCheckTime = now
            }

            // Se pausado mas deveria estar tocando
            if (paused && !cameraOff && readyState >= 2) {
                videoEl.play().catch(() => {})
            }

            if (!cameraOff && readyState >= 2 && (videoWidth === 0 || videoHeight === 0)) {
                // Se local está 0x0 por muito tempo, tenta re-anexar
                stuckFrameCountRef.current++
                if (stuckFrameCountRef.current > 30) {
                    console.warn("[VP-LOCAL] Vídeo local 0x0. Re-anexando srcObject...")
                    stuckFrameCountRef.current = 0
                    videoEl.srcObject = null
                    setTimeout(() => { if (videoEl) videoEl.srcObject = stream }, 50)
                }
            } else {
                stuckFrameCountRef.current = 0
            }
        }, 100)

        return () => clearInterval(watchdog)
    }, [stream, cameraOff])

    return (
        <div className={cn(
            "group relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500",
            isSpeaking && "ring-4 ring-[#06b6d4] shadow-lg",
        )}>
            {isSpeaking && (
                <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 bg-[#06b6d4] text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse shadow-lg shadow-[#06b6d4]/20 border border-white/20">
                    <Mic className="h-3 w-3" />
                    SPEAKING
                </div>
            )}

            {/* Indicador de Qualidade */}
            {connectionQuality && connectionQuality !== 'excellent' && (
                <div className={cn(
                    "absolute top-2 left-2 z-30 px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1",
                    connectionQuality === 'poor' ? "bg-red-500/80 border-red-400 text-white" : "bg-amber-500/80 border-amber-400 text-white",
                    isSpeaking && "top-8" // Desloca se estiver falando
                )}>
                    {connectionQuality === 'poor' ? 'Rede Ruim' : 'Rede Instável'}
                </div>
            )}
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
