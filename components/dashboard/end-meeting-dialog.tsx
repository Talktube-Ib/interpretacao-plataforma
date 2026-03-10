'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, XOctagon, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface EndMeetingDialogProps {
    meetingId: string
    meetingTitle: string
}

export default function EndMeetingDialog({ meetingId, meetingTitle }: EndMeetingDialogProps) {
    const [loading, setLoading] = useState(false)

    const handleEnd = async () => {
        setLoading(true)
        try {
            const { endMeeting } = await import('@/app/actions/meeting')
            const result = await endMeeting(meetingId)

            if (result.success) {
                toast.success('Reunião encerrada para todos os participantes.', {
                    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />
                })
                window.location.reload()
            } else {
                throw new Error(result.error || 'Erro desconhecido')
            }
        } catch (error) {
            console.error('Failed to end meeting:', error)
            toast.error('Não foi possível encerrar a reunião', {
                description: (error as Error).message,
                icon: <AlertCircle className="h-4 w-4 text-red-500" />
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-8 px-3 text-red-500 hover:bg-red-500/10 rounded-lg font-black uppercase text-[10px]"
                >
                    Encerrar
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-white flex items-center gap-2">
                        <XOctagon className="h-5 w-5 text-red-500" />
                        Encerrar Reunião?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                        Você tem certeza que deseja encerrar a reunião <strong>{meetingTitle}</strong> para todos os participantes?
                        <br />
                        Esta ação interromperá as transmissões imediatamente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white">Voltar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); handleEnd(); }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Encerrar para Todos'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
