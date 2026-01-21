
'use client'

import { useState, use, useEffect, useRef, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Check,
    Globe, Users, MessageSquare, Monitor, X, ChevronUp, Settings, Share2, Hand, Smile, PlayCircle,
    MoreHorizontal, Volume2, Wifi, WifiOff, AlertTriangle,
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

// Imports updated
import { createClient } from '@/lib/supabase/client' // NEW IMPORT
import { useWebRTC } from '@/hooks/use-webrtc'
import { useChat } from '@/hooks/use-chat'
import { RemoteVideo, LocalVideo } from '@/components/webrtc/video-player'
import { ChatPanel } from '@/components/room/chat-panel'
import { DebugLogs } from '@/components/debug-logs' // NEW
import { ParticipantList } from '@/components/room/participant-list'
// InterpreterControls removed
import { InterpreterConsole } from '@/components/room/InterpreterConsole'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { ShareMeetingDialog } from '@/components/share-meeting-dialog'
import { LANGUAGES } from '@/lib/languages'
import { checkAndEndMeeting, restartPersonalMeeting, endMeeting } from '@/app/actions/meeting' // NEW IMPORT

import { VideoGrid } from '@/components/room/video-grid'
import { LayoutGrid, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { PreCallLobby } from '@/components/room/pre-call-lobby'
import { SettingsDialog } from '@/components/room/settings-dialog'
import { useLanguage } from '@/components/providers/language-provider'
import { InterpreterSetupModal } from '@/components/room/interpreter-setup-modal'
import { VolumeControl } from '@/components/room/volume-control'
import { UpsellModal } from '@/components/marketing/upsell-modal'
import { VirtualBooth } from '@/components/VirtualBooth'
import { GlossaryHUD } from '@/components/GlossaryHUD'
import { FatigueTimer } from '@/components/room/FatigueTimer'
import { AudioProcessor } from '@/components/audio/AudioProcessor'
import { BriefingModal } from '@/components/briefing/BriefingModal'
import { RecorderControls } from '@/components/room/RecorderControls'
import { MinutesPanel } from '@/components/room/MinutesPanel'
import { useMeetingTranscription } from '@/hooks/useMeetingTranscription'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition' // NEW IMPORT

export default function RoomPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ role?: string }> }) {
    // ... preceding state remains ...
    const { id: roomId } = use(params)
    const { role } = use(searchParams)
    const { t } = useLanguage()

    // User Identity Logic
    const [userId, setUserId] = useState('')
    const [userName, setUserName] = useState(t('room.participant_default'))
    const [currentRole, setCurrentRole] = useState<string>('participant')
    const [isLoaded, setIsLoaded] = useState(false)
    const [showUpsell, setShowUpsell] = useState(false) // NEW STATE

    // State declarations moved for hoisting
    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(true)
    const [selectedLang, setSelectedLang] = useState('original')
    const [volumeBalance, setVolumeBalance] = useState(20)
    const [myBroadcastLang, setMyBroadcastLang] = useState('floor')
    const [masterVolume, setMasterVolume] = useState(1) // 0 to 1
    const [showLangMenu, setShowLangMenu] = useState(false)
    const [attentionToast, setAttentionToast] = useState<{ id: string, name: string } | null>(null)
    const [activeSidebar, setActiveSidebar] = useState<'chat' | 'participants' | null>(null)
    const [isSharing, setIsSharing] = useState(false)
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
    const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([])
    const [activeLanguages, setActiveLanguages] = useState<string[]>([]) // Dynamic languages from DB
    const [assignedLanguages, setAssignedLanguages] = useState<string[]>([]) // For restricted interpreters
    const [isSettingsOpen, setIsSettingsOpen] = useState(false) // Added for mobile menu control
    const [isGlossaryActive, setIsGlossaryActive] = useState(true) // Default to true for now
    const [isShadowing, setIsShadowing] = useState(false) // NEW: Shadowing Mode
    const [isMinutesActive, setIsMinutesActive] = useState(false) // NEW: Minutes Mode

    // Layout and Join States
    const [isJoined, setIsJoined] = useState(false)
    const [lobbyConfig, setLobbyConfig] = useState<{
        micOn: boolean,
        cameraOn: boolean,
        audioDeviceId: string,
        videoDeviceId: string,
        stream?: MediaStream
    } | null>(null)

    const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery')
    const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
    const [pinnedSpeakerId, setPinnedSpeakerId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const itemsPerPage = 49

    // Local Mute State
    const [localMutedPeers, setLocalMutedPeers] = useState<Set<string>>(new Set())

    const handleToggleLocalMute = (targetId: string) => {
        setLocalMutedPeers(prev => {
            const next = new Set(prev)
            if (next.has(targetId)) next.delete(targetId)
            else next.add(targetId)
            return next
        })
    }


    // --- SHARED SPEECH RECOGNITION (Singleton) ---
    // This instance is shared between Minutes and Glossary to avoid conflicts.
    const {
        isListening: isSpeechListening,
        transcript: speechTranscript,
        startListening: startSpeechListening,
        stopListening: stopSpeechListening,
        isSupported: isSpeechSupported,
        error: speechError
    } = useSpeechRecognition(myBroadcastLang === 'floor' || selectedLang === 'original' ? 'pt-BR' : myBroadcastLang) // Default to PT or Broadcast Lang

    // Manage Speech Recognition Lifecycle
    useEffect(() => {
        if (!isSpeechSupported) return

        const shouldListen = micOn && !isShadowing && (isMinutesActive || isGlossaryActive)

        if (shouldListen && !isSpeechListening) {
            startSpeechListening()
        } else if (!shouldListen && isSpeechListening) {
            stopSpeechListening()
        }
    }, [micOn, isShadowing, isMinutesActive, isGlossaryActive, isSpeechSupported, isSpeechListening, startSpeechListening, stopSpeechListening])
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

                if (user) {
                    setUserId(user.id)
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role, full_name, username')
                        .eq('id', user.id)
                        .single()

                    if (profileError) {
                        console.error('Error fetching profile:', profileError)
                    }

                    if (profile) {
                        setUserName(profile.full_name || profile.username || user?.user_metadata?.full_name || user.email?.split('@')[0] || t('room.participant_default'))
                        setCurrentRole(profile.role || user?.user_metadata?.role || 'participant')
                    } else {
                        // Fallback if profile fetch fails but user exists (shouldn't happen often but RLS might cause it)
                        setUserName(user?.user_metadata?.full_name || user.email?.split('@')[0] || t('room.participant_default'))
                        setCurrentRole(user?.user_metadata?.role || 'participant')
                    }
                    // Check Meeting Interpreters (Item 1)
                    const { data: meeting } = await supabase
                        .from('meetings')
                        .select('settings, start_time, status, host_id')
                        .eq('id', roomId)
                        .single()

                    if (meeting?.settings?.minutes_active) {
                        setIsMinutesActive(true)
                    }

                    // Check Expiration (Lazy Check)
                    if (meeting?.status === 'active' && meeting.start_time) {
                        const startTime = new Date(meeting.start_time).getTime()
                        const diffMinutes = (Date.now() - startTime) / (1000 * 60)

                        if (diffMinutes > 120) {
                            // Expired. Kill it.
                            const { expired } = await checkAndEndMeeting(roomId)
                            if (expired) {
                                // IF HOST, AUTO RESTART
                                if (meeting.host_id === user.id) {
                                    await restartPersonalMeeting(roomId)
                                    window.location.reload()
                                    return
                                }

                                alert(t('room.meeting_expired_title'))
                                window.location.href = '/dashboard'
                                return
                            }
                        }
                    } else if (meeting?.status === 'ended') {
                        // IF HOST, AUTO RESTART
                        if (meeting.host_id === user.id) {
                            await restartPersonalMeeting(roomId)
                            window.location.reload()
                            return
                        }

                        alert(t('room.meeting_ended_title'))
                        window.location.href = '/dashboard'
                        return
                    }

                    // Check Meeting Interpreters (Item 1)
                    if (meeting?.settings?.interpreters) {
                        const interpreterConfig = meeting.settings.interpreters.find(
                            (i: any) => i.email?.toLowerCase() === user.email?.toLowerCase()
                        )

                        if (interpreterConfig) {
                            setCurrentRole('interpreter')
                            // Support single 'lang' or array 'langs'
                            if (interpreterConfig.lang) {
                                setAssignedLanguages([interpreterConfig.lang])
                                // Auto-set the broadcast language
                                setMyBroadcastLang(interpreterConfig.lang)
                            } else if (interpreterConfig.langs) {
                                setAssignedLanguages(interpreterConfig.langs)
                                setMyBroadcastLang(interpreterConfig.langs[0])
                            }
                        }
                    }

                    if (meeting?.settings?.active_languages) {
                        setActiveLanguages(meeting.settings.active_languages)
                    }
                } else {
                    // Guests also need to check expiration? Ideally yes, but server action is somewhat protected.
                    // Let's do a client check first to fail fast.
                    const { data: meeting } = await supabase.from('meetings').select('status, start_time, settings').eq('id', roomId).single()

                    if (meeting?.status === 'ended') {
                        alert(t('room.meeting_ended_title'))
                        window.location.href = '/dashboard'
                        return
                    }

                    if (meeting?.status === 'active' && meeting.start_time) {
                        const startTime = new Date(meeting.start_time).getTime()
                        const diffMinutes = (Date.now() - startTime) / (1000 * 60)
                        if (diffMinutes > 120) {
                            alert(t('room.meeting_limit_title'))
                            window.location.href = '/login' // Guests to login
                            return
                        }
                    }

                    if (meeting?.settings?.active_languages) {
                        setActiveLanguages(meeting.settings.active_languages)
                    }
                    if (meeting?.settings?.minutes_active) {
                        setIsMinutesActive(true)
                    }

                    const guestId = 'guest-' + Math.random().toString(36).substr(2, 9)
                    setUserId(guestId)
                    setUserName(t('room.guest_default'))
                    setCurrentRole('participant')
                }
            } catch (error) {
                console.error("Critical error in initUser:", error)
            } finally {
                setIsLoaded(true)
            }
        }
        initUser()
    }, [roomId])

    // State declarations previously here were moved up to fix 'used before declaration' errors
    // State declarations previously here were moved up to fix 'used before declaration' errors

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
        switchDevice: switchDeviceWebRTC,
        sendEmoji,
        shareVideoFile,
        toggleHand,
        localHandRaised,
        isHost,
        sharingUserId,
        isAnySharing,
        reactions,
        hostId,
        promoteToHost,
        kickUser,
        updateUserRole,

        updateUserLanguages,
        muteUser,
        blockUserAudio,
        unblockUserAudio,
        reconnect,
        connectionState
    } = useWebRTC(roomId, userId, currentRole, lobbyConfig || {}, isJoined, userName)


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

    const handleVideoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsSharing(true)
            await shareVideoFile(file)
            setIsSharing(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    useEffect(() => {
        const handleActivity = () => {
            setShowUI(true)
            setLastInteraction(Date.now())
        }
        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('mousedown', handleActivity)
        window.addEventListener('keydown', handleActivity)
        window.addEventListener('touchstart', handleActivity)
        const interval = setInterval(() => {
            if (Date.now() - lastInteraction > 3000 && !activeSidebar) {
                setShowUI(false)
            }
        }, 1000)
        return () => {
            window.removeEventListener('mousemove', handleActivity)
            window.removeEventListener('mousedown', handleActivity)
            window.removeEventListener('keydown', handleActivity)
            window.removeEventListener('touchstart', handleActivity)
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
        const handleLangUpdate = (e: CustomEvent<string[]>) => {
            console.log("Admin updated my languages:", e.detail)
            setAssignedLanguages(e.detail)
            // If my current broadcast lang is not in the new allowed list, reset to floor or first allowed
            if (e.detail.length > 0 && !e.detail.includes(myBroadcastLang)) {
                setMyBroadcastLang(e.detail[0])
            } else if (e.detail.length === 0) {
                // If no languages allowed, maybe force floor?
                setMyBroadcastLang('floor')
            }
        }
        window.addEventListener('admin-update-languages' as any, handleLangUpdate as any)
        return () => window.removeEventListener('admin-update-languages' as any, handleLangUpdate as any)
    }, [myBroadcastLang])

    // Permission Logic
    const canManageMinutes = isHost || currentRole === 'admin'

    // Listen for Admin Mute
    useEffect(() => {
        const handleMute = () => {
            // Optional: Show Toast
            alert('O anfitrião desativou seu microfone.')
        }
        window.addEventListener('admin-mute', handleMute)
        return () => window.removeEventListener('admin-mute', handleMute)
    }, [])

    // Listen for Meeting Settings Updates (Minutes, etc)
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel(`meeting-settings:${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'meetings',
                filter: `id=eq.${roomId}`
            }, (payload) => {
                const newSettings = payload.new.settings
                if (newSettings) {
                    setIsMinutesActive(!!newSettings.minutes_active)
                }
            })
            .subscribe()

        return () => { channel.unsubscribe() }
    }, [roomId])

    const handleToggleMinutes = async () => {
        if (!canManageMinutes) return;
        const supabase = createClient()
        // We need to fetch current settings first to merge or just update jsonb (Supabase merges top-level but be careful)
        // Safer to fetch and update
        const { data: meeting } = await supabase.from('meetings').select('settings').eq('id', roomId).single()
        const currentSettings = meeting?.settings || {}

        const newState = !isMinutesActive

        await supabase.from('meetings').update({
            settings: { ...currentSettings, minutes_active: newState }
        }).eq('id', roomId)

        // Optimistic update
        setIsMinutesActive(newState)
    }

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


    // AI Transcription Background Service
    useMeetingTranscription({
        meetingId: roomId,
        userId: userId,
        userName: userName,
        isMicOn: micOn && !isShadowing, // Don't transcript if shadowing
        language: myBroadcastLang === 'floor' ? 'pt-BR' : myBroadcastLang, // Simplistic lang detection
        enabled: isMinutesActive,
        transcript: speechTranscript // Shared Transcript
    })

    const handleToggleMic = () => {
        // If shadowing, we keep micOn locally true (for recorder) but ensure WebRTC is muted?
        // Actually, logic is:
        // Normal Mode: micOn = true -> WebRTC Unmuted
        // Shadowing Mode: micOn = true -> WebRTC Muted (but local stream active for Recorder)

        // HOWEVER, hookToggleMic controls the TRACK enabled state, which affects ALL consumers (Recorder too usually, unless we cloned the stream before).
        // Since we pass 'localStream' to recorder, disabling the track there disables it for recorder too.

        // WORKAROUND: We need 'hookToggleMic' to ONLY affect the PeerConnection sending, NOT the local track itself.
        // But 'use-webrtc' likely toggles track.enabled.

        // Strategy B: Keep track enabled. Use 'muteUser' or similar? No that's for incoming.
        // Simple strategy: When IS SHADOWING, we DO NOT call hookToggleMic(true). We fake it ui-wise?

        // Let's refine:
        // If Shadowing is ON:
        //   User clicks Mic: Toggles 'micOn' state.
        //   But we force hookToggleMic(false) always so peers don't hear.

        const newState = !micOn
        setMicOn(newState)

        if (isShadowing) {
            // In shadowing, we want local mic ON (newState=true) but remote OFF.
            // So we ensure hookToggleMic is FALSE always.
            hookToggleMic(false)
        } else {
            // Normal behavior
            hookToggleMic(newState)
        }
    }

    // Effect to enforce Shadowing logic when mode changes
    useEffect(() => {
        if (isShadowing) {
            // Enter Shadowing: Cut audio to peers immediately
            hookToggleMic(false)
            // But if mic was on, keep 'micOn' true so user sees they are "speaking" (to recorder)
        } else {
            // Exit Shadowing: Restore audio to peers if mic is theoretically on
            if (micOn) hookToggleMic(true)
        }
    }, [isShadowing])

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

    const handleToggleCamera = () => {
        const newState = !cameraOn
        setCameraOn(newState)
        hookToggleCamera(newState)
    }

    const handleToggleShare = async () => {
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
    }

    const availableSystemLanguages = activeLanguages.length > 0
        ? LANGUAGES.filter(l => activeLanguages.includes(l.code))
        : LANGUAGES

    const ROOM_LANGUAGES = [
        { code: 'original', name: t('room.original_audio'), flag: '🏳️' },
        ...availableSystemLanguages
    ]

    const handleLangChange = (code: string) => {
        setSelectedLang(code)
        setShowLangMenu(false)
        setVolumeBalance(code !== 'original' ? 80 : 0)
    }

    // Automatic Speaker Detection
    const handlePeerSpeaking = (id: string, isSpeaking: boolean) => {
        if (isSpeaking && !pinnedSpeakerId) {
            setActiveSpeakerId(id)
        }
    }

    const handleSpeakerChange = (id: string) => {
        if (pinnedSpeakerId === id) {
            setPinnedSpeakerId(null) // Unpin if clicking same
        } else {
            setPinnedSpeakerId(id)
            setViewMode('speaker') // Auto switch to speaker mode when pinning
        }
    }

    // Network Status Monitoring
    const [isOnline, setIsOnline] = useState(true)

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

    const isSignalingConnected = connectionState === 'SUBSCRIBED'



    if (!isLoaded) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020817] text-white gap-4">
                <div className="h-8 w-8 border-4 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm animate-pulse">{t('room.connecting') || 'Carregando...'}</p>
            </div>
        )
    }

    if (!isJoined) {
        return (
            <PreCallLobby
                userName={userName}
                isGuest={isGuest}
                onJoin={(config: any) => {
                    setLobbyConfig(config)
                    setMicOn(config.micOn)
                    setCameraOn(config.cameraOn)
                    setUserName(config.name)
                    setIsJoined(true)
                }}
            />
        )
    }



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
                        "px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1",
                        userCount > 1 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'
                    )}>
                        <Users className="h-3 w-3" />
                        <span>{userCount}</span>
                        <span className="hidden xs:inline ml-1">{t('room.online')}</span>
                    </div>
                </div>

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
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Main Layout (Flex Row) */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Video Grid Section */}
                <div className="flex-1 min-w-0 p-2 md:p-6 flex items-center justify-center transition-all duration-300 relative">
                    <VideoGrid
                        peers={paginatedPeers}
                        localStream={localStream}
                        currentRole={currentRole}
                        micOn={micOn}
                        cameraOn={cameraOn}
                        mode={viewMode}
                        activeSpeakerId={activeSpeakerId}
                        pinnedSpeakerId={pinnedSpeakerId}
                        onSpeakerChange={handleSpeakerChange}
                        onPeerSpeaking={handlePeerSpeaking}
                        localUserName={userName}
                        selectedLang={selectedLang}
                        volumeBalance={volumeBalance}
                        handRaised={localHandRaised}
                        masterVolume={masterVolume}
                        localMutedPeers={localMutedPeers}
                        onMutePeer={muteUser}
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
                                        {
                                            userId: userId,
                                            name: `${userName} (Você)`,
                                            role: currentRole,
                                            micOn: micOn,
                                            cameraOn: cameraOn,
                                            handRaised: localHandRaised,
                                            isHost: isHost
                                        },
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

            {(currentRole.toLowerCase().includes('interpreter') || currentRole.toLowerCase().includes('admin')) && (
                <>
                    <InterpreterSetupModal
                        isOpen={isJoined && currentRole.toLowerCase().includes('interpreter') && assignedLanguages.length === 0 && myBroadcastLang === 'floor'} // Show if interpreter, joined, and hasn't picked non-floor language (unless pre-assigned restricted)
                        // Logic refinement: If user has 'assignedLanguages' from DB, maybe we don't need modal? Or we do active selection from allowed?
                        // Let's assume we force selection if myBroadcastLang is 'floor' (default).
                        // We need a state to track "setup done" to avoid showing it if they genuinely want to be on 'floor' (unlikely for active interpreter).
                        // Better: use explicit state [interpreterSetupDone, setInterpreterSetupDone]
                        // But for now, let's use the local state I'll add below.

                        availableLanguages={availableSystemLanguages}
                        occupiedLanguages={peers.filter(p => p.role?.includes('interpreter') && p.userId !== userId).map(p => p.language).filter(Boolean) as string[]}
                        onSelect={(lang: any) => {
                            setMyBroadcastLang(lang)
                            // Trigger update metadata immediate
                            updateMetadata({ language: lang })
                        }}
                        userName={userName}
                    />

                    <InterpreterConsole
                        active={micOn}
                        onToggleActive={handleToggleMic}
                        currentLanguage={myBroadcastLang}
                        onLanguageChange={(lang: any) => {
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
                            // I accepted the handover, so I go ON AIR
                            if (!micOn) handleToggleMic()
                        }}
                    />

                    <GlossaryHUD
                        meetingId={roomId}
                        isInterpreter={true}
                        targetLanguage={selectedLang}
                        isActive={isGlossaryActive}
                        onClose={() => setIsGlossaryActive(false)}
                        transcript={speechTranscript}
                        isListening={isSpeechListening}
                        speechError={speechError}
                        isSupported={isSpeechSupported}
                    />
                </>
            )}
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
                            {t('room.translation_channels')}
                        </div>
                        <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                            {ROOM_LANGUAGES.map((lang) => (
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
                                        <div className="ml-auto w-2 h-2 rounded-full bg-[#06b6d4]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Control Bar */}
            <div className="h-20 md:h-28 bg-card/85 backdrop-blur-3xl border-t border-border flex items-center justify-evenly md:justify-center gap-2 md:gap-4 relative z-[50] px-2 md:px-10 pb-safe transition-all w-full">
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
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Briefing Button */}
                    <div className="hidden md:block">
                        <BriefingModal roomId={roomId} isHost={isHost} />
                    </div>

                    {/* AI Minutes Button */}
                    <div className="hidden md:block">
                        <MinutesPanel
                            meetingId={roomId}
                            isHost={canManageMinutes}
                            isActive={isMinutesActive}
                            onToggle={handleToggleMinutes}
                            currentTranscript={speechTranscript}
                        />
                    </div>

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
                        currentAudioId={localStorage.getItem('preferredAudioDevice') || undefined}
                        currentVideoId={localStorage.getItem('preferredVideoDevice') || undefined}
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
                            <div className="ml-4 flex items-center gap-4 bg-black/40 p-2 rounded-xl backdrop-blur border border-white/5">
                                <FatigueTimer isActive={micOn} />
                                <div className="h-8 w-px bg-white/10" />
                                <RecorderControls
                                    stream={localStream}
                                    isShadowing={isShadowing}
                                    onToggleShadowing={() => setIsShadowing(prev => !prev)}
                                />
                                <div className="h-8 w-px bg-white/10" />
                                <AudioProcessor stream={localStream} isEnabled={true} />
                            </div>
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
                        if (currentRole === 'interpreter') {
                            // Interpreters just leave
                            const supabase = createClient()
                            await supabase.auth.signOut() // Optional: sign out if guest? 
                            window.location.href = '/dashboard'
                            return
                        }

                        // Check if host
                        if (isHost) {
                            if (confirm(t('room.host_leave_confirm'))) {
                                await endMeeting(roomId)
                                window.location.href = '/dashboard'
                            }
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
            < FloatingReactions reactions={reactions} />
        </div >
    )
}
