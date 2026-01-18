'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateMeetingMinutes } from '@/app/actions/generateMinutes'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MinutesPanelProps {
    meetingId: string
    isHost: boolean
}

export function MinutesPanel({ meetingId, isHost }: MinutesPanelProps) {
    const [transcripts, setTranscripts] = useState<any[]>([])
    const [summary, setSummary] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    // Fetch Transcripts (Live)
    useEffect(() => {
        if (!isOpen) return

        const fetchTranscripts = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('meeting_transcripts')
                .select('*')
                .eq('meeting_id', meetingId)
                .order('created_at', { ascending: true })
            if (data) setTranscripts(data)

            // Fetch latest summary
            const { data: sum } = await supabase
                .from('meeting_summaries')
                .select('summary_md')
                .eq('meeting_id', meetingId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (sum) setSummary(sum.summary_md)
        }

        fetchTranscripts()

        const supabase = createClient()
        const channel = supabase.channel(`minutes:${meetingId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_transcripts', filter: `meeting_id=eq.${meetingId}` },
                (payload) => setTranscripts(prev => [...prev, payload.new])
            )
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_summaries', filter: `meeting_id=eq.${meetingId}` },
                (payload) => setSummary(payload.new.summary_md)
            )
            .subscribe()

        return () => { channel.unsubscribe() }
    }, [meetingId, isOpen])

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            const result = await generateMeetingMinutes(meetingId)
            if (result.success) {
                // Summary will update via Realtime subscription
            } else {
                alert(`Erro: ${result.error}`)
            }
        } catch (e) {
            alert('Erro ao invocar geração.')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white" title="Ata e Transcrição">
                    <FileText className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] bg-[#020817] border-white/10 flex flex-col p-0 gap-0 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[#06b6d4]" />
                        <h2 className="text-sm font-bold tracking-wider font-mono text-white">ATA & REGISTRO</h2>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Raw Transcript */}
                    <div className="w-1/2 border-r border-white/10 flex flex-col bg-zinc-950/30">
                        <div className="p-2 text-[10px] font-bold uppercase text-zinc-500 bg-black/10">Histórico em Tempo Real</div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {transcripts.length === 0 && <p className="text-zinc-600 text-xs italic">Aguardando falas...</p>}
                                {transcripts.map((t) => (
                                    <div key={t.id} className="flex flex-col gap-1">
                                        <span className="text-xs font-bold text-[#06b6d4]">{t.user_name} <span className="text-[10px] text-zinc-600 font-normal">{new Date(t.created_at).toLocaleTimeString()}</span></span>
                                        <p className="text-sm text-zinc-300">{t.content}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right: AI Summary */}
                    <div className="w-1/2 flex flex-col bg-zinc-900/10">
                        <div className="p-2 text-[10px] font-bold uppercase text-zinc-500 bg-black/10 flex justify-between items-center">
                            <span>Ata Gerada por IA (Gemini)</span>
                            {isHost && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] gap-1 text-purple-400 hover:text-purple-300"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    {isGenerating && "Gerando..."}
                                    {!isGenerating && "Gerar Nova Ata"}
                                </Button>
                            )}
                        </div>
                        <ScrollArea className="flex-1 p-6">
                            {summary ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{summary}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                                    <Sparkles className="h-10 w-10" />
                                    <p className="text-xs">Nenhuma ata gerada ainda.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
