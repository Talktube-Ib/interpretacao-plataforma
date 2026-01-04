'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Megaphone, Bell, Zap, Wrench, Info, Star, Calendar } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/components/providers/language-provider'
import { enUS, es, ptBR } from 'date-fns/locale'

const locales: Record<string, any> = {
    en: enUS,
    pt: ptBR,
    es: es
}

export default function MessagesPage() {
    const { t, language } = useLanguage()
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const getIconForTitle = (title: string) => {
        const titleLower = title.toLowerCase()
        if (titleLower.includes('🚀') || titleLower.includes('update') || titleLower.includes('atualização') || titleLower.includes('novedad')) return <Zap className="h-5 w-5 text-amber-500" />
        if (titleLower.includes('🔧') || titleLower.includes('manutenção') || titleLower.includes('correção') || titleLower.includes('mantenimiento')) return <Wrench className="h-5 w-5 text-blue-500" />
        if (titleLower.includes('⚠️') || titleLower.includes('importante') || titleLower.includes('aviso') || titleLower.includes('alerta')) return <Star className="h-5 w-5 text-red-500" />
        return <Info className="h-5 w-5 text-cyan-500" />
    }

    useEffect(() => {
        const loadMessages = async () => {
            const supabase = createClient()
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

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground animate-pulse">{t('messages.loading')}</p>
        </div>
    )

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 min-h-screen">
            {/* Header Hero */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-10 shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
                        <Megaphone className="h-10 w-10 text-white fill-white/20" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-white mb-2">{t('messages.title')}</h1>
                        <p className="text-blue-100/80 text-lg font-medium max-w-xl">
                            {t('messages.subtitle')}
                        </p>
                    </div>
                </div>
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-purple-400/30 rounded-full blur-3xl" />
            </div>

            <div className="grid gap-6">
                {messages.length === 0 ? (
                    <div className="text-center py-32 bg-card rounded-[2.5rem] border border-dashed border-border/60">
                        <div className="bg-accent/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bell className="h-10 w-10 text-muted-foreground opacity-40" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{t('messages.empty_title')}</h3>
                        <p className="text-muted-foreground font-medium max-w-sm mx-auto">{t('messages.empty_desc')}</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isNew = differenceInDays(new Date(), new Date(msg.created_at)) <= 3

                        return (
                            <Card
                                key={msg.id}
                                className="group bg-card dark:bg-slate-900/50 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden backdrop-blur-sm"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                                <CardHeader className="pb-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-accent/50 rounded-xl group-hover:bg-primary/10 transition-colors mt-1 md:mt-0">
                                                {getIconForTitle(msg.title)}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {msg.title}
                                                    </CardTitle>
                                                    {isNew && (
                                                        <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] font-bold px-2 py-0.5 shadow-lg shadow-orange-500/20 animate-pulse">
                                                            {t('messages.new_badge')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(msg.created_at), t('messages.date_format'), { locale: locales[language] || ptBR })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pl-[5.5rem] pr-8 pb-8 pt-0">
                                    <div className="prose dark:prose-invert max-w-none text-muted-foreground/90 leading-relaxed text-sm md:text-base border-l-2 border-border/50 pl-6">
                                        <p className="whitespace-pre-wrap font-sans">
                                            {msg.content}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
