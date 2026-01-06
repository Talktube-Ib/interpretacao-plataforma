'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Notification {
    id: string
    title: string
    message: string
    link: string | null
    read: boolean
    created_at: string
}

export function NotificationsDropdown({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const supabase = createClient()

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (!error && data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
        }
    }

    // Real-time subscription
    useEffect(() => {
        fetchNotifications()

        const channel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev])
                    setUnreadCount(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)

        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllAsRead = async () => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', userId)
            .eq('read', false)

        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group hover:bg-white/5 rounded-xl transition-all">
                    <Bell className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-950 animate-pulse" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px] bg-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-0 shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Notificações</h4>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-[10px] uppercase font-bold text-cyan-500 hover:text-cyan-400 transition-colors"
                        >
                            Marcar lidas
                        </button>
                    )}
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm italic">
                            Nenhuma notificação recente
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "p-4 flex flex-col gap-1 cursor-pointer border-b border-border/20 last:border-0 hover:bg-white/5 focus:bg-white/5",
                                    !notification.read && "bg-cyan-950/20"
                                )}
                                onClick={() => {
                                    if (!notification.read) markAsRead(notification.id)
                                }}
                            >
                                <div className="flex justify-between w-full">
                                    <span className={cn("text-xs font-bold", !notification.read ? "text-cyan-400" : "text-slate-300")}>
                                        {notification.title}
                                    </span>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                    {notification.message}
                                </p>
                                {notification.link && (
                                    <Link
                                        href={notification.link}
                                        className="mt-2 text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                                    >
                                        Ver detalhes →
                                    </Link>
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
