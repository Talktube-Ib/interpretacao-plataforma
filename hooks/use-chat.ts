import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Message {
    id: string
    sender: string
    senderName?: string
    text: string
    timestamp: number
    role: string
}

function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.error("Audio play failed", e);
    }
}

export function useChat(roomId: string, userId: string, userRole: string, userName: string) {
    const [messages, setMessages] = useState<Message[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const isActiveRef = useRef(false)
    const supabase = createClient()
    const channelRef = useRef<any>(null)
    const seenMessagesRef = useRef<Set<string>>(new Set())

    // Keep ref in sync
    useEffect(() => {
        isActiveRef.current = isActive
    }, [isActive])

    useEffect(() => {
        if (!roomId) return

        // 1. Fetch History
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })

            if (data) {
                const mapped: Message[] = data.map((d: any) => {
                    const msg = {
                        id: d.id,
                        sender: d.sender_id,
                        senderName: d.sender_name,
                        text: d.content,
                        timestamp: new Date(d.created_at).getTime(),
                        role: d.role
                    }
                    seenMessagesRef.current.add(msg.id)
                    // Also add a fuzzy key for history
                    seenMessagesRef.current.add(`${msg.sender}:${msg.text}:${Math.floor(msg.timestamp / 2000)}`)
                    return msg
                })
                setMessages(mapped)
            }
        }
        fetchHistory()

        // 2. Subscribe to NEW additions (Realtime & Broadcast Fallback)
        const channel = supabase.channel(`room-chat:${roomId}`)
        channelRef.current = channel

        const handleNewMessage = (msg: Message, fromPostgres = false) => {
            const fuzzyKey = `${msg.sender}:${msg.text}:${Math.floor(msg.timestamp / 2000)}`

            // Deduplicate by exact ID OR fuzzy key (sender+text+time window)
            if (seenMessagesRef.current.has(msg.id) || seenMessagesRef.current.has(fuzzyKey)) {
                return
            }

            seenMessagesRef.current.add(msg.id)
            seenMessagesRef.current.add(fuzzyKey)

            setMessages(prev => [...prev, msg])

            // Notify if not active and NOT my own message
            if (msg.sender !== userId && !isActiveRef.current) {
                setUnreadCount(prev => prev + 1)
                playNotificationSound()
            }
        }

        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    const newMsg = payload.new as any
                    if (!newMsg) return

                    const msg: Message = {
                        id: newMsg.id,
                        sender: newMsg.sender_id,
                        senderName: newMsg.sender_name,
                        text: newMsg.content,
                        timestamp: new Date(newMsg.created_at).getTime(),
                        role: newMsg.role
                    }
                    handleNewMessage(msg, true)
                }
            )
            .on('broadcast', { event: 'chat-message' }, (payload) => {
                const msg = payload.payload as Message
                if (msg.sender === userId) return // Ignore own
                handleNewMessage(msg)
            })
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [roomId, userId])

    const sendMessage = async (text: string) => {
        if (!text.trim()) return

        const msgId = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15)
        const timestamp = Date.now()

        const msg: Message = {
            id: msgId,
            sender: userId,
            senderName: userName,
            text,
            timestamp,
            role: userRole
        }

        // Add to seen BEFORE optimistic update to avoid duplicates if broadcast arrives too fast
        const fuzzyKey = `${msg.sender}:${msg.text}:${Math.floor(msg.timestamp / 2000)}`
        seenMessagesRef.current.add(msg.id)
        seenMessagesRef.current.add(fuzzyKey)

        // 1. Optimistic local update
        setMessages(prev => [...prev, msg])

        // 2. Broadcast for real-time (Ensures Guest delivery)
        channelRef.current?.send({
            type: 'broadcast',
            event: 'chat-message',
            payload: msg
        })

        // 3. Persistent storage
        try {
            await supabase.from('messages').insert({
                id: msgId,
                room_id: roomId,
                sender_id: userId,
                sender_name: userName,
                content: text,
                role: userRole
            })
        } catch (e) {
            console.error("Chat Insert exception:", e)
        }
    }

    const markAsRead = () => {
        setUnreadCount(0)
    }

    return {
        messages,
        sendMessage,
        unreadCount,
        markAsRead,
        setIsActive
    }
}
