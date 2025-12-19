import { useState, useEffect, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
    id: string
    sender: string
    text: string
    timestamp: number
    role: string
}

const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..." // Placeholder - using a real one below

// Simple "Pop" sound (Shortened for brevity, real base64 needed or use Audio Context oscillator)
// Using an oscillator is safer/cleaner than a massive base64 string here.
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

export function useChat(channel: RealtimeChannel | null, userId: string, userRole: string) {
    const [messages, setMessages] = useState<Message[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isActive, setIsActive] = useState(false)
    const isActiveRef = useRef(false)

    // Keep ref in sync
    useEffect(() => {
        isActiveRef.current = isActive
    }, [isActive])

    useEffect(() => {
        if (!channel) return

        const handleMsg = (event: { payload: { sender: string, text: string, role: string, id?: string, timestamp?: number } }) => {
            const { payload } = event
            if (payload.sender === userId) return;

            setMessages(prev => [...prev, {
                id: payload.id || Math.random().toString(),
                sender: payload.sender,
                text: payload.text,
                timestamp: payload.timestamp || Date.now(),
                role: payload.role
            }])

            if (!isActiveRef.current) {
                setUnreadCount(prev => prev + 1)
                playNotificationSound()
            }
        }

        channel.on('broadcast', { event: 'chat-message' }, handleMsg)

        return () => {
            channel.off('broadcast', { event: 'chat-message' })
        }
    }, [channel, userId]) // Removed isActive from deps

    const sendMessage = (text: string) => {
        if (!channel || !text.trim()) return

        const msg: Message = {
            id: Math.random().toString(),
            sender: userId,
            text,
            timestamp: Date.now(),
            role: userRole
        }

        channel.send({
            type: 'broadcast',
            event: 'chat-message',
            payload: msg
        })

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
        setIsActive // Parent sets this when sidebar opens/closes
    }
}
