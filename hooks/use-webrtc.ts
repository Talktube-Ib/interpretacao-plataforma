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
    connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed' | 'closed'
}

export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: { micOn?: boolean; cameraOn?: boolean; stream?: MediaStream } = {},
    isJoined: boolean = false,
    userName: string = 'Participante',
    liveKitToken?: string,
    liveKitUrl?: string,
    iceServers?: RTCIceServer[],
) {
    const [room, setRoom] = useState<Room | null>(null)
    const [peers, setPeers] = useState<PeerData[]>([])
    const [roomLocalStream, setRoomLocalStream] = useState<MediaStream | null>(null)
    const [isMicOn, setIsMicOn] = useState(initialConfig.micOn !== false)
    const [isCameraOn, setIsCameraOn] = useState(initialConfig.cameraOn !== false)
    const [mediaStatus, setMediaStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed' | 'closed'>('disconnected')
    const [lastError, setLastError] = useState<string | null>(null)

    const roomRef = useRef<Room | null>(null)
    const peersRef = useRef<Map<string, PeerData>>(new Map())

    // ─── Sync Local State to Component ───────────────────────────────────────
    const syncToState = useCallback(() => {
        setPeers(Array.from(peersRef.current.values()))
    }, [])

    const updateLocalStates = useCallback(() => {
        if (!roomRef.current) return
        const lp = roomRef.current.localParticipant
        
        // Update local track stream
        const stream = new MediaStream()
        lp.getTrackPublications().forEach(pub => {
            if (pub.track?.mediaStreamTrack) {
                stream.addTrack(pub.track.mediaStreamTrack)
            }
        })
        setRoomLocalStream(stream.getTracks().length > 0 ? stream : null)
        
        // Sync hardware status
        setIsMicOn(lp.isMicrophoneEnabled)
        setIsCameraOn(lp.isCameraEnabled)
    }, [])

    // ─── LiveKit Room Logic ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isJoined || !liveKitToken) return

        const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
                resolution: { width: 1280, height: 720 },
            },
            publishDefaults: {
                simulcast: true,
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
                const newStream = existing.stream ? new MediaStream(existing.stream.getTracks()) : new MediaStream()
                
                if (track.kind === 'video') {
                    newStream.getVideoTracks().forEach(t => newStream.removeTrack(t))
                    existing.cameraOn = true
                } else {
                    newStream.getAudioTracks().forEach(t => newStream.removeTrack(t))
                    existing.micOn = true
                }
                newStream.addTrack(track.mediaStreamTrack)
                existing.stream = newStream
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
                    const newStream = new MediaStream(existing.stream.getTracks())
                    newStream.removeTrack(track.mediaStreamTrack)
                    existing.stream = newStream
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

        const handleMuteChange = (pub: any, p: Participant) => {
            if (p instanceof RemoteParticipant) {
                const existing = peersRef.current.get(p.identity)
                if (existing) {
                    if (pub.kind === 'video') existing.cameraOn = !pub.isMuted
                    else existing.micOn = !pub.isMuted
                    syncToState()
                }
            } else {
                updateLocalStates()
            }
        }

        const handleMetadataChanged = (metadata: string | undefined, p: Participant) => {
            const id = p.identity
            const existing = peersRef.current.get(id)
            if (existing) {
                try {
                    const parsed = JSON.parse(metadata || '{}')
                    existing.role = parsed.role || existing.role
                } catch (e) {}
                existing.name = p.name || existing.name
                syncToState()
            }
        }

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
            .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
            .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
            .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
            .on(RoomEvent.TrackMuted, handleMuteChange)
            .on(RoomEvent.TrackUnmuted, handleMuteChange)
            .on(RoomEvent.ParticipantMetadataChanged, handleMetadataChanged)
            .on(RoomEvent.ParticipantNameChanged, (name: string, p: Participant) => {
                const existing = peersRef.current.get(p.identity)
                if (existing) {
                    existing.name = name || p.name || existing.name
                    syncToState()
                }
            })
            .on(RoomEvent.LocalTrackPublished, updateLocalStates)
            .on(RoomEvent.LocalTrackUnpublished, updateLocalStates)
            .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
                if (state === ConnectionState.Connected) setMediaStatus('connected')
                else if (state === ConnectionState.Connecting || state === ConnectionState.Reconnecting) setMediaStatus('connecting')
                else if (state === ConnectionState.Disconnected) setMediaStatus('disconnected')
            })

        const connect = async () => {
            try {
                setMediaStatus('connecting')
                const rawUrl = liveKitUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL!
                const url = rawUrl.startsWith('http') ? rawUrl.replace('http', 'ws') : rawUrl
                
                await room.connect(url, liveKitToken!, { rtcConfig: { iceServers } })
                setMediaStatus('connected')

                // Initial publish (DO NOT USE initialConfig as dependency)
                await room.localParticipant.setMicrophoneEnabled(true)
                await room.localParticipant.setCameraEnabled(true)
                updateLocalStates()
            } catch (err) {
                console.error('[LK] Connection error:', err)
                setLastError(String(err))
                setMediaStatus('failed')
            }
        }

        connect()

        return () => {
            room.removeAllListeners()
            room.disconnect()
            roomRef.current = null
        }
    }, [isJoined, liveKitToken, roomId, liveKitUrl, iceServers, syncToState, updateLocalStates])

    // ─── Actions ─────────────────────────────────────────────────────────────
    const toggleMic = useCallback(async (enabled: boolean) => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(enabled)
            // Resume audio play if blocked
            await roomRef.current.startAudio()
            updateLocalStates()
        } catch (err) { console.error('[LK] Toggle Mic failed:', err) }
    }, [updateLocalStates])

    const toggleCamera = useCallback(async (enabled: boolean) => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setCameraEnabled(enabled)
            updateLocalStates()
        } catch (err) { console.error('[LK] Toggle Camera failed:', err) }
    }, [updateLocalStates])

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
        isMicOn,
        isCameraOn,
        mediaStatus,
        lastError,
        toggleMic,
        toggleCamera,
        switchDevice,
        reconnect,
        userCount: peers.length + 1,
        isHost: userRole === 'admin' || userRole === 'MASTER',
        isAudioBlocked: room?.canPlaybackAudio === false,
        localScreenStream: null,
        sharingUserId: null,
        reactions: [],
        signalingStatus: 'joined', 
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
        setLastError,
    }
}
