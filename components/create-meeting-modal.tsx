
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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
    const [interpreters, setInterpreters] = useState<{ name: string, email: string, languages: string[] }[]>([])
    const supabase = createClient()
    const router = useRouter()



    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (userId === 'demo-user') {
            alert('Funcionalidade indisponível no modo de demonstração.')
            return
        }

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
                allowed_languages: Array.from(new Set(['pt', 'en', ...interpreters.flatMap(i => i.languages)])),
                settings: { interpreters } // Assuming settings or interpreters column exists
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

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06b6d4]">Intérpretes Pré-configurados</Label>
                                {interpreters.map((interpreter, index) => (
                                    <div key={index} className="space-y-3 p-4 bg-accent/20 rounded-2xl border border-border/50 relative">
                                        <button
                                            type="button"
                                            onClick={() => setInterpreters(prev => prev.filter((_, i) => i !== index))}
                                            className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                        <Input
                                            placeholder="Nome Completo"
                                            className="bg-background border-border h-10 rounded-xl"
                                            value={interpreter.name}
                                            onChange={e => {
                                                const newInt = [...interpreters]
                                                newInt[index] = { ...newInt[index], name: e.target.value }
                                                setInterpreters(newInt)
                                            }}
                                        />
                                        <Input
                                            type="email"
                                            placeholder="E-mail"
                                            className="bg-background border-border h-10 rounded-xl"
                                            value={interpreter.email}
                                            onChange={e => {
                                                const newInt = [...interpreters]
                                                newInt[index] = { ...newInt[index], email: e.target.value }
                                                setInterpreters(newInt)
                                            }}
                                        />
                                        <div className="flex gap-2">
                                            {['pt', 'en', 'es', 'fr'].map(lang => (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => {
                                                        const newInt = [...interpreters];
                                                        const currentLangs = newInt[index].languages || []; // Safety check

                                                        let newLangs;
                                                        if (currentLangs.includes(lang)) {
                                                            newLangs = currentLangs.filter(l => l !== lang);
                                                        } else {
                                                            newLangs = [...currentLangs, lang];
                                                        }

                                                        newInt[index] = { ...newInt[index], languages: newLangs };
                                                        setInterpreters(newInt);
                                                    }}
                                                    className={cn(
                                                        "text-[10px] px-2 py-1 rounded-md font-bold uppercase",
                                                        (interpreter.languages || []).includes(lang) ? "bg-[#06b6d4] text-white" : "bg-accent text-muted-foreground"
                                                    )}
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setInterpreters(prev => [...prev, { name: '', email: '', languages: [] }])}
                                    className="w-full border-dashed border-border text-muted-foreground hover:text-[#06b6d4] hover:border-[#06b6d4] rounded-xl h-10"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Adicionar Intérprete
                                </Button>
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
