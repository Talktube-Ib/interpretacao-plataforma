import { useEffect, useRef, useState } from "react"
import { Mic, User, Shield, VideoOff, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoProps {
    stream?: MediaStream | null
    name: string
    role: string
    volume?: number
    isLocal?: boolean
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

            // Simple debounce/threshold for speaking
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

export function RemoteVideo({ stream, name, role, volume = 1.0 }: VideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isSpeaking, setIsSpeaking] = useState(false)

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume
        }
    }, [volume])

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
            videoRef.current.muted = false

            videoRef.current.onloadedmetadata = async () => {
                try {
                    await videoRef.current?.play()
                } catch (e) {
                    console.error("Autoplay blocked:", e)
                }
            }
        }
    }, [stream])

    return (
        <div className={cn(
            "bg-card rounded-[2.5rem] overflow-hidden relative border-2 transition-all duration-500 group w-full h-full shadow-2xl",
            isSpeaking ? "border-[#06b6d4] shadow-[0_0_30px_rgba(6,182,212,0.2)]" : "border-border"
        )}>
            {stream ? (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover rounded-[2.3rem]"
                    />

                    {/* Top Identity Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                        <div className="bg-background/40 backdrop-blur-xl border border-border/50 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-sm">
                            <div className={cn(
                                "w-2 h-2 rounded-full animate-pulse",
                                role === 'interpreter' ? "bg-purple-500" : "bg-[#06b6d4]"
                            )} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                                {role === 'interpreter' ? 'Intérprete' : 'Participante'}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Info Bar */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div className="bg-background/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-border flex items-center gap-3">
                            <div className="bg-accent/50 p-1.5 rounded-lg">
                                <User className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                                {name.split('-')[1] || name}
                            </span>
                        </div>

                        <div className="bg-background/60 backdrop-blur-md p-2 rounded-2xl border border-border">
                            <AudioMeter stream={stream} onSpeakingChange={setIsSpeaking} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent/20">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#06b6d4]/20 rounded-full blur-3xl animate-pulse" />
                        <div className="relative bg-card/50 backdrop-blur-xl border border-border p-8 rounded-full shadow-inner ring-1 ring-white/5">
                            <Globe className="h-12 w-12 text-[#06b6d4] animate-spin-slow" />
                        </div>
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Sinal de Entrada</p>
                        <p className="text-sm font-bold text-foreground/50 mt-1 italic">Aguardando {name}...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export function LocalVideo({ stream, role }: VideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isSpeaking, setIsSpeaking] = useState(false)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className={cn(
            "bg-card rounded-[2.5rem] overflow-hidden relative border-2 shadow-2xl group w-full h-full transition-all duration-500 hover:border-[#06b6d4]/50",
            isSpeaking ? "border-[#06b6d4] shadow-[0_0_30px_rgba(6,182,212,0.2)]" : "border-border"
        )}>
            {stream ? (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100 rounded-[2.3rem]"
                    />

                    {/* Top Identity Badge */}
                    <div className="absolute top-4 left-4">
                        <div className="bg-[#06b6d4] px-4 py-1.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-[#06b6d4]/20">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Você (Sinal Local)</span>
                        </div>
                    </div>

                    {/* Bottom Info Bar */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div className="bg-background/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-border flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">Sua Câmera</span>
                        </div>
                        <div className="bg-background/60 backdrop-blur-md p-2 rounded-2xl border border-border">
                            <AudioMeter stream={stream} onSpeakingChange={setIsSpeaking} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent/10">
                    <div className="bg-card/50 backdrop-blur-xl border border-border p-8 rounded-[2.5rem] shadow-xl">
                        <VideoOff className="h-10 w-10 text-muted-foreground opacity-30 mb-4 mx-auto" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Câmera Desligada</p>
                    </div>
                </div>
            )}
        </div>
    )
}

