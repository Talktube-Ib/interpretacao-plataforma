'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWebRTC } from '@/hooks/use-webrtc'
import { VideoGrid } from '@/components/room/video-grid'
import { Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RoomPage() {
    const params = useParams()
    const roomId = params.id as string
    const [token, setToken] = useState<string | null>(null)
    const [liveKitUrl, setLiveKitUrl] = useState<string | null>(null)
    const [isJoined, setIsJoined] = useState(false)

    // FIX BUG 5: role real retornado pelo servidor
    const [currentRole, setCurrentRole] = useState<string>('participant')

    // FIX BUG 2: username estável — não recria a cada render
    const [stableUsername] = useState(
        () => `user_${Math.random().toString(36).substring(7)}`
    )

    useEffect(() => {
        async function fetchData() {
            // FIX: sem ?role= na URL — servidor resolve pelo banco (V2)
            const res = await fetch(`/api/livekit/token?room=${roomId}&username=${stableUsername}`)
            const data = await res.json()

            if (data.error) {
                console.error('[Room] Erro ao buscar token:', data.error)
                return
            }

            setToken(data.token)
            setLiveKitUrl(data.url)
            // FIX BUG 5: role resolvido no banco
            setCurrentRole(data.role || 'participant')
            setIsJoined(true)
        }
        fetchData()
    }, [roomId, stableUsername])

    const {
        peers,
        roomLocalStream,
        mediaStatus,
        isMicOn,
        isCameraOn,
        toggleMic,
        toggleCamera
    } = useWebRTC(
        roomId,
        stableUsername, // ID estável
        currentRole,
        { micOn: true, cameraOn: true },
        isJoined,
        'Convidado',
        token || undefined,
        liveKitUrl || undefined
    )

    if (!isJoined || !token) {
        return <div className="h-screen bg-black flex items-center justify-center text-white">Carregando...</div>
    }

    return (
        <div className="h-screen w-screen bg-zinc-950 flex flex-col text-white overflow-hidden">
            <main className="flex-1 p-4 relative">
                <VideoGrid
                    peers={peers}
                    localStream={roomLocalStream}
                    micOn={isMicOn}
                    cameraOn={isCameraOn}
                    localUserName="Você"
                    currentRole={currentRole}
                />
            </main>
            <footer className="h-24 bg-black/60 flex items-center justify-center gap-4">
                <Button onClick={() => toggleMic(!isMicOn)} className={isMicOn ? "" : "bg-red-500"}>
                    {isMicOn ? <Mic /> : <MicOff />}
                </Button>
                <Button onClick={() => toggleCamera(!isCameraOn)} className={isCameraOn ? "" : "bg-red-500"}>
                    {isCameraOn ? <Video /> : <VideoOff />}
                </Button>
            </footer>
        </div>
    )
}
