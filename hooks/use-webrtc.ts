import { useEffect, useState, useRef, useCallback } from 'react'
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    RemoteTrack,
    RemoteTrackPublication,
    Track,
    Participant,
    ConnectionState,
} from 'livekit-client'

export interface PeerData {
    userId: string
    id: string
    name: string
    role: string
    micOn: boolean
    cameraOn: boolean
    stream: MediaStream | null
    screenStream: MediaStream | null
    connectionState: string
}

export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: { micOn?: boolean; cameraOn?: boolean; stream?: MediaStream } = {},
    isJoined: boolean = false,
    userName: string = 'Participante',
    liveKitToken?: string,
) {
    const [room, setRoom] = useState<Room | null>(null)
    const [peers, setPeers] = useState<PeerData[]>([])
    const [roomLocalStream, setRoomLocalStream] = useState<MediaStream | null>(null)
    const [mediaStatus, setMediaStatus] = useState<string>('disconnected')
    const [lastError, setLastError] = useState<string | null>(null)

    const roomRef = useRef<Room | null>(null)
    const peersRef = useRef<Map<string, PeerData>>(new Map())

    // ─── Sync Local State to Component ───────────────────────────────────────
    const syncToState = useCallback(() => {
        setPeers(Array.from(peersRef.current.values()))
    }, [])

    const updateLocalStream = useCallback(() => {
        if (!roomRef.current) return
        const lp = roomRef.current.localParticipant
        const stream = new MediaStream()
        lp.getTrackPublications().forEach(pub => {
            if (pub.track?.mediaStreamTrack) {
                stream.addTrack(pub.track.mediaStreamTrack)
            }
        })
        setRoomLocalStream(stream.getTracks().length > 0 ? stream : null)
    }, [])

    // ─── LiveKit Room Logic ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isJoined || !liveKitToken) return

        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            publishDefaults: {
                videoSimulcast: true,
                screenShareSimulcast: true,
            }
        })
        roomRef.current = room
        setRoom(room)

        const handleTrackSubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
            console.log(`[LK] Subscribed: ${track.kind} (${pub.source}) from ${p.identity}`)
            const id = p.identity
            const existing = peersRef.current.get(id) || {
                userId: id.split('_')[0],
                id: id,
                name: p.name || 'Participante',
                role: 'participant',
                micOn: false,
                cameraOn: false,
                stream: null,
                screenStream: null,
                connectionState: 'connected'
            }

            if (pub.source === Track.Source.ScreenShare) {
                existing.screenStream = new MediaStream([track.mediaStreamTrack])
            } else {
                if (!existing.stream) existing.stream = new MediaStream()
                
                // Track management
                if (track.kind === 'video') {
                    existing.stream.getVideoTracks().forEach(t => existing.stream?.removeTrack(t))
                    existing.cameraOn = true
                } else {
                    existing.stream.getAudioTracks().forEach(t => existing.stream?.removeTrack(t))
                    existing.micOn = true
                }
                existing.stream.addTrack(track.mediaStreamTrack)
            }

            peersRef.current.set(id, existing)
            syncToState()
        }

        const handleTrackUnsubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
            const id = p.identity
            const existing = peersRef.current.get(id)
            if (!existing) return

            if (pub.source === Track.Source.ScreenShare) {
                existing.screenStream = null
            } else {
                if (existing.stream) {
                    existing.stream.removeTrack(track.mediaStreamTrack)
                    if (track.kind === 'video') existing.cameraOn = false
                    else existing.micOn = false
                }
            }
            syncToState()
        }

        const handleParticipantConnected = (p: RemoteParticipant) => {
            peersRef.current.set(p.identity, {
                userId: p.identity.split('_')[0],
                id: p.identity,
                name: p.name || 'Participante',
                role: 'participant',
                micOn: false,
                cameraOn: false,
                stream: null,
                screenStream: null,
                connectionState: 'connected'
            })
            syncToState()
        }

        const handleParticipantDisconnected = (p: RemoteParticipant) => {
            peersRef.current.delete(p.identity)
            syncToState()
        }

        const handleMuteChange = (pub: RemoteTrackPublication, p: Participant) => {
            if (p instanceof RemoteParticipant) {
                const existing = peersRef.current.get(p.identity)
                if (existing) {
                    if (pub.kind === 'video') existing.cameraOn = !pub.isMuted
                    else existing.micOn = !pub.isMuted
                    syncToState()
                }
            } else {
                updateLocalStream()
            }
        }

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
            .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
            .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
            .on(RoomEvent.TrackMuted, handleMuteChange)
            .on(RoomEvent.TrackUnmuted, handleMuteChange)
            .on(RoomEvent.LocalTrackPublished, updateLocalStream)
            .on(RoomEvent.LocalTrackUnpublished, updateLocalStream)
            .on(RoomEvent.ConnectionStateChanged, (state) => setMediaStatus(state))

        const connect = async () => {
            try {
                setMediaStatus('connecting')
                await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, liveKitToken)
                setMediaStatus('connected')

                // Initial publish (minimalist - rely on room capabilities)
                await room.localParticipant.setMicrophoneEnabled(initialConfig.micOn !== false)
                await room.localParticipant.setCameraEnabled(initialConfig.cameraOn !== false)
                updateLocalStream()
            } catch (err) {
                console.error('[LK] Connection error:', err)
                setLastError(String(err))
                setMediaStatus('error')
            }
        }

        connect()

        return () => {
            room.removeAllListeners()
            room.disconnect()
            roomRef.current = null
        }
    }, [isJoined, liveKitToken, roomId]) // Minimized dependencies for stability

    // ─── Actions ─────────────────────────────────────────────────────────────
    const toggleMic = useCallback(async (enabled: boolean) => {
        if (roomRef.current) await roomRef.current.localParticipant.setMicrophoneEnabled(enabled)
    }, [])

    const toggleCamera = useCallback(async (enabled: boolean) => {
        if (roomRef.current) await roomRef.current.localParticipant.setCameraEnabled(enabled)
    }, [])

    const switchDevice = useCallback(async (kind: 'audio' | 'video', deviceId: string) => {
        if (roomRef.current) await roomRef.current.switchActiveDevice(kind === 'audio' ? 'audioinput' : 'videoinput', deviceId)
    }, [])

    const reconnect = useCallback(() => {
        window.location.reload()
    }, [])

    return {
        room,
        peers,
        roomLocalStream,
        mediaStatus,
        lastError,
        toggleMic,
        toggleCamera,
        switchDevice,
        reconnect,
        userCount: peers.length + 1,
        isHost: userRole === 'admin' || userRole === 'MASTER',
        localScreenStream: null,
        sharingUserId: null,
        reactions: [],
        signalingStatus: 'joined', // Mock for simplified room
        getDiagnostics: () => ({}),
        sendEmoji: () => {},
        shareScreen: () => {},
        stopScreenShare: () => {},
        updateMetadata: () => {},
        promoteToHost: () => {},
        kickUser: () => {},
        updateUserRole: () => {},
        updateUserLanguages: () => {},
        muteUser: () => {},
        blockUserAudio: () => {},
        unblockUserAudio: () => {},
        mediaStatus: mediaStatus as any,
        lastError,
        setLastError,
    }
}
