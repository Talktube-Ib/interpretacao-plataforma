"use client"

import React, { useEffect, useRef, useState } from "react"
import { VideoOff, Globe, MicOff, Hand, User, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

console.log("[VideoPlayer] LOADED - v4.2 - SYNC-FIX")

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
    const [tracksCount, setTracksCount] = useState(0)

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume
        }
    }, [volume])

    useEffect(() => {
        const videoEl = videoRef.current
        if (!videoEl || !stream) {
            setTracksCount(0)
            setIsVideoReady(false)
            return
        }

        setTracksCount(stream.getTracks().length)
        console.log(`[RemoteVideo] Stream ${stream.id} (${stream.getTracks().length} trks)`)

        videoEl.srcObject = stream

        const attemptPlay = async () => {
            try {
                await videoEl.play()
                setIsVideoReady(true)
            } catch (error) {
                videoEl.muted = true
                try {
                    await videoEl.play()
                    setIsVideoReady(true)
                } catch (e2) { }
            }
        }

        if (videoEl.readyState >= 1) {
            attemptPlay()
        } else {
            videoEl.onloadedmetadata = attemptPlay
        }

        return () => {
            videoEl.srcObject = null
        }
    }, [stream])

    // DEBUG UI
    const debugBorder = isVideoReady ? 'border-green-500' : (stream ? 'border-blue-500' : 'border-red-500')

    return (
        <div className={cn(
            "rounded-[2rem] overflow-hidden relative border-[12px] bg-zinc-950 w-full h-full transition-all shadow-2xl",
            debugBorder
        )}>
            {stream ? (
                <>
                    <video ref={videoRef} playsInline autoPlay className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 top-0 bg-black/70 p-1 text-[10px] text-white flex justify-between z-[99]">
                        <span>REMOTE: {name.slice(0, 8)}</span>
                        <span>TRKS: {tracksCount}</span>
                        <span>{isVideoReady ? "PLAYING" : "WAITING"}</span>
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                    <VideoOff className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-widest">{connectionState}</p>
                    <p className="text-[10px] opacity-40">WAITING FOR MEDIA SIGNAL...</p>
                </div>
            )}

            <div className="absolute bottom-4 left-4 z-[99]">
                <span className="bg-black/60 px-2 py-1 rounded-lg text-xs font-bold text-white border border-white/10 italic">
                    DEBUG-V4.2
                </span>
            </div>

            <div className="hidden">
                <AudioMeter stream={stream} onSpeakingChange={setIsSpeaking} />
            </div>
        </div>
    )
}

export function LocalVideo({ stream, name = "Você", role = "participant", micOff, cameraOff }: VideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isVideoReady, setIsVideoReady] = useState(false)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
            videoRef.current.play().then(() => setIsVideoReady(true)).catch(() => { })
        }
    }, [stream])

    // Local is always green if it has a stream
    const debugBorder = stream ? 'border-cyan-500' : 'border-orange-500'

    return (
        <div className={cn(
            "rounded-[2rem] overflow-hidden relative border-[12px] bg-zinc-950 w-full h-full transition-all shadow-2xl",
            debugBorder
        )}>
            {stream ? (
                <>
                    <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover transform -scale-x-100" />
                    <div className="absolute inset-x-0 top-0 bg-black/70 p-1 text-[10px] text-white flex justify-between z-[99]">
                        <span>LOCAL: {name}</span>
                        <span>TRKS: {stream.getTracks().length}</span>
                        <span>{isVideoReady ? "PLAYING" : "WAITING"}</span>
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                    <VideoOff className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-[10px] opacity-40">LOCAL CAMERA DISCONNECTED</p>
                </div>
            )}

            <div className="absolute bottom-4 left-4 z-[99]">
                <span className="bg-black/60 px-2 py-1 rounded-lg text-xs font-bold text-white border border-white/10 italic">
                    LOCAL-DEBUG-V4.2
                </span>
            </div>

            <div className="hidden">
                <AudioMeter stream={stream} onSpeakingChange={setIsSpeaking} />
            </div>
        </div>
    )
}
