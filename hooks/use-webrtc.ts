import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/lib/polyfills'
import { RealtimeChannel } from '@supabase/supabase-js'
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Participant,
    Track,
    VideoQuality,
    LocalTrackPublication
} from 'livekit-client'
import { useMediaStream } from './use-media-stream'
import { useSignaling } from './use-signaling'

interface PeerData {
    userId: string
    stream?: MediaStream
    screenStream?: MediaStream
    role: string
    language?: string
    micOn?: boolean
    cameraOn?: boolean
    isSpeaking?: boolean
    handRaised?: boolean
    name?: string
    isPresentation?: boolean
    isHost?: boolean
    connectionState?: 'connecting' | 'connected' | 'failed' | 'disconnected'
    audioBlocked?: boolean
    joinedAt?: number
}

export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: { micOn?: boolean, cameraOn?: boolean, audioDeviceId?: string, videoDeviceId?: string, stream?: MediaStream } = {},
    isJoined: boolean = false,
    userName: string = 'Participante',
    liveKitToken?: string
) {
    const sessionUserId = userId // O userId já vem com o sufixo da RoomPage

    // --- Refactored: useMediaStream ---
    const { stream: localStream, error: mediaError, toggleMic: toggleMicStream, toggleCamera: toggleCameraStream, switchDevice } = useMediaStream({
        micOn: initialConfig.micOn,
        cameraOn: initialConfig.cameraOn,
        audioDeviceId: initialConfig.audioDeviceId,
        videoDeviceId: initialConfig.videoDeviceId,
        stream: initialConfig.stream
    }, isJoined)

    const [peers, setPeers] = useState<PeerData[]>([])
    const [userCount, setUserCount] = useState(0)
    const [sharingUserId, setSharingUserId] = useState<string | null>(null)
    const [hostId, setHostId] = useState<string | null>(null)
    const [localHandRaised, setLocalHandRaised] = useState(false)
    const [reactions, setReactions] = useState<{ id: string, emoji: string, userId: string }[]>([])
    const [mediaStatus, setMediaStatus] = useState<'connecting' | 'connected' | 'failed' | 'disconnected'>('disconnected')
    const [lastError, setLastError] = useState<string | null>(null)

    const roomRef = useRef<Room | null>(null)
    const metadataRef = useRef<any>({
        name: userName,
        role: userRole,
        micOn: initialConfig.micOn !== false,
        cameraOn: initialConfig.cameraOn !== false,
        handRaised: false,
        language: 'floor',
        audioBlocked: false,
        isHost: false
    })

    const peersRef = useRef<Map<string, PeerData>>(new Map())

    const syncToState = useCallback(() => {
        setPeers(Array.from(peersRef.current.values()))
        if (roomRef.current) {
            setUserCount(roomRef.current.remoteParticipants.size + 1)
        } else if (isJoined) {
            setUserCount(1)
        }
    }, [isJoined])

    // --- LiveKit Room Connection ---
    useEffect(() => {
        if (!isJoined || !liveKitToken || !roomId) return

        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            publishDefaults: {
                videoEncoding: {
                    maxBitrate: 1_500_000,
                    maxFramerate: 30,
                },
                screenShareEncoding: {
                    maxBitrate: 3_000_000,
                    maxFramerate: 30,
                }
            }
        })

        roomRef.current = room

        const handleParticipantConnected = (participant: RemoteParticipant) => {
            console.log('--- SFU Event: Participant connected:', participant.identity)
            setUserCount(room.remoteParticipants.size + 1)
        }

        const handleParticipantDisconnected = (participant: RemoteParticipant) => {
            console.log('--- SFU Event: Participant disconnected:', participant.identity)
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
            console.log(`--- SFU Track Subscribed: ${track.kind} (${publication.source}) from ${participant.identity}`)
            const fullIdentity = participant.identity
            const userId = fullIdentity.split('_')[0]
            const isScreen = publication.source === Track.Source.ScreenShare

            const peerId = fullIdentity
            const existing = peersRef.current.get(peerId) || {
                userId,
                role: 'participant',
                connectionState: 'connected',
                joinedAt: Date.now()
            }

            if (track.kind === Track.Kind.Video) {
                const stream = new MediaStream([track.mediaStreamTrack])
                if (isScreen) {
                    existing.screenStream = stream
                    setSharingUserId(userId)
                    console.log('--- Screen Share Attached to Peer:', peerId)
                } else {
                    existing.stream = stream
                    existing.cameraOn = true
                }
                existing.connectionState = 'connected'
            }

            if (track.kind === Track.Kind.Audio) {
                existing.micOn = true
            }

            peersRef.current.set(peerId, existing)
            syncToState()
            setUserCount(room.remoteParticipants.size + 1)
        }

        const handleTrackUnsubscribed = (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
        ) => {
            console.log(`--- SFU Track Unsubscribed: ${track.kind} from ${participant.identity}`)
            const peerId = participant.identity
            const existing = peersRef.current.get(peerId)
            if (existing) {
                if (publication.source === Track.Source.ScreenShare) {
                    existing.screenStream = undefined
                    if (sharingUserId === participant.identity.split('_')[0]) setSharingUserId(null)
                } else if (track.kind === Track.Kind.Video) {
                    existing.stream = undefined
                    existing.cameraOn = false
                } else if (track.kind === Track.Kind.Audio) {
                    existing.micOn = false
                }
                syncToState()
            }
        }

        room
            .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
            .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
            .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
            .on(RoomEvent.TrackPublished, (pub, participant) => {
                console.log(`--- SFU Track Published: ${pub.kind} (${pub.source}) from ${participant.identity}`)
            })
            .on(RoomEvent.ConnectionStateChanged, (state) => {
                console.log('--- SFU Room Connection State:', state)
            })
            .on(RoomEvent.Disconnected, (reason) => {
                console.warn('--- SFU Room Disconnected:', reason)
                setMediaStatus('disconnected')
            })
            .on(RoomEvent.Reconnecting, () => {
                console.log('--- SFU Room Reconnecting...')
                setMediaStatus('connecting')
            })
            .on(RoomEvent.Reconnected, () => {
                console.log('--- SFU Room Reconnected')
                setMediaStatus('connected')
            })

        const connect = async () => {
            try {
                console.log('--- LiveKit Connection Attempt ---')
                console.log('Room ID:', roomId)
                console.log('Identity:', sessionUserId)
                console.log('Token exists:', !!liveKitToken)

                setMediaStatus('connecting')
                const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!
                console.log('WS URL:', wsUrl)

                await room.connect(wsUrl, liveKitToken)
                console.log('--- LiveKit Connected Successfully ---')
                setMediaStatus('connected')
                setLastError(null) // Clear any previous errors

                // Publish local tracks
                if (localStream) {
                    console.log('Publishing local tracks...')
                    const audioTrack = localStream.getAudioTracks()[0]
                    const videoTrack = localStream.getVideoTracks()[0]

                    if (audioTrack) {
                        const pub = await room.localParticipant.publishTrack(audioTrack, { name: 'audio' })
                        console.log('Audio track published:', pub.trackSid)
                    }
                    if (videoTrack) {
                        const pub = await room.localParticipant.publishTrack(videoTrack, { name: 'video' })
                        console.log('Video track published:', pub.trackSid)
                    }
                }

                setUserCount(room.remoteParticipants.size + 1)
            } catch (error) {
                console.error('--- LiveKit Connection Failed ---')
                console.error('Error detail:', error)
                setLastError(error instanceof Error ? error.message : String(error))
                setMediaStatus('failed')
                setUserCount(1) // Always count self
            }
        }

        connect()

        return () => {
            console.log('Cleaning up LiveKit room connection')
            room.disconnect()
        }
    }, [isJoined, liveKitToken, roomId, localStream, sessionUserId])

    // --- Signaling & Presence Logic (Metadata) ---
    const handleRoomEvent = useCallback((event: any) => {
        if (event.created_by === userId) return
        const type = event.type
        const data = event.payload || {}

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
    }, [userId, toggleMicStream])

    const handlePresenceSync = useCallback((users: string[], state: any) => {
        console.log('Presence Sync. Users in room:', users)
        let changed = false

        // 1. Remove peers that are no longer in the presence list
        const currentPeerIds = Array.from(peersRef.current.keys())
        currentPeerIds.forEach(peerId => {
            // Don't remove presentation tracks here, they are handled by LiveKit events
            if (peerId.endsWith('-presentation')) return

            if (!users.includes(peerId) && peerId !== sessionUserId) {
                console.log('Removing ghost session:', peerId)
                peersRef.current.delete(peerId)
                changed = true
            }
        })

        // 2. Add or update users that are in the presence list
        users.forEach(remoteSessionId => {
            if (remoteSessionId === sessionUserId) return
            const remoteData = (state[remoteSessionId] as any[])?.[0]
            const remoteId = remoteSessionId.split('_')[0]
            const existing = peersRef.current.get(remoteSessionId)

            if (existing) {
                let peerChanged = false
                if (remoteData?.name && existing.name !== remoteData.name) { existing.name = remoteData.name; peerChanged = true }
                if (existing.micOn !== remoteData?.micOn) { existing.micOn = remoteData?.micOn; peerChanged = true }
                if (existing.cameraOn !== remoteData?.cameraOn) { existing.cameraOn = remoteData?.cameraOn; peerChanged = true }
                if (existing.handRaised !== remoteData?.handRaised) { existing.handRaised = remoteData?.handRaised; peerChanged = true }
                if (existing.language !== remoteData?.language) { existing.language = remoteData?.language; peerChanged = true }
                if (existing.role !== remoteData?.role) { existing.role = remoteData?.role; peerChanged = true }
                if (existing.isHost !== remoteData?.isHost) { existing.isHost = remoteData?.isHost; peerChanged = true }
                if (existing.audioBlocked !== remoteData?.audioBlocked) { existing.audioBlocked = remoteData?.audioBlocked; peerChanged = true }
                if (peerChanged) changed = true
            } else {
                console.log('Adding new session from presence:', remoteSessionId)
                // Initialize if not present (waiting for tracks)
                peersRef.current.set(remoteSessionId, {
                    userId: remoteId,
                    name: remoteData?.name || 'Participante',
                    role: remoteData?.role || 'participant',
                    micOn: remoteData?.micOn,
                    cameraOn: remoteData?.cameraOn,
                    handRaised: remoteData?.handRaised,
                    language: remoteData?.language,
                    isHost: remoteData?.isHost,
                    audioBlocked: remoteData?.audioBlocked,
                    connectionState: 'connecting',
                    joinedAt: Date.now()
                })
                changed = true
            }
        })

        // 3. Cleanup: If a session is in 'connecting' for > 15 seconds 
        // AND it's not in the LiveKit room.remoteParticipants list, it's a ghost or failing.
        const now = Date.now()
        const lkParticipantIdentities = roomRef.current ? Array.from(roomRef.current.remoteParticipants.keys()) : []

        peersRef.current.forEach((peer, peerId) => {
            if (peer.isPresentation) return

            const isKnownByLK = lkParticipantIdentities.includes(peerId)
            const timeInRoom = now - (peer.joinedAt || now)

            if (!isKnownByLK && timeInRoom > 15000 && peer.connectionState === 'connecting') {
                console.warn('Presence ghost detected (15s timeout):', peerId)
                peersRef.current.delete(peerId)
                changed = true
            }
        })

        if (changed) syncToState()
    }, [sessionUserId, syncToState])

    const signaling = useSignaling(roomId, sessionUserId, metadataRef.current, {
        onSignal: () => { }, // P2P Signaling no longer needed
        onShareStarted: (payload) => setSharingUserId(payload.sender),
        onShareEnded: () => setSharingUserId(null),
        onHostPromoted: (payload) => setHostId(payload.newHostId),
        onReaction: (payload) => {
            const { emoji, sender } = payload
            const id = Math.random().toString(36).substr(2, 9)
            setReactions(prev => [...prev, { id, emoji, userId: sender }])
            setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 5000)
        },
        onRoomEvent: handleRoomEvent,
        onPresenceSync: handlePresenceSync
    })

    const updateMetadata = useCallback((patch: any) => {
        metadataRef.current = { ...metadataRef.current, ...patch }
        signaling?.trackMetadata(metadataRef.current)
    }, [signaling])

    // --- Restaurando Funções: Share Screen ---
    const shareScreen = async () => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setScreenShareEnabled(true)
            signaling?.broadcastEvent('share-started', { sender: userId })
        } catch (error) {
            console.error('Failed to share screen:', error)
        }
    }

    const stopScreenShare = async () => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setScreenShareEnabled(false)
            signaling?.broadcastEvent('share-ended', { sender: userId })
        } catch (error) {
            console.error('Failed to stop screen share:', error)
        }
    }

    const shareVideoFile = async (file: File) => {
        // Implementation for video file sharing could be added here
        console.warn('shareVideoFile not yet implemented for LiveKit')
    }

    const promoteToHost = async (newHostId: string) => {
        if (!metadataRef.current.isHost) return
        await createClient().from('meetings').update({ host_id: newHostId }).eq('id', roomId)
        signaling?.broadcastEvent('host-promoted', { newHostId })
        setHostId(newHostId)
    }

    const sendEmoji = (emoji: string) => signaling?.sendReaction(emoji)

    const toggleHand = () => {
        const newState = !localHandRaised
        setLocalHandRaised(newState)
        updateMetadata({ handRaised: newState })
    }

    const supabase = createClient()
    const kickUser = async (targetId: string) => await supabase.from('room_events').insert({ meeting_id: roomId, type: 'KICK', payload: { targetId } })
    const updateUserRole = async (targetId: string, newRole: string) => await supabase.from('room_events').insert({ meeting_id: roomId, type: 'SET_ROLE', payload: { targetId, role: newRole } })
    const updateUserLanguages = async (targetId: string, languages: string[]) => await supabase.from('room_events').insert({ meeting_id: roomId, type: 'SET_ALLOWED_LANGUAGES', payload: { targetId, languages } })
    const muteUser = async (targetId: string) => await supabase.from('room_events').insert({ meeting_id: roomId, type: 'MUTE', payload: { targetId } })
    const blockUserAudio = async (targetId: string) => await supabase.from('room_events').insert({ meeting_id: roomId, type: 'BLOCK_AUDIO', payload: { targetId } })
    const unblockUserAudio = async (targetId: string) => await supabase.from('room_events').insert({ meeting_id: roomId, type: 'UNBLOCK_AUDIO', payload: { targetId } })

    const reconnect = useCallback(() => {
        window.location.reload()
    }, [])

    const toggleMic = useCallback(async (enabled: boolean) => {
        toggleMicStream(enabled)
        if (roomRef.current) {
            await roomRef.current.localParticipant.setMicrophoneEnabled(enabled)
            updateMetadata({ micOn: enabled })
        }
    }, [toggleMicStream, updateMetadata])

    const toggleCamera = useCallback(async (enabled: boolean) => {
        toggleCameraStream(enabled)
        if (roomRef.current) {
            await roomRef.current.localParticipant.setCameraEnabled(enabled)
            updateMetadata({ cameraOn: enabled })
        }
    }, [toggleCameraStream, updateMetadata])

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
        switchDevice,
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
        setLastError
    }
}
