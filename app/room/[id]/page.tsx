'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { useWebRTC } from '@/hooks/use-webrtc'
import { VideoGrid } from '@/components/room/video-grid'
import { Mic, MicOff, Video, VideoOff, Maximize2, Share2, Settings, Copy, Check, X, Volume2, Video as VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { createClient } from '@/lib/supabase/client'

export default function RoomPage() {
    const params = useParams()
    const roomId = params.id as string
    const [token, setToken] = useState<string | null>(null)
    const [liveKitUrl, setLiveKitUrl] = useState<string | null>(null)
    const [isJoined, setIsJoined] = useState(false)
    const [currentRole, setCurrentRole] = useState<string>('participant')
    const [stableUsername] = useState(() => `user_${Math.random().toString(36).substring(7)}`)
    const [realUserName, setRealUserName] = useState<string>('Convidado')

    const supabase = createClient()

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const name = user.user_metadata?.full_name || user.email || 'Convidado'
                setRealUserName(name)
            }
        }
        getUser()
    }, [])

    // Estados de UI e Layout
    const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery')
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
    const [pinnedSpeakerId, setPinnedSpeakerId] = useState<string | null>(null)
    const [selectedLang, setSelectedLang] = useState('original')
    const [showSettings, setShowSettings] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)
    
    // Controle de volume local (Peer -> Volume)
    const [localPeerVolumes, setLocalPeerVolumes] = useState<Record<string, number>>({})
    const [localMutedPeers, setLocalMutedPeers] = useState<Set<string>>(new Set())

    // Listas de dispositivos
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])

    const {
        peers,
        roomLocalStream,
        isMicOn,
        isCameraOn,
        toggleMic,
        toggleCamera,
        switchDevice
    } = useWebRTC(
        roomId,
        stableUsername, 
        currentRole,
        { micOn: true, cameraOn: true },
        isJoined,
        realUserName, 
        token || undefined,
        liveKitUrl || undefined
    )

    useEffect(() => {
        async function fetchData() {
            const res = await fetch(`/api/livekit/token?room=${roomId}&username=${stableUsername}`)
            const data = await res.json()
            if (data.error) return
            setToken(data.token)
            setLiveKitUrl(data.url)
            setCurrentRole(data.role || 'participant')
            setIsJoined(true)
        }
        fetchData()
    }, [roomId, stableUsername])

    // Carregar dispositivos de mídia
    useEffect(() => {
        if (!isJoined) return
        async function loadDevices() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
                setVideoDevices(devices.filter(d => d.kind === 'videoinput'))
            } catch (err) {
                console.error('Erro ao listar dispositivos:', err)
            }
        }
        loadDevices()
        navigator.mediaDevices.ondevicechange = loadDevices
        return () => { navigator.mediaDevices.ondevicechange = null }
    }, [isJoined])

    const copyMeetingLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
        } catch (err) {
            console.error('Falha ao copiar:', err)
        }
    }

    const handleLocalVolumeChange = (peerId: string, volume: number) => {
        setLocalPeerVolumes(prev => ({ ...prev, [peerId]: volume }))
    }

    const handleMutePeer = (peerId: string) => {
        setLocalMutedPeers(prev => {
            const next = new Set(prev)
            if (next.has(peerId)) next.delete(peerId)
            else next.add(peerId)
            return next
        })
    }

    if (!isJoined || !token) {
        return <div className="h-screen bg-black flex items-center justify-center text-white">Carregando...</div>
    }

    return (
        <div className="h-screen w-screen bg-zinc-950 flex flex-col text-white overflow-hidden relative font-sans">
            {/* Logo da Empresa */}
            <div className="absolute top-6 left-6 z-[40] pointer-events-none">
                <img src="/logo-official.svg" alt="Logo" className="h-8 md:h-10 w-auto opacity-90 drop-shadow-2xl" />
            </div>

            <main className="flex-1 min-h-0 w-full relative overflow-hidden">
                <VideoGrid
                    peers={peers}
                    localStream={roomLocalStream}
                    micOn={isMicOn}
                    cameraOn={isCameraOn}
                    localUserName={realUserName}
                    currentRole={currentRole}
                    mode={viewMode}
                    activeSpeakerId={activeSpeakerId}
                    pinnedSpeakerId={pinnedSpeakerId}
                    onSpeakerChange={setPinnedSpeakerId}
                    onPeerSpeaking={(id, isSpeaking) => isSpeaking && setActiveSpeakerId(id)}
                    selectedLang={selectedLang}
                    handRaised={false}
                    localPeerVolumes={localPeerVolumes}
                    onLocalVolumeChange={handleLocalVolumeChange}
                    localMutedPeers={localMutedPeers}
                    onMutePeer={handleMutePeer}
                />
            </main>

            {/* Modal de Configurações */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-800/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-cyan-400" />
                                    Configurações
                                </h3>
                                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* Microfones */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                        <Volume2 className="h-4 w-4" /> Microfone
                                    </label>
                                    <div className="space-y-2">
                                        {audioDevices.map(device => (
                                            <button 
                                                key={device.deviceId}
                                                onClick={() => switchDevice('audio', device.deviceId)}
                                                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-sm flex items-center justify-between"
                                            >
                                                <span className="truncate pr-4">{device.label || `Microfone ${device.deviceId.slice(0, 5)}`}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Câmeras */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                        <VideoIcon className="h-4 w-4" /> Câmera
                                    </label>
                                    <div className="space-y-2">
                                        {videoDevices.map(device => (
                                            <button 
                                                key={device.deviceId}
                                                onClick={() => switchDevice('video', device.deviceId)}
                                                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-sm"
                                            >
                                                <span className="truncate">{device.label || `Câmera ${device.deviceId.slice(0, 5)}`}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-zinc-800/30 border-t border-white/5 text-center">
                                <button 
                                    onClick={() => setShowSettings(false)}
                                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
                                >
                                    Concluído
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="h-24 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-4 md:gap-8 z-50 px-4">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleMic(!isMicOn)} 
                        className={cn(
                            "h-14 w-14 rounded-full transition-all duration-300",
                            isMicOn ? "bg-white/5 border border-white/10 hover:bg-white/10" : "bg-red-500 text-white hover:bg-red-600"
                        )}
                    >
                        {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                    </Button>
                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleCamera(!isCameraOn)} 
                        className={cn(
                            "h-14 w-14 rounded-full transition-all duration-300",
                            isCameraOn ? "bg-white/5 border border-white/10 hover:bg-white/10" : "bg-red-500 text-white hover:bg-red-600"
                        )}
                    >
                        {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                    </Button>
                </div>

                <div className="h-8 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(prev => prev === 'gallery' ? 'speaker' : 'gallery')}
                        className="h-14 w-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
                        title="Alternar Visualização"
                    >
                        <Maximize2 className="h-6 w-6" />
                    </Button>

                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={copyMeetingLink}
                        className={cn(
                            "h-14 w-14 rounded-full border transition-all duration-300",
                            copySuccess ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white"
                        )}
                        title="Copiar Link da Reunião"
                    >
                        {copySuccess ? <Check className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
                    </Button>

                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSettings(true)}
                        className="h-14 w-14 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-zinc-400 hover:text-white"
                        title="Configurações de Dispositivos"
                    >
                        <Settings className="h-6 w-6" />
                    </Button>
                </div>

                {/* Toast flutuante de cópia */}
                <AnimatePresence>
                    {copySuccess && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute bottom-28 bg-green-500 text-black px-4 py-2 rounded-full font-bold shadow-xl flex items-center gap-2"
                        >
                            <Copy className="h-4 w-4" />
                            Link copiado!
                        </motion.div>
                    )}
                </AnimatePresence>
            </footer>
        </div>
    )
}
