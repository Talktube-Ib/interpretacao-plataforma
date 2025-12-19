
'use client'

import { useState, use, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Globe, Users, MessageSquare, Monitor, X, ChevronUp, Settings, Share2
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'

// Imports updated
import { useWebRTC } from '@/hooks/use-webrtc'
import { useChat } from '@/hooks/use-chat'
import { RemoteVideo, LocalVideo } from '@/components/webrtc/video-player'
import { ChatPanel } from '@/components/room/chat-panel'
import { ParticipantList } from '@/components/room/participant-list'
import { InterpreterControls } from '@/components/room/interpreter-controls'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { ShareMeetingDialog } from '@/components/share-meeting-dialog'

export default function RoomPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ role?: string }> }) {
    const { id: roomId } = use(params)
    const { role } = use(searchParams)

    // User Identity Logic
    const [userId] = useState(() => 'user-' + Math.random().toString(36).substr(2, 9))

    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)
    const [selectedLang, setSelectedLang] = useState('original')
    const [volumeBalance, setVolumeBalance] = useState(20)
    const [myBroadcastLang, setMyBroadcastLang] = useState('floor') // For interpreters
    const [showLangMenu, setShowLangMenu] = useState(false)
    const [currentRole, setCurrentRole] = useState<'participant' | 'interpreter'>(role === 'interpreter' ? 'interpreter' : 'participant')
    const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | null>(null)
    const [isSharing, setIsSharing] = useState(false)
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
    const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([])

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioInputs(devices.filter(d => d.kind === 'audioinput'))
            setVideoInputs(devices.filter(d => d.kind === 'videoinput'))
        })
    }, [])

    const {
        localStream,
        peers,
        toggleMic: hookToggleMic,
        toggleCamera: hookToggleCamera,
        shareScreen,
        stopScreenShare,
        userCount,
        mediaError,
        channel,
        updateMetadata,
        switchDevice
    } = useWebRTC(roomId, userId, currentRole)

    const { messages, sendMessage, unreadCount, markAsRead, setIsActive: setIsChatActive } = useChat(roomId, userId, currentRole)

    // Update Chat Active State when sidebar changes
    useEffect(() => {
        if (activeSidebar === 'chat') {
            setIsChatActive(true)
            if (unreadCount > 0) markAsRead()
        } else {
            setIsChatActive(false)
        }
    }, [activeSidebar, unreadCount]) // Added unreadCount to dep to ensure we clear it if it increments while open (edge case)

    const handleToggleMic = () => {
        const newState = !micOn
        setMicOn(newState)
        hookToggleMic(newState)
    }

    const handleToggleCamera = () => {
        const newState = !cameraOn
        setCameraOn(newState)
        hookToggleCamera(newState)
    }

    const handleToggleShare = async () => {
        if (isSharing) {
            await stopScreenShare()
            setIsSharing(false)
        } else {
            await shareScreen(() => setIsSharing(false))
            setIsSharing(true)
        }
    }

    const AVAILABLE_LANGUAGES = [
        { code: 'original', name: 'Áudio Original (Piso)', flag: '🏳️' },
        { code: 'pt', name: 'Português', flag: '🇧🇷' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
    ]

    const handleLangChange = (code: string) => {
        setSelectedLang(code)
        setShowLangMenu(false)
        if (code !== 'original') {
            setVolumeBalance(80)
        } else {
            setVolumeBalance(0)
        }
    }

    return (
        <div className="h-screen bg-background flex flex-col relative overflow-hidden text-foreground transition-colors duration-500">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 z-[40] flex justify-between items-center bg-gradient-to-b from-background to-transparent pointer-events-none">
                <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto border border-border flex items-center gap-4 shadow-xl">
                    <div className="scale-75 origin-left -ml-2">
                        <Logo />
                    </div>
                    <div className="h-4 w-px bg-border/50" />
                    <span className="font-semibold text-sm opacity-80">ID: {roomId}</span>

                    <ShareMeetingDialog
                        roomId={roomId}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-white hover:bg-white/10 rounded-full">
                                <Share2 className="h-3 w-3" />
                            </Button>
                        }
                    />

                    <div className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${userCount > 1 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'}`}>
                        <Users className="h-3 w-3" />
                        {userCount} Online
                    </div>
                </div>
                {/* Badge removed */}
            </div>

            {/* Main Layout (Flex Row) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Grid Section */}
                <div className="flex-1 p-4 flex items-center justify-center transition-all duration-300">
                    <motion.div
                        layout
                        className={`grid gap-4 w-full content-center justify-items-center transition-all ${peers.length === 0 ? 'grid-cols-1 max-w-xl' :
                            peers.length === 1 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl' :
                                peers.length <= 4 ? 'grid-cols-2 max-w-5xl' :
                                    'grid-cols-2 md:grid-cols-3 max-w-[1400px]'
                            }`}
                        style={{ maxHeight: 'calc(100vh - 180px)' }}
                    >
                        {/* Self View */}
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="aspect-video w-full relative rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black/40"
                        >
                            <LocalVideo stream={localStream} role={currentRole} name="Você" />
                        </motion.div>

                        {/* Remote Peers */}
                        <AnimatePresence mode="popLayout">
                            {peers.map((peer) => {
                                let vol = 1.0
                                const speakerLang = (peer as any).language || 'floor'

                                if (selectedLang === 'original') {
                                    // Original Mode: Hear Floor @ 100%, Interpreters @ 0%
                                    if (speakerLang === 'floor' || speakerLang === 'original') {
                                        vol = 1.0
                                    } else {
                                        vol = 0.0
                                    }
                                } else {
                                    // Translation Mode (e.g., selected 'pt')
                                    if (speakerLang === selectedLang) {
                                        // The interpreter for my language -> 100%
                                        vol = 1.0
                                    } else if (speakerLang === 'floor' || speakerLang === 'original') {
                                        // The floor speaker -> 20% (Background)
                                        // Invert balance logic: 20 on slider = 20% floor volume
                                        // Slider 0 = 0% Floor (Full Interpreter), 100 = 100% Floor (No Interpreter distinction)
                                        // Let's stick to the previous slider logic: 20 means "Focus on Interpreter", so floor is low.
                                        vol = (100 - volumeBalance) / 100
                                    } else {
                                        // Other interpreters -> 0%
                                        vol = 0.0
                                    }
                                }

                                return (
                                    <motion.div
                                        key={peer.userId}
                                        layout
                                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                                        className="aspect-video"
                                    >
                                        <RemoteVideo
                                            stream={peer.stream}
                                            name={peer.userId}
                                            role={peer.role}
                                            volume={vol}
                                        />
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>

                        {/* Empty placeholder if alone */}
                        {peers.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="aspect-video bg-accent/10 rounded-[2.5rem] border-2 border-dashed border-border flex items-center justify-center"
                            >
                                <div className="text-muted-foreground text-center">
                                    <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                                        <Users className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p className="font-black uppercase tracking-[0.2em] text-xs">Aguardando participantes...</p>
                                    <p className="text-[10px] mt-2 opacity-50 italic">Convide alguém enviando o link desta sala.</p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {/* Sidebars */}
                <AnimatePresence>
                    {activeSidebar === 'chat' && (
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute md:relative inset-0 md:inset-auto z-[60] md:z-30 w-full md:w-auto"
                        >
                            <div className="h-full w-full md:w-80">
                                <ChatPanel
                                    messages={messages}
                                    userId={userId}
                                    onSendMessage={sendMessage}
                                    onClose={() => setActiveSidebar(null)} // Add close prop
                                />
                            </div>
                        </motion.div>
                    )}
                    {activeSidebar === 'participants' && (
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute md:relative inset-0 md:inset-auto z-[60] md:z-30 w-full md:w-auto"
                        >
                            <div className="h-full w-full md:w-80">
                                <ParticipantList
                                    peers={peers}
                                    userRole={currentRole}
                                    userCount={userCount}
                                    onClose={() => setActiveSidebar(null)} // Add close prop
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error Banner */}
            {mediaError && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-8 py-4 rounded-[2rem] z-50 text-center animate-bounce font-black shadow-2xl border-4 border-white/20">
                    ⚠️ ERRO DE CÂMERA: {mediaError}
                </div>
            )}

            {/* Interpreter Floating Controls (Moved to Root) */}
            <InterpreterControls
                role={currentRole}
                currentLanguage={myBroadcastLang}
                onLanguageChange={(lang) => {
                    setMyBroadcastLang(lang)
                    updateMetadata({ language: lang })
                }}
            />

            {/* Language Menu (Moved to Root) */}
            <AnimatePresence>
                {showLangMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 w-80 bg-card/90 backdrop-blur-2xl border border-border rounded-[2.5rem] shadow-3xl p-4 z-[70]"
                    >
                        <div className="text-[10px] font-black text-muted-foreground px-4 py-2 uppercase tracking-[0.3em] mb-2">
                            Canais de Tradução
                        </div>
                        <div className="space-y-1">
                            {AVAILABLE_LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLangChange(lang.code)}
                                    className={cn(
                                        "w-full flex items-center p-4 rounded-2xl transition-all active:scale-[0.98]",
                                        selectedLang === lang.code
                                            ? 'bg-[#06b6d4]/10 text-[#06b6d4] ring-1 ring-[#06b6d4]/30'
                                            : 'hover:bg-accent/50 text-muted-foreground'
                                    )}
                                >
                                    <span className="text-2xl mr-4">{lang.flag}</span>
                                    <span className="font-bold text-sm tracking-tight">{lang.name}</span>
                                    {selectedLang === lang.code && (
                                        <div className="ml-auto w-2 h-2 rounded-full bg-[#06b6d4] shadow-[0_0_10px_#06b6d4]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Control Bar */}
            <div className="h-24 md:h-28 bg-card/60 backdrop-blur-3xl border-t border-border flex items-center justify-start md:justify-center gap-4 md:gap-6 relative z-[50] px-4 md:px-10 overflow-x-auto no-scrollbar pb-safe">
                <div className="flex items-center gap-4 shrink-0 mx-auto">
                    {/* Mic Control */}
                    <div className="flex items-center gap-0.5 bg-background/50 backdrop-blur rounded-2xl p-1 border border-border/50 shadow-sm group hover:border-[#06b6d4]/50 transition-colors">
                        <Button
                            variant={micOn ? "ghost" : "destructive"}
                            size="icon"
                            className={cn(
                                "h-12 w-12 rounded-xl rounded-r-none border-0 transition-all",
                                micOn ? "bg-accent/20 text-foreground hover:bg-accent/40" : "bg-red-500 text-white shadow-red-500/20"
                            )}
                            onClick={handleToggleMic}
                        >
                            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-12 w-6 rounded-xl rounded-l-none border-l border-white/5 hover:bg-accent/40">
                                    <ChevronUp className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="center" className="w-64 mb-4 rounded-2xl bg-black/90 backdrop-blur-3xl border-white/10 p-2 shadow-2xl">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">Microfone</DropdownMenuLabel>
                                {audioInputs.map((device, i) => (
                                    <DropdownMenuItem
                                        key={i}
                                        onClick={() => switchDevice('audio', device.deviceId)}
                                        className="rounded-xl focus:bg-[#06b6d4]/20 focus:text-[#06b6d4] cursor-pointer text-xs font-medium py-2.5"
                                    >
                                        {device.label || `Microphone ${i + 1}`}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Camera Control */}
                    <div className="flex items-center gap-0.5 bg-background/50 backdrop-blur rounded-2xl p-1 border border-border/50 shadow-sm group hover:border-[#06b6d4]/50 transition-colors">
                        <Button
                            variant={cameraOn ? "ghost" : "destructive"}
                            size="icon"
                            className={cn(
                                "h-12 w-12 rounded-xl rounded-r-none border-0 transition-all",
                                cameraOn ? "bg-accent/20 text-foreground hover:bg-accent/40" : "bg-red-500 text-white shadow-red-500/20"
                            )}
                            onClick={handleToggleCamera}
                        >
                            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-12 w-6 rounded-xl rounded-l-none border-l border-white/5 hover:bg-accent/40">
                                    <ChevronUp className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="center" className="w-64 mb-4 rounded-2xl bg-black/90 backdrop-blur-3xl border-white/10 p-2 shadow-2xl">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">Câmera</DropdownMenuLabel>
                                {videoInputs.map((device, i) => (
                                    <DropdownMenuItem
                                        key={i}
                                        onClick={() => switchDevice('video', device.deviceId)}
                                        className="rounded-xl focus:bg-[#06b6d4]/20 focus:text-[#06b6d4] cursor-pointer text-xs font-medium py-2.5"
                                    >
                                        {device.label || `Camera ${i + 1}`}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Button
                        variant={isSharing ? "default" : "secondary"}
                        size="icon"
                        className={cn(
                            "h-14 w-14 rounded-2xl shadow-xl transition-all active:scale-95 border-0 hidden md:flex",
                            isSharing ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20 animate-pulse" : "bg-accent/50 text-foreground hover:bg-accent"
                        )}
                        onClick={handleToggleShare}
                        title="Compartilhar Tela"
                    >
                        <Monitor className="h-6 w-6" />
                    </Button>
                </div>

                <div className="w-px h-10 bg-border/50 hidden md:block" />

                <div className="relative">
                    <Button
                        variant={selectedLang === 'original' ? "outline" : "default"}
                        size="lg"
                        className={`h-16 px-8 rounded-2xl border-2 transition-all active:scale-95 ${selectedLang !== 'original'
                            ? 'bg-[#06b6d4] hover:bg-[#0891b2] border-[#06b6d4] text-white shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                            : 'border-border bg-accent/20 text-foreground hover:bg-accent/40'
                            }`}
                        onClick={() => setShowLangMenu(!showLangMenu)}
                    >
                        <Globe className="h-6 w-6 mr-3" />
                        <div className="flex flex-col items-start leading-tight">
                            <span className="opacity-70 uppercase tracking-[0.2em] text-[8px] font-black">Escutando</span>
                            <span className="font-black text-sm">
                                {AVAILABLE_LANGUAGES.find(l => l.code === selectedLang)?.name || 'Original'}
                            </span>
                        </div>
                    </Button>

                </div>

                {selectedLang !== 'original' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="fixed bottom-32 right-10 bg-card/80 backdrop-blur-3xl p-8 rounded-[3rem] border border-border w-64 shadow-2xl z-[50]"
                    >
                        <div className="flex justify-between text-[10px] uppercase font-black tracking-[0.2em] text-[#06b6d4] mb-4">
                            <span>Piso</span>
                            <span>Intérprete</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volumeBalance}
                            onChange={(e) => setVolumeBalance(Number(e.target.value))}
                            className="w-full h-2 bg-accent/30 rounded-full appearance-none cursor-pointer accent-[#06b6d4]"
                        />
                        <div className="text-center text-[10px] text-muted-foreground mt-4 font-black tracking-widest uppercase">
                            Mix de Áudio: {100 - volumeBalance}% / {volumeBalance}%
                        </div>
                    </motion.div>
                )}

                <div className="w-px h-10 bg-border/50 hidden md:block" />

                <Button
                    variant={currentRole === 'interpreter' ? 'default' : 'outline'}
                    className={cn(
                        "h-14 px-8 rounded-2xl font-black border-2 transition-all active:scale-95",
                        currentRole === 'interpreter'
                            ? 'bg-purple-600 hover:bg-purple-700 border-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.4)] text-white'
                            : 'border-border bg-accent/20 text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    )}
                    onClick={() => {
                        const newRole = currentRole === 'participant' ? 'interpreter' : 'participant'
                        setCurrentRole(newRole)
                        // Reset language when switching roles
                        if (newRole === 'participant') {
                            setMyBroadcastLang('floor')
                            updateMetadata({ language: 'floor' })
                        }
                    }}
                >
                    <Mic className="h-5 w-5 mr-3" />
                    {currentRole === 'interpreter' ? 'MODE: INTÉRPRETE' : 'VIRAR INTÉRPRETE'}
                </Button>

                <div className="flex bg-accent/20 rounded-2xl p-1.5 border border-border">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-11 w-11 rounded-xl transition-all",
                            activeSidebar === 'participants' ? 'bg-[#06b6d4] text-white shadow-lg' : 'text-muted-foreground hover:bg-accent'
                        )}
                        onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')}
                    >
                        <Users className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-11 w-11 rounded-xl transition-all relative",
                            activeSidebar === 'chat' ? 'bg-[#06b6d4] text-white shadow-lg' : 'text-muted-foreground hover:bg-accent'
                        )}
                        onClick={() => {
                            if (activeSidebar === 'chat') {
                                setActiveSidebar(null)
                            } else {
                                setActiveSidebar('chat')
                                markAsRead()
                            }
                        }}
                    >
                        <MessageSquare className="h-5 w-5" />
                        {unreadCount > 0 && activeSidebar !== 'chat' && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-bold text-white items-center justify-center">
                                    {unreadCount}
                                </span>
                            </span>
                        )}
                    </Button>
                </div>

                <Button asChild variant="destructive" size="lg" className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-red-900/20 active:scale-95 border-0 bg-red-500 hover:bg-red-600">
                    <Link href="/dashboard">
                        <PhoneOff className="h-5 w-5 mr-3" /> Sair
                    </Link>
                </Button>
            </div>
        </div>
    )
}
