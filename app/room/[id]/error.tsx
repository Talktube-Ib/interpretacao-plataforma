'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Room Error Boundary Caught:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Ops! Erro na Sala</h2>
          <p className="text-gray-400 text-sm">
            Ocorreu um erro crítico ao carregar esta página no servidor.
          </p>
        </div>

        <div className="bg-black/40 rounded-xl p-4 text-left overflow-auto max-h-48 border border-white/5">
          <p className="text-red-400 font-mono text-[10px] break-words">
            <strong>Erro:</strong> {error.message || 'Erro desconhecido'}
          </p>
          {error.digest && (
            <p className="text-gray-500 font-mono text-[9px] mt-1">
              ID: {error.digest}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button
            variant="outline"
            className="rounded-xl border-white/10 hover:bg-white/5 text-xs h-11"
            onClick={() => reset()}
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Tentar Novamente
          </Button>
          <Link href="/dashboard" className="w-full">
            <Button
              variant="secondary"
              className="w-full rounded-xl h-11 text-xs"
            >
              <Home className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-[10px] text-gray-600">
          Se este erro persistir no mobile, por favor tire um print desta tela.
        </p>
      </div>
    </div>
  )
}
