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
    const sessionId = useRef(Math.random().toString(36).substr(2, 6)).current
    const sessionUserId = `${userId}_${sessionId}`

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
            console.log('Participant connected:', participant.identity)
            setUserCount(room.remoteParticipants.size + 1)
        }

        const handleParticipantDisconnected = (participant: RemoteParticipant) => {
            console.log('Participant disconnected:', participant.identity)
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
            const fullIdentity = participant.identity
            const userId = fullIdentity.split('_')[0]
            const isScreen = publication.source === Track.Source.ScreenShare

            const peerId = isScreen ? `${fullIdentity}-presentation` : fullIdentity
            const existing = peersRef.current.get(peerId) || {
                userId,
                role: 'participant', // Will be updated by metadata
                connectionState: 'connected',
                isPresentation: isScreen
            }

            if (track.kind === Track.Kind.Video) {
                const stream = new MediaStream([track.mediaStreamTrack])
                if (isScreen) {
                    existing.screenStream = stream
                    setSharingUserId(userId)
                } else {
                    existing.stream = stream
                }
                existing.connectionState = 'connected'
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
            if (publication.source === Track.Source.ScreenShare) {
                peersRef.current.delete(`${participant.identity}-presentation`)
                if (sharingUserId === participant.identity) setSharingUserId(null)
            }
            syncToState()
        }

        room
            .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
            .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
            .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
            .on(RoomEvent.Disconnected, () => setMediaStatus('disconnected'))
            .on(RoomEvent.Reconnecting, () => setMediaStatus('connecting'))
            .on(RoomEvent.Reconnected, () => setMediaStatus('connected'))

        const connect = async () => {
            try {
                setMediaStatus('connecting')
                const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!
                await room.connect(wsUrl, liveKitToken)
                setMediaStatus('connected')

                // Publish local tracks
                if (localStream) {
                    const audioTrack = localStream.getAudioTracks()[0]
                    const videoTrack = localStream.getVideoTracks()[0]

                    if (audioTrack) await room.localParticipant.publishTrack(audioTrack, { name: 'audio' })
                    if (videoTrack) await room.localParticipant.publishTrack(videoTrack, { name: 'video' })
                }

                setUserCount(room.remoteParticipants.size + 1)
            } catch (error) {
                console.error('Failed to connect to LiveKit room:', error)
                setMediaStatus('failed')
                setUserCount(1) // Always count self
            }
        }

        connect()

        return () => {
            room.disconnect()
        }
    }, [isJoined, liveKitToken, roomId, localStream])

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
        let changed = false
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
                    connectionState: 'connecting'
                })
                changed = true
            }
        })
        if (changed) syncToState()
    }, [userId, syncToState])

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

    return {
        localStream,
        peers,
        userCount,
        toggleMic: toggleMicStream,
        toggleCamera: toggleCameraStream,
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
        signalingStatus: signaling?.connectionState || 'disconnected'
    }
}
