"use client"

import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, Video, VideoOff, MicOff, Settings2, User, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AudioMeter } from './audio-meter'

interface PreCallLobbyProps {
    onJoin: (config: { micOn: boolean, cameraOn: boolean, audioDeviceId: string, videoDeviceId: string, name: string }) => void
    userName: string
    isGuest: boolean
}

export function PreCallLobby({ onJoin, userName: initialName, isGuest }: PreCallLobbyProps) {
    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedAudio, setSelectedAudio] = useState('')
    const [selectedVideo, setSelectedVideo] = useState('')
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [chosenName, setChosenName] = useState(initialName)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const init = async () => {
            try {
                const initialStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                setStream(initialStream)

                const devices = await navigator.mediaDevices.enumerateDevices()
                const audio = devices.filter(d => d.kind === 'audioinput')
                const video = devices.filter(d => d.kind === 'videoinput')

                setAudioDevices(audio)
                setVideoDevices(video)

                if (audio.length > 0) setSelectedAudio(audio[0].deviceId)
                if (video.length > 0) setSelectedVideo(video[0].deviceId)

                // Clean up initial stream
                initialStream.getTracks().forEach(t => t.stop())
            } catch (err) {
                console.error("Lobby init failed:", err)
            }
        }
        init()
    }, [])

    useEffect(() => {
        const updateStream = async () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop())
            }

            if (!cameraOn && !micOn) {
                setStream(null)
                return
            }

            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    audio: micOn ? { deviceId: selectedAudio ? { exact: selectedAudio } : undefined } : false,
                    video: cameraOn ? { deviceId: selectedVideo ? { exact: selectedVideo } : undefined } : false
                })
                setStream(newStream)
            } catch (err) {
                console.error("Failed to get preview stream:", err)
            }
        }
        updateStream()
    }, [micOn, cameraOn, selectedAudio, selectedVideo])

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

                {/* Visualização da Câmera */}
                <div className="space-y-4">
                    <div className="relative aspect-video bg-card rounded-[2.5rem] overflow-hidden border-4 border-border/30 shadow-2xl">
                        {cameraOn && stream?.getVideoTracks().length ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover -scale-x-100"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent/10">
                                <div className="bg-card/50 backdrop-blur-xl border border-border p-8 rounded-[2.5rem] shadow-xl">
                                    <VideoOff className="h-10 w-10 text-muted-foreground opacity-30 mb-4 mx-auto" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Câmera Desligada</p>
                                </div>
                            </div>
                        )}

                        {/* Controles Flutuantes rápidos */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                            <Button
                                variant={micOn ? "secondary" : "destructive"}
                                size="icon"
                                className="rounded-full h-12 w-12 shadow-xl backdrop-blur-md"
                                onClick={() => setMicOn(!micOn)}
                            >
                                {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                            </Button>
                            <Button
                                variant={cameraOn ? "secondary" : "destructive"}
                                size="icon"
                                className="rounded-full h-12 w-12 shadow-xl backdrop-blur-md"
                                onClick={() => setCameraOn(!cameraOn)}
                            >
                                {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-heading tracking-tight">Pronto para entrar?</h2>
                        <p className="text-muted-foreground">Verifique seu áudio e vídeo antes de começar.</p>
                    </div>
                </div>

                {/* Configurações e Botão de Entrar */}
                <Card className="p-8 space-y-8 bg-card/40 backdrop-blur-xl border-border/50 rounded-[2.5rem] shadow-2xl">
                    <div className="space-y-6">
                        {isGuest && (
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Seu Nome</Label>
                                <input
                                    type="text"
                                    value={chosenName}
                                    onChange={(e) => setChosenName(e.target.value)}
                                    placeholder="Como quer ser chamado?"
                                    className="w-full h-12 rounded-2xl bg-background/50 border border-border/50 px-4 focus:outline-none focus:ring-2 focus:ring-[#06b6d4]/50 font-bold"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Microfone</Label>
                            <Select value={selectedAudio} onValueChange={setSelectedAudio}>
                                <SelectTrigger className="rounded-2xl h-12 bg-background/50 border-border/50 shadow-none">
                                    <SelectValue placeholder="Selecione o Microfone" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/50 bg-card/90 backdrop-blur-xl">
                                    {audioDevices.map((d) => (
                                        <SelectItem key={d.deviceId} value={d.deviceId} className="rounded-xl">
                                            {d.label || `Microfone ${d.deviceId.slice(0, 5)}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest opacity-50 ml-1">Câmera</Label>
                            <Select value={selectedVideo} onValueChange={setSelectedVideo}>
                                <SelectTrigger className="rounded-2xl h-12 bg-background/50 border-border/50 shadow-none">
                                    <SelectValue placeholder="Selecione a Câmera" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/50 bg-card/90 backdrop-blur-xl">
                                    {videoDevices.map((d) => (
                                        <SelectItem key={d.deviceId} value={d.deviceId} className="rounded-xl">
                                            {d.label || `Câmera ${d.deviceId.slice(0, 5)}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-4 space-y-4">
                        <Button
                            className="w-full h-16 rounded-2xl text-lg font-bold shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse hover:animate-none"
                            onClick={() => {
                                if (stream) stream.getTracks().forEach(t => t.stop())
                                onJoin({ micOn, cameraOn, audioDeviceId: selectedAudio, videoDeviceId: selectedVideo, name: chosenName })
                            }}
                        >
                            Entrar na Reunião
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground uppercase font-black tracking-[0.2em] opacity-50">
                            Entrando como {chosenName}
                        </p>
                    </div>
                </Card>

            </div>
        </div>
    )
}
