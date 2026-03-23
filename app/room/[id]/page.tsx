'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWebRTC } from '@/hooks/use-webrtc'
import { VideoGrid } from '@/components/room/video-grid'
import { Mic, MicOff, Video, VideoOff, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

    // Estados de layout para o VideoGrid
    const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery')
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
    const [pinnedSpeakerId, setPinnedSpeakerId] = useState<string | null>(null)
    const [selectedLang, setSelectedLang] = useState('original')

    const {
        peers,
        roomLocalStream,
        isMicOn,
        isCameraOn,
        toggleMic,
        toggleCamera
    } = useWebRTC(
        roomId,
        stableUsername, 
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
        <div className="h-screen w-screen bg-zinc-950 flex flex-col text-white overflow-hidden relative font-sans">
            {/* Logo da Empresa */}
            <div className="absolute top-6 left-6 z-[100] pointer-events-none">
                <img src="/logo-official.svg" alt="Logo" className="h-8 md:h-10 w-auto opacity-90 drop-shadow-2xl" />
            </div>

            <main className="flex-1 min-h-0 w-full relative overflow-hidden">
                <VideoGrid
                    peers={peers}
                    localStream={roomLocalStream}
                    micOn={isMicOn}
                    cameraOn={isCameraOn}
                    localUserName="Você"
                    currentRole={currentRole}
                    mode={viewMode}
                    activeSpeakerId={activeSpeakerId}
                    pinnedSpeakerId={pinnedSpeakerId}
                    onSpeakerChange={setPinnedSpeakerId}
                    onPeerSpeaking={(id, isSpeaking) => isSpeaking && setActiveSpeakerId(id)}
                    selectedLang={selectedLang}
                    handRaised={false} // Default para layout
                />
            </main>
            <footer className="h-20 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-6 z-50">
                <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => toggleMic(!isMicOn)} 
                    className={cn(
                        "h-12 w-12 rounded-full transition-all duration-300",
                        isMicOn ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-500"
                    )}
                >
                    {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode(prev => prev === 'gallery' ? 'speaker' : 'gallery')}
                    className="h-12 w-12 rounded-full bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                >
                    <Maximize2 className="h-5 w-5" />
                </Button>
                <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => toggleCamera(!isCameraOn)} 
                    className={cn(
                        "h-12 w-12 rounded-full transition-all duration-300",
                        isCameraOn ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-500"
                    )}
                >
                    {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
            </footer>
        </div>
    )
}
