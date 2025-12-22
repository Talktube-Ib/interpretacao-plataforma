import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/lib/polyfills'
import SimplePeer from 'simple-peer'
import { RealtimeChannel } from '@supabase/supabase-js'
import { playNotificationSound } from '@/lib/audio-effects'

interface PeerData {
    peer: SimplePeer.Instance
    stream?: MediaStream
    userId: string
    role: string
    language?: string
    micOn?: boolean
    cameraOn?: boolean
    isSpeaking?: boolean
    handRaised?: boolean
    name?: string
    isPresentation?: boolean
    parentUserId?: string
    isHost?: boolean
    connectionState?: 'connecting' | 'connected' | 'failed' | 'disconnected'
}

export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: { micOn?: boolean, cameraOn?: boolean, audioDeviceId?: string, videoDeviceId?: string } = {}
) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [peers, setPeers] = useState<PeerData[]>([])
    const [logs, setLogs] = useState<string[]>([])
    const [userCount, setUserCount] = useState(0)
    const [mediaError, setMediaError] = useState<string | null>(null)
    const iceServersRef = useRef<any[]>([{ urls: 'stun:stun.l.google.com:19302' }])
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)

    const [localHandRaised, setLocalHandRaised] = useState(false)
    const [reactions, setReactions] = useState<{ id: string, emoji: string, userId: string }[]>([])

    const channelRef = useRef<RealtimeChannel | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const videoElementRef = useRef<HTMLVideoElement | null>(null)
    const originalMicTrackRef = useRef<MediaStreamTrack | null>(null)

    // MIXER REF
    const mixedStreamRef = useRef<MediaStream | null>(null)
    const activeSharingPeerMap = useRef<Map<string, MediaStreamTrack>>(new Map())

    const [hostId, setHostId] = useState<string | null>(null)
    const peersRef = useRef<Map<string, PeerData>>(new Map())

    const addLog = useCallback((msg: string) => {
        console.log(`[useWebRTC] ${msg}`)
        setLogs(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()} - ${msg}`])
    }, [])

    const syncToState = useCallback(() => {
        setPeers(Array.from(peersRef.current.values()))
    }, [])

    const updatePeerData = useCallback((id: string, patch: Partial<PeerData>) => {
        const existing = peersRef.current.get(id)
        if (existing) {
            peersRef.current.set(id, { ...existing, ...patch })
            syncToState()
        }
    }, [syncToState])

    const supabase = createClient()

    useEffect(() => {
        let mounted = true
        let activeStream: MediaStream | null = null

        const init = async () => {
            try {
                try {
                    const res = await fetch('/api/turn')
                    const data = await res.json()
                    if (data.iceServers) {
                        iceServersRef.current = data.iceServers
                        addLog(`Loaded ${data.iceServers.length} ICE servers`)
                    }
                } catch (e) {
                    console.error("Failed to load ICE servers", e)
                }

                const constraints = {
                    audio: initialConfig.micOn !== false,
                    video: initialConfig.cameraOn !== false
                }
                const stream = await navigator.mediaDevices.getUserMedia(constraints)
                activeStream = stream

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop())
                    return
                }

                setLocalStream(stream)
                originalMicTrackRef.current = stream.getAudioTracks()[0]

                const { data: meeting } = await supabase.from('meetings').select('host_id').eq('id', roomId).single()
                if (meeting?.host_id && mounted) setHostId(meeting.host_id)

                if (mounted) joinChannel(stream)

            } catch (err: any) {
                if (!mounted) return
                addLog(`Media acquire failure: ${err.message}. Observer mode.`)
                joinChannel(null)
            }
        }

        init()

        return () => {
            mounted = false
            activeStream?.getTracks().forEach(t => t.stop())
            peersRef.current.forEach(p => p.peer.destroy())
            peersRef.current.clear()
            syncToState()
            if (channelRef.current) {
                channelRef.current.unsubscribe()
                channelRef.current = null
            }
        }
    }, [roomId, userId])

    const createPeer = (targetUserId: string, initiator: boolean, stream: MediaStream | null, targetRole: string) => {
        if (peersRef.current.get(targetUserId)) return peersRef.current.get(targetUserId)!.peer

        addLog(`Creating Peer to ${targetUserId} (Init: ${initiator})`)

        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: stream || undefined,
            config: { iceServers: iceServersRef.current }
        })

        peer.on('signal', (signal) => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'signal',
                payload: {
                    target: targetUserId,
                    sender: userId,
                    signal,
                    role: userRole,
                    metadata: { name: 'Participante', role: userRole }
                }
            })
        })

        peer.on('connect', () => {
            addLog(`Connected to ${targetUserId}`)
            updatePeerData(targetUserId, { connectionState: 'connected' })
        })

        peer.on('stream', (remoteStream) => {
            addLog(`*** STREAM from ${targetUserId} (${remoteStream.getTracks().length} tracks) ***`)
            updatePeerData(targetUserId, { stream: remoteStream, connectionState: 'connected' })
        })

        peer.on('track', (track, stream) => {
            if (track.kind === 'video') {
                const videoTracks = stream.getVideoTracks()
                if (videoTracks.length > 1 && track.id === videoTracks[videoTracks.length - 1].id) {
                    addLog(`Detected secondary video track (Presentation) from ${targetUserId}`)
                    const presentationId = `${targetUserId}-presentation`
                    peersRef.current.set(presentationId, {
                        peer,
                        stream: new MediaStream([track]),
                        userId: presentationId,
                        role: 'presentation',
                        name: `Apresentação`,
                        isPresentation: true,
                        parentUserId: targetUserId,
                        connectionState: 'connected'
                    })
                    syncToState()
                }
            }
        })

        peer.on('close', () => {
            addLog(`Connection closed: ${targetUserId}`)
            const p = peersRef.current.get(targetUserId)
            if (p) {
                p.peer.destroy()
                peersRef.current.delete(targetUserId)
                peersRef.current.delete(`${targetUserId}-presentation`)
                syncToState()
            }
        })

        peer.on('error', (err) => {
            addLog(`Peer error ${targetUserId}: ${err.message}`)
            updatePeerData(targetUserId, { connectionState: 'failed' })
        })

        peersRef.current.set(targetUserId, {
            peer,
            userId: targetUserId,
            role: targetRole,
            connectionState: 'connecting'
        })
        syncToState()
        return peer
    }

    const handleSignal = (payload: any, stream: MediaStream | null) => {
        if (payload.target !== userId) return
        const { sender, signal } = payload
        const existing = peersRef.current.get(sender)
        if (existing) {
            existing.peer.signal(signal)
        } else if (signal.type === 'offer') {
            const newPeer = createPeer(sender, false, stream, payload.role || 'participant')
            newPeer?.signal(signal)
        }
    }

    const joinChannel = (stream: MediaStream | null) => {
        if (channelRef.current) return
        const newChannel = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } })
        channelRef.current = newChannel
        setChannelState(newChannel)

        newChannel
            .on('broadcast', { event: 'signal' }, (event) => handleSignal(event.payload, stream))
            .on('broadcast', { event: 'media-toggle' }, (event) => {
                const { userId: remoteId, kind, enabled } = event.payload
                updatePeerData(remoteId, kind === 'mic' ? { micOn: enabled } : { cameraOn: enabled })
            })
            .on('presence', { event: 'sync' }, () => {
                const state = newChannel.presenceState()
                const users = Object.keys(state)
                setUserCount(users.length)
                users.forEach(remoteId => {
                    if (remoteId === userId) return
                    if (!peersRef.current.has(remoteId)) {
                        createPeer(remoteId, userId > remoteId, stream, (state[remoteId] as any[])?.[0]?.role || 'participant')
                    }
                })
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') await newChannel.track({ userId, role: userRole, micOn: true, cameraOn: true })
            })
    }

    // AUDIO MIXER FUNCTION
    const mixAudio = (sourceStream: MediaStream) => {
        if (!originalMicTrackRef.current) return sourceStream.getAudioTracks()[0]

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }
            const ctx = audioContextRef.current
            const dest = ctx.createMediaStreamDestination()

            // Source 1: Microphone
            const micSource = ctx.createMediaStreamSource(new MediaStream([originalMicTrackRef.current]))
            micSource.connect(dest)

            // Source 2: Shared Content (Screen/Video)
            if (sourceStream.getAudioTracks().length > 0) {
                const sharedSource = ctx.createMediaStreamSource(sourceStream)
                const gain = ctx.createGain()
                gain.gain.value = 1.0
                sharedSource.connect(gain)
                gain.connect(dest)
                addLog("Mixed Mic + Content Audio")
            }

            return dest.stream.getAudioTracks()[0]
        } catch (e) {
            addLog("Mixer Error, falling back to original content audio")
            return sourceStream.getAudioTracks()[0]
        }
    }

    const shareScreen = async (onEnd?: () => void) => {
        try {
            addLog("Requesting Screen Share with Audio...")
            // Specifically requesting audio: true
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            })

            const screenVideoTrack = screenStream.getVideoTracks()[0]
            const mixedAudioTrack = mixAudio(screenStream)

            if (localStream) {
                localStream.addTrack(screenVideoTrack)
                peersRef.current.forEach(p => {
                    if (!p.isPresentation) {
                        p.peer.addTrack(screenVideoTrack, localStream)
                        // If we have mixed audio, we need to replace the current audio track to feed both
                        if (mixedAudioTrack && originalMicTrackRef.current) {
                            p.peer.replaceTrack(originalMicTrackRef.current, mixedAudioTrack, localStream)
                        }
                    }
                })
            }

            screenVideoTrack.onended = () => {
                addLog("Screen share ended via browser ui.")
                stopScreenShare(onEnd, mixedAudioTrack)
            }
            return screenStream
        } catch (e: any) {
            addLog(`Screen share error: ${e.message}`)
            onEnd?.()
        }
    }

    const stopScreenShare = (onEnd?: () => void, mixedAudioTrack?: MediaStreamTrack) => {
        if (!localStream) return

        // Find screen track precisely
        const tracks = localStream.getVideoTracks()
        const primaryCameraId = localStream.getVideoTracks()[0]?.id
        const screenTrack = tracks.find(t => t.id !== primaryCameraId)

        if (screenTrack) {
            screenTrack.stop()
            localStream.removeTrack(screenTrack)
            peersRef.current.forEach(p => {
                if (!p.isPresentation) {
                    try { p.peer.removeTrack(screenTrack, localStream) } catch (e) { }
                    // Revert audio if mixed
                    if (mixedAudioTrack && originalMicTrackRef.current) {
                        p.peer.replaceTrack(mixedAudioTrack, originalMicTrackRef.current, localStream)
                    }
                }
            })
        }
        onEnd?.()
    }

    const shareVideoFile = async (file: File, onEnd?: () => void) => {
        try {
            addLog(`Sharing Video File: ${file.name}`)
            const video = document.createElement('video')
            video.src = URL.createObjectURL(file)
            video.muted = true // So host doesn't hear echo
            video.playsInline = true
            videoElementRef.current = video

            await video.play()

            // captureStream 
            const fileStream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream()
            const fileVideoTrack = fileStream.getVideoTracks()[0]
            const mixedAudioTrack = mixAudio(fileStream)

            if (localStream && fileVideoTrack) {
                localStream.addTrack(fileVideoTrack)
                peersRef.current.forEach(p => {
                    if (!p.isPresentation) {
                        p.peer.addTrack(fileVideoTrack, localStream)
                        if (mixedAudioTrack && originalMicTrackRef.current) {
                            p.peer.replaceTrack(originalMicTrackRef.current, mixedAudioTrack, localStream)
                        }
                    }
                })
            }

            video.onended = () => {
                addLog("Video file share ended.")
                stopScreenShare(onEnd, mixedAudioTrack)
            }
        } catch (e: any) {
            addLog(`Video share error: ${e.message}`)
            onEnd?.()
        }
    }

    const switchDevice = async (kind: 'audio' | 'video', deviceId: string) => {
        addLog(`Switching ${kind} to ${deviceId}`)
    }

    const toggleMic = (enabled: boolean) => {
        localStream?.getAudioTracks().forEach(t => t.enabled = enabled)
        channelRef.current?.send({ type: 'broadcast', event: 'media-toggle', payload: { userId, kind: 'mic', enabled } })
    }

    const toggleCamera = (enabled: boolean) => {
        localStream?.getVideoTracks().forEach(t => t.enabled = enabled)
        channelRef.current?.send({ type: 'broadcast', event: 'media-toggle', payload: { userId, kind: 'camera', enabled } })
    }

    return {
        localStream,
        peers,
        logs,
        userCount,
        mediaError,
        toggleMic,
        toggleCamera,
        localHandRaised,
        reactions,
        channel: channelState,
        hostId,
        isHost: hostId === userId,
        shareScreen,
        stopScreenShare: () => stopScreenShare(),
        shareVideoFile,
        switchDevice,
        sendEmoji: (e: string) => { },
        toggleHand: () => { },
        updateMetadata: (m: any) => { },
        promoteToHost: (id: string) => { }
    }
}
