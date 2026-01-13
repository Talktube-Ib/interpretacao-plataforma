'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/providers/language-provider'
import { MeetingForm, MeetingFormData } from './meeting-form'

interface EditMeetingModalProps {
    meeting: any
    trigger?: React.ReactNode
}

export default function EditMeetingModal({ meeting, trigger }: EditMeetingModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()
    const { t } = useLanguage()

    // Parse existing data
    const existingDate = new Date(meeting.start_time)
    const dateStr = existingDate.toISOString().split('T')[0]
    const timeStr = existingDate.toTimeString().slice(0, 5)

    const initialValues: Partial<MeetingFormData> = {
        title: meeting.title,
        date: dateStr,
        time: timeStr,
        interpreters: meeting.settings?.interpreters || []
    }

    const handleUpdate = async (data: MeetingFormData) => {
        setLoading(true)

        // Combine date and time
        const startDateTime = new Date(`${data.date}T${data.time}:00`).toISOString()

        const { error } = await supabase
            .from('meetings')
            .update({
                title: data.title,
                start_time: startDateTime,
                allowed_languages: Array.from(new Set(['pt', 'en', ...data.interpreters.flatMap(i => i.languages)])),
                settings: { ...meeting.settings, interpreters: data.interpreters }
            })
            .eq('id', meeting.id)

        if (!error) {
            // TODO: Handle sending notifications to NEW interpreters only? 
            // For now, simplicity: just update.
            setLoading(false)
            setIsOpen(false)
            router.refresh()
        } else {
            setLoading(false)
            alert('Error updating meeting: ' + error.message)
        }
    }

    return (
        <>
            {trigger ? (
                <div onClick={() => setIsOpen(true)}>{trigger}</div>
            ) : (
                <Button onClick={() => setIsOpen(true)} size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-cyan-400">
                    <Pencil className="h-4 w-4" />
                </Button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md transition-all duration-300">
                    <div className="bg-card border border-border w-full max-w-md rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto no-scrollbar">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 md:top-6 md:right-6 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent/50 rounded-full z-10"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="mb-6 md:mb-8">
                            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tighter uppercase">Editar Reunião</h2>
                        </div>

                        <MeetingForm
                            initialValues={initialValues}
                            onSubmit={handleUpdate}
                            loading={loading}
                            submitLabel="Salvar Alterações"
                            onCancel={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
