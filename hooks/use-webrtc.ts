import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/lib/polyfills'
import SimplePeer from 'simple-peer'
import { RealtimeChannel } from '@supabase/supabase-js'

interface PeerData {
    peer: SimplePeer.Instance
    stream?: MediaStream
    screenStream?: MediaStream
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
    lastSignalTime?: number
    audioBlocked?: boolean
}

export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: { micOn?: boolean, cameraOn?: boolean, audioDeviceId?: string, videoDeviceId?: string, stream?: MediaStream } = {},
    isJoined: boolean = false,
    userName: string = 'Participante'
) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [peers, setPeers] = useState<PeerData[]>([])
    const metadataRef = useRef<any>({
        name: userName,
        role: userRole,
        micOn: initialConfig.micOn !== false,
        cameraOn: initialConfig.cameraOn !== false,
        handRaised: false,
        language: 'floor',
        audioBlocked: false
    })
    const [userCount, setUserCount] = useState(0)
    const [mediaError, setMediaError] = useState<string | null>(null)
    const iceServersRef = useRef<any[]>([
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ])
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)

    const [localHandRaised, setLocalHandRaised] = useState(false)
    const [reactions, setReactions] = useState<{ id: string, emoji: string, userId: string }[]>([])

    const channelRef = useRef<RealtimeChannel | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const originalMicTrackRef = useRef<MediaStreamTrack | null>(null)
    const currentAudioTrackRef = useRef<MediaStreamTrack | null>(null)
    const mixedAudioTrackRef = useRef<MediaStreamTrack | null>(null)
    const screenVideoTrackRef = useRef<MediaStreamTrack | null>(null)
    const activeScreenStreamRef = useRef<MediaStream | null>(null)

    const [hostId, setHostId] = useState<string | null>(null)
    const peersRef = useRef<Map<string, PeerData>>(new Map())
    const [sharingUserId, setSharingUserId] = useState<string | null>(null)

    // Force Opus to Music Mode (High fidelity, Stereo, CBR)
    const optimizeSdp = (sdp: string) => {
        try {
            return sdp.replace(/a=fmtp:(\d+) (.+)/g, (match, pt, params) => {
                if (sdp.includes(`a=rtpmap:${pt} opus/48000/2`)) {
                    // Force stereo, max bitrate, disable DTX/VAD (useinbandfec=1; cbr=1)
                    return `a=fmtp:${pt} ${params};stereo=1;sprop-stereo=1;maxaveragebitrate=510000;useinbandfec=1;cbr=1`
                }
                return match
            })
        } catch (e) { return sdp }
    }

    const syncToState = useCallback(() => {
        setPeers(Array.from(peersRef.current.values()))
    }, [])

    const updatePeerData = useCallback((id: string, patchOrFn: Partial<PeerData> | ((prev: PeerData | undefined) => Partial<PeerData>)) => {
        const existing = peersRef.current.get(id)
        if (existing) {
            const patch = typeof patchOrFn === 'function' ? patchOrFn(existing) : patchOrFn
            peersRef.current.set(id, { ...existing, ...patch })
            syncToState()
        }
    }, [syncToState])

    const supabase = createClient()

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now()
            let changed = false
            peersRef.current.forEach((p, id) => {
                // Increased timeout to 45s to handle slower ICE gathering/network
                if (p.connectionState === 'connecting' && p.lastSignalTime && (now - p.lastSignalTime > 45000)) {
                    p.peer.destroy()
                    peersRef.current.delete(id)
                    changed = true
                }
            })
            if (changed) syncToState()
        }, 10000)
        return () => clearInterval(interval)
    }, [syncToState])

    const createPeer = useCallback((targetUserId: string, initiator: boolean, stream: MediaStream | null, targetRole: string, targetName: string = 'Participante') => {
        if (peersRef.current.get(targetUserId)) return peersRef.current.get(targetUserId)!.peer
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: stream || undefined,
            config: { iceServers: iceServersRef.current },
            // sdpTransform: optimizeSdp - REMOVED: Causing issues with video negotiation on some clients
        })
        peer.on('signal', (signal) => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'signal',
                payload: { target: targetUserId, sender: userId, signal, role: userRole, name: userName }
            })
        })
        peer.on('connect', () => { updatePeerData(targetUserId, { connectionState: 'connected' }) })
        peer.on('stream', (remoteStream) => {
            updatePeerData(targetUserId, (prev) => {
                // If we already have a main stream, and this new one is video, assume it's screen share?
                // Or better, rely on track counts?
                // Simple-peer fires 'stream' for the first stream.
                // If we use addStream for screen share, it fires 'stream' again.
                // We need to differentiate.

                // Heuristic: If we already have a stream, this is likely screen share.
                // OR check if remoteStream has video track and we already have a video track.

                // Better approach: Check if this stream id is different?
                // Usually `addStream` creates a new stream ID on the receiving end? No, it limits sending stream.

                // Let's assume the second stream received is screen share.
                if (prev?.stream && prev.stream.id !== remoteStream.id) {
                    console.log(`Received second stream for ${targetUserId}, treating as Screen Share`)
                    return { screenStream: remoteStream, connectionState: 'connected' }
                }

                // If no stream yet, or it replaces main stream?
                // Standard behavior: 1st stream is camera.
                return { stream: remoteStream, connectionState: 'connected' }
            })
        })
        peer.on('error', (err) => {
            console.error(`Peer error with ${targetUserId}:`, err)
            // cleanup will be handled by 'close' event usually, but force destroy just in case
            peer.destroy()
        })
        peer.on('close', () => {
            const p = peersRef.current.get(targetUserId)
            if (p) { p.peer.destroy(); peersRef.current.delete(targetUserId); peersRef.current.delete(`${targetUserId}-presentation`); syncToState() }
        })
        peersRef.current.set(targetUserId, { peer, userId: targetUserId, role: targetRole, name: targetName, connectionState: 'connecting', lastSignalTime: Date.now() })
        syncToState()
        return peer
    }, [userId, userRole, userName, syncToState, updatePeerData])

    const updateMetadata = useCallback((patch: any) => {
        const newState = { ...metadataRef.current, ...patch }
        // Simple diff check to prevent flood
        if (JSON.stringify(newState) === JSON.stringify(metadataRef.current)) return

        metadataRef.current = newState
        if (channelRef.current && isJoined) {
            channelRef.current.track(metadataRef.current)
        }
    }, [isJoined])

    const joinChannel = useCallback((stream: MediaStream | null) => {
        if (channelRef.current) {
            channelRef.current.unsubscribe()
        }

        console.log("Joining Supabase Channel:", roomId)
        const newChannel = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } })
        channelRef.current = newChannel
        setChannelState(newChannel)

        newChannel
            .on('broadcast', { event: 'signal' }, (event) => {
                const { sender, signal, target, role: r, name: n } = event.payload
                if (target !== userId) return
                const existing = peersRef.current.get(sender)
                if (existing) {
                    existing.lastSignalTime = Date.now();
                    if (existing.peer && !existing.peer.destroyed) existing.peer.signal(signal)
                }
                else if (signal.type === 'offer') {
                    const newPeer = createPeer(sender, false, stream, r || 'participant', n || 'Participante')
                    newPeer?.signal(signal)
                }
            })
            .on('broadcast', { event: 'share-started' }, (event) => { setSharingUserId(event.payload.sender) })
            .on('broadcast', { event: 'share-ended' }, (event) => {
                const { sender } = event.payload
                peersRef.current.delete(`${sender}-presentation`)
                const actualPeer = peersRef.current.get(sender)
                if (actualPeer && actualPeer.stream) {
                    const vTracks = actualPeer.stream.getVideoTracks()
                    if (vTracks.length > 1) {
                        const newStream = new MediaStream([vTracks[0]])
                        actualPeer.stream.getAudioTracks().forEach(t => newStream.addTrack(t))
                        actualPeer.stream = newStream
                    }
                }
                setSharingUserId(null); syncToState()
            })
            .on('broadcast', { event: 'host-promoted' }, (event) => {
                setHostId(event.payload.newHostId)
            })
            .on('broadcast', { event: 'reaction' }, (event) => {
                const { emoji, sender } = event.payload
                const id = Math.random().toString(36).substr(2, 9)
                setReactions(prev => [...prev, { id, emoji, userId: sender }])
                setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 5000)
            })
            // New Admin Actions Listener
            .on('broadcast', { event: 'admin-action' }, async (event) => {
                const { action, targetId, payload } = event.payload
                if (targetId === userId) {
                    if (action === 'set-role') {
                        updateMetadata({ role: payload.role })
                        if (payload.role !== 'interpreter') {
                            updateMetadata({ language: 'floor' })
                        }
                    }
                    else if (action === 'set-allowed-languages') {
                        window.dispatchEvent(new CustomEvent('admin-update-languages', { detail: payload.languages }))
                    }
                    // ... (existing code)
                    else if (action === 'kick') {
                        alert('Você foi removido da reunião pelo administrador.')
                        window.location.href = '/dashboard'
                    }
                    else if (action === 'mute-user') {
                        toggleMic(false)
                        // Trigger visual feedback (maybe a custom event or relying on metadata update)
                        window.dispatchEvent(new CustomEvent('admin-mute'))
                    }
                    else if (action === 'block-audio') {
                        updateMetadata({ audioBlocked: true })
                        toggleMic(false)
                        alert('Seu áudio foi bloqueado pelo anfitrião.')
                    }
                    else if (action === 'unblock-audio') {
                        updateMetadata({ audioBlocked: false })
                        alert('Seu áudio foi desbloqueado. Você já pode ligar o microfone.')
                    }
                }
            })

            .on('presence', { event: 'sync' }, () => {
                const state = newChannel.presenceState(); const users = Object.keys(state); setUserCount(users.length)
                let changed = false
                peersRef.current.forEach((p, id) => {
                    if (id !== userId && !id.endsWith('-presentation') && !users.includes(id)) { p.peer.destroy(); peersRef.current.delete(id); peersRef.current.delete(`${id}-presentation`); changed = true }
                })
                users.forEach(remoteId => {
                    const remoteData = (state[remoteId] as any[])?.[0]
                    if (remoteId !== userId && !peersRef.current.has(remoteId)) {
                        createPeer(remoteId, userId > remoteId, stream, remoteData?.role || 'participant', remoteData?.name || 'Participante')
                        changed = true
                    } else if (remoteId !== userId && peersRef.current.has(remoteId)) {
                        const p = peersRef.current.get(remoteId)!
                        let peerChanged = false
                        if (remoteData?.name && p.name !== remoteData.name) { p.name = remoteData.name; peerChanged = true }
                        if (p.micOn !== remoteData?.micOn) { p.micOn = remoteData?.micOn; peerChanged = true }
                        if (p.cameraOn !== remoteData?.cameraOn) { p.cameraOn = remoteData?.cameraOn; peerChanged = true }
                        if (p.handRaised !== remoteData?.handRaised) { p.handRaised = remoteData?.handRaised; peerChanged = true }
                        if (p.language !== remoteData?.language) { p.language = remoteData?.language; peerChanged = true }
                        if (p.role !== remoteData?.role) { p.role = remoteData?.role; peerChanged = true }
                        if (p.isHost !== remoteData?.isHost) { p.isHost = remoteData?.isHost; peerChanged = true }
                        if (p.audioBlocked !== remoteData?.audioBlocked) { p.audioBlocked = remoteData?.audioBlocked; peerChanged = true }
                        if (peerChanged) changed = true
                    }
                })
                if (changed) syncToState()
            })
            .subscribe(async (status) => {
                console.log("Supabase Channel Status:", status)
                if (status === 'SUBSCRIBED') {
                    // Include host status in initial track if known
                    const isHost = hostId === userId || metadataRef.current.isHost
                    metadataRef.current = { ...metadataRef.current, isHost }
                    await newChannel.track(metadataRef.current)
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    console.error("Supabase Channel Disconnected:", status)
                    // Optional: Trigger UI warning
                }
            })
    }, [roomId, userId, userRole, userName, hostId])

    useEffect(() => {
        let mounted = true
        let activeStream: MediaStream | null = null

        const init = async () => {
            try {
                // Defer media acquisition until user actually joins (avoids conflict with Lobby preview)
                if (!isJoined) return

                try {
                    const res = await fetch('/api/turn')
                    const data = await res.json()
                    if (data.iceServers) iceServersRef.current = data.iceServers
                } catch (e) { }
                let stream: MediaStream
                if (initialConfig.stream) {
                    console.log("Using stream from Lobby...")
                    stream = initialConfig.stream
                } else {
                    const constraints = {
                        audio: initialConfig.micOn !== false ? { deviceId: initialConfig.audioDeviceId ? { exact: initialConfig.audioDeviceId } : undefined } : true,
                        video: initialConfig.cameraOn !== false ? { deviceId: initialConfig.videoDeviceId ? { exact: initialConfig.videoDeviceId } : undefined } : true
                    }
                    stream = await navigator.mediaDevices.getUserMedia(constraints)
                }
                setMediaError(null) // Clear any previous errors
                activeStream = stream
                if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }

                // Mute tracks if they should be off initially (getUserMedia might return them on by default)
                if (initialConfig.micOn === false) stream.getAudioTracks().forEach(t => t.enabled = false);
                if (initialConfig.cameraOn === false) stream.getVideoTracks().forEach(t => t.enabled = false);

                setLocalStream(stream)
                originalMicTrackRef.current = stream.getAudioTracks()[0]
                currentAudioTrackRef.current = stream.getAudioTracks()[0]
                const { data: meeting } = await supabase.from('meetings').select('host_id').eq('id', roomId).single()
                if (meeting?.host_id && mounted) {
                    setHostId(meeting.host_id)
                    metadataRef.current.isHost = meeting.host_id === userId
                }

                // Ensure metadata is up-to-date with latest props before joining
                metadataRef.current.name = userName
                metadataRef.current.role = userRole
                metadataRef.current.micOn = initialConfig.micOn !== false
                metadataRef.current.cameraOn = initialConfig.cameraOn !== false

                // ONLY JOIN CHANNEL IF isJoined IS TRUE (Lobby fix v11.0)
                if (mounted && isJoined) joinChannel(stream)
            } catch (err: any) {
                if (!mounted) return
                // Only set error if we don't have a valid stream already (prevent transient false positives)
                if (!activeStream) {
                    setMediaError(err.message)
                    if (isJoined) joinChannel(null)
                }
            }
        }
        init()
        return () => {
            mounted = false
            activeStream?.getTracks().forEach(t => t.stop())
            peersRef.current.forEach(p => p.peer.destroy()); peersRef.current.clear()
            syncToState()
            if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current = null }
        }
    }, [roomId, userId, isJoined])

    // NEW: Sync local tracks to all connected peers whenever localStream changes
    // This handles cases where the user joins first (no permissions) and then allows camera later.
    useEffect(() => {
        if (!localStream) return

        peersRef.current.forEach(p => {
            // Only add if not already added (SimplePeer throws if track already exists, so we try/catch)
            localStream.getTracks().forEach(track => {
                try {
                    p.peer.addTrack(track, localStream)
                } catch (e) {
                    // Ignore "Track already exists" errors
                }
            })
        })
    }, [localStream])

    const promoteToHost = async (newHostId: string) => {
        if (hostId !== userId) return
        try {
            await supabase.from('meetings').update({ host_id: newHostId }).eq('id', roomId)
            channelRef.current?.send({ type: 'broadcast', event: 'host-promoted', payload: { newHostId } })
            setHostId(newHostId)
        } catch (e) { console.error(e) }
    }

    const sendEmoji = (emoji: string) => {
        channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji, sender: userId } })
        const id = Math.random().toString(36).substr(2, 9)
        setReactions(prev => [...prev, { id, emoji, userId }])
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 5000)
    }

    const toggleHand = () => {
        const newState = !localHandRaised
        setLocalHandRaised(newState)
        updateMetadata({ handRaised: newState })
    }



    // React to identity changes (e.g. Admin name loading late)
    useEffect(() => {
        if (channelRef.current && isJoined) {
            updateMetadata({ name: userName, role: userRole })
        }
    }, [userName, userRole, isJoined])

    const mixAudio = async (contentStream: MediaStream) => {
        const contentTrack = contentStream.getAudioTracks()[0]

        // STRICT FALLBACK: If no content audio, return original mic immediately. Do not mix.
        if (!contentTrack) {
            console.warn("Sem áudio do sistema detectado. Mantendo microfone original.")
            return originalMicTrackRef.current
        }

        if (!originalMicTrackRef.current) return contentTrack

        try {
            // FORCE RESET: Always create a fresh context to avoid "suspended" or stale states
            if (audioContextRef.current) {
                try { await audioContextRef.current.close() } catch (e) { }
                audioContextRef.current = null
            }

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                latencyHint: 'interactive',
                sampleRate: 48000
            })
            const ctx = audioContextRef.current

            const dest = ctx.createMediaStreamDestination()

            // Mic Source
            const micSource = ctx.createMediaStreamSource(new MediaStream([originalMicTrackRef.current]))
            const micGain = ctx.createGain()
            micGain.gain.value = 1.0
            micSource.connect(micGain)
            micGain.connect(dest)

            // Content Source
            const contentSource = ctx.createMediaStreamSource(new MediaStream([contentTrack]))
            const contentGain = ctx.createGain()
            contentGain.gain.value = 1.0
            contentSource.connect(contentGain)
            contentGain.connect(dest)

            return dest.stream.getAudioTracks()[0]
        } catch (e) {
            console.error("Audio mixing failed CRITICAL:", e)
            return originalMicTrackRef.current
        }
    }

    const shareScreen = async (onEnd?: () => void) => {
        if (sharingUserId && sharingUserId !== userId) return
        try {
            console.log("Iniciando compartilhamento de tela com áudio (High Fidelity)...")
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' } as any,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 48000,
                    channelCount: 2
                }
            })

            const screenTrack = screenStream.getVideoTracks()[0]
            screenVideoTrackRef.current = screenTrack

            // Check if user actually shared audio
            const hasSystemAudio = screenStream.getAudioTracks().length > 0
            let mixedTrack: MediaStreamTrack | null = null;

            if (hasSystemAudio) {
                console.log("Áudio do sistema detectado. Iniciando mixagem...")
                const track = await mixAudio(screenStream)
                if (track) mixedTrack = track
            } else {
                console.log("Nenhum áudio do sistema compartilhado. Usando apenas microfone.")
            }

            mixedAudioTrackRef.current = mixedTrack

            if (localStream) {
                // OLD METHOD: Add Track to localStream (Removed)
                // localStream.addTrack(screenTrack)

                // NEW METHOD: Add separate stream
                peersRef.current.forEach(p => {
                    if (!p.isPresentation) {
                        try {
                            console.log(`Adding Screen Share Stream to Peer ${p.userId}`)
                            p.peer.addStream(screenStream)
                        } catch (e) {
                            console.error("Failed to add screen stream to peer:", e)
                        }
                    }
                })
            }

            setSharingUserId(userId)
            channelRef.current?.send({ type: 'broadcast', event: 'share-started', payload: { sender: userId } })

            // Listen for browser "Stop Sharing" button
            screenTrack.onended = () => {
                console.log("Browser Stop Sharing detected")
                stopScreenShare(onEnd)
            }
            return screenStream
        } catch (e: any) {
            console.error("Screen share failed:", e)
            onEnd?.()
        }
    }

    const stopScreenShare = (onEnd?: () => void) => {
        if (!localStream) return

        // FIX: Remove Stream
        const screenTrack = screenVideoTrackRef.current

        if (screenTrack) {
            screenTrack.stop()
            screenVideoTrackRef.current = null
        }

        peersRef.current.forEach(p => {
            // How to remove specific stream? SimplePeer removeStream(stream)
            // But we need the exact stream object we added.
            // We didn't save the stream object globally?
            // Wait, we returned 'screenStream' from shareScreen, but we need to keep a ref to it to remove it.
            // Let's rely on track ending sending a 'removestream' or 'removetrack'?
            // SimplePeer documentation: peer.removeStream(stream)

            // FIXME: We need to store the activeScreenStreamRef
        })

        setSharingUserId(null)
        channelRef.current?.send({ type: 'broadcast', event: 'share-ended', payload: { sender: userId } })
        onEnd?.()
    }

    const shareVideoFile = async (file: File, onEnd?: () => void) => {
        if (sharingUserId && sharingUserId !== userId) return
        try {
            const video = document.createElement('video'); video.src = URL.createObjectURL(file); video.muted = true; video.playsInline = true; await video.play()
            const fileStream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream()
            const fileTrack = fileStream.getVideoTracks()[0];
            const mixedTrack = await mixAudio(fileStream)
            mixedAudioTrackRef.current = mixedTrack || null

            if (localStream && fileTrack) {
                localStream.addTrack(fileTrack)

                if (mixedTrack && currentAudioTrackRef.current) {
                    const toReplace = currentAudioTrackRef.current
                    localStream.removeTrack(toReplace)
                    localStream.addTrack(mixedTrack)

                    peersRef.current.forEach(p => {
                        if (!p.isPresentation) {
                            try { p.peer.replaceTrack(toReplace, mixedTrack, localStream) } catch (e) { }
                        }
                    })
                    currentAudioTrackRef.current = mixedTrack
                }

                peersRef.current.forEach(p => {
                    if (!p.isPresentation) {
                        try { p.peer.addTrack(fileTrack, localStream) } catch (e) { }
                    }
                })
            }
            setSharingUserId(userId); channelRef.current?.send({ type: 'broadcast', event: 'share-started', payload: { sender: userId } })
            video.onended = () => stopScreenShare(onEnd)
        } catch (e) { }
    }

    const toggleMic = (enabled: boolean) => {
        if (enabled && metadataRef.current.audioBlocked) {
            alert('Seu áudio está bloqueado pelo anfitrião.')
            return
        }

        if (originalMicTrackRef.current) originalMicTrackRef.current.enabled = enabled
        if (mixedAudioTrackRef.current) mixedAudioTrackRef.current.enabled = enabled
        localStream?.getAudioTracks().forEach(t => t.enabled = enabled)
        updateMetadata({ micOn: enabled })
    }

    const toggleCamera = (enabled: boolean) => {
        localStream?.getVideoTracks().forEach(t => t.enabled = enabled)
        updateMetadata({ cameraOn: enabled })
    }

    // Admin Actions
    const kickUser = (targetId: string) => {
        channelRef.current?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'kick', targetId } })
    }

    const updateUserRole = (targetId: string, newRole: string) => {
        channelRef.current?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'set-role', targetId, payload: { role: newRole } } })
    }

    const updateUserLanguages = (targetId: string, languages: string[]) => {
        channelRef.current?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'set-allowed-languages', targetId, payload: { languages } } })
    }

    const muteUser = (targetId: string) => {
        channelRef.current?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'mute-user', targetId } })
    }

    const blockUserAudio = (targetId: string) => {
        channelRef.current?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'block-audio', targetId } })
    }

    const unblockUserAudio = (targetId: string) => {
        channelRef.current?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'unblock-audio', targetId } })
    }


    const reconnect = useCallback(() => {
        console.log("Reiniciando conexão WebRTC...")
        // Destroy all peers
        peersRef.current.forEach(p => p.peer.destroy())
        peersRef.current.clear()
        syncToState()

        // Re-join channel
        if (localStream) {
            joinChannel(localStream)
        }
    }, [joinChannel, localStream, syncToState])

    return {
        localStream,
        peers,
        userCount,
        toggleMic,
        toggleCamera,
        shareScreen,
        stopScreenShare: () => stopScreenShare(),
        shareVideoFile,
        sharingUserId,
        isAnySharing: !!sharingUserId,
        channel: channelState,
        switchDevice: async (kind: 'audio' | 'video', deviceId: string) => {
            if (!localStream) return

            try {
                const constraints = kind === 'audio'
                    ? { audio: { deviceId: { exact: deviceId } } }
                    : { video: { deviceId: { exact: deviceId } } }

                const newStream = await navigator.mediaDevices.getUserMedia(constraints)
                const newTrack = kind === 'audio' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0]

                if (kind === 'audio') {
                    const oldTrack = currentAudioTrackRef.current
                    if (oldTrack) {
                        localStream.removeTrack(oldTrack)
                        oldTrack.stop()
                    }
                    localStream.addTrack(newTrack)
                    originalMicTrackRef.current = newTrack
                    currentAudioTrackRef.current = newTrack

                    // If sharing screen with audio, we might need to remix (TODO: Handle remixing on device switch)
                    // For now, just replacing the track in peers
                    peersRef.current.forEach(p => {
                        if (!p.isPresentation) {
                            p.peer.replaceTrack(oldTrack!, newTrack, localStream)
                        }
                    })
                    updateMetadata({ micOn: true }) // Auto unmute on switch? Or keep state?
                } else {
                    const oldTrack = localStream.getVideoTracks()[0] // Assuming one video track
                    if (oldTrack) {
                        localStream.removeTrack(oldTrack)
                        oldTrack.stop()
                    }
                    localStream.addTrack(newTrack)
                    peersRef.current.forEach(p => {
                        if (!p.isPresentation) {
                            p.peer.replaceTrack(oldTrack!, newTrack, localStream)
                        }
                    })
                    updateMetadata({ cameraOn: true })
                }
            } catch (err) {
                console.error("Failed to switch device:", err)
            }
        },
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
        reconnect // NEW
    }
}
