import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

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
    const channelRef = useRef<RealtimeChannel | null>(null)

    // Keep ref in sync
    useEffect(() => {
        isActiveRef.current = isActive
    }, [isActive])

    useEffect(() => {
        // Create DEDICATED chat channel to avoid WebRTC conflicts
        const chatChannel = supabase.channel(`chat:${roomId}`, {
            config: {
                broadcast: { self: true } // We want to receive our own messages to confirm delivery (optional, but good for sync)
            }
        })

        channelRef.current = chatChannel

        const handleMsg = (event: { payload: { sender: string, text: string, role: string, id?: string, timestamp?: number } }) => {
            const { payload } = event
            if (payload.sender === userId) return; // Ignore own echo if we handle it optimistically

            console.log("Chat message received:", payload)

            setMessages(prev => {
                // Avoid duplicates (if any)
                if (prev.some(m => m.id === payload.id)) return prev
                return [...prev, {
                    id: payload.id || Math.random().toString(),
                    sender: payload.sender,
                    text: payload.text,
                    timestamp: payload.timestamp || Date.now(),
                    role: payload.role
                }]
            })

            if (!isActiveRef.current) {
                console.log("Chat inactive, playing sound")
                setUnreadCount(prev => prev + 1)
                playNotificationSound()
            }
        }

        chatChannel
            .on('broadcast', { event: 'chat-message' }, handleMsg)
            .subscribe((status) => {
                console.log(`Chat Channel Status (${roomId}):`, status)
            })

        return () => {
            console.log("Cleaning up chat channel")
            chatChannel.unsubscribe()
        }
    }, [roomId, userId]) // Removed isActive from deps to keep channel stable

    const sendMessage = async (text: string) => {
        if (!channelRef.current || !text.trim()) return

        const msg: Message = {
            id: Math.random().toString(),
            sender: userId,
            text,
            timestamp: Date.now(),
            role: userRole
        }

        await channelRef.current.send({
            type: 'broadcast',
            event: 'chat-message',
            payload: msg
        })

        // Optimistic update
        setMessages(prev => [...prev, msg])
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
