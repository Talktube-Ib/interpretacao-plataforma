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

    // FIX 1: Stream persistente por participante — nunca recriado, apenas mutado.
    // Isso evita o "pisca preto" causado por trocar srcObject no <video>.
    const peerStreamsRef = useRef<Map<string, MediaStream>>(new Map())

    // ─── Retorna (ou cria) o MediaStream persistente de um participante ─────────
    const getOrCreateStream = useCallback((participantId: string): MediaStream => {
        if (!peerStreamsRef.current.has(participantId)) {
            peerStreamsRef.current.set(participantId, new MediaStream())
        }
        return peerStreamsRef.current.get(participantId)!
    }, [])

    // ─── Sync Local State to Component ───────────────────────────────────────
    const syncToState = useCallback(() => {
        setPeers(Array.from(peersRef.current.values()))
    }, [])

    const updateLocalStates = useCallback(() => {
        if (!roomRef.current) return
        const lp = roomRef.current.localParticipant

        // FIX 2: Stream local também usa referência persistente.
        // Reutilizamos o mesmo objeto MediaStream e apenas adicionamos/removemos tracks.
        setRoomLocalStream(prev => {
            const stream = prev || new MediaStream()
            // Remove tracks que não existem mais
            stream.getTracks().forEach(t => {
                const stillExists = Array.from(lp.getTrackPublications().values())
                    .some(pub => pub.track?.mediaStreamTrack === t)
                if (!stillExists) stream.removeTrack(t)
            })
            // Adiciona tracks novos
            lp.getTrackPublications().forEach(pub => {
                if (pub.track?.mediaStreamTrack) {
                    const mst = pub.track.mediaStreamTrack
                    if (!stream.getTracks().includes(mst)) {
                        stream.addTrack(mst)
                    }
                }
            })
            return stream.getTracks().length > 0 ? stream : null
        })

        setIsMicOn(lp.isMicrophoneEnabled)
        setIsCameraOn(lp.isCameraEnabled)
    }, [])

    // ─── LiveKit Room Logic ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isJoined || !liveKitToken) return

        if (roomRef.current &&
           (roomRef.current.state === ConnectionState.Connected || roomRef.current.state === ConnectionState.Connecting)) {
            return
        }

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

        // FIX 3: handleTrackSubscribed adiciona a track ao stream persistente,
        // em vez de criar um new MediaStream() a cada update.
        const handleTrackSubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
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
                connectionState: 'connected' as const
            }

            if (pub.source === Track.Source.ScreenShare) {
                // Screen share pode ter stream próprio sem problema de pisca
                existing.screenStream = new MediaStream([track.mediaStreamTrack])
            } else {
                // Reutilizar o mesmo MediaStream — apenas adicionar/remover tracks
                const persistentStream = getOrCreateStream(id)

                if (track.kind === 'video') {
                    // Remove qualquer video track antiga antes de adicionar a nova
                    persistentStream.getVideoTracks().forEach(t => persistentStream.removeTrack(t))
                    existing.cameraOn = true
                } else {
                    persistentStream.getAudioTracks().forEach(t => persistentStream.removeTrack(t))
                    existing.micOn = true
                }
                persistentStream.addTrack(track.mediaStreamTrack)
                existing.stream = persistentStream  // sempre a mesma referência
            }

            peersRef.current.set(id, existing)
            syncToState()
        }

        // FIX 4: handleTrackUnsubscribed remove track do stream persistente,
        // sem criar um new MediaStream().
        const handleTrackUnsubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, p: RemoteParticipant) => {
            const id = p.identity
            const existing = peersRef.current.get(id)
            if (!existing) return

            if (pub.source === Track.Source.ScreenShare) {
                existing.screenStream = null
            } else {
                const persistentStream = peerStreamsRef.current.get(id)
                if (persistentStream) {
                    // Remove apenas a track específica — não recria o objeto
                    persistentStream.removeTrack(track.mediaStreamTrack)
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
            // Limpa o stream persistente do participante que saiu
            peerStreamsRef.current.delete(p.identity)
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

                await room.connect(url, liveKitToken)
                setMediaStatus('connected')
                if (userName) room.localParticipant.setName(userName)

                // Popula participantes existentes
                room.remoteParticipants.forEach((p: RemoteParticipant) => {
                    handleParticipantConnected(p)
                    // Subscribes em tracks já publicadas ao entrar na sala
                    p.getTrackPublications().forEach(pub => {
                        if (pub.track && pub.isSubscribed) {
                            handleTrackSubscribed(pub.track as RemoteTrack, pub as RemoteTrackPublication, p)
                        }
                    })
                })

                // FIX 5: LiveKit gerencia 100% do hardware após join.
                // NÃO passamos stream do useMediaStream aqui — evita conflito de hardware.
                await room.localParticipant.setMicrophoneEnabled(initialConfig.micOn !== false)
                await room.localParticipant.setCameraEnabled(initialConfig.cameraOn !== false)
                updateLocalStates()
            } catch (err) {
                console.error('[LK] Connection error:', err)
                setLastError(String(err))
                setMediaStatus('failed')
            }
        }

        connect()

        return () => {
            room.disconnect()
            roomRef.current = null
            peersRef.current.clear()
            peerStreamsRef.current.clear()
        }
    }, [isJoined, liveKitToken, roomId])

    useEffect(() => {
        if (roomRef.current?.state === ConnectionState.Connected && userName) {
            roomRef.current.localParticipant.setName(userName)
        }
    }, [userName])

    // ─── Actions ─────────────────────────────────────────────────────────────
    const toggleMic = useCallback(async (enabled: boolean) => {
        if (!roomRef.current) return
        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(enabled)
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
