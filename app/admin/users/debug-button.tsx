'use client'

import { Button } from "@/components/ui/button"
import { Bug } from 'lucide-react'
import { debugAdminConnection } from '../actions'

export function DebugButton() {
    const runDebug = async () => {
        const result = await debugAdminConnection()
        alert(JSON.stringify(result, null, 2))
    }

    return (
        <Button onClick={runDebug} variant="destructive" size="sm" className="gap-2">
            <Bug className="h-4 w-4" /> Diagnosticar Conexão
        </Button>
    )
}
