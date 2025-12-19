
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface CreateMeetingModalProps {
    userId: string
    preselectedDate?: Date
}

export default function CreateMeetingModal({ userId, preselectedDate }: CreateMeetingModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [date, setDate] = useState(() => preselectedDate ? format(preselectedDate, 'yyyy-MM-dd') : '')
    const [time, setTime] = useState('')
    const supabase = createClient()
    const router = useRouter()



    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Combine date and time
        const startDateTime = new Date(`${date}T${time}:00`).toISOString()

        const { error } = await supabase
            .from('meetings')
            .insert({
                host_id: userId,
                title,
                start_time: startDateTime,
                status: 'scheduled',
                allowed_languages: ['pt', 'en'], // Default for MVP
            })

        setLoading(false)
        if (error) {
            alert('Erro ao criar reunião: ' + error.message)
        } else {
            setIsOpen(false)
            setTitle('')
            if (!preselectedDate) setDate('')
            setTime('')
            router.refresh()
        }
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)} className="w-full md:w-auto bg-[#06b6d4] hover:bg-[#0891b2] text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold px-8 h-12 rounded-xl">
                <Plus className="h-5 w-5 mr-2" /> Agendar Reunião
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md transition-all duration-300">
                    <div className="bg-card border border-border w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#06b6d4]/20 rounded-full blur-2xl" />

                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent/50 rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Novo Evento</h2>
                            <p className="text-muted-foreground text-sm mt-1">Configure os detalhes da sua transmissão.</p>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06b6d4]">Título do Evento</Label>
                                <Input
                                    required
                                    placeholder="Ex: Conferência Internacional de Tecnologia"
                                    className="bg-accent/30 border-border text-foreground h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Data</Label>
                                    <Input
                                        type="date"
                                        required
                                        className="bg-accent/30 border-border text-foreground h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Hora</Label>
                                    <Input
                                        type="time"
                                        required
                                        className="bg-accent/30 border-border text-foreground h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="pt-6 flex flex-col gap-3">
                                <Button type="submit" className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white h-14 rounded-2xl font-black text-lg shadow-lg shadow-[#06b6d4]/20 border-0" disabled={loading}>
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar e Agendar'}
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground font-bold rounded-xl h-12">
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
