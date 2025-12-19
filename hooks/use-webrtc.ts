
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import SimplePeer from 'simple-peer'
import { RealtimeChannel } from '@supabase/supabase-js'

interface PeerData {
    peer: SimplePeer.Instance
    stream?: MediaStream
    userId: string
    role: string
    language?: string // Added for interpretation
}


export function useWebRTC(roomId: string, userId: string, userRole: string = 'participant') {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [peers, setPeers] = useState<Map<string, PeerData>>(new Map())
    const [logs, setLogs] = useState<string[]>([])
    const [userCount, setUserCount] = useState(0)
    const [mediaError, setMediaError] = useState<string | null>(null)
    const [iceServers, setIceServers] = useState<any[]>([{ urls: 'stun:stun.l.google.com:19302' }]) // Default fallback
    const iceServersRef = useRef<any[]>([{ urls: 'stun:stun.l.google.com:19302' }]) // Ref for closure access
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)

    // Helper to add logs
    const addLog = (msg: string) => {
        console.log(`[WebRTC] ${msg}`)
        setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()} - ${msg}`])
    }

    const supabase = createClient()
    const channelRef = useRef<RealtimeChannel | null>(null)
    const peersRef = useRef<Map<string, PeerData>>(new Map())

    // 1. Initialize User Media (Camera/Mic)
    useEffect(() => {
        let mounted = true

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

                addLog(`Initializing media...`)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                })

                addLog(`Media acquired: ${stream.getAudioTracks().length} audio tracks, ${stream.getVideoTracks().length} video tracks`)

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop())
                    return
                }

                setLocalStream(stream)
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
            // Cleanup
            localStream?.getTracks().forEach(track => track.stop()) // Keep media alive for flicker-free exp? No, stop it.
            // Actually, for dev exp, stopping is safer.

            if (channelRef.current) {
                addLog(`Cleaning up channel...`)
                channelRef.current.unsubscribe()
                channelRef.current = null
            }

            peersRef.current.forEach(p => p.peer.destroy())
            peersRef.current.clear()
            setPeers(new Map())
        }
    }, [roomId, userId])

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
        // If we don't have a peer for them yet
        if (!peersRef.current.has(remoteUserId)) {
            const shouldInitiate = userId > remoteUserId
            const remoteState = (state[remoteUserId] as unknown[])[0] as Record<string, unknown>
            const remoteRole = (remoteState?.role as string) || 'participant'
            const remoteLang = (remoteState?.language as string) || 'floor'

            addLog(`Found ${remoteUserId}. Initiating? ${shouldInitiate}`)
            createPeer(remoteUserId, userId, shouldInitiate, stream, remoteRole, remoteLang)
        }
    })
})
            .subscribe(async (status: string) => {
    addLog(`Channel status: ${status}`)
    if (status === 'SUBSCRIBED') {
        // Announce presence with Role
        await channel.track({ userId, role: userRole })
    }
})

channelRef.current = channel
    }

// Effect to handle role updates
useEffect(() => {
    if (channelRef.current) {
        addLog(`Updating role to ${userRole}...`)
        channelRef.current.track({ userId, role: userRole })
        channelRef.current.send({
            type: 'broadcast',
            event: 'role-update',
            payload: { userId, role: userRole }
        })
    }
}, [userRole])

const createPeer = (targetUserId: string, initiatorId: string, initiator: boolean, stream: MediaStream | null, targetRole: string, targetLanguage: string = 'floor') => {
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
        console.log("Received stream from", targetUserId)
        addLog(`Received stream from ${targetUserId}: ${remoteStream.getAudioTracks().length} Audio, ${remoteStream.getVideoTracks().length} Video`)
        setPeers(prev => {
            const newMap = new Map(prev)
            const existing = newMap.get(targetUserId)
            if (existing) {
                newMap.set(targetUserId, { ...existing, stream: remoteStream })
            } else {
                // Should not happen if logic is correct, but safe fallback
                newMap.set(targetUserId, { peer, stream: remoteStream, userId: targetUserId, role: targetRole, language: targetLanguage })
            }
            return newMap
        })
    })

    peer.on('close', () => {
        removePeer(targetUserId)
    })

    peer.on('error', (err: Error) => {
        console.error('Peer error:', err)
        removePeer(targetUserId)
    })

    const peerData = { peer, userId: targetUserId, role: targetRole, language: targetLanguage }
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
        const peer = createPeer(senderId, userId, false, stream, (payload.role as string) || 'participant', (payload.language as string) || 'floor')
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
    } else {
        addLog("Cannot toggle mic: No local stream.")
    }
}

const toggleCamera = (enabled: boolean) => {
    localStream?.getVideoTracks().forEach(t => t.enabled = enabled)
}

const shareScreen = async (onEnd?: () => void) => {
    try {
        if (!localStream) return

        addLog("Requesting screen share...");
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                frameRate: 30
            },
            audio: false
        })

        const screenTrack = screenStream.getVideoTracks()[0]
        const currentVideoTrack = localStream.getVideoTracks()[0]

        addLog(`Screen share started. Track: ${screenTrack.id}`)

        if (currentVideoTrack) {
            currentVideoTrack.stop() // Stop camera to save resource
            localStream.removeTrack(currentVideoTrack)
        }
        localStream.addTrack(screenTrack)

        // Replace track for all peers
        peersRef.current.forEach((peerData, peerId) => {
            if (peerData.peer && !peerData.peer.destroyed) {
                addLog(`Replacing track for peer ${peerId}`)
                peerData.peer.replaceTrack(currentVideoTrack, screenTrack, localStream)
            }
        })

        screenTrack.onended = () => {
            addLog("Screen share ended by browser UI.")
            stopScreenShare(onEnd)
        }

        return screenStream
    } catch (err) {
        console.error("Error sharing screen:", err)
        addLog(`Error sharing screen: ${err}`)
        onEnd?.() // Reset UI state if failed
    }
}

const stopScreenShare = async (callback?: () => void) => {
    try {
        if (!localStream) return
        addLog("Stopping screen share, reverting to camera...")

        const screenTrack = localStream.getVideoTracks()[0]
        if (screenTrack) {
            screenTrack.stop()
            localStream.removeTrack(screenTrack)
        }

        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const cameraTrack = cameraStream.getVideoTracks()[0]

        if (cameraTrack) {
            localStream.addTrack(cameraTrack)
            // Replace track back for all peers
            peersRef.current.forEach((peerData, peerId) => {
                if (peerData.peer && !peerData.peer.destroyed) {
                    peerData.peer.replaceTrack(screenTrack, cameraTrack, localStream)
                }
            })
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

return {
    localStream,
    peers: Array.from(peers.values()),
    toggleMic,
    toggleCamera,
    shareScreen,
    stopScreenShare,
    updateMetadata,
    logs,
    userCount,
    mediaError,
    channel: channelState, // Export state instead of ref
}
}
