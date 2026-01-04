'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { cleanupExpiredMeetings } from '../actions'

export function CleanupButton() {
    const [loading, setLoading] = useState(false)

    async function handleCleanup() {
        if (!confirm('Tem certeza que deseja encerrar todas as reuniões ativas com mais de 2 horas?')) return

        setLoading(true)
        try {
            const result = await cleanupExpiredMeetings()

            if (result.success) {
                alert(`Limpeza concluída! ${result.count} reuniões foram encerradas.`)
            } else {
                alert(`Falha ao limpar: ${result.error || 'Erro desconhecido'}`)
            }
        } catch (error) {
            console.error(error)
            alert('Falha crítica ao tentar limpar reuniões.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleCleanup}
            disabled={loading}
            variant="destructive"
            className="flex items-center gap-2"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Limpar Expiradas (120 min+)
        </Button>
    )
}
