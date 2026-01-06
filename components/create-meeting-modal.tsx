
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
import { useLanguage } from '@/components/providers/language-provider'

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
    const { t } = useLanguage()



    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (userId === 'demo-user') {
            alert(t('create_meeting.demo_error'))
            return
        }

        setLoading(true)

        // Combine date and time
        const startDateTime = new Date(`${date}T${time}:00`).toISOString()

        const { data: meetingData, error } = await supabase
            .from('meetings')
            .insert({
                host_id: userId,
                title,
                start_time: startDateTime,
                status: 'scheduled',
                allowed_languages: Array.from(new Set(['pt', 'en', ...interpreters.flatMap(i => i.languages)])),
                settings: { interpreters }
            })
            .select() // Select to get the meeting ID

        if (!error && meetingData && meetingData[0]) {
            const meetingId = meetingData[0].id

            // Send Notifications
            for (const interpreter of interpreters) {
                if (interpreter.email) {
                    // 1. Find user by email
                    const { data: userData } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', interpreter.email)
                        .single()

                    // 2. If user exists, create notification
                    if (userData) {
                        await supabase
                            .from('notifications')
                            .insert({
                                user_id: userData.id,
                                title: t('notifications.invite_title') || 'Convite para Reunião',
                                message: `${t('notifications.invite_msg_prefix') || 'Você foi convidado para interpretar na reunião'}: ${title}`,
                                link: `/room/${meetingId}`
                            })
                    }
                }
            }

            setLoading(false)
            setIsOpen(false)
            setTitle('')
            if (!preselectedDate) setDate('')
            setTime('')
            router.refresh()
        } else {
            setLoading(false)
            alert(t('create_meeting.error') + (error?.message || 'Unknown error'))
        }
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)} className="w-full md:w-auto bg-[#06b6d4] hover:bg-[#0891b2] text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold px-8 h-12 rounded-xl">
                <Plus className="h-5 w-5 mr-2" /> {t('create_meeting.button_label')}
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md transition-all duration-300">
                    <div className="bg-card border border-border w-full max-w-md rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto no-scrollbar">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#06b6d4]/20 rounded-full blur-2xl pointer-events-none" />

                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 md:top-6 md:right-6 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent/50 rounded-full z-10"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="mb-6 md:mb-8">
                            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tighter uppercase">{t('create_meeting.modal_title')}</h2>
                            <p className="text-muted-foreground text-xs md:text-sm mt-1">{t('create_meeting.modal_desc')}</p>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4 md:space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06b6d4]">{t('create_meeting.label_title')}</Label>
                                <Input
                                    required
                                    placeholder={t('create_meeting.placeholder_title')}
                                    className="bg-accent/30 border-border text-foreground h-10 md:h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('create_meeting.label_date')}</Label>
                                    <Input
                                        type="date"
                                        required
                                        className="bg-accent/30 border-border text-foreground h-10 md:h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('create_meeting.label_time')}</Label>
                                    <Input
                                        type="time"
                                        required
                                        className="bg-accent/30 border-border text-foreground h-10 md:h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06b6d4]">{t('create_meeting.label_interpreters')}</Label>
                                {interpreters.map((interpreter, index) => (
                                    <div key={index} className="space-y-3 p-3 md:p-4 bg-accent/20 rounded-2xl border border-border/50 relative">
                                        <button
                                            type="button"
                                            onClick={() => setInterpreters(prev => prev.filter((_, i) => i !== index))}
                                            className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                        <Input
                                            placeholder={t('create_meeting.placeholder_name')}
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
                                            placeholder={t('create_meeting.placeholder_email')}
                                            className="bg-background border-border h-10 rounded-xl"
                                            value={interpreter.email}
                                            onChange={e => {
                                                const newInt = [...interpreters]
                                                newInt[index] = { ...newInt[index], email: e.target.value }
                                                setInterpreters(newInt)
                                            }}
                                        />
                                        <div className="flex gap-2 flex-wrap">
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
                                    <Plus className="h-4 w-4 mr-2" /> {t('create_meeting.add_interpreter')}
                                </Button>
                            </div>

                            <div className="pt-4 md:pt-6 flex flex-col gap-3">
                                <Button type="submit" className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white h-12 md:h-14 rounded-2xl font-black text-lg shadow-lg shadow-[#06b6d4]/20 border-0" disabled={loading}>
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('create_meeting.submit_btn')}
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground font-bold rounded-xl h-12">
                                    {t('create_meeting.cancel_btn')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
