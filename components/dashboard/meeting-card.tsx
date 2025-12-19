'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Mic, Clock, Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface Meeting {
    id: string
    title: string
    status: string
    start_time: string
    allowed_languages: string[]
}

export function MeetingCard({ meeting }: { meeting: Meeting }) {
    const [copied, setCopied] = useState(false)

    const copyLink = () => {
        const url = `${window.location.origin}/room/${meeting.id}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        toast.success('Link da reunião copiado!')
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Card className="bg-card border-border hover:border-[#06b6d4]/40 transition-all group shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <CardTitle className="font-bold text-lg truncate pr-2 group-hover:text-[#06b6d4] transition-colors text-foreground" title={meeting.title}>
                        {meeting.title}
                    </CardTitle>
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${meeting.status === 'active' ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' :
                        meeting.status === 'ended' ? 'bg-muted text-muted-foreground border border-border' :
                            'bg-green-500/10 text-green-500 border border-green-500/20'
                        }`}>
                        {meeting.status === 'active' ? 'Ao Vivo' : meeting.status === 'ended' ? 'Encerrada' : 'Agendada'}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="p-2 rounded-lg bg-accent/50">
                        <Clock className="h-4 w-4 text-[#06b6d4]" />
                    </div>
                    <span>{new Date(meeting.start_time).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {meeting.allowed_languages?.map((lang) => (
                        <span key={lang} className="bg-[#06b6d4]/10 text-[#06b6d4] px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-[#06b6d4]/20">
                            {lang}
                        </span>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button asChild className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white brightness-110 h-11 rounded-xl font-bold border-0">
                    <Link href={`/room/${meeting.id}`}>
                        <Video className="h-5 w-5 mr-3" />
                        Entrar na Reunião
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                    onClick={copyLink}
                >
                    {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Link Copiado!' : 'Copiar Link de Convite'}
                </Button>
            </CardFooter>
        </Card>
    )
}
