'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Database } from 'lucide-react'
import { backfillUsernames } from '@/app/actions/backfill'
import { useRouter } from 'next/navigation'

export function BackfillButton() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const runBackfill = async () => {
        if (!confirm('Deseja gerar nomes de usuário para todos os perfis que ainda não possuem um?')) return

        setLoading(true)
        try {
            const result = await backfillUsernames()
            if (result.success) {
                alert(`Sucesso! ${result.count} usuários foram atualizados.`)
                router.refresh()
            } else {
                alert(`Erro: ${result.error}`)
            }
        } catch (err: any) {
            alert(`Erro Inesperado: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button 
            onClick={runBackfill} 
            variant="outline" 
            size="sm" 
            disabled={loading}
            className="gap-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500/10"
        >
            <Database className="h-4 w-4" /> 
            {loading ? 'Processando...' : 'Backfill Usernames'}
        </Button>
    )
}
