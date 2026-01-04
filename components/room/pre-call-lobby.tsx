'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mic, MicOff, Video, VideoOff, Settings, Sparkles, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreCallLobbyProps {
    userName: string
    isGuest: boolean
    onJoin: (config: {
        micOn: boolean
        cameraOn: boolean
        name: string
        audioDeviceId: string
        videoDeviceId: string
    }) => void
}

export function PreCallLobby({ userName, isGuest, onJoin }: PreCallLobbyProps) {
    const [name, setName] = useState(userName || '')
    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        let localStream: MediaStream | null = null

        async function initMedia() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                })
                setStream(localStream)
                if (videoRef.current) {
                    videoRef.current.srcObject = localStream
                }
            } catch (err) {
                console.error("Failed to get media access", err)
                setCameraOn(false)
                setMicOn(false)
            }
        }

        initMedia()

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    useEffect(() => {
        if (stream) {
            stream.getAudioTracks().forEach(track => track.enabled = micOn)
            stream.getVideoTracks().forEach(track => track.enabled = cameraOn)
        }
    }, [micOn, cameraOn, stream])

    const handleJoin = () => {
        if (!name.trim()) return
        onJoin({
            micOn,
            cameraOn,
            name,
            audioDeviceId: 'default',
            videoDeviceId: 'default'
        })
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#020817] relative overflow-hidden p-6">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 z-10">
                {/* Left Column: Preview */}
                <div className="flex flex-col gap-6 animate-in slide-in-from-left-8 duration-700">
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
                        {stream && cameraOn ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-slate-900/50">
                                <div className="p-4 rounded-full bg-slate-800/50">
                                    <VideoOff className="h-12 w-12 opacity-50" />
                                </div>
                                <p>Camera is off</p>
                            </div>
                        )}

                        {/* Overlay Controls */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
                            <Button
                                variant={micOn ? "default" : "destructive"}
                                size="icon"
                                className={cn("h-12 w-12 rounded-xl transition-all", micOn ? "bg-white text-black hover:bg-white/90" : "")}
                                onClick={() => setMicOn(!micOn)}
                            >
                                {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                            </Button>
                            <Button
                                variant={cameraOn ? "default" : "destructive"}
                                size="icon"
                                className={cn("h-12 w-12 rounded-xl transition-all", cameraOn ? "bg-white text-black hover:bg-white/90" : "")}
                                onClick={() => setCameraOn(!cameraOn)}
                            >
                                {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                            </Button>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-6 left-6 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-xs font-bold text-white border border-white/10 flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", stream ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                            {stream ? "Ready to Join" : "Checking devices..."}
                        </div>
                    </div>
                </div>

                {/* Right Column: Controls */}
                <div className="flex flex-col justify-center gap-8 animate-in slide-in-from-right-8 duration-700 delay-100">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-4">
                            Tudo pronto?
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Configure seu áudio e vídeo antes de entrar na reunião.
                        </p>
                    </div>

                    <div className="space-y-6 bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Seu Nome</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-12 h-14 bg-slate-950/50 border-slate-800 text-lg focus:ring-purple-500/50 rounded-xl"
                                    placeholder="Como quer ser chamado?"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleJoin}
                            disabled={!name.trim()}
                            className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.4)]"
                        >
                            Entrar na Sala <Sparkles className="ml-2 h-5 w-5" />
                        </Button>

                        {!isGuest && (
                            <div className="text-center">
                                <p className="text-xs text-slate-500">
                                    Conectado como <span className="text-slate-300 font-medium">{userName}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
