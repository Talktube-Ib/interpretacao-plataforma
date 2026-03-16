'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Error Segment:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Falha no Dashboard</h2>
          <p className="text-gray-400 text-sm">
            Não conseguimos carregar seu painel de controle.
          </p>
        </div>

        <div className="bg-black/40 rounded-xl p-4 text-left overflow-auto max-h-48 border border-white/5 font-mono text-[10px]">
          <p className="text-red-400"><strong>Erro:</strong> {error.message || 'Erro inesperado no servidor'}</p>
          {error.digest && <p className="text-gray-600 mt-1">Ref: {error.digest}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-xl h-11"
            onClick={() => reset()}
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Tentar Recarregar
          </Button>
          <Link href="/login">
            <Button
              variant="ghost"
              className="w-full text-gray-400 hover:text-white hover:bg-white/5 rounded-xl h-11"
            >
              <LogOut className="w-4 h-4 mr-2" /> Ir para Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
