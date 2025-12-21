'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Megaphone, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MessagesPage() {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadMessages = async () => {
            const supabase = createClient()
            // Fetch messages
            const { data } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })

            if (data) setMessages(data)

            // Mark as read
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('profiles').update({
                    last_read_announcements_at: new Date().toISOString()
                }).eq('id', user.id)
            }

            setLoading(false)
        }
        loadMessages()
    }, [])

    if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando avisos...</div>

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-yellow-500/10 rounded-2xl">
                    <Megaphone className="h-8 w-8 text-yellow-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Quadro de Avisos</h1>
                    <p className="text-muted-foreground">Fique por dentro das novidades e atualizações oficiais.</p>
                </div>
            </div>

            <div className="space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-[2rem] border border-border">
                        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground font-medium">Nenhum comunicado recente.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <Card key={msg.id} className="bg-card border-border overflow-hidden hover:border-[#06b6d4]/50 transition-colors group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#06b6d4] opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        {msg.title}
                                    </CardTitle>
                                    <span className="text-xs font-mono text-muted-foreground bg-accent/50 px-2 py-1 rounded">
                                        {format(new Date(msg.created_at), "d 'de' MMMM", { locale: ptBR })}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
