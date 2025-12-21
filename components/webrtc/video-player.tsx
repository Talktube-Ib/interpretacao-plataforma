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

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume
        }
    }, [volume])

    useEffect(() => {
        if (!videoRef.current || !stream) return

        // Force reset source
        videoRef.current.srcObject = null

        // Small timeout to ensure DOM is ready and browser processed cleanup
        const timer = setTimeout(async () => {
            if (!videoRef.current) return

            console.log(`[RemoteVideo] Attaching stream ${stream.id} to video element`)
            videoRef.current.srcObject = stream

            // Critical for iOS/Mobile: playsInline is already on prop, but we must call play()
            try {
                await videoRef.current.play()
                console.log(`[RemoteVideo] Playback started for ${stream.id}`)
            } catch (e) {
                console.error(`[RemoteVideo] Play failed for ${stream.id}:`, e)
                // Retry muted if failed (browsers block unmuted autoplay)
                if (videoRef.current) {
                    videoRef.current.muted = true
                    try {
                        await videoRef.current.play()
                        console.log(`[RemoteVideo] Muted playback started for ${stream.id}`)
                    } catch (e2) {
                        console.error(`[RemoteVideo] Muted play also failed for ${stream.id}:`, e2)
                    }
                }
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [stream])

    return (
        <div className={cn(
            "bg-pink-500/20 rounded-[2.5rem] overflow-hidden relative border-4 transition-all duration-500 group w-full h-full shadow-2xl",
            isSpeaking
                ? role === 'interpreter'
                    ? "border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)] scale-[1.02] z-10"
                    : "border-[#06b6d4] shadow-[0_0_40px_rgba(6,182,212,0.4)] scale-[1.02] z-10"
                : "border-border/30"
        )}>
            {stream ? (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={false} // Ensure it's not muted by default unless necessary, but handle carefully
                        onPlay={() => console.log(`[RemoteVideo] Playing stream ${stream.id}`)}
                        onError={(e) => console.error(`[RemoteVideo] Error playing stream ${stream.id}:`, e)}
                        className="w-full h-full object-cover rounded-[2.3rem]"
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

                    {/* Bottom Info Bar */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                            <div className="bg-white/10 p-1 rounded-md">
                                <User className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-xs font-bold text-white tracking-tight">
                                {name}
                            </span>
                        </div>
                    </div>

                    <div className="hidden">
                        <AudioMeter stream={stream} onSpeakingChange={(s) => {
                            setIsSpeaking(s)
                            onSpeakingChange?.(s)
                        }} />
                    </div>

                    {/* Debug Overlay */}
                    <div className="absolute top-2 left-2 z-50 bg-black/50 text-[10px] text-green-400 font-mono p-1 rounded pointer-events-auto">
                        <button
                            className="bg-red-500 text-white px-2 py-1 rounded mb-1 hover:bg-red-600"
                            onClick={() => {
                                if (videoRef.current) {
                                    videoRef.current.muted = false;
                                    videoRef.current.play()
                                        .then(() => alert("Started!"))
                                        .catch(e => alert("Err: " + e));
                                }
                            }}
                        >
                            FORCE PLAY
                        </button><br />
                        D: {stream.id.slice(0, 4)}<br />
                        A: {stream.getAudioTracks().length} | {stream.getAudioTracks()[0]?.enabled ? 'E' : 'D'} | {stream.getAudioTracks()[0]?.readyState}<br />
                        V: {stream.getVideoTracks().length} | {stream.getVideoTracks()[0]?.enabled ? 'E' : 'D'} | {stream.getVideoTracks()[0]?.readyState}<br />
                        S: {connectionState}<br />
                        Vol: {volume}<br />
                        Size: {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight}
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent/20">
                    <div className="relative">
                        <div className={cn(
                            "absolute inset-0 rounded-full blur-3xl animate-pulse",
                            connectionState === 'failed' ? "bg-red-500/20" : "bg-[#06b6d4]/20"
                        )} />
                        <div className="relative bg-card/50 backdrop-blur-xl border border-border p-8 rounded-full shadow-inner ring-1 ring-white/5">
                            {connectionState === 'failed' ? (
                                <VideoOff className="h-12 w-12 text-red-500 opacity-80" />
                            ) : cameraOff ? (
                                <VideoOff className="h-12 w-12 text-muted-foreground opacity-50" />
                            ) : (
                                <Globe className="h-12 w-12 text-[#06b6d4] animate-spin-slow" />
                            )}
                        </div>
                    </div>
                    <div className="mt-6 text-center">
                        <p className={cn(
                            "text-[10px] font-black uppercase tracking-[0.3em] animate-pulse",
                            connectionState === 'failed' ? "text-red-500" : "text-muted-foreground"
                        )}>
                            {connectionState === 'failed' ? "Falha na Conexão" :
                                connectionState === 'connecting' ? "Conectando..." :
                                    cameraOff ? "Câmera Desligada" : "Sinal de Entrada"}
                        </p>
                        <p className="text-sm font-bold text-foreground/50 mt-1 italic">
                            {connectionState === 'failed' ? "Verifique firewall/rede" :
                                cameraOff ? name : `Aguardando ${name}...`}
                        </p>
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
