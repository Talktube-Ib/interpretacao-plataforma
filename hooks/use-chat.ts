import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Message {
    id: string
    sender: string
    senderName?: string
    text: string
    timestamp: number
    role: string
    recipientId?: string // Who this message is for (optional)
}

function playNotificationSound() {
    try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
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
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const seenMessagesRef = useRef<Set<string>>(new Set())

    // Helper to parse message content
    const parseContent = (content: string): { text: string, recipientId?: string } => {
        try {
            // Check if it looks like our JSON format unique signature
            if (content.startsWith('{"v":1')) {
                const parsed = JSON.parse(content)
                return { text: parsed.text, recipientId: parsed.recipientId }
            }
        } catch (e) {
            // Ignore parse error, treat as plain text
        }
        return { text: content }
    }

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
                const mapped: Message[] = (data as { id: string, sender_id: string, sender_name: string, content: string, created_at: string, role: string }[]).map((d) => {
                    const { text, recipientId } = parseContent(d.content)

                    const msg = {
                        id: d.id,
                        sender: d.sender_id,
                        senderName: d.sender_name,
                        text,
                        timestamp: new Date(d.created_at).getTime(),
                        role: d.role,
                        recipientId // New field
                    }
                    seenMessagesRef.current.add(msg.id)
                    // Also add a fuzzy key for history
                    seenMessagesRef.current.add(`${msg.sender}:${msg.text}:${Math.floor(msg.timestamp / 2000)}`)
                    return msg
                }).filter((msg) => {
                    // Filter history: Show if Public OR (Private AND (I am sender OR I am recipient))
                    if (!msg.recipientId) return true
                    return msg.sender === userId || msg.recipientId === userId
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

            // FILTER: If private, strict check
            if (msg.recipientId && msg.recipientId !== userId && msg.sender !== userId) {
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
                    const newMsg = payload.new as { id: string, sender_id: string, sender_name: string, content: string, created_at: string, role: string }
                    if (!newMsg) return

                    const { text, recipientId } = parseContent(newMsg.content)

                    const msg: Message = {
                        id: newMsg.id,
                        sender: newMsg.sender_id,
                        senderName: newMsg.sender_name,
                        text,
                        timestamp: new Date(newMsg.created_at).getTime(),
                        role: newMsg.role,
                        recipientId
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

    const sendMessage = async (text: string, recipientId?: string) => {
        if (!text.trim()) return

        const msgId = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15)
        const timestamp = Date.now()

        const msg: Message = {
            id: msgId,
            sender: userId,
            senderName: userName,
            text,
            timestamp,
            role: userRole,
            recipientId
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
            // If recipientId is present, we wrap content in JSON
            let contentToSave = text
            if (recipientId) {
                contentToSave = JSON.stringify({ v: 1, text, recipientId })
            }

            await supabase.from('messages').insert({
                id: msgId,
                room_id: roomId,
                sender_id: userId,
                sender_name: userName,
                content: contentToSave,
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
