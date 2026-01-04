'use client'

import { Button } from '@/components/ui/button'
import { Video, Loader2 } from 'lucide-react'
import { createInstantMeeting } from '@/components/dashboard/actions'
import { useTransition } from 'react'

export function InstantMeetingButton() {
    const [isPending, startTransition] = useTransition()

    return (
        <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-sm h-14 rounded-2xl shadow-xl shadow-indigo-600/20 group-hover:shadow-indigo-600/40 transition-all duration-300 flex items-center justify-center"
            onClick={() => startTransition(() => createInstantMeeting())}
            disabled={isPending}
        >
            {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
                <>
                    <Video className="h-5 w-5 mr-2" />
                    Iniciar Agora
                </>
            )}
        </Button>
    )
}
