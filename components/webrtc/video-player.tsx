import { useEffect, useRef, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, Maximize2, Loader2, User, Hand, VolumeX, Volume2 } from 'lucide-react'
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
    const [hasVideoTrack, setHasVideoTrack] = useState(false)
    const [hasAudioTrack, setHasAudioTrack] = useState(false)

    const stuckFrameCountRef = useRef(0)
    const lastTimeRef = useRef(0)

    useEffect(() => {
        if (!stream) {
            setHasAudioTrack(false)
            setHasVideoTrack(false)
            return
        }
        const checkTracks = () => {
            const vTracks = stream.getVideoTracks()
            const aTracks = stream.getAudioTracks()
            setHasVideoTrack(vTracks.length > 0 && vTracks.some(t => t.readyState === 'live'))
            setHasAudioTrack(aTracks.length > 0 && aTracks.some(t => t.readyState === 'live'))
        }
        checkTracks()
        stream.onaddtrack = checkTracks
        stream.onremovetrack = checkTracks
        return () => {
            stream.onaddtrack = null
            stream.onremovetrack = null
        }
    }, [stream, cameraOff, name])

    // FIX: Só atribui srcObject se o stream for realmente diferente.
    // Como o useWebRTC agora reutiliza a mesma referência de MediaStream,
    // esse efeito raramente dispara — elimina o pisca preto de 1-3s.
    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl) return

        if (stream && hasVideoTrack && !cameraOff) {
            if (videoEl.srcObject !== stream) {
                videoEl.srcObject = stream
                videoEl.playsInline = true
                videoEl.play().catch(e => {
                    if (e.name === 'AbortError') return
                    videoEl.muted = true
                    videoEl.play().catch(() => {})
                })
            }
        } else {
            videoEl.srcObject = null
        }
    }, [stream, hasVideoTrack, cameraOff])

    useEffect(() => {
        const audioEl = audioRef.current
        if (audioEl && stream && hasAudioTrack) {
            if (audioEl.srcObject !== stream) {
                audioEl.srcObject = stream
                audioEl.play().catch(e => {
                    if (e.name === 'AbortError') return
                    audioEl.muted = true
                    audioEl.play().then(() => setIsMutedAutoplay(true)).catch(() => {})
                })
            }
        }
    }, [stream, hasAudioTrack, micOff])

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, volume))
        if (audioRef.current) {
            const vol = Math.max(0, Math.min(1, volume))
            audioRef.current.volume = vol
            if (vol === 0) audioRef.current.muted = true
            else if (!isMutedAutoplay) audioRef.current.muted = false
        }
    }, [volume, isMutedAutoplay])

    // FIX WATCHDOG:
    // 1. Tolerância: 80 ticks × 100ms = 8s (era 30 ticks = 3s)
    // 2. Antes de resetar, verifica se a track ainda está 'live'
    //    — jitter passageiro não derruba mais o vídeo
    // 3. Usa srcObject do próprio elemento (não do closure) — evita stale ref
    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl || !stream || !hasVideoTrack || cameraOff) return

        stuckFrameCountRef.current = 0
        lastTimeRef.current = 0

        const watchdog = setInterval(() => {
            const { videoWidth, videoHeight, currentTime, paused, readyState } = videoEl
            if (readyState >= 2 && !paused) {
                if (videoWidth === 0 || videoHeight === 0 || currentTime === lastTimeRef.current) {
                    stuckFrameCountRef.current++
                } else {
                    stuckFrameCountRef.current = 0
                    lastTimeRef.current = currentTime
                }

                if (stuckFrameCountRef.current > 80) {
                    const videoTracks = (videoEl.srcObject as MediaStream | null)?.getVideoTracks() ?? []
                    const trackIsLive = videoTracks.some(t => t.readyState === 'live' && t.enabled)

                    if (!trackIsLive) {
                        // Track morreu — não tenta reiniciar, aguarda nova subscription
                        console.warn(`[WATCHDOG] ${name}: track morreu, aguardando nova subscription`)
                        stuckFrameCountRef.current = 0
                        return
                    }

                    console.warn(`[WATCHDOG] ${name}: vídeo travado. Recuperando...`)
                    stuckFrameCountRef.current = 0

                    const currentSrc = videoEl.srcObject
                    videoEl.srcObject = null
                    setTimeout(() => {
                        if (videoEl && currentSrc) {
                            videoEl.srcObject = currentSrc
                            videoEl.play().catch(() => {})
                        }
                    }, 150)
                }
            } else if (readyState < 2 && !paused) {
                // Buffering legítimo — desconta ao invés de acumular
                stuckFrameCountRef.current = Math.max(0, stuckFrameCountRef.current - 1)
            }
        }, 100)

        return () => clearInterval(watchdog)
    }, [stream, hasVideoTrack, cameraOff, name])

    return (
        <div className={cn("relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden group/video", isSpeaking && "ring-4 ring-[#06b6d4]")}>
            <audio ref={audioRef} autoPlay playsInline />
            {(!stream || !hasVideoTrack || cameraOff) ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800"><User className="h-12 w-12 text-zinc-600" /></div>
            ) : (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
            )}
            
            {/* Controle de Volume Individual (Hover) */}
            {!isPresentation && onIndividualVolumeChange && (
                <div className="absolute top-4 right-4 z-50 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
                    <div className="bg-black/60 backdrop-blur-xl p-2 rounded-2xl flex items-center gap-3 border border-white/10 shadow-2xl">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onIndividualVolumeChange(individualVolume === 0 ? 1 : 0);
                            }}
                            className="text-white hover:text-cyan-400 transition-colors"
                        >
                            {individualVolume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                        <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={individualVolume}
                            onChange={(e) => {
                                e.stopPropagation();
                                onIndividualVolumeChange(parseFloat(e.target.value));
                            }}
                            className="w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white shadow-sm"
                        />
                    </div>
                </div>
            )}

            <style jsx>{` .mirror { transform: scaleX(-1); } `}</style>
        </div>
    )
})

export const LocalVideo = memo(function LocalVideo({
    stream, name, cameraOff, isSpeaking
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl) return

        if (stream && !cameraOff) {
            if (videoEl.srcObject !== stream) {
                videoEl.srcObject = stream
            }
        } else {
            videoEl.srcObject = null
        }
    }, [stream, cameraOff])

    return (
        <div className={cn("relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden", isSpeaking && "ring-4 ring-[#06b6d4]")}>
            {(cameraOff || !stream) ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800"><User className="h-12 w-12 text-zinc-600" /></div>
            ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
            )}
            <style jsx>{` .mirror { transform: scaleX(-1); } `}</style>
        </div>
    )
})
