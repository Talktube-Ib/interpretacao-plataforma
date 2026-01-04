'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function ExportButton() {
    return (
        <Button variant="outline" onClick={() => alert('Exportar relatórios em desenvolvimento')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
        </Button>
    )
}
