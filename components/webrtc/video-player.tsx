"use client"

import React, { useEffect, useRef, useState } from "react"
import { VideoOff, Globe, MicOff, Hand, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoProps {
    stream?: MediaStream | null
    name?: string
    role?: string
    volume?: number
    isLocal?: boolean
    cameraOff?: boolean
    micOff?: boolean
    handRaised?: boolean
    onSpeakingChange?: (isSpeaking: boolean) => void
    connectionState?: 'connecting' | 'connected' | 'failed' | 'disconnected'
}

function AudioMeter({ stream, onSpeakingChange }: { stream?: MediaStream | null, onSpeakingChange?: (isSpeaking: boolean) => void }) {
    const [level, setLevel] = useState(0)

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) {
            setLevel(0)
            onSpeakingChange?.(false)
            return
        }

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioCtx.createAnalyser()
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)

        analyser.fftSize = 32
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        let animationId: number
        let speakingCount = 0

        const update = () => {
            analyser.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i]
            }
            const average = sum / bufferLength
            setLevel(average)

            if (average > 30) {
                speakingCount = Math.min(speakingCount + 1, 10)
            } else {
                speakingCount = Math.max(speakingCount - 1, 0)
            }

            onSpeakingChange?.(speakingCount > 5)

            animationId = requestAnimationFrame(update)
        }
        update()

        return () => {
            cancelAnimationFrame(animationId)
            audioCtx.close()
        }
    }, [stream, onSpeakingChange])

    return (
        <div className="flex items-end gap-[2px] h-4 w-6">
            {[1, 2, 3, 4].map((i) => {
                const height = Math.min(100, (level / 150) * 100 * (i * 0.4 + 0.6))
                return (
                    <div
                        key={i}
                        className={cn(
                            "w-[3px] rounded-full transition-all duration-150",
                            level > 10 ? "bg-[#06b6d4]" : "bg-muted-foreground/30"
                        )}
                        style={{ height: `${Math.max(20, height)}%` }}
                    />
                )
            })}
        </div>
    )
}

export function RemoteVideo({ stream, name = "Participante", role = "participant", volume = 1.0, micOff, cameraOff, handRaised, onSpeakingChange, connectionState = 'connected' }: VideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isVideoReady, setIsVideoReady] = useState(false)

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume
        }
    }, [volume])

    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl || !stream) return

        console.log(`[RemoteVideo] New Stream Assigned: ${stream.id} (Tracks: ${stream.getTracks().length})`)
        videoEl.srcObject = null
        setIsVideoReady(false)

        const timer = setTimeout(async () => {
            if (!videoEl) return
            videoEl.srcObject = stream

            try {
                // FORCE UNMUTED for testing if possible, but keep robust fallback
                await videoEl.play()
                setIsVideoReady(true)
            } catch (error) {
                console.warn(`[RemoteVideo] Autoplay blocked, trying muted...`, error)
                videoEl.muted = true
                try {
                    await videoEl.play()
                    setIsVideoReady(true)
                } catch (e2) {
                    console.error(`[RemoteVideo] Play failed completely`, e2)
                }
            }
        }, 100)

        // Metadata load handler (just in case)
        const handleMetadata = () => {
            if (videoEl.paused) {
                videoEl.play().catch(e => console.log("Metadata play attempt failed", e))
            }
        }
        videoEl.addEventListener('loadedmetadata', handleMetadata)

        return () => {
            clearTimeout(timer)
            videoEl.removeEventListener('loadedmetadata', handleMetadata)
        }
    }, [stream])

    // DEBUG BORDER LOGIC
    // RED = No Stream Prop
    // BLUE = Stream Prop Present (Connection likely OK)
    // GREEN = Video Ready & Playing
    const debugBorderColor = isVideoReady ? 'border-green-500' : (stream ? 'border-blue-500' : 'border-red-500')

    return (
        <div className={cn(
            "bg-zinc-900 rounded-[2.5rem] overflow-hidden relative border-8 transition-all duration-500 w-full h-full shadow-2xl",
            debugBorderColor
        )}>
            {stream ? (
                <>
                    <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        className={cn(
                            "w-full h-full object-cover rounded-[2.3rem]",
                            // DISABLE OPACITY HIDING -> Always show what we have, even if black
                            "opacity-100"
                        )}
                    />

                    {/* VISIBLE DEBUG INFO OVERLAY */}
                    <div className="absolute top-10 left-2 z-[60] bg-black/80 text-white text-[10px] font-mono p-2 rounded pointer-events-none">
                        STRM: {stream.id.slice(0, 5)}<br />
                        TRK: A={stream.getAudioTracks().length} V={stream.getVideoTracks().length}<br />
                        RDY: {isVideoReady ? 'YES' : 'NO'}<br />
                        CONN: {connectionState}
                    </div>

                    {/* Status Icons */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                        {micOff && <div className="bg-red-500 p-1 rounded"><MicOff className="h-4 w-4 text-white" /></div>}
                    </div>

                    <div className="absolute bottom-4 left-4">
                        <span className="text-white bg-black/50 px-2 rounded">{name}</span>
                    </div>

                    <div className="hidden">
                        <AudioMeter stream={stream} onSpeakingChange={setIsSpeaking} />
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                        <VideoOff className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>{connectionState}</p>
                        <p className="text-xs text-zinc-500">No Stream Prop</p>
                    </div>
                </div>
            )}
        </div>
    )
}


export function LocalVideo({ stream, role = "participant", micOff, cameraOff, name = "Você", handRaised, onSpeakingChange }: VideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isSpeaking, setIsSpeaking] = useState(false)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className={cn(
            "bg-card rounded-[2.5rem] overflow-hidden relative border-4 shadow-2xl group w-full h-full transition-all duration-500",
            isSpeaking
                ? role === 'interpreter'
                    ? "border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)] scale-[1.02] z-10"
                    : "border-[#06b6d4] shadow-[0_0_40px_rgba(6,182,212,0.4)] scale-[1.02] z-10"
                : "border-border/30 hover:border-[#06b6d4]/50"
        )}>
            {!cameraOff && stream ? (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100 rounded-[2.3rem]"
                    />

                    {/* Status Icons */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                        {micOff && (
                            <div className="bg-destructive/80 backdrop-blur-md p-1.5 rounded-lg shadow-lg">
                                <MicOff className="h-4 w-4 text-white" />
                            </div>
                        )}
                        {handRaised && (
                            <div className="bg-amber-500 backdrop-blur-md p-1.5 rounded-lg shadow-lg animate-bounce">
                                <Hand className="h-4 w-4 text-white fill-current" />
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                            <span className="text-xs font-bold text-white tracking-tight">{name} (Local)</span>
                        </div>
                    </div>

                    <div className="hidden">
                        <AudioMeter stream={stream} onSpeakingChange={(s) => {
                            setIsSpeaking(s)
                            onSpeakingChange?.(s)
                        }} />
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent/10">
                    <div className="bg-card/50 backdrop-blur-xl border border-border p-8 rounded-[2.5rem] shadow-xl">
                        <VideoOff className="h-10 w-10 text-muted-foreground opacity-30 mb-4 mx-auto" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                            {cameraOff ? "Você desligou a câmera" : "Câmera Desligada"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
