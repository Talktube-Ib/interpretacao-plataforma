
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useLanguage } from '@/components/providers/language-provider'
import { MeetingForm, MeetingFormData } from './dashboard/meeting-form'

interface CreateMeetingModalProps {
    userId: string
    preselectedDate?: Date
}

export default function CreateMeetingModal({ userId, preselectedDate }: CreateMeetingModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()
    const { t } = useLanguage()

    const handleCreate = async (data: MeetingFormData) => {
        if (userId === 'demo-user') {
            alert(t('create_meeting.demo_error'))
            return
        }

        setLoading(true)

        // Combine date and time
        const startDateTime = new Date(`${data.date}T${data.time}:00`).toISOString()

        const { data: meetingData, error } = await supabase
            .from('meetings')
            .insert({
                host_id: userId,
                title: data.title,
                start_time: startDateTime,
                status: 'scheduled',
                allowed_languages: Array.from(new Set(['pt', 'en', ...data.interpreters.flatMap(i => i.languages)])),
                settings: { interpreters: data.interpreters }
            })
            .select()

        if (!error && meetingData && meetingData[0]) {
            const meetingId = meetingData[0].id

            // Send Notifications
            for (const interpreter of data.interpreters) {
                if (interpreter.email) {
                    const { data: userData } = await supabase.from('profiles').select('id').eq('email', interpreter.email).single()
                    if (userData) {
                        await supabase.from('notifications').insert({
                            user_id: userData.id,
                            title: t('notifications.invite_title') || 'Convite para Reunião',
                            message: `${t('notifications.invite_msg_prefix') || 'Você foi convidado para interpretar na reunião'}: ${data.title}`,
                            link: `/room/${meetingId}`
                        })
                    }
                }
            }

            setLoading(false)
            setIsOpen(false)
            router.refresh()
        } else {
            setLoading(false)
            alert(t('create_meeting.error') + (error?.message || 'Unknown error'))
        }
    }

    // Default values logic
    const initialValues = {
        title: '',
        date: preselectedDate ? format(preselectedDate, 'yyyy-MM-dd') : '',
        time: '',
        interpreters: []
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

                        <MeetingForm
                            initialValues={initialValues}
                            onSubmit={handleCreate}
                            loading={loading}
                            onCancel={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
