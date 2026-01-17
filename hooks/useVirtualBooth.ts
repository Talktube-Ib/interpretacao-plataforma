import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import SimplePeer from 'simple-peer'
import { v4 as uuidv4 } from 'uuid' 

// We can reuse the same ICE servers
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
]

interface BoothState {
    partnerId: string | null
    partnerName: string | null
    isConnected: boolean
    isHandoverPending: boolean
    handoverDeadline: number | null
    handoverRequester: string | null
    connectionState: 'idle' | 'finding-partner' | 'connecting' | 'connected' | 'disconnected'
}

export function useVirtualBooth(
    roomId: string, 
    userId: string, 
    userLanguage: string,
    stream: MediaStream | null // The booth-specific stream (can be same as main or separated)
) {
    const supabase = createClient()
    const [state, setState] = useState<BoothState>({
        partnerId: null,
        partnerName: null,
        isConnected: false,
        isHandoverPending: false,
        handoverDeadline: null,
        handoverRequester: null,
        connectionState: 'finding-partner'
    })

    const [partnerStream, setPartnerStream] = useState<MediaStream | null>(null)
    const peerRef = useRef<SimplePeer.Instance | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)
    const channelName = `booth:${roomId}:${userLanguage}` // Private channel for this language pair

    // 1. Find Partner and Connect
    useEffect(() => {
        if (!roomId || !userId || !userLanguage || userLanguage === 'floor') {
            setState(s => ({ ...s, connectionState: 'idle' }))
            return
        }

        console.log(`[VirtualBooth] Joining booth channel: ${channelName}`)
        
        const channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: userId,
                },
            },
        })

        channelRef.current = channel

        channel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState()
                const users = Object.keys(presenceState)
                
                // Find someone who IS NOT ME
                const partner = users.find(id => id !== userId)
                
                if (partner) {
                    console.log(`[VirtualBooth] Partner found: ${partner}`)
                    setState(s => ({ ...s, partnerId: partner, connectionState: 'connecting' }))
                    
                    // Decide who initiates (lexical sort)
                    const iAmInitiator = userId > partner
                    if (iAmInitiator) {
                        initiatePeer(partner, true)
                    }
                } else {
                    console.log(`[VirtualBooth] No partner found yet.`)
                    setState(s => ({ ...s, partnerId: null, connectionState: 'finding-partner' }))
                }
            })
            // Signaling for Booth P2P
            .on('broadcast', { event: 'booth-signal' }, ({ payload }) => {
                const { signal, sender } = payload
                if (sender !== userId && peerRef.current) {
                    peerRef.current.signal(signal)
                } else if (sender !== userId && !peerRef.current) {
                    // Received offer but haven't created peer yet (race condition or I am receiver)
                    // Receiver needs to create peer now
                     initiatePeer(sender, false, signal)
                }
            })
            // Signaling for Handover
            .on('broadcast', { event: 'handover-request' }, ({ payload }) => {
                const { sender, deadline } = payload
                if (sender !== userId) {
                    setState(s => ({ 
                        ...s, 
                        isHandoverPending: true, 
                        handoverRequester: sender,
                        handoverDeadline: deadline 
                    }))
                }
            })
            .on('broadcast', { event: 'handover-accept' }, ({ payload }) => {
                 const { sender } = payload
                if (sender !== userId) {
                    // Partner accepted!
                    // Trigger callback or state update to switch mic logic
                    // This hook mainly manages the state, the parent component executes the audio switch
                    window.dispatchEvent(new CustomEvent('booth-handover-accepted'))
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() })
                }
            })

        return () => {
            channel.unsubscribe()
            if (peerRef.current) peerRef.current.destroy()
        }
    }, [roomId, userId, userLanguage]) // Re-run if language changes (switching cabins)

    // Helper to start P2P
    const initiatePeer = (targetId: string, initiator: boolean, offerSignal?: any) => {
        if (peerRef.current) return // Already exists

        const p = new SimplePeer({
            initiator,
            trickle: true,
            stream: stream || undefined,
            config: { iceServers: ICE_SERVERS }
        })

        p.on('signal', (data) => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'booth-signal',
                payload: {
                    signal: data,
                    sender: userId,
                    target: targetId
                }
            })
        })

        p.on('connect', () => {
            console.log('[VirtualBooth] P2P Connected via Direct DataChannel')
            setState(s => ({ ...s, isConnected: true, connectionState: 'connected' }))
        })

        p.on('stream', (remoteStream) => {
            setPartnerStream(remoteStream)
        })

        p.on('close', () => {
            setState(s => ({ ...s, isConnected: false, connectionState: 'disconnected', partnerId: null }))
            peerRef.current = null
        })

        p.on('error', (err) => {
            console.error('[VirtualBooth] Peer error:', err)
        })

        if (offerSignal && !initiator) {
            p.signal(offerSignal)
        }

        peerRef.current = p
    }

    // Handover API
    const requestHandover = useCallback(() => {
        const deadline = Date.now() + 10000 // 10s countdown
        channelRef.current?.send({
            type: 'broadcast',
            event: 'handover-request',
            payload: { sender: userId, deadline }
        })
    }, [])

    const acceptHandover = useCallback(() => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'handover-accept',
            payload: { sender: userId }
        })
        setState(s => ({ ...s, isHandoverPending: false, handoverRequester: null }))
    }, [])
    
    const cancelHandover = useCallback(() => {
         setState(s => ({ ...s, isHandoverPending: false, handoverRequester: null }))
         // Optionally notify partner
    }, [])

    return {
        ...state,
        partnerStream,
        requestHandover,
        acceptHandover,
        cancelHandover
    }
}
