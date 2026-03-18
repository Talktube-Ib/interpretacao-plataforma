
'use client'

import { useState, use, useEffect, useRef, ChangeEvent, useCallback, useMemo, startTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Check,
    Globe, Users, MessageSquare, Monitor, X, ChevronUp, Settings, Share2, Hand, Smile, PlayCircle,
    MoreHorizontal, Volume2, Wifi, WifiOff, AlertTriangle, Loader2,
} from 'lucide-react'
import { FloatingReactions } from '@/components/room/floating-reactions'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import Link from 'next/link'

import { RecorderControls } from '@/components/room/RecorderControls'
import { createClient } from '@/lib/supabase/client'
import { useWebRTC } from '@/hooks/use-webrtc'
import { useMediaStream } from '@/hooks/use-media-stream'
import { useChat } from '@/hooks/use-chat'
import { RemoteVideo, LocalVideo } from '@/components/webrtc/video-player'
import { ChatPanel } from '@/components/room/chat-panel'
import { DebugLogs } from '@/components/debug-logs'
import { ParticipantList } from '@/components/room/participant-list'
import { InterpreterConsole } from '@/components/room/InterpreterConsole'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { ShareMeetingDialog } from '@/components/share-meeting-dialog'
import { LANGUAGES, type Language } from '@/lib/languages'
import { checkAndEndMeeting, restartPersonalMeeting, endMeeting } from '@/app/actions/meeting'
import { VideoGrid } from '@/components/room/video-grid'
import { LayoutGrid, Maximize2, ChevronLeft, ChevronRight, Ghost } from 'lucide-react'
import { PreCallLobby } from '@/components/room/pre-call-lobby'
import { SettingsDialog } from '@/components/room/settings-dialog'
import { useLanguage } from '@/components/providers/language-provider'
import { InterpreterSetupModal } from '@/components/room/interpreter-setup-modal'
import { VolumeControl } from '@/components/room/volume-control'
import { UpsellModal } from '@/components/marketing/upsell-modal'
import { VirtualBooth } from '@/components/VirtualBooth'

interface RoomPageProps {
    roomId: string
    searchRole?: string
}

export default function RoomPage({ roomId, searchRole }: RoomPageProps) {
    const role = searchRole || 'participant'
    const { t } = useLanguage()

    // User Identity Logic
    const [userId, setUserId] = useState('')
    const sessionSuffix = useRef(Math.random().toString(36).substring(2, 6)).current
    const sessionUserId = userId.length > 4   // guest-xxx tem pelo menos 10 chars
        ? `${userId}_${sessionSuffix}`
        : null
    const [userName, setUserName] = useState(t('room.participant_default'))
    const [currentRole, setCurrentRole] = useState<string>('participant')
    const [isLoaded, setIsLoaded] = useState(false)
    const [showUpsell, setShowUpsell] = useState(false) // NEW STATE
    const [isGhost, setIsGhost] = useState(false)
    const [hostId, setHostId] = useState<string | null>(null) // State to store host_id

    // State declarations moved for hoisting
    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)
    const [selectedLang, setSelectedLang] = useState('original')
    const [volumeBalance, setVolumeBalance] = useState(20)
    const [myBroadcastLang, setMyBroadcastLang] = useState('floor')
    const [masterVolume, setMasterVolume] = useState(1) // 0 to 1
    const [attentionToast, setAttentionToast] = useState<{ id: string, name: string } | null>(null)
    const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | null>(null)
    const [isSharing, setIsSharing] = useState(false)
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
    const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([])
    const [activeLanguages, setActiveLanguages] = useState<string[]>([]) // Dynamic languages from DB
    const [assignedLanguages, setAssignedLanguages] = useState<string[]>([]) // For restricted interpreters
    const [isSettingsOpen, setIsSettingsOpen] = useState(false) // Added for mobile menu control
    const [liveKitToken, setLiveKitToken] = useState<string | null>(null)
    const [tokenReady, setTokenReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [isOnline, setIsOnline] = useState(true)
    const [hasClosedSetup, setHasClosedSetup] = useState(false)
    const [iceServers, setIceServers] = useState<RTCIceServer[]>([])

    // Online/Offline Listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])


    // Layout and Join States
    const [isJoined, setIsJoined] = useState(false)
    const [lobbyConfig, setLobbyConfig] = useState<{
        micOn: boolean,
        cameraOn: boolean,
        audioDeviceId: string,
        videoDeviceId: string,
        isGhost: boolean,
        name: string,
        stream?: MediaStream
    } | null>(null)

    const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery')
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
    const [pinnedSpeakerId, setPinnedSpeakerId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 49

    const systemLogsRef = useRef<string[]>([])
    const [systemLogs, setSystemLogs] = useState<string[]>([])
    const handleOpenDebug = useCallback(() => {
        setSystemLogs([...systemLogsRef.current])
    }, [])

    useEffect(() => {
        const orig = { log: console.log, error: console.error }
        const fmt = (prefix: string, args: any[]) =>
            `[${new Date().toLocaleTimeString()}] ${prefix}` +
            args.map(a => {
                if (a instanceof Error) return `${a.name}: ${a.message}`
                try { return typeof a === 'object' && a ? JSON.stringify(a) : String(a) }
                catch { return '[Object]' }
            }).join(' ')

        console.log   = (...args) => { 
            systemLogsRef.current = [fmt('', args), ...systemLogsRef.current].slice(0, 200)
            orig.log(...args) 
        }
        console.error = (...args) => { 
            systemLogsRef.current = [fmt('ERR: ', args), ...systemLogsRef.current].slice(0, 200)
            orig.error(...args) 
        }
        return () => { 
            console.log = orig.log
            console.error = orig.error 
        }
    }, [])

    // ICE Servers Fetch
    useEffect(() => {
        fetch('/api/turn')
            .then(res => res.json())
            .then(data => {
                if (data.iceServers) {
                    setIceServers(data.iceServers)
                    console.log('[ICE] Servidores carregados:', data.iceServers.length)
                }
            })
            .catch(err => console.error('[ICE] Falha ao buscar:', err))
    }, [])

    // Local Mute State
    const [localMutedPeers, setLocalMutedPeers] = useState<Set<string>>(new Set())
    const [localPeerVolumes, setLocalPeerVolumes] = useState<Record<string, number>>({})

    const handleToggleLocalMute = useCallback((targetId: string) => {
        setLocalMutedPeers(prev => {
            const next = new Set(prev)
            if (next.has(targetId)) next.delete(targetId)
            else next.add(targetId)
            return next
        })
    }, [])

    const handleSetLocalVolume = useCallback((targetId: string, volume: number) => {
        setLocalPeerVolumes(prev => ({
            ...prev,
            [targetId]: volume
        }))
    }, [])

    const mediaProps = useMediaStream({
        micOn: lobbyConfig?.micOn ?? true,
        cameraOn: lobbyConfig?.cameraOn ?? true,
        audioDeviceId: lobbyConfig?.audioDeviceId || 'default',
        videoDeviceId: lobbyConfig?.videoDeviceId || 'default',
    }, true)

    const {
        stream: localStream,
        error: mediaError,
        toggleMic: toggleLocalMic,
        toggleCamera: toggleLocalCamera,
        switchDevice: switchLocalDevice
    } = mediaProps

    const {
        peers,
        toggleMic: hookToggleMic,
        toggleCamera: hookToggleCamera,
        shareScreen,
        stopScreenShare,
        userCount,
        channel,
        updateMetadata,
        switchDevice: switchDeviceWebRTC,
        sendEmoji,
        shareVideoFile,
        toggleHand,
        localHandRaised,
        isHost,
        sharingUserId,
        isAnySharing,
        reactions,
        promoteToHost,
        kickUser,
        updateUserRole,

        updateUserLanguages,
        muteUser,
        blockUserAudio,
        unblockUserAudio,
        reconnect,
        mediaStatus,
        lastError,
        setLastError,
        localScreenStream,
        signalingStatus
    } = useWebRTC(
        roomId, 
        sessionUserId || '', 
        currentRole, 
        { ...lobbyConfig, stream: localStream ?? undefined }, 
        isJoined && tokenReady, 
        userName, 
        liveKitToken || undefined, 
        isGhost, 
        hostId ?? undefined,
        iceServers,
        mediaProps
    )

    const isSignalingConnected = signalingStatus === 'SUBSCRIBED' || signalingStatus === 'joined'

    const availableSystemLanguages = useMemo(() => {
        const codes = activeLanguages.length > 0 ? activeLanguages : LANGUAGES.map(l => l.code)
        return codes.map(code => LANGUAGES.find(l => l.code === code)).filter(Boolean) as Language[]
    }, [activeLanguages])

    useEffect(() => {
        // Only show upsell to guests (users not logged in)
        // Wait for isLoaded to ensure userId is stable
        if (isLoaded && isJoined) {
            const isGuestUser = userId.startsWith('guest-')
            if (isGuestUser) {
                const timer = setTimeout(() => setShowUpsell(true), 5000)
                return () => clearTimeout(timer)
            }
        }
    }, [isJoined, userId, isLoaded])

    useEffect(() => {
        const initUser = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    console.log('[Auth] Usuário não autenticado. Redirecionando para login...')
                    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
                    return
                }

                // 2. Fetch Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, role, full_name')
                    .eq('id', user.id)
                    .maybeSingle()

                const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || t('room.participant_default')
                const roleFromDB = profile?.role || 'participant'

                // 3. Fetch Meeting
                const { data: meeting } = await supabase
                    .from('meetings')
                    .select('id, settings, start_time, status, host_id')
                    .eq('id', roomId)
                    .maybeSingle()

                if (!meeting) {
                    // Check if it's a personal room ID (owned by another user)
                    const { data: hostProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', roomId)
                        .maybeSingle()

                    if (!hostProfile) {
                        setError(t('room.meeting_not_found'))
                        setLoading(false)
                        return
                    }
                    
                    // Personal room logic
                    setHostId(hostProfile.id)
                } else {
                    setHostId(meeting.host_id)
                    
                    // Status checks
                    if (meeting.status === 'ended') {
                        if (meeting.host_id === user.id) {
                            await restartPersonalMeeting(roomId)
                            window.location.reload()
                            return
                        }
                        alert(t('room.meeting_ended_title'))
                        window.location.href = '/dashboard'
                        return
                    }

                    // Meeting settings
                    if (meeting.settings?.active_languages) {
                        setActiveLanguages(meeting.settings.active_languages)
                    }

                    // Interpreter logic
                    if (meeting.settings?.interpreters) {
                        const interpreterConfig = meeting.settings.interpreters.find(
                            (i: any) => i.email?.toLowerCase() === user.email?.toLowerCase()
                        )
                        if (interpreterConfig) {
                            setCurrentRole('interpreter')
                            if (interpreterConfig.lang) {
                                setAssignedLanguages([interpreterConfig.lang])
                                setMyBroadcastLang(interpreterConfig.lang)
                            } else if (interpreterConfig.langs) {
                                setAssignedLanguages(interpreterConfig.langs)
                                setMyBroadcastLang(interpreterConfig.langs[0])
                            }
                        } else {
                            setCurrentRole(roleFromDB)
                        }
                    } else {
                        setCurrentRole(roleFromDB)
                    }
                }

                // 4. PREPARE LOBBY (Auto-join disabled by user request, but settings ready)
                const urlParams = new URLSearchParams(window.location.search)
                const ghostParam = urlParams.get('ghost') === 'true'

                startTransition(() => {
                    setUserId(user.id)
                    setUserName(name)
                    setIsGhost(ghostParam)
                    
                    setLobbyConfig({
                        micOn: !ghostParam,
                        cameraOn: !ghostParam,
                        audioDeviceId: 'default',
                        videoDeviceId: 'default',
                        isGhost: ghostParam,
                        name: name
                    })

                    setMicOn(!ghostParam)
                    setCameraOn(!ghostParam)
                    setIsJoined(false) // USER WANTS LOBBY FIRST
                })

            } catch (error) {
                console.error("Critical error in initUser:", error)
                setError("Falha ao iniciar sessão")
            } finally {
                setIsLoaded(true)
                setLoading(false)
            }
        }

        initUser()
    }, [roomId])

    useEffect(() => {
        if (!isJoined || !sessionUserId || !roomId) return
        if (liveKitToken) return 

        let cancelled = false

        const fetchToken = async (attempt = 1) => {
            try {
                console.log(`[Token] Buscando para:`, { sessionUserId, role: currentRole, attempt })

                const resp = await fetch(
                    `/api/livekit/token?` +
                    `room=${encodeURIComponent(roomId)}` +
                    `&username=${encodeURIComponent(sessionUserId)}` +
                    `&name=${encodeURIComponent(userName)}` +
                    `&role=${encodeURIComponent(currentRole)}`
                )

                if (cancelled) return

                if (!resp.ok) {
                    const text = await resp.text()
                    console.error('[Token] HTTP error:', resp.status, text)
                    if ((resp.status === 504 || resp.status === 503) && attempt < 3) {
                        setTimeout(() => { if (!cancelled) fetchToken(attempt + 1) }, 2000)
                        return
                    }
                    setLastError(`Token HTTP ${resp.status}: ${text.slice(0, 50)}`)
                    return
                }

                const data = await resp.json()
                if (data.token) {
                    setLiveKitToken(data.token)
                    setTokenReady(true)
                    setLastError(null)
                }
            } catch (err) {
                if (cancelled) return
                if (attempt < 3) {
                    setTimeout(() => { if (!cancelled) fetchToken(attempt + 1) }, 2000)
                    return
                }
                setLastError(`Falha de rede: ${String(err)}`)
            }
        }

        fetchToken()
        return () => { cancelled = true }
    }, [isJoined, sessionUserId, roomId, currentRole, userName])

    // Refresh do token 30min antes de expirar
    useEffect(() => {
        if (!tokenReady || !sessionUserId || !roomId) return
        const REFRESH_MS = (4 * 60 - 30) * 60 * 1000 // 3h30 (token dura 4h)
        const timer = setTimeout(async () => {
            try {
                const resp = await fetch(`/api/livekit/token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent(sessionUserId)}&name=${encodeURIComponent(userName)}&role=${currentRole}`)
                const data = await resp.json()
                if (data.token) { 
                    setLiveKitToken(data.token)
                    console.log('[Token] Refreshed') 
                }
            } catch (err) { console.error('[Token] Refresh failed:', err) }
        }, REFRESH_MS)
        return () => clearTimeout(timer)
    }, [tokenReady, sessionUserId, roomId, currentRole])

    // State declarations previously here were moved up to fix 'used before declaration' errors
    // State declarations previously here were moved up to fix 'used before declaration' errors

    // State declarations previously here were moved up to fix 'used before declaration' errors
    // State declarations previously here were moved up to fix 'used before declaration' errors


    const isGuest = userId.startsWith('guest-')

    // Populate Device Lists
    useEffect(() => {
        if (isJoined) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                setAudioInputs(devices.filter(d => d.kind === 'audioinput'))
                setVideoInputs(devices.filter(d => d.kind === 'videoinput'))
            })
        }
    }, [isJoined])

    // Pagination Logic & Sorting (Camera-on first)
    const sortedPeers = [...peers].sort((a, b) => {
        if (a.cameraOn === b.cameraOn) return 0
        return a.cameraOn ? -1 : 1
    })

    const paginatedPeers = sortedPeers.length <= itemsPerPage
        ? sortedPeers
        : sortedPeers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const totalPages = Math.ceil(peers.length / itemsPerPage)

    // UI Visibility Logic
    const [showUI, setShowUI] = useState(true)
    const [lastInteraction, setLastInteraction] = useState(Date.now())
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleVideoFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsSharing(true)
            await shareVideoFile(file)
            setIsSharing(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [shareVideoFile])

    useEffect(() => {
        const handleActivity = () => {
            setShowUI(true)
            setLastInteraction(Date.now())
        }
        
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart']
        events.forEach(e => window.addEventListener(e, handleActivity))
        
        const interval = setInterval(() => {
            if (Date.now() - lastInteraction > 3000 && !activeSidebar) {
                setShowUI(false)
            }
        }, 1000)
        
        return () => {
            events.forEach(e => window.removeEventListener(e, handleActivity))
            clearInterval(interval)
        }
    }, [activeSidebar, lastInteraction])

    // Sync local sharing state with WebRTC track status (handles browser "Stop Sharing" button)
    useEffect(() => {
        if (sharingUserId === userId) {
            setIsSharing(true)
        } else {
            setIsSharing(false)
        }
    }, [sharingUserId, userId])

    // Auto-switch to Speaker Mode when a presentation is detected
    useEffect(() => {
        // Check for role 'presentation' OR if any peer has a screen stream
        const hasPresentation = peers.some(p => p.role === 'presentation' || p.screenStream)

        if (hasPresentation || isSharing) {
            if (viewMode !== 'speaker') {
                console.log("Auto-switching to Speaker Mode (Presentation Detected)")
                setViewMode('speaker')
            }
        } else {
            // Revert Auto-Switch
            if (viewMode === 'speaker' && !pinnedSpeakerId) {
                console.log("Auto-switching to Gallery Mode (No Presentation)")
                setViewMode('gallery')
            }
        }
    }, [peers, isSharing, viewMode, pinnedSpeakerId])

    // Sync active language to metadata when interpreter
    useEffect(() => {
        if (isJoined && currentRole.toLowerCase().includes('interpreter')) {
            updateMetadata({ language: myBroadcastLang })
        }
    }, [myBroadcastLang, isJoined, currentRole, updateMetadata])

    const { messages, sendMessage, unreadCount, markAsRead, setIsActive: setIsChatActive } = useChat(roomId, userId, currentRole, userName)

    useEffect(() => {
        if (activeSidebar === 'chat') {
            setIsChatActive(true)
            if (unreadCount > 0) markAsRead()
        } else {
            setIsChatActive(false)
        }
    }, [activeSidebar, unreadCount])

    // Chamada de Atenção (Hand Raise Notification)
    const prevPeersHandRef = useRef<{ [key: string]: boolean }>({})

    // Listen for Admin Language Updates
    useEffect(() => {
        const handleLangUpdate = (e: Event) => {
            const detail = (e as CustomEvent<string[]>).detail
            console.log("Admin updated my languages:", detail)
            setAssignedLanguages(detail)
            // If my current broadcast lang is not in the new allowed list, reset to floor or first allowed
            if (detail.length > 0 && !detail.includes(myBroadcastLang)) {
                setMyBroadcastLang(detail[0])
            } else if (detail.length === 0) {
                // If no languages allowed, maybe force floor?
                setMyBroadcastLang('floor')
            }
        }
        window.addEventListener('admin-update-languages', handleLangUpdate)
        return () => window.removeEventListener('admin-update-languages', handleLangUpdate)
    }, [myBroadcastLang])


    useEffect(() => {
        peers.forEach(p => {

            const wasRaised = prevPeersHandRef.current[p.userId]
            if (p.handRaised && !wasRaised) {
                // NEW HAND RAISED
                setAttentionToast({ id: p.userId, name: p.name || t('room.someone') })
                setTimeout(() => setAttentionToast(null), 5000)

                const audio = new Audio('/sounds/notification.mp3')
                audio.play().catch(() => { })
            }
            prevPeersHandRef.current[p.userId] = !!p.handRaised
        })
    }, [peers])



    const handleToggleMic = useCallback(() => {
        setMicOn(prev => {
            const newState = !prev
            console.log('[UI] Toggle Mic ->', newState)
            hookToggleMic(newState)
            return newState
        })
    }, [hookToggleMic])

    // Listen for Handover Acceptance (I requested it, partner accepted -> I go off air)
    // Moved here to avoid 'used before declaration' lint error
    useEffect(() => {
        const handleHandoverAccepted = () => {
            // My partner accepted my request. I should mute.
            if (micOn) handleToggleMic()
            alert(t('room.handover_complete') || 'Handover concluído. Você está mudo.')
        }
        window.addEventListener('booth-handover-accepted', handleHandoverAccepted)
        return () => window.removeEventListener('booth-handover-accepted', handleHandoverAccepted)
    }, [micOn, handleToggleMic])

    const handleToggleCamera = useCallback(() => {
        setCameraOn(prev => {
            const newState = !prev
            console.log('[UI] Toggle Cam ->', newState)
            hookToggleCamera(newState)
            return newState
        })
    }, [hookToggleCamera])

    const handleToggleShare = useCallback(async () => {
        try {
            if (isSharing) {
                await stopScreenShare()
                setIsSharing(false)
            } else {
                await shareScreen()
                setIsSharing(true)
            }
        } catch (err) {
            console.error("Screen share toggle failed:", err)
            setIsSharing(false)
        }
    }, [isSharing, shareScreen, stopScreenShare])


    const ROOM_LANGUAGES = [
        { code: 'original', name: t('room.original_audio'), flag: '🏳️' },
        ...availableSystemLanguages
    ]

    const handleLangChange = useCallback((code: string) => {
        setSelectedLang(code)
        setVolumeBalance(code !== 'original' ? 80 : 0)
    }, [])

    // Automatic Speaker Detection
    const handlePeerSpeaking = useCallback((id: string, isSpeaking: boolean) => {
        if (isSpeaking && !pinnedSpeakerId) {
            setActiveSpeakerId(id)
        }
    }, [pinnedSpeakerId])

    const handleSpeakerChange = useCallback((id: string) => {
        if (pinnedSpeakerId === id) {
            setPinnedSpeakerId(null) // Unpin if clicking same
        } else {
            setPinnedSpeakerId(id)
            setViewMode('speaker') // Auto switch to speaker mode when pinning
        }
    }, [pinnedSpeakerId])





    if (!isLoaded || (loading && !isJoined)) {
        return (
            <div className="h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <Loader2 className="h-10 w-10 text-[#06b6d4] animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('room.authenticating')}</h2>
                <p className="text-zinc-400 text-center max-w-xs">{t('room.preparing_session')}</p>
                {error && (
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Tentar novamente
                    </Button>
                )}
            </div>
        )
    }

    // We show the lobby if not joined
    if (!isJoined) {
        return (
            <PreCallLobby
                userName={userName}
                userRole={currentRole}
                isGuest={isGuest}
                stream={localStream ?? undefined}
                error={mediaError || undefined}
                onToggleMic={toggleLocalMic}
                onToggleCamera={toggleLocalCamera}
                onSwitchDevice={switchLocalDevice}
                onJoin={async (config: {
                    micOn: boolean,
                    cameraOn: boolean,
                    audioDeviceId: string,
                    videoDeviceId: string,
                    isGhost: boolean,
                    name: string,
                    stream?: MediaStream
                }) => {
                    setLobbyConfig(config)
                    setMicOn(config.micOn)
                    setCameraOn(config.cameraOn)
                    setIsGhost(config.isGhost)
                    setUserName(config.name)
                    setIsJoined(true)
                    setLoading(false)

                    if (config.isGhost) {
                        const { logAdminAction } = await import('@/components/admin/actions')
                        await logAdminAction({
                            action: 'ROOM_GHOST_JOIN',
                            targetResource: 'meeting',
                            targetId: roomId,
                            details: { name: config.name, role: currentRole }
                        })
                    }
                }}
            />
        )
    }



    const screenSharePeer = peers.find(p => !!p.screenStream)
    const effectiveSpeakerId = pinnedSpeakerId ?? activeSpeakerId ?? peers[0]?.userId ?? null

    const computedViewMode: 'gallery' | 'speaker' = (() => {
        if (pinnedSpeakerId) return 'speaker'
        if (screenSharePeer || isSharing) return 'speaker'
        return viewMode
    })()

    return (
        <div className="h-screen bg-[#020817] flex flex-col relative overflow-hidden text-foreground transition-colors duration-500">
            {/* Top Bar - Auto Hides */}
            <div className={`absolute top-0 left-0 right-0 p-2 md:p-4 z-[40] flex justify-between items-center transition-all duration-500 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
                <div className="bg-card/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full pointer-events-auto border border-border flex items-center gap-2 md:gap-4 shadow-xl max-w-[85vw] overflow-hidden">
                    <div className="scale-75 origin-left -ml-2">
                        <Logo />
                    </div>
                    <div className="h-4 w-px bg-border/50" />
                    <div className="flex flex-col md:flex-row md:items-center whitespace-nowrap">
                        <span className="font-semibold text-xs md:text-sm opacity-80 md:hidden">ID: {roomId.slice(0, 8)}...</span>
                        <span className="font-semibold text-sm opacity-80 hidden md:inline">ID: {roomId}</span>
                    </div>

                    <ShareMeetingDialog
                        roomId={roomId}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-white hover:bg-white/10 rounded-full">
                                <Share2 className="h-3 w-3" />
                            </Button>
                        }
                    />

                    {/* Reconnect Button - Visible only if joined */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (confirm('Deseja reconectar à sala? Isso pode resolver problemas de áudio/vídeo.')) {
                                reconnect()
                            }
                        }}
                        className="h-6 w-6 ml-1 text-white hover:bg-red-500/20 rounded-full"
                        title="Reconectar"
                    >
                        <Settings className="h-3 w-3 text-red-400" />
                    </Button>

                    <div className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 transition-all",
                        userCount > 1 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50',
                        isGhost && "border-purple-500/50 text-purple-400 bg-purple-500/10"
                    )}>
                        {isGhost ? <Ghost className="h-3 w-3 shadow-[0_0_8px_rgba(168,85,247,0.5)]" /> : <Users className="h-3 w-3" />}
                        <span>{userCount}</span>
                        <span className="hidden xs:inline ml-1 uppercase text-[8px] tracking-tighter">
                            {isGhost ? "Modo Auditor" : t('room.online')}
                        </span>
                               </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* View Mode Controls - Zoom style - Hidden on mobile to prevent overflow */}
                    <div className="hidden md:flex bg-card/40 backdrop-blur-md p-0.5 md:p-1 rounded-xl md:rounded-2xl border border-border pointer-events-auto shadow-xl gap-1 md:gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 h-8 md:h-10 font-bold text-[10px] md:text-sm rounded-lg md:rounded-xl hover:bg-white/10">
                                    <Maximize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    <span className="hidden lg:inline">{t('room.view_mode')}</span>
                                    <ChevronUp className="h-3 w-3 opacity-50 rotate-180" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="end" className="w-48 md:w-56 mt-2 rounded-xl md:rounded-2xl bg-black/95 backdrop-blur-3xl border-white/10 p-1 md:p-2 shadow-2xl z-[100]">
                                <DropdownMenuItem
                                    onClick={() => setViewMode('gallery')}
                                    className={cn("rounded-lg md:rounded-xl p-2 md:p-3 flex items-center justify-between cursor-pointer", viewMode === 'gallery' && "bg-[#06b6d4]/20 text-[#06b6d4]")}
                                >
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <LayoutGrid className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        <span className="font-semibold text-xs md:text-sm">{t('room.gallery_view')}</span>
                                    </div>
                                    {viewMode === 'gallery' && <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-[#06b6d4]" />}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setViewMode('speaker')}
                                    className={cn("rounded-lg md:rounded-xl p-2 md:p-3 flex items-center justify-between cursor-pointer", viewMode === 'speaker' && "bg-[#06b6d4]/20 text-[#06b6d4]")}
                                >
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        <span className="font-semibold text-xs md:text-sm">{t('room.speaker_view')}</span>
                                    </div>
                                    {viewMode === 'speaker' && <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-[#06b6d4]" />}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (typeof document !== 'undefined') {
                                            if (!document.fullscreenElement) {
                                                document.documentElement.requestFullscreen()
                                            } else {
                                                document.exitFullscreen()
                                            }
                                        }
                                    }}
                                    className="rounded-lg md:rounded-xl p-2 md:p-3 flex items-center gap-2 md:gap-3 cursor-pointer"
                                >
                                    <Maximize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    <span className="font-semibold text-xs md:text-sm">{t('room.fullscreen')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10 md:hidden" />
                                <DropdownMenuItem
                                    className="md:hidden rounded-lg p-2 flex items-center justify-center text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-bold text-[10px]"
                                >
                                    FECHAR
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>       </div>
            </div>

            {/* Main Layout (Flex Row) */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Video Grid Section */}
                <div className="flex-1 min-w-0 p-2 md:p-6 flex items-center justify-center transition-all duration-300 relative">
                    <VideoGrid
                        peers={paginatedPeers.map(p => ({ ...p, connectionState: p.connectionState || mediaStatus }))}
                        localStream={localStream}
                        currentRole={currentRole}
                        micOn={micOn}
                        cameraOn={cameraOn}
                        mode={computedViewMode}
                        activeSpeakerId={effectiveSpeakerId}
                        pinnedSpeakerId={pinnedSpeakerId}
                        onSpeakerChange={handleSpeakerChange}
                        onPeerSpeaking={handlePeerSpeaking}
                        localUserName={userName}
                        selectedLang={selectedLang}
                        volumeBalance={volumeBalance}
                        handRaised={localHandRaised}
                        masterVolume={masterVolume}
                        localMutedPeers={localMutedPeers}
                        onMutePeer={handleToggleLocalMute}
                        localPeerVolumes={localPeerVolumes}
                        onLocalVolumeChange={handleSetLocalVolume}
                        localScreenStream={localScreenStream}
                        isGhost={isGhost}
                    />

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 z-[60]">
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="text-white hover:bg-white/10"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <span className="text-xs font-bold text-white">
                                {currentPage} {t('room.page_of')} {totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="text-white hover:bg-white/10"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Sidebars */}
                <AnimatePresence>
                    {activeSidebar === 'chat' && (
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute md:relative inset-y-0 right-0 md:inset-auto z-[60] md:z-10 w-full md:w-80 shrink-0 border-l border-border/10 bg-card"
                        >
                            <div className="h-full w-full md:w-80">
                                <ChatPanel
                                    messages={messages}
                                    userId={userId}
                                    peers={peers}
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
                            className="absolute md:relative inset-y-0 right-0 md:inset-auto z-[60] md:z-10 w-full md:w-80 shrink-0 border-l border-border/10 bg-card"
                        >
                            <div className="h-full w-full md:w-80">
                                <ParticipantList
                                    peers={[
                                        // Include self in participant list only if NOT ghost or if self is admin (admins see ghosts)
                                        ...((!isGhost || currentRole === 'admin' || currentRole === 'MASTER') ? [{
                                            userId: userId,
                                            name: `${userName} (Você${isGhost ? ' - Ghost' : ''})`,
                                            role: currentRole,
                                            micOn: micOn,
                                            cameraOn: cameraOn,
                                            handRaised: localHandRaised,
                                            isHost: isHost,
                                            isGhost: isGhost
                                        }] : []),
                                        ...peers.map(p => ({
                                            ...p,
                                            name: p.name || 'Participante',
                                            micOn: p.micOn ?? false,
                                            cameraOn: p.cameraOn ?? false,
                                            audioBlocked: p.audioBlocked
                                        }))
                                    ]}
                                    userRole={currentRole}
                                    userCount={userCount}
                                    isHost={isHost}
                                    hostId={hostId || ''}
                                    onPromote={promoteToHost}
                                    onKick={kickUser}
                                    onUpdateRole={updateUserRole}
                                    onUpdateLanguages={updateUserLanguages}
                                    onMute={muteUser}
                                    onBlockAudio={blockUserAudio}
                                    onUnblockAudio={unblockUserAudio}

                                    localMutedPeers={localMutedPeers}
                                    onToggleLocalMute={handleToggleLocalMute}

                                    onClose={() => setActiveSidebar(null)}
                                />
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Attention Toast (Chamada de Atenção) */}
            <AnimatePresence>
                {attentionToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="fixed top-8 left-1/2 z-[100] bg-amber-500 text-white px-6 py-4 rounded-[2rem] shadow-2xl border-4 border-white/20 flex items-center gap-4"
                    >
                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                            <Hand className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('room.attention')}</div>
                            <div className="text-lg font-black">{attentionToast.name} {t('room.raised_hand')}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Banner */}
            {mediaError && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-8 py-4 rounded-[2rem] z-50 text-center animate-bounce font-black shadow-2xl border-4 border-white/20">
                    ⚠️ {t('room.camera_error')} {mediaError}
                </div>
            )}

            {/* Network Status Banner */}
            {(!isOnline || !isSignalingConnected) && (
                <div className="absolute top-36 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white px-6 py-3 rounded-full z-50 text-center flex items-center gap-3 font-bold shadow-xl backdrop-blur-md animate-pulse">
                    <WifiOff className="h-5 w-5" />
                    <span>
                        {!isOnline ? t('room.network_offline') || 'Sem conexão com a internet' : t('room.signaling_disconnected') || 'Problema de conexão com o servidor'}
                    </span>
                </div>
            )}



            {/* Interpreter Console (Central Cockpit) */}
            {/* Interpreter Console (Unified Strip) */}
            {/* Interpreter Console (Central Cockpit) */}
            {/* Interpreter Console (Central Cockpit) */}

            {/* Interpreter Console (Central Cockpit) */}
            {currentRole.toLowerCase().includes('interpreter') && (
                <>
                    <InterpreterSetupModal
                        isOpen={isJoined && assignedLanguages.length === 0 && myBroadcastLang === 'floor' && !hasClosedSetup}
                        availableLanguages={availableSystemLanguages}
                        occupiedLanguages={peers.filter(p => p.role?.includes('interpreter') && p.userId !== userId).map(p => p.language).filter(Boolean) as string[]}
                        onSelect={(lang: string) => {
                            setMyBroadcastLang(lang)
                            updateMetadata({ language: lang })
                        }}
                        onClose={() => setHasClosedSetup(true)}
                        userName={userName}
                    />


                    <InterpreterConsole
                        active={micOn}
                        onToggleActive={handleToggleMic}
                        currentLanguage={myBroadcastLang}
                    onLanguageChange={(lang: string) => {
                            setMyBroadcastLang(lang)
                            updateMetadata({ language: lang })
                        }}
                        isListeningToFloor={selectedLang === 'original'}
                        onListenToFloor={() => handleLangChange('original')}
                        onHandover={() => sendEmoji('🔄')}
                        availableLanguages={availableSystemLanguages}
                        allowedLanguages={assignedLanguages.length > 0 ? assignedLanguages : undefined}
                        occupiedLanguages={peers.filter(p => p.role?.includes('interpreter') && p.userId !== userId).map(p => p.language).filter(Boolean) as string[]}
                    />

                    <VirtualBooth
                        roomId={roomId}
                        userId={userId}
                        userLanguage={myBroadcastLang}
                        localStream={localStream}
                        isActive={micOn}
                        onHandoverComplete={() => {
                            if (!micOn) handleToggleMic()
                        }}
                    />
                </>
            )}

            {/* Bottom Control Bar */}
            <div className="h-20 md:h-28 bg-card/85 backdrop-blur-3xl border-t border-border flex items-center justify-start md:justify-center gap-2 md:gap-4 relative z-[50] px-4 md:px-10 pb-safe transition-all w-full overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 md:gap-4 shrink-0 justify-center w-full md:w-auto">
                    {/* Mic Control */}
                    <div className="flex items-center gap-0.5 bg-background/50 backdrop-blur rounded-2xl p-1 border border-border/50 shadow-sm group hover:border-[#06b6d4]/50 transition-colors">
                        <Button
                            variant={micOn ? "ghost" : "destructive"}
                            size="icon"
                            className={cn(
                                "h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl rounded-r-none border-0 transition-all",
                                micOn ? "bg-accent/20 text-foreground hover:bg-accent/40" : "bg-red-500 text-white shadow-red-500/20"
                            )}
                            onClick={handleToggleMic}
                        >
                            {micOn ? <Mic className="h-4 w-4 md:h-5 md:w-5" /> : <MicOff className="h-4 w-4 md:h-5 md:w-5" />}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-12 w-6 rounded-xl rounded-l-none border-l border-white/5 hover:bg-accent/40">
                                    <ChevronUp className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="center" className="w-64 mb-4 rounded-2xl bg-black/90 backdrop-blur-3xl border-white/10 p-2 shadow-2xl">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">{t('room.microphone')}</DropdownMenuLabel>
                                {audioInputs.map((device, i) => (
                                    <DropdownMenuItem
                                        key={i}
                                        onClick={() => switchDeviceWebRTC('audio', device.deviceId)}
                                        className="rounded-xl focus:bg-[#06b6d4]/20 focus:text-[#06b6d4] cursor-pointer text-xs font-medium py-2.5 flex justify-between"
                                    >
                                        <span className="truncate max-w-[180px]">{device.label || `Microphone ${i + 1}`}</span>
                                        {localStream?.getAudioTracks()[0]?.getSettings().deviceId === device.deviceId && (
                                            <Check className="h-4 w-4 text-[#06b6d4]" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="bg-white/10 md:hidden" />
                                <DropdownMenuItem
                                    className="md:hidden rounded-xl py-3 flex items-center justify-center text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-bold text-xs"
                                >
                                    FECHAR
                                </DropdownMenuItem>
                            </DropdownMenuContent>

                        </DropdownMenu>
                    </div>

                    {/* Camera Control */}
                    <div className="flex items-center gap-0.5 bg-background/50 backdrop-blur rounded-2xl p-1 border border-border/50 shadow-sm group hover:border-[#06b6d4]/50 transition-colors">
                        <Button
                            variant={cameraOn ? "ghost" : "destructive"}
                            size="icon"
                            className={cn(
                                "h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl rounded-r-none border-0 transition-all",
                                cameraOn ? "bg-accent/20 text-foreground hover:bg-accent/40" : "bg-red-500 text-white shadow-red-500/20"
                            )}
                            onClick={handleToggleCamera}
                        >
                            {cameraOn ? <Video className="h-4 w-4 md:h-5 md:w-5" /> : <VideoOff className="h-4 w-4 md:h-5 md:w-5" />}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-12 w-6 rounded-xl rounded-l-none border-l border-white/5 hover:bg-accent/40">
                                    <ChevronUp className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="center" className="w-64 mb-4 rounded-2xl bg-black/90 backdrop-blur-3xl border-white/10 p-2 shadow-2xl">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">{t('room.camera')}</DropdownMenuLabel>
                                {videoInputs.map((device, i) => (
                                    <DropdownMenuItem
                                        key={i}
                                        onClick={() => switchDeviceWebRTC('video', device.deviceId)}
                                        className="rounded-xl focus:bg-[#06b6d4]/20 focus:text-[#06b6d4] cursor-pointer text-xs font-medium py-2.5 flex justify-between"
                                    >
                                        <span className="truncate max-w-[180px]">{device.label || `Camera ${i + 1}`}</span>
                                        {localStream?.getVideoTracks()[0]?.getSettings().deviceId === device.deviceId && (
                                            <Check className="h-4 w-4 text-[#06b6d4]" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="bg-white/10 md:hidden" />
                                <DropdownMenuItem
                                    className="md:hidden rounded-xl py-3 flex items-center justify-center text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-bold text-xs"
                                >
                                    FECHAR
                                </DropdownMenuItem>
                            </DropdownMenuContent>

                        </DropdownMenu>
                    </div>

                    {/* Sharing Dropdown - Desktop Only */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant={isSharing ? "default" : "secondary"}
                                size="icon"
                                disabled={isAnySharing && !isSharing}
                                className={cn(
                                    "hidden md:flex h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl shadow-sm transition-all active:scale-95 border-0",
                                    isSharing ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20 animate-pulse" : "bg-background/50 text-foreground hover:bg-accent/40 backdrop-blur",
                                    isAnySharing && !isSharing && "opacity-50 cursor-not-allowed grayscale"
                                )}
                                title={isAnySharing && !isSharing ? t('room.room_busy') : t('room.share')}
                            >
                                <Monitor className="h-4 w-4 md:h-5 md:w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" align="center" className="w-56 mb-4 rounded-2xl bg-black/90 backdrop-blur-3xl border-white/10 p-2 shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">{t('room.share_options')}</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={handleToggleShare}
                                className="rounded-xl focus:bg-[#06b6d4]/20 focus:text-[#06b6d4] cursor-pointer text-xs font-medium py-2.5 flex items-center gap-2"
                            >
                                <Monitor className="h-4 w-4" />
                                {isSharing ? t('room.stop_share') : t('room.share_screen')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => fileInputRef.current?.click()}
                                className="rounded-xl focus:bg-[#06b6d4]/20 focus:text-[#06b6d4] cursor-pointer text-xs font-medium py-2.5 flex items-center gap-2"
                            >
                                <PlayCircle className="h-4 w-4" />
                                {t('room.share_local_video')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10 md:hidden" />
                            <DropdownMenuItem
                                className="md:hidden rounded-xl py-3 flex items-center justify-center text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-bold text-xs"
                            >
                                FECHAR
                            </DropdownMenuItem>
                        </DropdownMenuContent>

                    </DropdownMenu>


                    {/* Volume Control - Desktop Only */}
                    <div className="hidden md:flex items-center gap-0.5 bg-background/50 backdrop-blur rounded-2xl p-1 border border-border/50 shadow-sm group hover:border-[#06b6d4]/50 transition-colors">
                        <VolumeControl volume={masterVolume} onVolumeChange={setMasterVolume} />
                    </div>


                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleVideoFileChange}
                        accept="video/*"
                        className="hidden"
                    />

                    <SettingsDialog
                        audioDevices={audioInputs}
                        videoDevices={videoInputs}
                        currentAudioId={typeof window !== 'undefined' ? (localStorage.getItem('preferredAudioDevice') || undefined) : undefined}
                        currentVideoId={typeof window !== 'undefined' ? (localStorage.getItem('preferredVideoDevice') || undefined) : undefined}
                        localStream={localStream}
                        onSwitch={switchDeviceWebRTC}
                        open={isSettingsOpen}
                        onOpenChange={setIsSettingsOpen}
                    />

                    <div className="w-px h-10 bg-border/50 hidden md:block" />

                    {/* Raised Hand */}
                    <Button
                        variant={localHandRaised ? "default" : "secondary"}
                        size="icon"
                        className={cn(
                            "h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-2xl shadow-xl transition-all active:scale-95 border-0",
                            localHandRaised ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20" : "bg-accent/50 text-foreground hover:bg-accent"
                        )}
                        onClick={toggleHand}
                        title={t('room.raise_hand')}
                    >
                        <Hand className={cn("h-5 w-5 md:h-6 md:w-6", localHandRaised && "animate-bounce")} />
                    </Button>

                    {/* Force Reconnect / Sync Button */}
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-12 w-12 md:h-14 md:w-14 rounded-lg md:rounded-2xl shadow-xl bg-accent/50 text-foreground hover:bg-accent border-0"
                        onClick={() => {
                            reconnect()
                            alert(t('room.reconnecting') || 'Sincronizando áudio e vídeo...')
                        }}
                        title={t('room.refresh_connection') || 'Recarregar Conexão'}
                    >
                        <Wifi className="h-5 w-5 md:h-6 md:w-6" />
                    </Button>

                    {/* Reactions Menu - Desktop Only */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="hidden md:flex h-14 w-14 rounded-2xl shadow-xl bg-accent/50 text-foreground hover:bg-accent border-0"
                                title={t('room.send_reaction')}
                            >
                                <Smile className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" align="center" className="p-2 gap-2 flex bg-card/80 backdrop-blur-xl border-border rounded-2xl mb-4">
                            {['❤️', '👏', '🎉', '😂', '😮', '😢', '👍', '🔥'].map((emoji) => (
                                <Button
                                    key={emoji}
                                    variant="ghost"
                                    className="h-12 w-12 text-2xl p-0 hover:bg-white/10 rounded-xl"
                                    onClick={() => sendEmoji(emoji)}
                                >
                                    {emoji}
                                </Button>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mobile "More" Menu - Groups secondary actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="md:hidden h-12 w-12 rounded-xl bg-accent/50 text-foreground hover:bg-accent border-0"
                            >
                                <MoreHorizontal className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" align="end" className="w-64 mb-4 rounded-2xl bg-black/90 backdrop-blur-3xl border-white/10 p-2 shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">Opções</DropdownMenuLabel>

                            <DropdownMenuItem onClick={() => setMasterVolume(masterVolume === 0 ? 1 : 0)} className="rounded-xl py-3 flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-medium"><Volume2 className="h-4 w-4" /> Volume (Mute/Unmute)</span>
                                {masterVolume > 0 && <Check className="h-3 w-3 text-[#06b6d4]" />}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={handleToggleShare} className="rounded-xl py-3 flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-medium"><Monitor className="h-4 w-4" /> {isSharing ? "Parar Compartilhamento" : "Compartilhar Tela"}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-white/10 my-1" />

                            <div className="p-2">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Reações</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {['❤️', '👏', '🎉', '😂', '👍', '🔥'].map((emoji) => (
                                        <button
                                            key={emoji}
                                            className="h-8 w-8 text-lg flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                                            onClick={() => sendEmoji(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <DropdownMenuSeparator className="bg-white/10 my-1" />

                            <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="rounded-xl py-3 flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs font-medium"><Settings className="h-4 w-4" /> Configurações</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                                className="rounded-xl py-3 flex items-center justify-center text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-bold text-xs"
                            >
                                FECHAR OPÇÕES
                            </DropdownMenuItem>
                        </DropdownMenuContent>

                    </DropdownMenu>
                </div >

                <div className="w-px h-10 bg-border/50 hidden md:block" />

                {/* Language Selection - Globe style */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={selectedLang === 'original' ? "secondary" : "default"}
                            size="icon"
                            className={cn(
                                "h-14 w-14 rounded-2xl shadow-xl transition-all active:scale-95 border-0",
                                selectedLang !== 'original' ? "bg-[#06b6d4] text-white hover:bg-[#0891b2]" : "bg-accent/50 text-foreground hover:bg-accent"
                            )}
                            title={t('room.meeting_language')}
                        >
                            <Globe className="h-6 w-6" />
                            {selectedLang !== 'original' && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border border-white dark:border-black text-[8px] items-center justify-center font-bold">
                                        {selectedLang.toUpperCase()}
                                    </span>
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end" className="w-56 max-h-[70vh] overflow-y-auto mb-4 rounded-2xl bg-card border-border p-2 shadow-2xl custom-scrollbar">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5 font-bold">{t('room.listening_language')}</DropdownMenuLabel>
                        {ROOM_LANGUAGES.map((lang) => (
                            <DropdownMenuItem
                                key={lang.code}
                                onClick={() => handleLangChange(lang.code)}
                                className={cn(
                                    "rounded-xl p-3 flex items-center justify-between cursor-pointer",
                                    selectedLang === lang.code && "bg-[#06b6d4]/20 text-[#06b6d4]"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{lang.flag}</span>
                                    <span className="font-semibold">{lang.name}</span>
                                </div>
                                {selectedLang === lang.code && <div className="h-2 w-2 rounded-full bg-[#06b6d4]" />}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="bg-white/10 md:hidden" />
                        <DropdownMenuItem
                            className="md:hidden rounded-xl p-3 flex items-center justify-center text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer font-bold text-xs"
                        >
                            FECHAR MENU
                        </DropdownMenuItem>
                    </DropdownMenuContent>

                </DropdownMenu>

                {
                    selectedLang !== 'original' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="fixed bottom-32 right-10 bg-card/80 backdrop-blur-3xl p-8 rounded-[3rem] border border-border w-64 shadow-2xl z-[50]"
                        >
                            <div className="flex justify-between text-[10px] uppercase font-black tracking-[0.2em] text-[#06b6d4] mb-4">
                                <span>{t('room.floor')}</span>
                                <span>{t('room.interpreter')}</span>
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
                                {t('room.audio_mix')}: {100 - volumeBalance}% / {volumeBalance}%
                            </div>
                        </motion.div>
                    )
                }

                <div className="w-px h-10 bg-border/50 hidden md:block" />

                {
                    currentRole === 'interpreter' && (
                        <>
                            <Button
                                variant="default"
                                className="h-14 px-8 rounded-2xl font-black border-2 transition-all active:scale-95 bg-purple-600 hover:bg-purple-700 border-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.4)] text-white"
                                onClick={() => {
                                    // Toggle interpreter mode or other
                                }}
                            >
                                <Mic className="h-5 w-5 mr-3" />
                                {t('room.mode_interpreter')}
                            </Button>
                        </>
                    )
                }

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

                <Button
                    variant="destructive"
                    size="lg"
                    className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-red-900/20 active:scale-95 border-0 bg-red-500 hover:bg-red-600"
                    onClick={async () => {
                        const isLastParticipant = userCount <= 1;

                        if (currentRole === 'interpreter') {
                            if (isLastParticipant) {
                                await endMeeting(roomId, true)
                            }
                            window.location.href = '/dashboard'
                            return
                        }

                        if (isHost) {
                            if (confirm(t('room.host_leave_confirm') || 'Deseja encerrar a reunião para todos?')) {
                                await endMeeting(roomId)
                                window.location.href = '/dashboard'
                            }
                        } else if (isLastParticipant) {
                            await endMeeting(roomId, true)
                            window.location.href = '/dashboard'
                        } else {
                            window.location.href = '/dashboard'
                        }
                    }}
                >
                    <PhoneOff className="h-5 w-5 mr-3" /> {t('room.leave')}
                </Button>
            </div >

            {/* Upsell Modal for Guests */}
            <UpsellModal isOpen={showUpsell} onOpenChange={setShowUpsell} />

            {/* Floating Reactions Overlay */}
            <FloatingReactions reactions={reactions} />

            {/* BOTÃO DE DEBUG FIXO (Independente de UI Auto-Hide) */}
            <div 
                className="fixed top-2 right-2 md:top-6 md:right-6 z-[100] flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-red-500/50 rounded-full px-3 py-1.5 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:scale-105 transition-transform cursor-pointer"
                onClick={handleOpenDebug}
            >
                <DebugLogs logs={systemLogs} />
                <span className="text-[9px] font-black text-red-500 pr-1 animate-pulse hidden sm:inline tracking-widest">DIAGNOSTICS</span>
            </div>
        </div>
    )
}
