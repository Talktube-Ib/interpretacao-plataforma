'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { killAllActiveMeetings } from '@/components/admin/actions'

export function KillAllButton() {
    const [loading, setLoading] = useState(false)

    async function handleKillAll() {
        if (!confirm('!!! ATENÇÃO !!!\n\nIsso irá encerrar TODAS as reuniões que estão "active" ou "scheduled" (agendadas) neste momento.\n\nTodos os participantes serão desconectados.\n\nTem certeza absoluta?')) {
            return
        }

        setLoading(true)
        try {
            const result = await killAllActiveMeetings()

            if (result.success) {
                alert(`Sucesso! ${result.count} reunioes foram encerradas forçadamente.`)
            } else {
                alert(`Erro: ${result.error}`)
            }
        } catch (error) {
            console.error(error)
            alert('Falha crítica ao tentar encerrar reuniões.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="destructive"
            onClick={handleKillAll}
            disabled={loading}
            className="bg-red-900/50 hover:bg-red-800 border border-red-500/50 text-red-200"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Encerrando...' : 'Encerrar TODAS Agora'}
        </Button>
    )
}
