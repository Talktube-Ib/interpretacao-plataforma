'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Activity, Signal, Globe, Shield, AlertTriangle, RefreshCw, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiagnosticsDialogProps {
    getDiagnostics: () => Promise<any>
    reconnect: () => void
    trigger?: React.ReactNode
}

export function DiagnosticsDialog({ getDiagnostics, reconnect, trigger }: DiagnosticsDialogProps) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const refresh = async () => {
        setLoading(true)
        try {
            const stats = await getDiagnostics()
            setData(stats)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            refresh()
            const interval = setInterval(refresh, 3000)
            return () => clearInterval(interval)
        }
    }, [isOpen])

    const getIceColor = (state: string) => {
        switch (state) {
            case 'connected':
            case 'completed': return 'bg-green-500'
            case 'checking': return 'bg-yellow-500'
            case 'failed': return 'bg-red-500'
            default: return 'bg-zinc-500'
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2 border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <Activity className="h-4 w-4" />
                        Diagnóstico
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-blue-500" />
                        <DialogTitle>Diagnóstico de Conectividade</DialogTitle>
                    </div>
                    <DialogDescription className="text-zinc-400">
                        Informações técnicas para identificar problemas de rede e Firewall.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {loading && !data ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-4">
                            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                            <p className="text-sm text-zinc-500">Coletando estatísticas...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500">Estado ICE</span>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", getIceColor(data?.iceState))} />
                                        <span className="font-mono text-sm uppercase">{data?.iceState || 'Desconectado'}</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500">Transporte</span>
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <Globe className="h-4 w-4" />
                                        <span className="font-mono text-sm uppercase">{data?.candidateType || 'N/A'} ({data?.protocol || '??'})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Alertas Críticos */}
                            {data?.iceState === 'failed' && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400">
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <div className="text-xs space-y-1">
                                        <p className="font-bold">Falha Crítica de Conexão</p>
                                        <p className="opacity-80">Sua rede pode estar bloqueando o tráfego UDP (WebRTC). Verifique se há um servidor TURN configurado.</p>
                                    </div>
                                </div>
                            )}

                            {data?.candidateType === 'host' && data?.iceState !== 'connected' && (
                                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-3 text-yellow-500">
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <div className="text-xs space-y-1">
                                        <p className="font-bold">Limite de Rede Local</p>
                                        <p className="opacity-80">Você está tentando se conectar diretamente (Host), o que falha entre redes diferentes. O servidor TURN parece não estar respondendo.</p>
                                    </div>
                                </div>
                            )}

                            {/* Technical Details */}
                            <div className="rounded-xl border border-zinc-800 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-zinc-900/50">
                                        <TableRow className="border-zinc-800 hover:bg-transparent">
                                            <TableHead className="text-zinc-500 text-[10px] h-8">PARÂMETRO</TableHead>
                                            <TableHead className="text-zinc-500 text-[10px] h-8 text-right">VALOR</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="border-zinc-800 hover:bg-zinc-900/30">
                                            <TableCell className="py-2 text-xs font-medium">Servidor LiveKit</TableCell>
                                            <TableCell className="py-2 text-xs text-right font-mono text-zinc-400">
                                                {data?.url ? new URL(data.url).hostname : '---'}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="border-zinc-800 hover:bg-zinc-900/30">
                                            <TableCell className="py-2 text-xs font-medium">Participantes</TableCell>
                                            <TableCell className="py-2 text-xs text-right font-mono text-zinc-400">
                                                {data?.participants || 0}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="border-zinc-800 hover:bg-zinc-900/30">
                                            <TableCell className="py-2 text-xs font-medium">Sinalização</TableCell>
                                            <TableCell className="py-2 text-xs text-right font-mono text-zinc-400 uppercase">
                                                {data?.signalingState || '---'}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button 
                                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-500"
                                    onClick={() => {
                                        reconnect()
                                        setIsOpen(false)
                                    }}
                                >
                                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                                    Tentar Reconexão
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="border-zinc-800 hover:bg-zinc-900"
                                    onClick={refresh}
                                >
                                    Atualizar
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
