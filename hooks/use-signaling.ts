import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface SignalingEvents {
    onSignal: (payload: any) => void
    onShareStarted: (payload: any) => void
    onShareEnded: (payload: any) => void
    onHostPromoted: (payload: any) => void
    onReaction: (payload: any) => void
    onRoomEvent: (payload: any) => void
    onPresenceSync: (users: string[], state: any) => void
}

export function useSignaling(roomId: string, userId: string, metadata: any, events: SignalingEvents) {
    const [channel, setChannel] = useState<RealtimeChannel | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)
    const supabase = createClient()
    const metadataRef = useRef(metadata)

    const eventsRef = useRef(events)

    useEffect(() => {
        eventsRef.current = events
    }, [events])

    // Keep metadata ref up to date
    useEffect(() => {
        metadataRef.current = metadata
        if (channelRef.current) {
            // Debounce or check for diff could be added here
            // channelRef.current.track(metadata)
        }
    }, [metadata])

    const [connectionState, setConnectionState] = useState<string>('disconnected')

    useEffect(() => {
        // Prevent joining if no userId
        if (!userId || !roomId) return

        console.log("Connecting to Signaling Channel:", roomId)
        const newChannel = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } })
        channelRef.current = newChannel
        setChannel(newChannel)
        setConnectionState('connecting')

        newChannel
            .on('broadcast', { event: 'signal' }, (e) => eventsRef.current.onSignal(e.payload))
            .on('broadcast', { event: 'share-started' }, (e) => eventsRef.current.onShareStarted(e.payload))
            .on('broadcast', { event: 'share-ended' }, (e) => eventsRef.current.onShareEnded(e.payload))
            .on('broadcast', { event: 'host-promoted' }, (e) => eventsRef.current.onHostPromoted(e.payload))
            .on('broadcast', { event: 'reaction' }, (e) => eventsRef.current.onReaction(e.payload))
            // Database Events (Room Actions)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'room_events', filter: `meeting_id=eq.${roomId}` },
                (payload) => eventsRef.current.onRoomEvent(payload.new)
            )
            .on('presence', { event: 'sync' }, () => {
                const state = newChannel.presenceState()
                const users = Object.keys(state)
                eventsRef.current.onPresenceSync(users, state)
            })
            .subscribe(async (status) => {
                setConnectionState(status)
                if (status === 'SUBSCRIBED') {
                    await newChannel.track(metadataRef.current)
                }
            })

        return () => {
            console.log("Disconnecting Signaling Channel")
            newChannel.unsubscribe()
            setConnectionState('disconnected')
        }
    }, [roomId, userId]) // Events ref is stable, no need to add

    const sendSignal = useCallback((payload: any) => {
        channelRef.current?.send({ type: 'broadcast', event: 'signal', payload })
    }, [])

    const sendReaction = useCallback((emoji: string) => {
        channelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji, sender: userId } })
    }, [userId])

    const broadcastEvent = useCallback((event: string, payload: any) => {
        channelRef.current?.send({ type: 'broadcast', event, payload })
    }, [])

    const trackMetadata = useCallback(async (newMetadata: any) => {
        if (channelRef.current) {
            await channelRef.current.track(newMetadata)
        }
    }, [])

    return {
        channel,
        connectionState,
        sendSignal,
        sendReaction,
        broadcastEvent,
        trackMetadata
    }
}
