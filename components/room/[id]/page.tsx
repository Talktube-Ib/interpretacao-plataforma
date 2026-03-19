'use client'

import React, { useState, useEffect, useMemo, useTransition } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useMediaStream } from '@/hooks/use-media-stream'
import { useWebRTC } from '@/hooks/use-webrtc'
import { VideoGrid } from '@/components/room/video-grid'
import { Mic, MicOff, Video, VideoOff, LogOut, Settings, Users, Monitor, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function RoomPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const roomId = params.id as string
    
    // Auth & Identity (Minimalist)
    const [userId] = useState(() => `user_${Math.random().toString(36).substring(2, 7)}`)
    const userName = searchParams.get('name') || 'Convidado'
    const userRole = searchParams.get('role') || 'participant'
    
    const [token, setToken] = useState<string | null>(null)
    const [isJoined, setIsJoined] = useState(false)

    // 1. Fetch Token
    useEffect(() => {
        async function fetchToken() {
            try {
                const params = new URLSearchParams({
                    room: roomId,
                    username: `${userId}_${Math.random().toString(36).substring(2, 5)}`,
                    role: userRole,
                    name: userName
                })
                const res = await fetch(`/api/livekit/token?${params.toString()}`)
                
                if (!res.ok) {
                    const error = await res.text()
                    throw new Error(`Token fetch failed: ${res.status} ${error}`)
                }

                const data = await res.json()
                setToken(data.token)
                setIsJoined(true)
            } catch (err) {
                console.error("Failed to fetch token:", err)
            }
        }
        fetchToken()
    }, [roomId, userId, userName, userRole])

    // 2. Media Devices
    const { 
        stream: localMediaStream, 
        toggleMic: toggleLocalMic, 
        toggleCamera: toggleLocalCam,
        isMicOn,
        isCameraOn
    } = useMediaStream()

    // 3. WebRTC Logic
    const {
        peers,
        roomLocalStream,
        mediaStatus,
        toggleMic: toggleWebRTCMic,
        toggleCamera: toggleWebRTCCam,
        reconnect
    } = useWebRTC(
        roomId,
        userId,
        userRole,
        { micOn: isMicOn, cameraOn: isCameraOn, stream: localMediaStream || undefined },
        isJoined,
        userName,
        token || undefined
    )

    const handleLeave = () => {
        router.push('/')
    }

    if (!isJoined || !token) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                    <p className="text-zinc-400 font-medium animate-pulse">Entrando na sala...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen bg-zinc-950 flex flex-col overflow-hidden text-white font-sans">
            {/* Header minimalista */}
            <header className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20">
                        <Shield className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Sala de Vídeo (Estável)</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">ID: {roomId}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                     <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        mediaStatus === 'connected' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500 animate-pulse"
                    )}>
                        {mediaStatus === 'connected' ? 'Conectado' : 'Sincronizando...'}
                    </div>
                </div>
            </header>

            {/* Grid de Vídeo - Ocupa todo o espaço */}
            <main className="flex-1 min-h-0 relative p-4 flex items-center justify-center">
                <VideoGrid
                    peers={peers}
                    localStream={roomLocalStream}
                    currentRole={userRole}
                    micOn={isMicOn}
                    cameraOn={isCameraOn}
                    mode="gallery"
                    activeSpeakerId={null}
                    pinnedSpeakerId={null}
                    onSpeakerChange={() => {}}
                    onPeerSpeaking={() => {}}
                    localUserName={userName}
                    selectedLang="original"
                    handRaised={false}
                />
            </main>

            {/* Toolbar Inferior */}
            <footer className="h-24 px-8 border-t border-white/5 bg-black/60 backdrop-blur-2xl flex items-center justify-center gap-4 z-50">
                <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-3xl border border-white/5 shadow-2xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleLocalMic(!isMicOn); toggleWebRTCMic(!isMicOn); }}
                        className={cn(
                            "h-12 w-12 rounded-2xl transition-all duration-300",
                            isMicOn ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                        )}
                    >
                        {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleLocalCam(!isCameraOn); toggleWebRTCCam(!isCameraOn); }}
                        className={cn(
                            "h-12 w-12 rounded-2xl transition-all duration-300",
                            isCameraOn ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                        )}
                    >
                        {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </Button>

                    <div className="w-px h-8 bg-white/10 mx-2" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLeave}
                        className="h-12 w-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all duration-300"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </footer>
        </div>
    )
}
