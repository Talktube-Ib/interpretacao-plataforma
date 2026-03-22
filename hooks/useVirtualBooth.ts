import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useVirtualBooth(roomId: string, userId: string, language: string) {
    const supabase = createClient()
    const [liveKitToken, setLiveKitToken] = useState<string | null>(null)
    const [isHandoverPending, setIsHandoverPending] = useState(false)
    const [handoverDeadline, setHandoverDeadline] = useState<number | null>(null)
    const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')

    // FIX BUG 4: canal guardado em ref — reutilizado para escutar E enviar
    const channelRef = useRef<RealtimeChannel | null>(null)

    useEffect(() => {
        // FIX: não passa role na URL — servidor resolve pelo banco (v2)
        async function fetchToken() {
            const res = await fetch(`/api/livekit/token?room=${roomId}&username=${userId}`)
            const data = await res.json()
            setLiveKitToken(data.token)
        }
        fetchToken()
    }, [roomId, userId])

    // Lógica de Realtime para Handover (FIX BUG 4)
    useEffect(() => {
        setConnectionState('connecting')

        const channel = supabase
            .channel(`handover:${roomId}`)
            .on('broadcast', { event: 'handover_request' }, ({ payload }) => {
                // FIX BUG 3: targetId existe no payload agora — comparação funciona
                if (payload.targetId === userId) {
                    setIsHandoverPending(true)
                    setHandoverDeadline(Date.now() + 30000) // 30s
                }
            })
            .on('broadcast', { event: 'handover_accept' }, ({ payload }) => {
                if (payload.requesterId === userId) {
                    setIsHandoverPending(false)
                    setHandoverDeadline(null)
                }
            })
            .on('broadcast', { event: 'handover_cancel' }, ({ payload }) => {
                if (payload.targetId === userId) {
                    setIsHandoverPending(false)
                    setHandoverDeadline(null)
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setConnectionState('connected')
                else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnectionState('disconnected')
            })

        channelRef.current = channel

        return () => {
            channel.unsubscribe()
            channelRef.current = null
        }
    }, [roomId, userId])

    // FIX BUG 3: targetId agora é obrigatório no payload
    const requestHandover = useCallback(async (targetId: string) => {
        if (!channelRef.current) return
        await channelRef.current.send({
            type: 'broadcast',
            event: 'handover_request',
            payload: { requesterId: userId, targetId, timestamp: Date.now() }
        })
    }, [userId])

    const acceptHandover = useCallback(async () => {
        setIsHandoverPending(false)
        setHandoverDeadline(null)
        if (!channelRef.current) return
        await channelRef.current.send({
            type: 'broadcast',
            event: 'handover_accept',
            payload: { accepterId: userId, requesterId: userId, timestamp: Date.now() }
        })
    }, [userId])

    const cancelHandover = useCallback(async (targetId?: string) => {
        setIsHandoverPending(false)
        setHandoverDeadline(null)
        if (!channelRef.current || !targetId) return
        await channelRef.current.send({
            type: 'broadcast',
            event: 'handover_cancel',
            payload: { requesterId: userId, targetId, timestamp: Date.now() }
        })
    }, [userId])

    return {
        liveKitToken,
        isHandoverPending,
        handoverDeadline,
        requestHandover,
        acceptHandover,
        cancelHandover,
        connectionState
    }
}
