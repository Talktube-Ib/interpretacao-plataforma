'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { cn } from '@/lib/utils'

export interface MeetingFormData {
    title: string
    date: string
    time: string
    interpreters: { name: string, email: string, languages: string[] }[]
}

interface MeetingFormProps {
    initialValues?: Partial<MeetingFormData>
    onSubmit: (data: MeetingFormData) => Promise<void>
    loading?: boolean
    submitLabel?: string
    cancelLabel?: string
    onCancel: () => void
}

export function MeetingForm({ initialValues, onSubmit, loading, submitLabel, cancelLabel, onCancel }: MeetingFormProps) {
    const { t } = useLanguage()
    const [title, setTitle] = useState(initialValues?.title || '')
    const [date, setDate] = useState(initialValues?.date || '')
    const [time, setTime] = useState(initialValues?.time || '')
    const [interpreters, setInterpreters] = useState<{ name: string, email: string, languages: string[] }[]>(initialValues?.interpreters || [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit({ title, date, time, interpreters })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06b6d4]">{t('create_meeting.label_title') || 'TITLE'}</Label>
                <Input
                    required
                    placeholder={t('create_meeting.placeholder_title') || 'Meeting Title'}
                    className="bg-accent/30 border-border text-foreground h-10 md:h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('create_meeting.label_date') || 'DATE'}</Label>
                    <Input
                        type="date"
                        required
                        className="bg-accent/30 border-border text-foreground h-10 md:h-12 rounded-xl focus-visible:ring-[#06b6d4]"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('create_meeting.label_time') || 'TIME'}</Label>
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
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#06b6d4]">{t('create_meeting.label_interpreters') || 'INTERPRETERS'}</Label>
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
                            placeholder={t('create_meeting.placeholder_name') || 'Name'}
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
                            placeholder={t('create_meeting.placeholder_email') || 'Email'}
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
                                        const currentLangs = newInt[index].languages || [];

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
                    <Plus className="h-4 w-4 mr-2" /> {t('create_meeting.add_interpreter') || 'Add Interpreter'}
                </Button>
            </div>

            <div className="pt-4 md:pt-6 flex flex-col gap-3">
                <Button type="submit" className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white h-12 md:h-14 rounded-2xl font-black text-lg shadow-lg shadow-[#06b6d4]/20 border-0" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel || t('create_meeting.submit_btn') || 'Create Meeting'}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel} className="text-muted-foreground hover:text-foreground font-bold rounded-xl h-12">
                    {cancelLabel || t('create_meeting.cancel_btn') || 'Cancel'}
                </Button>
            </div>
        </form>
    )
}
