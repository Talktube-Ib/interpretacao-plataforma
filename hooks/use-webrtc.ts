import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import '@/lib/polyfills'
import SimplePeer from 'simple-peer'
import { RealtimeChannel } from '@supabase/supabase-js'

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
    lastSignalTime?: number
}

export function useWebRTC(
    roomId: string,
    userId: string,
    userRole: string = 'participant',
    initialConfig: { micOn?: boolean, cameraOn?: boolean, audioDeviceId?: string, videoDeviceId?: string } = {},
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
        language: 'floor'
    })
    const [userCount, setUserCount] = useState(0)
    const [mediaError, setMediaError] = useState<string | null>(null)
    const iceServersRef = useRef<any[]>([{ urls: 'stun:stun.l.google.com:19302' }])
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)

    const [localHandRaised, setLocalHandRaised] = useState(false)
    const [reactions, setReactions] = useState<{ id: string, emoji: string, userId: string }[]>([])

    const channelRef = useRef<RealtimeChannel | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const originalMicTrackRef = useRef<MediaStreamTrack | null>(null)
    const currentAudioTrackRef = useRef<MediaStreamTrack | null>(null)
    const mixedAudioTrackRef = useRef<MediaStreamTrack | null>(null)

    const [hostId, setHostId] = useState<string | null>(null)
    const peersRef = useRef<Map<string, PeerData>>(new Map())
    const [sharingUserId, setSharingUserId] = useState<string | null>(null)

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
        const interval = setInterval(() => {
            const now = Date.now()
            let changed = false
            peersRef.current.forEach((p, id) => {
                if (p.connectionState === 'connecting' && p.lastSignalTime && (now - p.lastSignalTime > 20000)) {
                    p.peer.destroy()
                    peersRef.current.delete(id)
                    changed = true
                }
            })
            if (changed) syncToState()
        }, 10000)
        return () => clearInterval(interval)
    }, [syncToState])

    useEffect(() => {
        let mounted = true
        let activeStream: MediaStream | null = null

        const init = async () => {
            try {
                try {
                    const res = await fetch('/api/turn')
                    const data = await res.json()
                    if (data.iceServers) iceServersRef.current = data.iceServers
                } catch (e) { }
                const constraints = {
                    audio: initialConfig.micOn !== false ? { deviceId: initialConfig.audioDeviceId ? { exact: initialConfig.audioDeviceId } : undefined } : true,
                    video: initialConfig.cameraOn !== false ? { deviceId: initialConfig.videoDeviceId ? { exact: initialConfig.videoDeviceId } : undefined } : true
                }
                const stream = await navigator.mediaDevices.getUserMedia(constraints)
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

                // ONLY JOIN CHANNEL IF isJoined IS TRUE (Lobby fix v11.0)
                if (mounted && isJoined) joinChannel(stream)
            } catch (err: any) {
                if (!mounted) return
                setMediaError(err.message)
                if (isJoined) joinChannel(null)
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

    const createPeer = (targetUserId: string, initiator: boolean, stream: MediaStream | null, targetRole: string, targetName: string = 'Participante') => {
        if (peersRef.current.get(targetUserId)) return peersRef.current.get(targetUserId)!.peer
        const peer = new SimplePeer({ initiator, trickle: true, stream: stream || undefined, config: { iceServers: iceServersRef.current } })
        peer.on('signal', (signal) => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'signal',
                payload: { target: targetUserId, sender: userId, signal, role: userRole, name: userName }
            })
        })
        peer.on('connect', () => { updatePeerData(targetUserId, { connectionState: 'connected' }) })
        peer.on('stream', (remoteStream) => { updatePeerData(targetUserId, { stream: remoteStream, connectionState: 'connected' }) })
        peer.on('track', (track, stream) => {
            if (track.kind === 'video') {
                const videoTracks = stream.getVideoTracks()
                if (videoTracks.length > 1 && track.id === videoTracks[videoTracks.length - 1].id) {
                    const presentationId = `${targetUserId}-presentation`
                    peersRef.current.set(presentationId, { peer, stream: new MediaStream([track]), userId: presentationId, role: 'presentation', name: `Apresentação`, isPresentation: true, parentUserId: targetUserId, connectionState: 'connected' })
                    syncToState()
                }
            }
        })
        peer.on('close', () => {
            const p = peersRef.current.get(targetUserId)
            if (p) { p.peer.destroy(); peersRef.current.delete(targetUserId); peersRef.current.delete(`${targetUserId}-presentation`); syncToState() }
        })
        peersRef.current.set(targetUserId, { peer, userId: targetUserId, role: targetRole, name: targetName, connectionState: 'connecting', lastSignalTime: Date.now() })
        syncToState()
        return peer
    }

    const joinChannel = (stream: MediaStream | null) => {
        if (channelRef.current) return
        const newChannel = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } })
        channelRef.current = newChannel
        setChannelState(newChannel)
        newChannel
            .on('broadcast', { event: 'signal' }, (event) => {
                const { sender, signal, target, role: r, name: n } = event.payload
                if (target !== userId) return
                const existing = peersRef.current.get(sender)
                if (existing) { existing.lastSignalTime = Date.now(); existing.peer.signal(signal) }
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
                        if (peerChanged) changed = true
                    }
                })
                if (changed) syncToState()
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Include host status in initial track if known
                    const isHost = hostId === userId || metadataRef.current.isHost
                    metadataRef.current = { ...metadataRef.current, isHost }
                    await newChannel.track(metadataRef.current)
                }
            })
    }

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

    const updateMetadata = (patch: any) => {
        metadataRef.current = { ...metadataRef.current, ...patch }
        if (channelRef.current && isJoined) {
            channelRef.current.track(metadataRef.current)
        }
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

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
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
            console.log("Iniciando compartilhamento de tela com áudio...")
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' } as any,
                audio: true
            })

            const screenTrack = screenStream.getVideoTracks()[0]

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
                localStream.addTrack(screenTrack)

                // Only swap if we actually have a NEW mixed track different from the current one
                if (mixedTrack && currentAudioTrackRef.current && mixedTrack !== currentAudioTrackRef.current) {
                    const toReplace = currentAudioTrackRef.current
                    localStream.removeTrack(toReplace)
                    localStream.addTrack(mixedTrack)

                    peersRef.current.forEach(p => {
                        if (!p.isPresentation) {
                            try { p.peer.replaceTrack(toReplace, mixedTrack, localStream) }
                            catch (e) { console.error("Falha ao substituir track áudio:", e) }
                        }
                    })
                    currentAudioTrackRef.current = mixedTrack
                }

                // Note: If no mixed track (fallback), we just keep currentAudioTrackRef (which is the mic)
                // We do NOT remove it.

                // Add the video track as a second track
                peersRef.current.forEach(p => {
                    if (!p.isPresentation) {
                        try { p.peer.addTrack(screenTrack, localStream) } catch (e) { }
                    }
                })
            }

            setSharingUserId(userId)
            channelRef.current?.send({ type: 'broadcast', event: 'share-started', payload: { sender: userId } })

            screenTrack.onended = () => stopScreenShare(onEnd)
            return screenStream
        } catch (e: any) {
            console.error("Screen share failed:", e)
            onEnd?.()
        }
    }

    const stopScreenShare = (onEnd?: () => void) => {
        if (!localStream) return
        const tracks = localStream.getTracks()
        const primaryVideoId = localStream.getVideoTracks()[0]?.id
        const screenTrack = localStream.getVideoTracks().find(t => t.id !== primaryVideoId)

        const mixedTrack = mixedAudioTrackRef.current

        if (screenTrack) {
            screenTrack.stop()
            localStream.removeTrack(screenTrack)
        }

        // Restore original mic track if it was replaced
        if (mixedTrack && originalMicTrackRef.current && currentAudioTrackRef.current === mixedTrack) {
            localStream.removeTrack(mixedTrack)
            localStream.addTrack(originalMicTrackRef.current)
            mixedTrack.stop()

            const toRepl = mixedTrack
            const restore = originalMicTrackRef.current

            peersRef.current.forEach(p => {
                if (!p.isPresentation) {
                    if (screenTrack) {
                        try { p.peer.removeTrack(screenTrack, localStream) } catch (e) { }
                    }
                    try { p.peer.replaceTrack(toRepl, restore, localStream) } catch (e) { }
                }
            })
            currentAudioTrackRef.current = restore
            mixedAudioTrackRef.current = null
        } else if (screenTrack) {
            // If just screen video without mixed audio
            peersRef.current.forEach(p => {
                if (!p.isPresentation) {
                    try { p.peer.removeTrack(screenTrack, localStream) } catch (e) { }
                }
            })
        }

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
        if (originalMicTrackRef.current) originalMicTrackRef.current.enabled = enabled
        if (mixedAudioTrackRef.current) mixedAudioTrackRef.current.enabled = enabled
        localStream?.getAudioTracks().forEach(t => t.enabled = enabled)
        updateMetadata({ micOn: enabled })
    }

    const toggleCamera = (enabled: boolean) => {
        localStream?.getVideoTracks().forEach(t => t.enabled = enabled)
        updateMetadata({ cameraOn: enabled })
    }

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
        switchDevice: async (k: any, d: any) => { },
        sendEmoji,
        toggleHand,
        updateMetadata,
        promoteToHost,
        mediaError,
        reactions,
        localHandRaised,
        hostId,
        isHost: hostId === userId
    }
}
