'use client'

import { useState } from 'react'
import { Button } from "../../../components/ui/button"
import { StopCircle, AlertTriangle } from 'lucide-react'
import React from 'react'
import { forceEndMeeting } from '../meeting-actions'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"

export function KillMeetingButton({ meetingId }: { meetingId: string }): React.ReactNode {
    const [loading, setLoading] = useState(false)

    const handleKill = async (reason: string) => {
        if (!confirm(`Confirmar encerramento forçado da reunião?\nMotivo: ${reason}`)) return

        setLoading(true)
        try {
            await forceEndMeeting(meetingId, reason)
        } catch (error) {
            alert('Falha ao encerrar reunião')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="destructive" size="sm" className="h-8" disabled={loading}>
                    <StopCircle className="h-4 w-4 mr-1" />
                    {loading ? 'Encerrando...' : 'Encerrar'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    Motivo do Encerramento
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleKill('Violação de Termos de Uso')}>
                    Violação de Termos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleKill('Conteúdo Impróprio')}>
                    Conteúdo Impróprio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleKill('Uso Excessivo de Recursos')}>
                    Abuso de Recursos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleKill('Intervenção Técnica')}>
                    Intervenção Técnica
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
