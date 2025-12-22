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
    const [peers, setPeers] = useState<Map<string, PeerData>>(new Map())
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

    const [hostId, setHostId] = useState<string | null>(null)

    const peersRef = useRef<Map<string, PeerData>>(new Map())
    const currentAudioDeviceId = useRef<string | undefined>(initialConfig.audioDeviceId)
    const currentVideoDeviceId = useRef<string | undefined>(initialConfig.videoDeviceId)

    const addLog = useCallback((msg: string) => {
        console.log(`[useWebRTC] ${msg}`)
        setLogs(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()} - ${msg}`])
    }, [])

    const syncPeersToState = useCallback(() => {
        const currentPeers = new Map(peersRef.current)
        setPeers(currentPeers)
        console.log(`[useWebRTC] State Sync: ${currentPeers.size} peers.`, Array.from(currentPeers.keys()))
    }, [])

    const updatePeerData = useCallback((id: string, patch: Partial<PeerData>) => {
        const existing = peersRef.current.get(id)
        if (existing) {
            peersRef.current.set(id, { ...existing, ...patch })
            syncPeersToState()
        }
    }, [syncPeersToState])

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
            syncPeersToState()
            if (channelRef.current) {
                channelRef.current.unsubscribe()
                channelRef.current = null
            }
        }
    }, [roomId, userId])

    const joinChannel = (stream: MediaStream | null) => {
        if (channelRef.current) return

        const newChannel = supabase.channel(`room:${roomId}`, {
            config: { presence: { key: userId } },
        })

        channelRef.current = newChannel
        setChannelState(newChannel)

        newChannel
            .on('broadcast', { event: 'signal' }, (event) => {
                handleSignal(event.payload, stream)
            })
            .on('broadcast', { event: 'media-toggle' }, (event) => {
                const { userId: remoteId, kind, enabled } = event.payload
                updatePeerData(remoteId, kind === 'mic' ? { micOn: enabled } : { cameraOn: enabled })
            })
            .on('broadcast', { event: 'metadata-update' }, (event) => {
                const { userId: remoteId, metadata } = event.payload
                updatePeerData(remoteId, metadata)
            })
            .on('presence', { event: 'sync' }, () => {
                const state = newChannel.presenceState()
                const users = Object.keys(state)
                setUserCount(users.length)

                users.forEach(remoteId => {
                    if (remoteId === userId) return
                    if (!peersRef.current.has(remoteId)) {
                        const shouldInitiate = userId > remoteId
                        const rState = (state[remoteId] as any[])?.[0] || {}
                        createPeer(remoteId, shouldInitiate, stream, rState.role || 'participant')
                    }
                })
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await newChannel.track({ userId, role: userRole, micOn: true, cameraOn: true })
                }
            })
    }

    const createPeer = (targetUserId: string, initiator: boolean, stream: MediaStream | null, targetRole: string) => {
        if (peersRef.current.has(targetUserId)) return peersRef.current.get(targetUserId)!.peer

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
                payload: { target: targetUserId, sender: userId, signal, role: userRole }
            })
        })

        peer.on('connect', () => {
            addLog(`Connected to ${targetUserId}`)
            updatePeerData(targetUserId, { connectionState: 'connected' })
        })

        peer.on('stream', (remoteStream) => {
            addLog(`*** STREAM from ${targetUserId} ***`)
            updatePeerData(targetUserId, { stream: remoteStream, connectionState: 'connected' })
        })

        peer.on('close', () => {
            addLog(`Connection closed: ${targetUserId}`)
            removePeer(targetUserId)
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
        syncPeersToState()
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

    const removePeer = (id: string) => {
        const p = peersRef.current.get(id)
        if (p) {
            p.peer.destroy()
            peersRef.current.delete(id)
            syncPeersToState()
        }
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
        peers: Array.from(peers.values()),
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
        shareScreen: async (onEnd?: () => void) => { addLog("Placeholder scaleShare"); return undefined },
        stopScreenShare: async (onEnd?: () => void) => { addLog("Placeholder stopScreenShare") },
        switchDevice: async (k: any, d: any) => { },
        sendEmoji: (e: string) => { },
        shareVideoFile: async (f: File, onEnd?: () => void) => { addLog("Placeholder shareVideoFile") },
        toggleHand: () => { },
        updateMetadata: (m: any) => { },
        promoteToHost: (id: string) => { }
    }
}
