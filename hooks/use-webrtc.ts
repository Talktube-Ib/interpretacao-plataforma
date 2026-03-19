import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/lib/polyfills'
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Track,
    RoomOptions,
    ReconnectPolicy,
    DefaultReconnectPolicy,
    TrackPublication,
    ConnectionQuality,
    VideoPresets,
    Participant,
} from 'livekit-client'
import { useSignaling } from './use-signaling'

interface PeerData {
    userId: string
    id: string // Identidade LiveKit completa (baseId_randomSuffix)
    stream: MediaStream | null
    screenStream: MediaStream | null
    role: string
    language?: string
    micOn: boolean
    cameraOn: boolean
    isSpeaking?: boolean
    connectionQuality: string // Added connectionQuality
    isGhost?: boolean
    handRaised?: boolean
    name: string
    isPresentation?: boolean
    isHost?: boolean
    connectionState: 'connecting' | 'connected' | 'failed' | 'disconnected' | 'closed'
    audioBlocked?: boolean
    joinedAt?: number
}

interface UserMetadata {
    [key: string]: any
    name: string
    role: string
    micOn: boolean
    cameraOn: boolean
    handRaised: boolean
    language: string
    audioBlocked: boolean
    isHost: boolean
    isGhost: boolean
}

// FIX: reconnect policy separada do Room, reutilizável
// Tenta reconectar até 5x com backoff exponencial (1s, 2s, 4s, 8s, 16s)
class ExponentialReconnectPolicy implements ReconnectPolicy {
    private attempt = 0
    nextRetryDelayInMs(context: { retryCount: number; elapsedMs: number }): number | null {
        if (this.attempt >= 5) return null // desiste após 5 tentativas
        const delay = Math.min(1000 * Math.pow(2, this.attempt), 16000)
        this.attempt++
        return delay
    }
}

export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: {
        micOn?: boolean
        cameraOn?: boolean
        audioDeviceId?: string
        videoDeviceId?: string
        stream?: MediaStream
    } = {},
    isJoined: boolean = false,
    userName: string = 'Participante',
    liveKitToken?: string,
    isGhostMode: boolean = false,
    initialHostId?: string,
    iceServers?: RTCIceServer[],
    mediaProps?: {
        stream: MediaStream | null
        toggleMic: (enabled: boolean) => void
        toggleCamera: (enabled: boolean) => void
        switchDevice: (kind: 'audio' | 'video', deviceId: string) => Promise<MediaStreamTrack | undefined>
        error: string | null
    }
) {
    const sessionUserId = userId

    const [room, setRoom] = useState<Room | null>(null)
    const [peers, setPeers] = useState<PeerData[]>([])
    const [localStreamFromRoom, setLocalStreamFromRoom] = useState<MediaStream | null>(null)

    // Backwards compatibility for internal usage
    const localStream = mediaProps?.stream ?? null
    const mediaError = mediaProps?.error ?? null

    // Backwards compatibility and internal use
    const toggleMicStream = useCallback((enabled: boolean) => {
        if (room) room.localParticipant.setMicrophoneEnabled(enabled).catch(console.error)
        else mediaProps?.toggleMic(enabled)
    }, [room, mediaProps])

    const toggleCameraStream = useCallback((enabled: boolean) => {
        if (room) room.localParticipant.setCameraEnabled(enabled).catch(console.error)
        else mediaProps?.toggleCamera(enabled)
    }, [room, mediaProps])

    const switchDevice = useCallback(async (kind: 'audio' | 'video', deviceId: string) => {
        if (room) {
            if (kind === 'audio') await room.switchActiveDevice('audioinput', deviceId)
            else await room.switchActiveDevice('videoinput', deviceId)
            return undefined // LiveKit switch doesn't return the track directly here
        }
        return mediaProps?.switchDevice(kind, deviceId)
    }, [room, mediaProps])
    const [userCount, setUserCount] = useState(0)
    const [sharingUserId, setSharingUserId] = useState<string | null>(null)
    const [hostId, setHostId] = useState<string | null>(initialHostId || null)
    const [isHandoverRequested, setIsHandoverRequested] = useState(false)

    // Sync local tracks from Room to localStreamFromRoom
    useEffect(() => {
        if (!room) {
            setLocalStreamFromRoom(null)
            return
        }

        const syncLocalTracks = () => {
            const tracks = room.localParticipant.getTrackPublications()
                .map(pub => pub.track?.mediaStreamTrack)
                .filter(Boolean) as MediaStreamTrack[]
            
            if (tracks.length > 0) {
                setLocalStreamFromRoom(new MediaStream(tracks))
            } else {
                setLocalStreamFromRoom(null)
            }
        }

        room.on(RoomEvent.LocalTrackPublished, syncLocalTracks)
        room.on(RoomEvent.LocalTrackUnpublished, syncLocalTracks)
        // Também ouve mutes para garantir que o stream reflita o estado real
        room.on(RoomEvent.TrackMuted, syncLocalTracks)
        room.on(RoomEvent.TrackUnmuted, syncLocalTracks)
        
        syncLocalTracks()

        return () => {
            room.off(RoomEvent.LocalTrackPublished, syncLocalTracks)
            room.off(RoomEvent.LocalTrackUnpublished, syncLocalTracks)
            room.off(RoomEvent.TrackMuted, syncLocalTracks)
            room.off(RoomEvent.TrackUnmuted, syncLocalTracks)
        }
    }, [room])
    const [localHandRaised, setLocalHandRaised] = useState(false)
    const [reactions, setReactions] = useState<{ id: string; emoji: string; userId: string }[]>([])
    const [mediaStatus, setMediaStatus] = useState<'connecting' | 'connected' | 'failed' | 'disconnected'>('disconnected')
    const [lastError, setLastError] = useState<string | null>(null)
    const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null)

    const roomRef = useRef<Room | null>(null)
    // FIX: sharingUserIdRef para evitar closure stale no handleTrackUnsubscribed
    const sharingUserIdRef = useRef<string | null>(null)

    const metadataRef = useRef<UserMetadata>({
        name: userName,
        role: userRole,
        micOn: initialConfig.micOn !== false,
        cameraOn: initialConfig.cameraOn !== false,
        handRaised: false,
        language: 'floor',
        audioBlocked: false,
        isHost: false,
        isGhost: isGhostMode,
    })

    const peersRef = useRef<Map<string, PeerData>>(new Map())
    const lastAudioDeviceId = useRef<string | undefined>(initialConfig.audioDeviceId)
    const lastVideoDeviceId = useRef<string | undefined>(initialConfig.videoDeviceId)
    // FIX: guarda o token atual em ref para não re-criar o Room a cada refresh de token
    const liveKitTokenRef = useRef<string | undefined>(liveKitToken)

    // Mantém ref sincronizado com prop (sem re-criar o Room)
    useEffect(() => {
        liveKitTokenRef.current = liveKitToken
        metadataRef.current.cameraOn = initialConfig.cameraOn !== false
        metadataRef.current.micOn = initialConfig.micOn !== false
        metadataRef.current.name = userName
    }, [liveKitToken, initialConfig.cameraOn, initialConfig.micOn, userName])

    // Mantém sharingUserIdRef sincronizado com state
    useEffect(() => {
        sharingUserIdRef.current = sharingUserId
    }, [sharingUserId])

    const syncToState = useCallback(() => {
        const allPeers = Array.from(peersRef.current.entries()).map(([id, data]) => ({
            ...data,
            id
        }))
        const isAdmin = userRole === 'admin' || userRole === 'MASTER'
        const visiblePeers = allPeers.filter(p => !p.isGhost || isAdmin)
        setPeers(visiblePeers)

        if (roomRef.current) {
            const remoteVisibleCount = allPeers.filter(p => !p.isGhost).length
            const selfVisible = isGhostMode ? 0 : 1
            setUserCount(remoteVisibleCount + selfVisible)
        } else if (isJoined) {
            setUserCount(isGhostMode ? 0 : 1)
        }
    }, [isJoined, userRole, isGhostMode])

    // ─── LiveKit Room Connection ───────────────────────────────────────────────
    // FIX: deps reduzidas — só reconecta se roomId ou sessionUserId mudar.
    // liveKitToken não está nas deps porque usamos a ref; isso evita que um
    // refresh de token destrua e recrie o Room (causando flash de desconexão).
    useEffect(() => {
        if (!isJoined || !liveKitTokenRef.current || !roomId) return

        let cancelled = false
        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            reconnectPolicy: new ExponentialReconnectPolicy(),
            publishDefaults: {
                simulcast: true,
                videoCodec: 'vp8',
                videoEncoding: {
                    maxBitrate: 400_000,
                    maxFramerate: 20,
                },
                screenShareEncoding: {
                    maxBitrate: 1_500_000,
                    maxFramerate: 12,
                },
            },
        })

        roomRef.current = room

        const handleParticipantConnected = (participant: RemoteParticipant) => {
            console.log('[LK] Participant connected:', participant.identity)
            const fullIdentity = participant.identity
            const baseUserId = fullIdentity.split('_')[0]
            const existing = peersRef.current.get(fullIdentity)
            
            if (existing) {
                existing.connectionState = 'connected'
                peersRef.current.set(fullIdentity, existing)
            } else {
                const remoteData = (roomRef.current?.remoteParticipants.get(fullIdentity) as any)?.metadata
                    ? JSON.parse((roomRef.current?.remoteParticipants.get(fullIdentity) as any).metadata)
                    : {}
                peersRef.current.set(fullIdentity, {
                    userId: baseUserId,
                    id: fullIdentity,
                    name: remoteData?.name || 'Participante',
                    role: remoteData?.role || 'participant',
                    micOn: false,
                    cameraOn: false,
                    isSpeaking: false,
                    handRaised: false,
                    connectionQuality: 'excellent',
                    connectionState: 'connected',
                    joinedAt: Date.now(),
                    stream: null,
                    screenStream: null,
                })
            }
            setUserCount(room.remoteParticipants.size + 1)
            syncToState()
        }

        const handleParticipantDisconnected = (participant: RemoteParticipant) => {
            console.log('[LK] Participant disconnected:', participant.identity)
            peersRef.current.delete(participant.identity)
            peersRef.current.delete(`${participant.identity}-presentation`)
            setUserCount(room.remoteParticipants.size + 1)
            syncToState()
        }

        const handleTrackSubscribed = (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log(`[LK] Track subscribed: ${track.kind} (${publication.source}) from ${participant.identity}`)
            const fullIdentity = participant.identity
            const baseUserId = fullIdentity.split('_')[0]
            const isScreen = publication.source === Track.Source.ScreenShare

            const existing = peersRef.current.get(fullIdentity) || {
                userId: baseUserId,
                id: fullIdentity,
                name: participant.name || participant.identity,
                role: 'participant',
                connectionState: 'connected' as const,
                joinedAt: Date.now(),
                cameraOn: false,
                micOn: false,
                isSpeaking: false,
                handRaised: false,
                connectionQuality: 'excellent',
                stream: null,
                screenStream: null
            } as PeerData

            if (isScreen) {
                const currentTracks = existing.screenStream?.getTracks() || []
                const newTracks = [...currentTracks.filter(t => t.kind !== track.kind), track.mediaStreamTrack]
                existing.screenStream = new MediaStream(newTracks)
                setSharingUserId(baseUserId)
            } else {
                const currentTracks = existing.stream?.getTracks() || []
                const newTracks = [...currentTracks.filter(t => t.kind !== track.kind), track.mediaStreamTrack]
                existing.stream = new MediaStream(newTracks)
                if (track.kind === Track.Kind.Video) existing.cameraOn = true
                if (track.kind === Track.Kind.Audio) existing.micOn = true
            }

            existing.connectionState = 'connected'
            peersRef.current.set(fullIdentity, existing)
            syncToState()
            setUserCount(room.remoteParticipants.size + 1)
        }

        const handleTrackUnsubscribed = (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log(`[LK] Track unsubscribed: ${track.kind} from ${participant.identity}`)
            const peerId = participant.identity
            const baseUserId = peerId.split('_')[0]
            const existing = peersRef.current.get(peerId)
            if (!existing) return

            const isScreen = publication.source === Track.Source.ScreenShare
            const stream = isScreen ? (existing.screenStream || null) : (existing.stream || null)

            if (stream) {
                stream.removeTrack(track.mediaStreamTrack)
                if (stream.getTracks().length > 0) {
                    if (isScreen) existing.screenStream = new MediaStream(stream.getTracks())
                    else existing.stream = new MediaStream(stream.getTracks())
                } else {
                    if (isScreen) {
                        existing.screenStream = null
                        if (sharingUserIdRef.current === baseUserId) setSharingUserId(null)
                    } else {
                        existing.stream = null
                    }
                }
            }

            if (!isScreen) {
                if (track.kind === Track.Kind.Video) existing.cameraOn = false
                if (track.kind === Track.Kind.Audio) existing.micOn = false
            }

            peersRef.current.set(peerId, existing)
            syncToState()
        }

        const handleReconnected = async () => {
            console.log('[LK] Reconnected')
            setMediaStatus('connected')
        }

        room
            .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
            .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
            .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
            .on(RoomEvent.Disconnected, reason => {
                if (!cancelled) setMediaStatus('disconnected')
            })
            .on(RoomEvent.Reconnecting, () => {
                if (!cancelled) setMediaStatus('connecting')
            })
            .on(RoomEvent.Reconnected, handleReconnected)

        const connect = async () => {
            try {
                if (cancelled) return
                setMediaStatus('connecting')
                await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, liveKitTokenRef.current!, { rtcConfig: { iceServers } })
                if (cancelled) { room.disconnect(); return }
                setMediaStatus('connected')
                setLastError(null)

                const canPublish = !['guest', 'viewer'].includes(userRole.toLowerCase())
                if (canPublish) {
                    await room.localParticipant.setMicrophoneEnabled(initialConfig.micOn !== false)
                    await room.localParticipant.setCameraEnabled(initialConfig.cameraOn !== false)
                }
                setUserCount(room.remoteParticipants.size + 1)
            } catch (error) {
                if (cancelled) return
                setLastError(error instanceof Error ? error.message : String(error))
                setMediaStatus('failed')
            }
        }

        connect()

        return () => {
            cancelled = true
            room.removeAllListeners()
            room.disconnect()
            roomRef.current = null
        }
    }, [isJoined, roomId, sessionUserId])

    const signaling = useSignaling(
        roomId,
        sessionUserId,
        metadataRef.current,
        {
            onSignal: () => {},
            onShareStarted: payload => setSharingUserId(payload.sender),
            onShareEnded: () => setSharingUserId(null),
            onHostPromoted: payload => setHostId(payload.hostId),
            onReaction: payload => {
                const id = Math.random().toString(36).substring(2, 11)
                setReactions(prev => [...prev, { id, emoji: payload.emoji, userId: payload.sender }])
                setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 5000)
            },
            onRoomEvent: (event) => handleRoomEvent(event),
            onPresenceSync: (u, s) => handlePresenceSync(u, s),
        },
        isJoined
    )

    // ─── Signaling & Presence ─────────────────────────────────────────────────
    function handleRoomEvent(event: { created_by: string; type: string; payload: Record<string, any> }) {
        if (event.created_by === userId) return
        const { type, payload: data } = event

        if (data.targetId === userId) {
            if (type === 'KICK') {
                alert('Você foi removido da reunião pelo administrador.')
                window.location.href = '/dashboard'
            } else if (type === 'MUTE') {
                toggleMicStream(false)
                window.dispatchEvent(new CustomEvent('admin-mute'))
            } else if (type === 'BLOCK_AUDIO') {
                metadataRef.current.audioBlocked = true
                toggleMicStream(false)
                alert('Seu áudio foi bloqueado pelo anfitrião.')
            } else if (type === 'UNBLOCK_AUDIO') {
                metadataRef.current.audioBlocked = false
                alert('Seu áudio foi desbloqueado.')
            } else if (type === 'SET_ROLE') {
                metadataRef.current.role = data.role
            }
            signaling?.trackMetadata(metadataRef.current)
        }
    }

    function handlePresenceSync(users: string[], state: Record<string, UserMetadata[]>) {
        let changed = false
        Array.from(peersRef.current.keys()).forEach(peerId => {
            if (peerId.endsWith('-presentation')) return
            if (!users.includes(peerId) && peerId !== sessionUserId) {
                peersRef.current.delete(peerId)
                changed = true
            }
        })
        users.forEach(remoteSessionId => {
            if (remoteSessionId === sessionUserId) return
            const remoteData = (state[remoteSessionId] as any[])?.[0]
            const remoteId = remoteSessionId.split('_')[0]
            const existing = peersRef.current.get(remoteSessionId)

            if (existing) {
                let peerChanged = false
                const fields: Array<keyof typeof existing> = ['name', 'micOn', 'cameraOn', 'handRaised', 'language', 'isHost', 'isGhost', 'audioBlocked']
                fields.forEach(f => {
                    const newVal = remoteData?.[f as string]
                    if (existing[f] !== newVal) { (existing as any)[f] = newVal; peerChanged = true }
                })
                if (peerChanged) changed = true
            } else {
                peersRef.current.set(remoteSessionId, {
                    userId: remoteId,
                    id: remoteSessionId,
                    name: remoteData?.name || 'Participante',
                    role: remoteData?.role || 'participant',
                    micOn: !!remoteData?.micOn,
                    cameraOn: !!remoteData?.cameraOn,
                    handRaised: !!remoteData?.handRaised,
                    language: remoteData?.language || 'floor',
                    isHost: !!remoteData?.isHost,
                    isGhost: !!remoteData?.isGhost,
                    audioBlocked: !!remoteData?.audioBlocked,
                    connectionState: 'connected',
                    joinedAt: Date.now(),
                    connectionQuality: 'excellent',
                    stream: null,
                    screenStream: null
                })
                changed = true
            }
        })
        if (changed) syncToState()
    }

    const updateMetadata = useCallback((patch: Partial<UserMetadata>) => {
        metadataRef.current = { ...metadataRef.current, ...patch }
        signaling?.trackMetadata(metadataRef.current)
    }, [signaling])

    const shareScreen = async () => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setScreenShareEnabled(true)
            setTimeout(() => {
                const pub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.ScreenShare)
                if (pub?.videoTrack?.mediaStreamTrack) setLocalScreenStream(new MediaStream([pub.videoTrack.mediaStreamTrack]))
            }, 500)
            signaling?.broadcastEvent('share-started', { sender: userId })
        } catch (error) { console.error('[Screen] Failed to share:', error) }
    }

    const stopScreenShare = async () => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setScreenShareEnabled(false)
            setLocalScreenStream(null)
            signaling?.broadcastEvent('share-ended', { sender: userId })
        } catch (error) { console.error('[Screen] Failed to stop:', error) }
    }

    const shareVideoFile = async (_file: File) => { console.warn('[shareVideoFile] Not implemented') }

    const supabase = createClient()
    const promoteToHost = async (newHostId: string) => {
        if (!metadataRef.current.isHost) return
        await supabase.from('meetings').update({ host_id: newHostId }).eq('id', roomId)
        signaling?.broadcastEvent('host-promoted', { newHostId })
        setHostId(newHostId)
    }
    const sendEmoji = (emoji: string) => signaling?.sendReaction(emoji)
    const toggleHand = () => {
        const next = !localHandRaised
        setLocalHandRaised(next)
        updateMetadata({ handRaised: next })
    }
    const kickUser = async (targetId: string) => supabase.from('room_events').insert({ meeting_id: roomId, type: 'KICK', payload: { targetId } })
    const updateUserRole = async (targetId: string, newRole: string) => supabase.from('room_events').insert({ meeting_id: roomId, type: 'SET_ROLE', payload: { targetId, role: newRole } })
    const updateUserLanguages = async (targetId: string, languages: string[]) => supabase.from('room_events').insert({ meeting_id: roomId, type: 'SET_ALLOWED_LANGUAGES', payload: { targetId, languages } })
    const muteUser = async (targetId: string) => supabase.from('room_events').insert({ meeting_id: roomId, type: 'MUTE', payload: { targetId } })
    const blockUserAudio = async (targetId: string) => supabase.from('room_events').insert({ meeting_id: roomId, type: 'BLOCK_AUDIO', payload: { targetId } })
    const unblockUserAudio = async (targetId: string) => supabase.from('room_events').insert({ meeting_id: roomId, type: 'UNBLOCK_AUDIO', payload: { targetId } })

    const reconnect = useCallback(async () => {
        if (!roomRef.current || !liveKitTokenRef.current) return
        try {
            setMediaStatus('connecting')
            await roomRef.current.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, liveKitTokenRef.current, { rtcConfig: { iceServers } })
            setMediaStatus('connected')
        } catch (err) { console.error('[Reconnect] Failed:', err); setMediaStatus('failed') }
    }, [iceServers])

    const handleSwitchDevice = useCallback(async (kind: 'audio' | 'video', deviceId: string) => {
        await switchDevice(kind, deviceId)
        if (roomRef.current?.state === 'connected') {
            try {
                const source = kind === 'audio' ? Track.Source.Microphone : Track.Source.Camera
                const pub = roomRef.current.localParticipant.getTrackPublication(source)
                const newTrack = await switchDevice(kind, deviceId)
                if (pub && newTrack) {
                    await (roomRef.current.localParticipant as any).unpublishTrack(pub.track)
                    await roomRef.current.localParticipant.publishTrack(newTrack, { source })
                } else if (newTrack) await roomRef.current.localParticipant.publishTrack(newTrack, { source })
            } catch (err) { console.error(`[Device] Switch ${kind} failed:`, err) }
        }
    }, [switchDevice])

    const toggleMic = useCallback(async (enabled: boolean) => {
        toggleMicStream(enabled)
        if (roomRef.current) {
            const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Microphone)
            if (pub) { if (enabled) await pub.track?.unmute(); else await pub.track?.mute() }
            updateMetadata({ micOn: enabled })
        }
    }, [toggleMicStream, updateMetadata])

    const toggleCamera = useCallback(async (enabled: boolean) => {
        toggleCameraStream(enabled)
        if (roomRef.current) {
            const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera)
            if (pub) { if (enabled) await pub.track?.unmute(); else await pub.track?.mute() }
            updateMetadata({ cameraOn: enabled })
        }
    }, [toggleCameraStream, updateMetadata])

    const getDiagnostics = useCallback(async () => {
        const d: any = { hasRoom: !!roomRef.current, state: 'no-room', participants: peers.length + 1 }
        if (roomRef.current) d.state = roomRef.current.state
        return d
    }, [peers.length])

    return {
        localStream,
        peers,
        userCount: Math.max(isJoined ? 1 : 0, userCount),
        toggleMic,
        toggleCamera,
        shareScreen,
        stopScreenShare,
        shareVideoFile,
        sharingUserId,
        isAnySharing: !!sharingUserId,
        channel: signaling?.channel,
        switchDevice: handleSwitchDevice,
        sendEmoji,
        toggleHand,
        updateMetadata,
        promoteToHost,
        kickUser,
        updateUserRole,
        updateUserLanguages,
        muteUser,
        blockUserAudio,
        unblockUserAudio,
        mediaError,
        reactions,
        localHandRaised,
        hostId,
        isHost: hostId === userId,
        reconnect,
        mediaStatus,
        lastError,
        setLastError,
        roomLocalStream: localStreamFromRoom,
        localScreenStream,
        signalingStatus: signaling?.connectionState || 'disconnected',
        getDiagnostics,
    }
}
