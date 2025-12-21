
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
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
}


export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: { micOn?: boolean, cameraOn?: boolean, audioDeviceId?: string, videoDeviceId?: string } = {}
) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [peers, setPeers] = useState<Map<string, PeerData>>(new Map())
    const [logs, setLogs] = useState<string[]>([])
    const [userCount, setUserCount] = useState(0)
    const [mediaError, setMediaError] = useState<string | null>(null)
    const [iceServers, setIceServers] = useState<any[]>([{ urls: 'stun:stun.l.google.com:19302' }]) // Default fallback
    const iceServersRef = useRef<any[]>([{ urls: 'stun:stun.l.google.com:19302' }]) // Ref for closure access
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)

    // Reactions & Interactions
    const [localHandRaised, setLocalHandRaised] = useState(false)
    const [reactions, setReactions] = useState<{ id: string, emoji: string, userId: string }[]>([])

    const channelRef = useRef<RealtimeChannel | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const videoElementRef = useRef<HTMLVideoElement | null>(null)
    const originalMicTrackRef = useRef<MediaStreamTrack | null>(null)
    const currentMixedTrackRef = useRef<MediaStreamTrack | null>(null)

    const [hostId, setHostId] = useState<string | null>(null)

    // Helper to add logs
    const addLog = (msg: string) => {
        console.log(`[WebRTC] ${msg}`)
        setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()} - ${msg}`])
    }

    const supabase = createClient()
    const peersRef = useRef<Map<string, PeerData>>(new Map())
    const currentAudioDeviceId = useRef<string | undefined>(initialConfig.audioDeviceId)
    const currentVideoDeviceId = useRef<string | undefined>(initialConfig.videoDeviceId)

    // 1. Initialize User Media (Camera/Mic)
    useEffect(() => {
        let mounted = true
        let activeStream: MediaStream | null = null

        const init = async () => {
            try {
                addLog(`Checking device capability...`)

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("API de câmera bloqueada! (Use HTTPS ou Enable Insecure Origins)")
                }

                // Fetch ICE Servers (TURN)
                try {
                    const res = await fetch('/api/turn')
                    const data = await res.json()
                    if (data.iceServers) {
                        setIceServers(data.iceServers)
                        iceServersRef.current = data.iceServers // Update ref
                        addLog(`Loaded ${data.iceServers.length} ICE servers`)
                    }
                } catch (e) {
                    console.error("Failed to load ICE servers, using default", e)
                }

                const constraints = {
                    audio: initialConfig.micOn !== false ? (initialConfig.audioDeviceId ? { deviceId: { exact: initialConfig.audioDeviceId } } : true) : false,
                    video: initialConfig.cameraOn !== false ? (initialConfig.videoDeviceId ? { deviceId: { exact: initialConfig.videoDeviceId } } : true) : false
                }

                if (initialConfig.audioDeviceId) currentAudioDeviceId.current = initialConfig.audioDeviceId
                if (initialConfig.videoDeviceId) currentVideoDeviceId.current = initialConfig.videoDeviceId

                addLog(`Initializing media with constraints: ${JSON.stringify(constraints)}`)
                const stream = await navigator.mediaDevices.getUserMedia(constraints)

                activeStream = stream // Store for cleanup

                addLog(`Media acquired: ${stream.getAudioTracks().length} audio tracks, ${stream.getVideoTracks().length} video tracks`)

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop())
                    return
                }

                setLocalStream(stream)
                originalMicTrackRef.current = stream.getAudioTracks()[0]
                // Fetch Initial Host
                const { data: meeting } = await supabase.from('meetings').select('host_id').eq('id', roomId).single()
                if (meeting?.host_id) {
                    setHostId(meeting.host_id)
                }

                joinChannel(stream)
            } catch (err: unknown) {
                const error = err as Error
                console.error("Error accessing media devices:", error)
                const errorMsg = `Error accessing media: ${error.message}. Joining as OBSERVER.`
                addLog(errorMsg)
                setMediaError(error.message)
                joinChannel(null)
            }
        }
        init()

        return () => {
            mounted = false
            // Cleanup strict
            console.log("Cleaning up WebRTC...", activeStream)

            if (activeStream) {
                activeStream.getTracks().forEach(track => {
                    console.log(`Stopping track: ${track.kind} - ${track.label}`)
                    track.stop()
                    track.enabled = false
                })
            }
            // Fallback: Stop specific refs if they exist
            if (originalMicTrackRef.current) originalMicTrackRef.current.stop()

            // Clean peers
            peersRef.current.forEach(p => p.peer.destroy())
            peersRef.current.clear()
            setPeers(new Map())

            if (channelRef.current) {
                channelRef.current.unsubscribe()
                channelRef.current = null
            }
        }
    }, [roomId, userId])

    // Add global beforeunload for strict cleanup on refresh/close
    useEffect(() => {
        const handleBeforeUnload = () => {
            localStream?.getTracks().forEach(t => t.stop())
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [localStream])

    // 2. Signaling Logic (Supabase Realtime)
    const joinChannel = (stream: MediaStream | null) => {
        addLog(`Joining channel room:${roomId} as ${userId} (${stream ? 'Video' : 'Observer'})`)
        const newChannel = supabase.channel(`room:${roomId}`, {
            config: {
                presence: {
                    key: userId,
                },
            },
        })

        channelRef.current = newChannel
        setChannelState(newChannel) // Trigger re-render for consumers
        addLog(`Connecting to Supabase channel room:${roomId}...`)
        newChannel
            .on('broadcast', { event: 'signal' }, (event: { payload: Record<string, unknown> }) => {
                const payload = event.payload
                handleSignal(payload, stream)
            })
            .on('broadcast', { event: 'metadata-update' }, (event: { payload: { userId: string, metadata: any } }) => {
                const { userId: remoteUserId, metadata } = event.payload
                // Update peers map with new metadata
                setPeers(prev => {
                    const newMap = new Map(prev)
                    const existing = newMap.get(remoteUserId)
                    if (existing) {
                        newMap.set(remoteUserId, { ...existing, ...metadata })
                    }
                    return newMap
                })
            })
            .on('broadcast', { event: 'media-toggle' }, (event: { payload: { userId: string, kind: 'mic' | 'camera', enabled: boolean } }) => {
                const { userId: remoteUserId, kind, enabled } = event.payload
                setPeers(prev => {
                    const newMap = new Map(prev)
                    const existing = newMap.get(remoteUserId)
                    if (existing) {
                        const update = kind === 'mic' ? { micOn: enabled } : { cameraOn: enabled }
                        newMap.set(remoteUserId, { ...existing, ...update })
                    }
                    return newMap
                })
            })
            .on('broadcast', { event: 'reaction' }, (event: { payload: { userId: string, emoji: string } }) => {
                const { userId: senderId, emoji } = event.payload
                const id = Math.random().toString(36).substr(2, 9)
                setReactions(prev => [...prev, { id, emoji, userId: senderId }])
                setTimeout(() => {
                    setReactions(prev => prev.filter(r => r.id !== id))
                }, 5000)
            })
            .on('broadcast', { event: 'host-update' }, (event: { payload: { hostId: string } }) => {
                const { hostId: newHostId } = event.payload
                addLog(`Host update: New host is ${newHostId}`)
                setHostId(newHostId)
            })
            .on('broadcast', { event: 'hand-toggle' }, (event: { payload: { userId: string, enabled: boolean } }) => {
                const { userId: remoteUserId, enabled } = event.payload
                if (enabled) playNotificationSound() // Play sound when someone raises hand
                setPeers(prev => {
                    const newMap = new Map(prev)
                    const existing = newMap.get(remoteUserId)
                    if (existing) {
                        newMap.set(remoteUserId, { ...existing, handRaised: enabled })
                    }
                    return newMap
                })
            })
            .on('presence', { event: 'sync' }, () => {
                const state = newChannel.presenceState()
                const users = Object.keys(state)
                setUserCount(users.length)

                // Identify new users
                users.forEach(remoteUserId => {
                    if (remoteUserId === userId) return;

                    if (!peersRef.current.has(remoteUserId)) {
                        const shouldInitiate = userId > remoteUserId
                        const remoteState = (state[remoteUserId] as any[])?.[0] || {}
                        const remoteRole = remoteState.role || 'participant'
                        const remoteLang = remoteState.language || 'floor'
                        const remoteMic = remoteState.micOn !== undefined ? remoteState.micOn : true
                        const remoteCam = remoteState.cameraOn !== undefined ? remoteState.cameraOn : true

                        addLog(`Found ${remoteUserId}. Initiating? ${shouldInitiate}`)
                        createPeer(
                            remoteUserId,
                            userId,
                            shouldInitiate,
                            stream,
                            remoteRole,
                            remoteLang,
                            remoteMic,
                            remoteCam
                        )
                    }
                })
            })
            .subscribe(async (status: string) => {
                addLog(`Channel status: ${status}`)
                if (status === 'SUBSCRIBED') {
                    // Initial track with default media states
                    await newChannel.track({
                        userId,
                        role: userRole,
                        micOn: true,
                        cameraOn: true
                    })
                }
            })
    }

    // Effect to handle role updates
    useEffect(() => {
        if (channelRef.current) {
            addLog(`Updating role to ${userRole}...`)
            channelRef.current.track({ userId, role: userRole, micOn: true, cameraOn: true })
            channelRef.current.send({
                type: 'broadcast',
                event: 'role-update',
                payload: { userId, role: userRole }
            })
        }
    }, [userRole])

    const createPeer = (targetUserId: string, initiatorId: string, initiator: boolean, stream: MediaStream | null, targetRole: string, targetLanguage: string = 'floor', remoteMic: boolean = true, remoteCam: boolean = true) => {
        // Double check ref to be safe
        if (peersRef.current.has(targetUserId)) {
            return peersRef.current.get(targetUserId)?.peer
        }

        addLog(`Creating Peer connection to ${targetUserId} (Initiator: ${initiator})`)

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
                payload: { target: targetUserId, sender: userId, signal, role: userRole, language: 'floor' } // Initial handshake
            })
        })

        peer.on('stream', (remoteStream) => {
            console.log("Received primary stream from", targetUserId)
            addLog(`Received stream from ${targetUserId}: ${remoteStream.getAudioTracks().length} Audio, ${remoteStream.getVideoTracks().length} Video`)

            setPeers(prev => {
                const newMap = new Map(prev)
                const existing = newMap.get(targetUserId)
                if (existing) {
                    newMap.set(targetUserId, { ...existing, stream: remoteStream })
                } else {
                    newMap.set(targetUserId, {
                        peer,
                        stream: remoteStream,
                        userId: targetUserId,
                        role: targetRole,
                        language: targetLanguage,
                        micOn: remoteMic,
                        cameraOn: remoteCam
                    })
                }
                return newMap
            })
        })

        peer.on('track', (track, stream) => {
            addLog(`Track received from ${targetUserId}: ${track.kind}`)
            // If we receive a second video track, it's likely a presentation
            if (track.kind === 'video') {
                const videoTracks = stream.getVideoTracks()
                if (videoTracks.length > 1 && track.id === videoTracks[videoTracks.length - 1].id) {
                    addLog(`Detected secondary video track (Presentation) from ${targetUserId}`)
                    // Create a virtual peer for presentation
                    const presentationId = `${targetUserId}-presentation`
                    setPeers(prev => {
                        const newMap = new Map(prev)
                        newMap.set(presentationId, {
                            peer, // Shares the same peer connection
                            stream: new MediaStream([track]),
                            userId: presentationId,
                            role: 'presentation',
                            name: `Apresentação de ${targetUserId}`,
                            isPresentation: true,
                            parentUserId: targetUserId
                        })
                        return newMap
                    })
                }
            }
        })

        peer.on('close', () => {
            removePeer(targetUserId)
        })

        peer.on('error', (err: Error) => {
            console.error('Peer error:', err)
            removePeer(targetUserId)
        })

        const peerData = {
            peer,
            userId: targetUserId,
            role: targetRole,
            language: targetLanguage,
            micOn: remoteMic,
            cameraOn: remoteCam
        }
        peersRef.current.set(targetUserId, peerData)
        setPeers(new Map(peersRef.current))

        return peer
    }

    const handleSignal = (payload: Record<string, unknown>, stream: MediaStream | null) => {
        if (payload.target !== userId) return

        const senderId = payload.sender as string
        const existingPeer = peersRef.current.get(senderId)

        if (existingPeer) {
            existingPeer.peer.signal(payload.signal as SimplePeer.SignalData)
        } else {
            addLog(`Received signal from new peer ${senderId}`)
            const peer = createPeer(
                senderId,
                userId,
                false,
                stream,
                (payload.role as string) || 'participant',
                (payload.language as string) || 'floor',
                true, // Default mic state for fallback
                true  // Default camera state for fallback
            )
            peer?.signal(payload.signal as SimplePeer.SignalData)
        }
    }

    const removePeer = (id: string) => {
        if (peersRef.current.has(id)) {
            peersRef.current.get(id)?.peer.destroy()
            peersRef.current.delete(id)
            setPeers(new Map(peersRef.current))
        }
    }

    const toggleMic = (enabled: boolean) => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks()
            addLog(`Toggling Mic: ${enabled}. Found ${audioTracks.length} tracks.`)
            audioTracks.forEach(t => {
                t.enabled = enabled
                addLog(`Track ${t.id} enabled: ${t.enabled}`)
            })
            // Broadcast state
            channelRef.current?.send({
                type: 'broadcast',
                event: 'media-toggle',
                payload: { userId, kind: 'mic', enabled }
            })
        } else {
            addLog("Cannot toggle mic: No local stream.")
        }
    }

    const toggleCamera = (enabled: boolean) => {
        localStream?.getVideoTracks().forEach(t => t.enabled = enabled)
        // Broadcast state
        channelRef.current?.send({
            type: 'broadcast',
            event: 'media-toggle',
            payload: { userId, kind: 'camera', enabled }
        })
    }

    const shareScreen = async (onEnd?: () => void) => {
        if (hostId !== userId) {
            alert("Apenas o Host pode compartilhar tela.")
            return
        }
        try {
            if (!localStream) return

            addLog("Requesting screen share...");
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 30
                },
                audio: true // Enabled system audio share
            })

            const screenVideoTrack = screenStream.getVideoTracks()[0]
            const screenAudioTrack = screenStream.getAudioTracks()[0]

            const currentVideoTrack = localStream.getVideoTracks()[0]
            const currentAudioTrack = localStream.getAudioTracks()[0]

            addLog(`Screen share started. Video: ${screenVideoTrack.id}, Audio: ${screenAudioTrack?.id || 'none'}`)

            // Do NOT stop or remove the current video track (camera)
            // We only add the screen track to the local stream object for consistency,
            // but the main goal is to send it as an additional track to peers.
            addLog(`Adding screen track ${screenVideoTrack.id} to local stream`)
            localStream.addTrack(screenVideoTrack)

            // Handle Audio Mixing/Replacement
            let finalAudioTrack = currentAudioTrack
            if (screenAudioTrack) {
                try {
                    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
                    const ctx = audioContextRef.current
                    const dest = ctx.createMediaStreamDestination()

                    if (currentAudioTrack) {
                        const micSource = ctx.createMediaStreamSource(new MediaStream([currentAudioTrack]))
                        micSource.connect(dest)
                    }

                    const systemSource = ctx.createMediaStreamSource(new MediaStream([screenAudioTrack]))
                    systemSource.connect(dest)

                    finalAudioTrack = dest.stream.getAudioTracks()[0]
                    addLog("Mixed microphone with system audio.")
                } catch (e) {
                    console.warn("Failed to mix audio, using only microphone:", e)
                }
            }

            // Add screen track to all peers (new renegotiation)
            peersRef.current.forEach((peerData, peerId) => {
                if (peerData.peer && !peerData.peer.destroyed) {
                    try {
                        addLog(`Adding new track to peer ${peerId}`)
                        peerData.peer.addTrack(screenVideoTrack, localStream)

                        if (screenAudioTrack && currentAudioTrack && finalAudioTrack) {
                            peerData.peer.replaceTrack(currentAudioTrack, finalAudioTrack, localStream)
                        }
                    } catch (e) {
                        console.error(`Failed to add presentation track for peer ${peerId}`, e)
                    }
                }
            })

            // Broadcast presentation status
            channelRef.current?.send({
                type: 'broadcast',
                event: 'presentation-toggle',
                payload: { userId, enabled: true, trackId: screenVideoTrack.id }
            })

            screenVideoTrack.onended = () => {
                addLog("Screen share ended by browser UI.")
                stopScreenShare(onEnd)
            }

            return screenStream
        } catch (err) {
            console.error("Error sharing screen:", err)
            addLog(`Error sharing screen: ${err}`)
            onEnd?.()
        }
    }

    const shareVideoFile = async (file: File, onEnd?: () => void) => {
        if (hostId !== userId) {
            alert("Apenas o Host pode compartilhar arquivos de vídeo.")
            return
        }
        try {
            if (!localStream) return

            addLog(`Starting local video share: ${file.name}`)

            const video = document.createElement('video')
            video.src = URL.createObjectURL(file)
            video.muted = true // Prevents feedback loop if played locally
            video.loop = false
            videoElementRef.current = video

            await video.play()

            // captureStream is a non-standard but widely supported API
            const mediaStream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream()

            const fileVideoTrack = mediaStream.getVideoTracks()[0]
            const fileAudioTrack = mediaStream.getAudioTracks()[0]

            const currentVideoTrack = localStream.getVideoTracks()[0]
            const currentAudioTrack = localStream.getAudioTracks()[0]

            // Handle Video Replacement
            if (currentVideoTrack) {
                currentVideoTrack.stop()
                localStream.removeTrack(currentVideoTrack)
            }
            localStream.addTrack(fileVideoTrack)

            // Handle Audio Mixing (Mic + Video)
            let finalAudioTrack = currentAudioTrack
            if (fileAudioTrack) {
                try {
                    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
                    const ctx = audioContextRef.current
                    const dest = ctx.createMediaStreamDestination()

                    if (currentAudioTrack) {
                        const micSource = ctx.createMediaStreamSource(new MediaStream([currentAudioTrack]))
                        micSource.connect(dest)
                    }

                    const videoSource = ctx.createMediaStreamSource(new MediaStream([fileAudioTrack]))
                    const videoGain = ctx.createGain()
                    videoGain.gain.value = 0.8 // Default volume for video
                    videoSource.connect(videoGain)
                    videoGain.connect(dest)

                    finalAudioTrack = dest.stream.getAudioTracks()[0]
                    addLog("Mixed microphone with video file audio.")
                } catch (e) {
                    console.warn("Failed to mix video audio, using only microphone:", e)
                }
            }

            // Sync with Peers
            peersRef.current.forEach((peerData, peerId) => {
                if (peerData.peer && !peerData.peer.destroyed) {
                    try {
                        peerData.peer.replaceTrack(currentVideoTrack, fileVideoTrack, localStream)
                        if (fileAudioTrack && currentAudioTrack && finalAudioTrack) {
                            peerData.peer.replaceTrack(currentAudioTrack, finalAudioTrack, localStream)
                        }
                    } catch (e) {
                        console.error(`Failed to replace tracks for peer ${peerId}`, e)
                    }
                }
            })

            video.onended = () => {
                addLog("Video file ended.")
                stopScreenShare(onEnd) // Recursively use stopScreenShare as it handles cleanup
            }

        } catch (err) {
            console.error("Error sharing video file:", err)
            addLog(`Error sharing video file: ${err}`)
            onEnd?.()
        }
    }

    const stopScreenShare = async (callback?: () => void) => {
        try {
            if (!localStream) return
            addLog("Stopping screen share, reverting to camera...")

            const screenVideoTrack = localStream.getVideoTracks().find(t => t.id !== currentVideoDeviceId.current && t.label.toLowerCase().includes('screen') || t.id !== originalMicTrackRef.current?.id)
            // Note: Identifying the screen track precisely might need better logic, but this is a good heuristic

            const currentAudioTrack = localStream.getAudioTracks()[0]

            // Find any track that isn't the primary camera
            const tracks = localStream.getVideoTracks()
            const realScreenTrack = tracks.length > 1 ? tracks[tracks.length - 1] : tracks[0]

            if (realScreenTrack) {
                realScreenTrack.stop()
                localStream.removeTrack(realScreenTrack)
            }

            // Broadcast presentation end
            channelRef.current?.send({
                type: 'broadcast',
                event: 'presentation-toggle',
                payload: { userId, enabled: false }
            })

            // Cleanup Video Element
            if (videoElementRef.current) {
                videoElementRef.current.pause()
                videoElementRef.current.src = ""
                videoElementRef.current.load()
                videoElementRef.current = null
            }

            // Restore Camera
            const constraints = {
                video: currentVideoDeviceId.current ? { deviceId: { exact: currentVideoDeviceId.current } } : true,
                audio: false
            }
            const cameraStream = await navigator.mediaDevices.getUserMedia(constraints)
            const cameraTrack = cameraStream.getVideoTracks()[0]

            // Restore Audio Track
            const micTrack = originalMicTrackRef.current

            if (cameraTrack) {
                localStream.addTrack(cameraTrack)
            }

            // Replace audios for all peers back to original mic if needed
            peersRef.current.forEach((peerData, peerId) => {
                if (peerData.peer && !peerData.peer.destroyed) {
                    try {
                        if (currentAudioTrack && micTrack && currentAudioTrack !== micTrack) {
                            peerData.peer.replaceTrack(currentAudioTrack, micTrack, localStream)
                        }
                    } catch (e) {
                        console.error(`Failed to revert tracks for peer ${peerId}`, e)
                    }
                }
            })

            // Update local stream audio if it was changed
            if (micTrack && currentAudioTrack !== micTrack) {
                localStream.removeTrack(currentAudioTrack)
                localStream.addTrack(micTrack)
            }

            callback?.()

        } catch (err) {
            console.error("Error reverting to camera:", err)
            addLog(`Error reverting to camera: ${err}`)
        }
    }

    const updateMetadata = (metadata: { language?: string }) => {
        if (channelRef.current) {
            addLog(`Updating my metadata: ${JSON.stringify(metadata)}`)
            channelRef.current.track({ userId, role: userRole, ...metadata })
            channelRef.current.send({
                type: 'broadcast',
                event: 'metadata-update',
                payload: { userId, metadata }
            })
        }
    }

    const switchDevice = async (kind: 'audio' | 'video', deviceId: string) => {
        if (!localStream) return

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                [kind]: { deviceId: { exact: deviceId } }
            })
            const newTrack = kind === 'audio' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0]
            const oldTrack = kind === 'audio' ? localStream.getAudioTracks()[0] : localStream.getVideoTracks()[0]

            if (oldTrack) {
                oldTrack.stop()
                localStream.removeTrack(oldTrack)
            }
            localStream.addTrack(newTrack)

            if (kind === 'audio') {
                originalMicTrackRef.current = newTrack
            }

            // Update Peers
            peersRef.current.forEach(({ peer }) => {
                if (oldTrack) {
                    peer.replaceTrack(oldTrack, newTrack, localStream)
                } else {
                    peer.addTrack(newTrack, localStream)
                }
            })

            // Force re-render of local video
            setLocalStream(new MediaStream(localStream.getTracks()))
            if (kind === 'audio') currentAudioDeviceId.current = deviceId
            else currentVideoDeviceId.current = deviceId
            addLog(`Switched ${kind} device to ${deviceId}`)
        } catch (err) {
            console.error(`Failed to switch ${kind} device:`, err)
        }
    }

    const promoteToHost = (targetUserId: string) => {
        if (hostId !== userId) {
            addLog(`Error: Only current host can promote others`)
            return
        }

        addLog(`Promoting ${targetUserId} to Host...`)
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'host-update',
                payload: { hostId: targetUserId }
            })
        }
    }

    const sendEmoji = (emoji: string) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'reaction',
            payload: { userId, emoji }
        })
        const id = Math.random().toString(36).substr(2, 9)
        setReactions(prev => [...prev, { id, emoji, userId }])
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id))
        }, 5000)
    }

    const toggleHand = () => {
        const newState = !localHandRaised
        setLocalHandRaised(newState)
        if (newState) playNotificationSound() // Play local sound
        channelRef.current?.send({
            type: 'broadcast',
            event: 'hand-toggle',
            payload: { userId, enabled: newState }
        })
    }

    return {
        localStream,
        peers: Array.from(peers.values()),
        logs,
        userCount,
        mediaError,
        toggleMic,
        toggleCamera,
        shareScreen,
        stopScreenShare,
        switchDevice,
        sendEmoji,
        shareVideoFile,
        toggleHand,
        updateMetadata,
        localHandRaised,
        reactions,
        channel: channelState,
        hostId,
        promoteToHost,
        isHost: hostId === userId
    }
}
