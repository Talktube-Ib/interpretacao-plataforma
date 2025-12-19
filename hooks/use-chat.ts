import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Message {
    id: string
    sender: string
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

export function useChat(roomId: string, userId: string, userRole: string) {
    const [messages, setMessages] = useState<Message[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const isActiveRef = useRef(false)
    const supabase = createClient()

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
                const mapped: Message[] = data.map((d: any) => ({
                    id: d.id,
                    sender: d.sender_id,
                    text: d.content,
                    timestamp: new Date(d.created_at).getTime(),
                    role: d.role
                }))
                setMessages(mapped)
            }
        }
        fetchHistory()

        // 2. Subscribe to NEW additions (Realtime)
        const channel = supabase
            .channel(`db-messages:${roomId}`)
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
                    const msg: Message = {
                        id: newMsg.id,
                        sender: newMsg.sender_id,
                        text: newMsg.content,
                        timestamp: new Date(newMsg.created_at).getTime(),
                        role: newMsg.role
                    }

                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev
                        return [...prev, msg]
                    })

                    // Notify if not active and NOT my own message
                    if (newMsg.sender_id !== userId && !isActiveRef.current) {
                        setUnreadCount(prev => prev + 1)
                        playNotificationSound()
                    }
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [roomId, userId])

    const sendMessage = async (text: string) => {
        if (!text.trim()) return

        // Optimistic UI update
        const tempId = Math.random().toString()
        const optimisticMsg: Message = {
            id: tempId,
            sender: userId,
            text,
            timestamp: Date.now(),
            role: userRole
        }
        setMessages(prev => [...prev, optimisticMsg])

        // Insert into DB
        const { error } = await supabase.from('messages').insert({
            room_id: roomId,
            sender_id: userId,
            content: text,
            role: userRole
        })

        if (error) {
            console.error("Failed to send message:", error)
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
