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

    // Media is now managed externally by RoomPage and passed via mediaProps
    const localStream = mediaProps?.stream ?? null
    const mediaError = mediaProps?.error ?? null
    const toggleMicStream = mediaProps?.toggleMic ?? (() => {})
    const toggleCameraStream = mediaProps?.toggleCamera ?? (() => {})
    const switchDevice = mediaProps?.switchDevice ?? (async () => undefined)

    const [peers, setPeers] = useState<PeerData[]>([])
    const [userCount, setUserCount] = useState(0)
    const [sharingUserId, setSharingUserId] = useState<string | null>(null)
    const [hostId, setHostId] = useState<string | null>(initialHostId || null)
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
                    maxBitrate: 800_000,
                    maxFramerate: 24,
                },
                screenShareEncoding: {
                    maxBitrate: 2_500_000,
                    maxFramerate: 15,
                },
            },
        })

        roomRef.current = room

        // Health Monitor
        const healthCheckInterval = setInterval(() => {
            if (room.state !== 'connected' || cancelled) return
            const presencePeerCount = Array.from(peersRef.current.keys()).filter(
                id => !id.endsWith('-presentation')
            ).length
            const lkPeerCount = room.remoteParticipants.size
            if (presencePeerCount > 0 && lkPeerCount === 0) {
                console.warn('[Health] Presence/LiveKit mismatch. Tentando reconectar SFU...')
                room.connect(
                    process.env.NEXT_PUBLIC_LIVEKIT_URL!, 
                    liveKitTokenRef.current!,
                    { rtcConfig: { iceServers } }
                ).catch(
                    err => console.error('[Health] Reconexão silenciosa falhou:', err)
                )
            }
        }, 10000)

        const handleParticipantConnected = (participant: RemoteParticipant) => {
            console.log('[LK] Participant connected:', participant.identity)
            const existing = peersRef.current.get(participant.identity)
            if (existing) {
                existing.connectionState = 'connected'
                syncToState()
            }
            setUserCount(room.remoteParticipants.size + 1)
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

            const existing = peersRef.current.get(fullIdentity) || ({
                userId: baseUserId,
                id: fullIdentity,
                name: 'Participante',
                role: 'participant',
                connectionState: 'connected' as const,
                joinedAt: Date.now(),
                cameraOn: false,
                micOn: false,
                isSpeaking: false,
                handRaised: false,
                connectionQuality: 'excellent', // Initial quality
                stream: null,
                screenStream: null
            } as PeerData)

            if (isScreen) {
                const stream = existing.screenStream ?? new MediaStream()
                stream.addTrack(track.mediaStreamTrack)
                existing.screenStream = new MediaStream(stream.getTracks())
                setSharingUserId(baseUserId)
            } else {
                const stream = existing.stream ?? new MediaStream()
                // Remove track do mesmo tipo para evitar duplicatas
                stream.getTracks().forEach((t: MediaStreamTrack) => { if (t.kind === track.kind) stream.removeTrack(t) })
                stream.addTrack(track.mediaStreamTrack)
                existing.stream = new MediaStream(stream.getTracks())
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
                        // FIX: usa ref em vez do closure stale
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

        // FIX: re-publica tracks após reconexão (crítico para mobile)
        const handleReconnected = async () => {
            console.log('[LK] Reconnected — re-publishing local tracks')
            setMediaStatus('connected')

            const canPublish = !['guest', 'viewer'].includes(userRole.toLowerCase())
            if (!canPublish) {
                console.log(`[LK] Cargo "${userRole}" — re-publicação de tracks ignorada na reconexão`)
                return // guest não re-publica
            }

            try {
                const micEnabled = metadataRef.current.micOn
                const camEnabled = metadataRef.current.cameraOn
                // FIX: paralelo com Promise.allSettled — se câmera falhar, mic ainda publica
                const results = await Promise.allSettled([
                    room.localParticipant.setMicrophoneEnabled(micEnabled, { deviceId: lastAudioDeviceId.current }),
                    room.localParticipant.setCameraEnabled(camEnabled, { deviceId: lastVideoDeviceId.current }),
                ])
                
                results.forEach((r, i) => {
                    const kind = i === 0 ? 'Mic' : 'Cam'
                    if (r.status === 'fulfilled') console.log(`[LK] Local ${kind} published successfully`)
                    else console.error(`[LK] Falha ao publicar ${kind}:`, r.reason)
                })
                results.forEach((r, i) => {
                    if (r.status === 'rejected') {
                        console.error(`[LK] Re-publish falhou (${i === 0 ? 'mic' : 'cam'}):`, r.reason)
                    }
                })
            } catch (err) {
                console.error('[LK] Erro ao re-publicar tracks após reconexão:', err)
            }
        }

        const handleConnectionQualityChanged = (quality: ConnectionQuality, participant: Participant) => {
            const peer = peersRef.current.get(participant.identity)
            if (peer) {
                peer.connectionQuality = quality.toString()
                syncToState()
            }
        }

        room
            .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
            .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
            .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
            .on(RoomEvent.TrackPublished, (pub, participant) => {
                console.log(`[LK] Track published: ${pub.kind} (${pub.source}) from ${participant.identity}`)
            })
            .on(RoomEvent.ConnectionStateChanged, state => {
                console.log('[LK] Connection state:', state)
            })
            .on(RoomEvent.Disconnected, reason => {
                console.warn('[LK] Disconnected:', reason)
                if (!cancelled) setMediaStatus('disconnected')
            })
            .on(RoomEvent.SignalConnected, () => {
                console.log('[LK] Signaling connected')
            })
            .on(RoomEvent.ConnectionStateChanged, state => {
                 console.log(`[LK] PC Connection State -> ${state}`)
            })
            .on(RoomEvent.Reconnecting, () => {
                console.log('[LK] Reconnecting...')
                if (!cancelled) setMediaStatus('connecting')
            })
            .on(RoomEvent.Reconnected, handleReconnected)

        const connect = async () => {
            try {
                console.log('[LK] Connecting...', { roomId, sessionUserId, role: userRole })
                if (cancelled) return
                setMediaStatus('connecting')

                await room.connect(
                    process.env.NEXT_PUBLIC_LIVEKIT_URL!, 
                    liveKitTokenRef.current!,
                    { rtcConfig: { iceServers } }
                )
                if (cancelled) {
                    room.disconnect()
                    return
                }
                
                console.log('[LK] Connected successfully')
                setMediaStatus('connected')
                setLastError(null)

                // FIX: só publica tracks se o cargo permite
                // guest e viewer não publicam — evita erro de permissão do LiveKit
                const canPublish = !['guest', 'viewer'].includes(userRole.toLowerCase())

                if (canPublish) {
                    const micEnabled = initialConfig.micOn !== false
                    const camEnabled = initialConfig.cameraOn !== false

                    const results = await Promise.allSettled([
                        room.localParticipant.setMicrophoneEnabled(micEnabled, { deviceId: lastAudioDeviceId.current }),
                        room.localParticipant.setCameraEnabled(camEnabled, { deviceId: lastVideoDeviceId.current }),
                    ])

                    if (cancelled) return

                    results.forEach((r, i) => {
                        const kind = i === 0 ? 'Mic' : 'Cam'
                        if (r.status === 'fulfilled') console.log(`[LK] Local ${kind} published successfully`)
                        else console.error(`[LK] Falha ao publicar ${kind}:`, r.reason)
                    })
                } else {
                    console.log(`[LK] Cargo "${userRole}" — publicação de tracks desabilitada`)
                }

                setUserCount(room.remoteParticipants.size + 1)
            } catch (error) {
                if (cancelled) return
                console.error('[LK] Connection failed:', error)
                setLastError(error instanceof Error ? error.message : String(error))
                setMediaStatus('failed')
                setUserCount(1)
            }
        }

        connect()

        return () => {
            cancelled = true
            console.log('[LK] Cleaning up room connection')
            clearInterval(healthCheckInterval)
            room.removeAllListeners()
            room.disconnect()
            roomRef.current = null
        }
    // FIX: liveKitToken removido das deps — usa ref para evitar re-criação do Room
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isJoined, roomId, sessionUserId])

    // ─── Signaling & Presence ─────────────────────────────────────────────────
    const handleRoomEvent = useCallback(
        (event: { created_by: string; type: string; payload: Record<string, any> }) => {
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
                    if (data.role !== 'interpreter') metadataRef.current.language = 'floor'
                }
                signaling?.trackMetadata(metadataRef.current)
            }

            if (type === 'SET_ALLOWED_LANGUAGES') {
                window.dispatchEvent(new CustomEvent('admin-update-languages', { detail: data.languages }))
            }
        },
        [userId, toggleMicStream]
    )

    const handlePresenceSync = useCallback(
        (users: string[], state: Record<string, UserMetadata[]>) => {
            console.log('[Presence] Sync. Users:', users)
            let changed = false

            // Remove peers que saíram
            Array.from(peersRef.current.keys()).forEach(peerId => {
                if (peerId.endsWith('-presentation')) return
                if (!users.includes(peerId) && peerId !== sessionUserId) {
                    peersRef.current.delete(peerId)
                    changed = true
                }
            })

            // Adiciona / atualiza peers presentes
            users.forEach(remoteSessionId => {
                if (remoteSessionId === sessionUserId) return
                const remoteData = (state[remoteSessionId] as any[])?.[0]
                const remoteId = remoteSessionId.split('_')[0]
                const existing = peersRef.current.get(remoteSessionId)

                if (existing) {
                    const fields: Array<keyof typeof existing> = [
                        'name', 'micOn', 'cameraOn', 'handRaised', 'language',
                        'isHost', 'isGhost', 'audioBlocked',
                    ]
                    let peerChanged = false
                    fields.forEach(f => {
                        let newVal = f === 'role'
                            ? remoteData?.role?.toLowerCase()
                            : remoteData?.[f as string]
                        
                        // FIX: Prioritize active tracks over signaling metadata
                        if (f === 'cameraOn' && !newVal) {
                            newVal = !!existing.stream && existing.stream.getVideoTracks().length > 0
                        }
                        if (f === 'micOn' && !newVal) {
                            newVal = !!existing.stream && existing.stream.getAudioTracks().length > 0
                        }

                        if (existing[f] !== newVal) {
                            (existing as any)[f] = newVal
                            peerChanged = true
                        }
                    })
                    // role separado por causa do toLowerCase
                    const remoteRole = remoteData?.role?.toLowerCase() || ''
                    if (existing.role !== remoteRole) { existing.role = remoteRole; peerChanged = true }
                    if (peerChanged) changed = true
                } else {
                    const isAlreadyInLK = Array.from(roomRef.current?.remoteParticipants.values() || []).some(p => p.identity === remoteSessionId)
                    const newPeer: PeerData = {
                        userId: remoteId,
                        id: remoteSessionId,
                        name: remoteData?.name || 'Participante',
                        role: remoteData?.role || 'participant',
                        micOn: !!remoteData?.micOn || (roomRef.current?.remoteParticipants.get(remoteSessionId)?.getTrackPublication(Track.Source.Microphone)?.isSubscribed ?? false),
                        cameraOn: !!remoteData?.cameraOn || (roomRef.current?.remoteParticipants.get(remoteSessionId)?.getTrackPublication(Track.Source.Camera)?.isSubscribed ?? false),
                        handRaised: !!remoteData?.handRaised,
                        language: remoteData?.language || 'floor',
                        isHost: !!remoteData?.isHost,
                        isGhost: !!remoteData?.isGhost,
                        audioBlocked: !!remoteData?.audioBlocked,
                        connectionState: isAlreadyInLK ? 'connected' : 'connecting',
                        joinedAt: Date.now(),
                        connectionQuality: 'excellent',
                        stream: null,
                        screenStream: null
                    }
                    peersRef.current.set(remoteSessionId, newPeer)
                    changed = true
                }
            })

            // Cleanup: peers em 'connecting' há mais de 15s sem aparecer no LiveKit
            const now = Date.now()
            const lkIdentities = roomRef.current
                ? Array.from(roomRef.current.remoteParticipants.values()).map(p => p.identity)
                : []

            peersRef.current.forEach((peer, peerId) => {
                if (peer.isPresentation) return
                if (!lkIdentities.includes(peerId) && (now - (peer.joinedAt ?? now)) > 15000 && peer.connectionState === 'connecting') {
                    console.warn('[Presence] Ghost detectado (15s timeout):', peerId)
                    peersRef.current.delete(peerId)
                    changed = true
                }
            })

            if (changed) syncToState()
        },
        [sessionUserId, syncToState]
    )

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
            onRoomEvent: handleRoomEvent,
            onPresenceSync: handlePresenceSync,
        },
        isJoined
    )

    const updateMetadata = useCallback(
        (patch: Partial<UserMetadata>) => {
            metadataRef.current = { ...metadataRef.current, ...patch }
            signaling?.trackMetadata(metadataRef.current)
        },
        [signaling]
    )

    // ─── Screen Share ─────────────────────────────────────────────────────────
    const shareScreen = async () => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setScreenShareEnabled(true)
            setTimeout(() => {
                const pub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.ScreenShare)
                if (pub?.videoTrack?.mediaStreamTrack) {
                    setLocalScreenStream(new MediaStream([pub.videoTrack.mediaStreamTrack]))
                }
            }, 500)
            signaling?.broadcastEvent('share-started', { sender: userId })
        } catch (error) {
            console.error('[Screen] Failed to share:', error)
        }
    }

    const stopScreenShare = async () => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setScreenShareEnabled(false)
            setLocalScreenStream(null)
            signaling?.broadcastEvent('share-ended', { sender: userId })
        } catch (error) {
            console.error('[Screen] Failed to stop:', error)
        }
    }

    const shareVideoFile = async (_file: File) => {
        console.warn('[shareVideoFile] Not yet implemented for LiveKit')
    }

    // ─── Admin Actions ────────────────────────────────────────────────────────
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
    const kickUser = async (targetId: string) =>
        supabase.from('room_events').insert({ meeting_id: roomId, type: 'KICK', payload: { targetId } })
    const updateUserRole = async (targetId: string, newRole: string) =>
        supabase.from('room_events').insert({ meeting_id: roomId, type: 'SET_ROLE', payload: { targetId, role: newRole } })
    const updateUserLanguages = async (targetId: string, languages: string[]) =>
        supabase.from('room_events').insert({ meeting_id: roomId, type: 'SET_ALLOWED_LANGUAGES', payload: { targetId, languages } })
    const muteUser = async (targetId: string) =>
        supabase.from('room_events').insert({ meeting_id: roomId, type: 'MUTE', payload: { targetId } })
    const blockUserAudio = async (targetId: string) =>
        supabase.from('room_events').insert({ meeting_id: roomId, type: 'BLOCK_AUDIO', payload: { targetId } })
    const unblockUserAudio = async (targetId: string) =>
        supabase.from('room_events').insert({ meeting_id: roomId, type: 'UNBLOCK_AUDIO', payload: { targetId } })

    // ─── Reconnect (sem reload de página) ─────────────────────────────────────
    // FIX: reconecta só o Room do LiveKit, sem perder estado da sessão
    const reconnect = useCallback(async () => {
        if (!roomRef.current || !liveKitTokenRef.current) {
            console.warn('[Reconnect] Sem room ou token disponível')
            return
        }
        try {
            console.log('[Reconnect] Reconectando LiveKit...')
            setMediaStatus('connecting')
            await roomRef.current.connect(
                process.env.NEXT_PUBLIC_LIVEKIT_URL!,
                liveKitTokenRef.current,
                { rtcConfig: { iceServers } }
            )
            // Re-publica tracks após reconexão manual
            const results = await Promise.allSettled([
                roomRef.current.localParticipant.setMicrophoneEnabled(
                    metadataRef.current.micOn,
                    { deviceId: lastAudioDeviceId.current }
                ),
                roomRef.current.localParticipant.setCameraEnabled(
                    metadataRef.current.cameraOn,
                    { deviceId: lastVideoDeviceId.current }
                ),
            ])
            results.forEach((r, i) => {
                if (r.status === 'rejected')
                    console.error(`[Reconnect] Re-publish falhou (${i === 0 ? 'mic' : 'cam'}):`, r.reason)
            })
            setMediaStatus('connected')
            console.log('[Reconnect] Reconexão manual bem-sucedida')
        } catch (err) {
            console.error('[Reconnect] Falhou:', err)
            setMediaStatus('failed')
        }
    }, [])

    // ─── Device Switch ────────────────────────────────────────────────────────
    const handleSwitchDevice = useCallback(
        async (kind: 'audio' | 'video', deviceId: string) => {
            await switchDevice(kind, deviceId)
            if (kind === 'audio') lastAudioDeviceId.current = deviceId
            else lastVideoDeviceId.current = deviceId

            if (roomRef.current?.state === 'connected') {
                try {
                    await roomRef.current.switchActiveDevice(
                        kind === 'audio' ? 'audioinput' : 'videoinput',
                        deviceId
                    )
                } catch (err) {
                    console.error(`[Device] Switch ${kind} falhou:`, err)
                }
            }
        },
        [switchDevice]
    )

    // ─── Mic / Camera Toggle ──────────────────────────────────────────────────
    const toggleMic = useCallback(
        async (enabled: boolean) => {
            toggleMicStream(enabled)
            if (roomRef.current) {
                await roomRef.current.localParticipant.setMicrophoneEnabled(enabled, {
                    deviceId: lastAudioDeviceId.current,
                })
                updateMetadata({ micOn: enabled })
            }
        },
        [toggleMicStream, updateMetadata]
    )

    const toggleCamera = useCallback(
        async (enabled: boolean) => {
            toggleCameraStream(enabled)
            if (roomRef.current) {
                await roomRef.current.localParticipant.setCameraEnabled(enabled, {
                    deviceId: lastVideoDeviceId.current,
                })
                updateMetadata({ cameraOn: enabled })
            }
        },
        [toggleCameraStream, updateMetadata]
    )

    // ─── Return ───────────────────────────────────────────────────────────────
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
        signalingStatus: signaling?.connectionState || 'disconnected',
        lastError,
        setLastError,
        localScreenStream,
    }
}
