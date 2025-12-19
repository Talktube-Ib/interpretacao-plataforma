import { useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export type SignalPayload = {
    type: 'offer' | 'answer' | 'candidate' | 'new-peer'
    sdp?: RTCSessionDescriptionInit | null
    candidate?: RTCIceCandidateInit | null
    senderId: string
    targetId?: string
    metadata?: Record<string, unknown> // Role, Name, Language
}

export function useSignaling(roomId: string, userId: string, onSignal: (payload: SignalPayload) => void) {
    const supabase = createClient()
    const channelRef = useRef<RealtimeChannel | null>(null)

    useEffect(() => {
        if (!roomId || !userId) return

        const roomChannel = supabase.channel(`room:${roomId}`, {
            config: {
                broadcast: { self: false },
            },
        })

        roomChannel
            .on('broadcast', { event: 'signal' }, (payload: { payload: SignalPayload }) => {
                const data = payload.payload
                // Broadcast events (like new-peer) OR Direct messages
                if (!data.targetId || data.targetId === userId) {
                    onSignal(data)
                }
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Joined signaling channel for room ${roomId}`)
                }
            })

        channelRef.current = roomChannel

        return () => {
            supabase.removeChannel(roomChannel)
            channelRef.current = null
        }
    }, [roomId, userId, onSignal, supabase])

    const sendSignal = async (payload: SignalPayload) => {
        if (channelRef.current) {
            await channelRef.current.send({
                type: 'broadcast',
                event: 'signal',
                payload,
            })
        }
    }

    return { sendSignal }
}
