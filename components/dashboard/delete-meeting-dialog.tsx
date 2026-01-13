'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

interface DeleteMeetingDialogProps {
    meetingId: string
    meetingTitle: string
}

export default function DeleteMeetingDialog({ meetingId, meetingTitle }: DeleteMeetingDialogProps) {
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleDelete = async () => {
        setLoading(true)
        const { error } = await supabase
            .from('meetings')
            .delete()
            .eq('id', meetingId)

        if (!error) {
            setLoading(false)
            router.refresh()
        } else {
            setLoading(false)
            alert('Error deleting meeting: ' + error.message)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Excluir Reunião?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                        Você tem certeza que deseja excluir a reunião <strong>{meetingTitle}</strong>?
                        <br />
                        Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
