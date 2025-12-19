'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, Loader2 } from 'lucide-react'
import { createInstantMeeting } from '@/app/dashboard/actions'
import { toast } from 'sonner'

export function InstantMeetingButton() {
    const [loading, setLoading] = useState(false)

    const handleInstantMeeting = async () => {
        try {
            setLoading(true)
            await createInstantMeeting()
        } catch (error: any) {
            toast.error('Erro ao iniciar reunião: ' + (error.message || 'Desconhecido'))
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleInstantMeeting}
            disabled={loading}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] font-black px-8 h-12 rounded-xl border-0 transition-all active:scale-95 group"
        >
            {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
                <Zap className="h-5 w-5 mr-2 fill-current group-hover:animate-pulse" />
            )}
            {loading ? 'Preparando...' : 'Iniciar Agora'}
        </Button>
    )
}
