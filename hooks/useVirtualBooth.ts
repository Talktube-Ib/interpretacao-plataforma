
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface BoothState {
    partnerId: string | null
    partnerName: string | null
    // Connection state now reflects LiveKit token status or Supabase presence
    isConnected: boolean
    isHandoverPending: boolean
    handoverDeadline: number | null
    handoverRequester: string | null
    connectionState: 'idle' | 'finding-partner' | 'connecting' | 'connected' | 'disconnected'
    liveKitToken: string | null
}

export function useVirtualBooth(
    roomId: string,
    userId: string,
    userLanguage: string
) {
    const supabase = createClient()
    const [state, setState] = useState<BoothState>({
        partnerId: null,
        partnerName: null,
        isConnected: false,
        isHandoverPending: false,
        handoverDeadline: null,
        handoverRequester: null,
        connectionState: 'finding-partner',
        liveKitToken: null
    })

    const channelRef = useRef<RealtimeChannel | null>(null)
    const channelName = `booth:${roomId}:${userLanguage}`

    // 1. Get LiveKit Token
    useEffect(() => {
        if (!roomId || !userId || !userLanguage || userLanguage === 'floor') {
            setState(s => ({ ...s, liveKitToken: null }))
            return
        }

        const fetchToken = async () => {
            try {
                // Determine room name for LiveKit (one room per language booth)
                const liveKitRoom = `booth-${roomId}-${userLanguage}`
                const resp = await fetch(`/api/livekit/token?room=${liveKitRoom}&username=${userId}`)
                const data = await resp.json()
                if (data.token) {
                    setState(s => ({ ...s, liveKitToken: data.token }))
                }
            } catch (error) {
                console.error("Failed to fetch LiveKit token", error)
            }
        }
        fetchToken()
    }, [roomId, userId, userLanguage])

    // 2. Supabase Presence & Handover (Keep existing logic)
    useEffect(() => {
        if (!roomId || !userId || !userLanguage || userLanguage === 'floor') {
            setState(s => ({ ...s, connectionState: 'idle' }))
            return
        }

        const channel = supabase.channel(channelName, {
            config: { presence: { key: userId } },
        })

        channelRef.current = channel

        channel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState()
                const users = Object.keys(presenceState)
                const partner = users.find(id => id !== userId)

                if (partner) {
                    setState(s => ({ ...s, partnerId: partner, connectionState: 'connected' }))
                } else {
                    setState(s => ({ ...s, partnerId: null, connectionState: 'finding-partner' }))
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
        }
    }, [roomId, userId, userLanguage, channelName])

    // Handover API
    const requestHandover = useCallback(() => {
        const deadline = Date.now() + 10000
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
    }, [])

    return {
        ...state,
        requestHandover,
        acceptHandover,
        cancelHandover
    }
}
