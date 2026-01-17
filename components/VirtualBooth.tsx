'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, ArrowRightLeft, Radio, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useVirtualBooth } from '@/hooks/useVirtualBooth'

interface VirtualBoothProps {
    roomId: string
    userId: string
    userLanguage: string
    localStream: MediaStream | null
    onHandoverComplete: () => void
    isActive: boolean
}

export function VirtualBooth({
    roomId,
    userId,
    userLanguage,
    localStream,
    onHandoverComplete,
    isActive
}: VirtualBoothProps) {
    const {
        partnerId,
        partnerName,
        isConnected,
        connectionState,
        partnerStream,
        isHandoverPending,
        handoverDeadline,
        handoverRequester,
        requestHandover,
        acceptHandover,
        cancelHandover
    } = useVirtualBooth(roomId, userId, userLanguage, localStream)

    const videoRef = useRef<HTMLVideoElement>(null)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    useEffect(() => {
        if (videoRef.current && partnerStream) {
            videoRef.current.srcObject = partnerStream
        }
    }, [partnerStream])

    // Countdown Timer logic
    useEffect(() => {
        if (isHandoverPending && handoverDeadline) {
            const interval = setInterval(() => {
                const diff = Math.ceil((handoverDeadline - Date.now()) / 1000)
                setTimeLeft(diff > 0 ? diff : 0)
                if (diff <= 0) {
                    // Timeout logic could go here
                }
            }, 1000)
            return () => clearInterval(interval)
        } else {
            setTimeLeft(null)
        }
    }, [isHandoverPending, handoverDeadline])

    // Event listener removed: Logic handled by parent component to avoid conflicts


    if (!userLanguage || userLanguage === 'floor') return null

    return (
        <div className="fixed top-24 right-4 z-[40] w-64 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-white/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse")} />
                    <span className="text-xs font-bold text-zinc-100 font-mono tracking-wider">CABINE VIRTUAL</span>
                </div>
                {connectionState !== 'connected' && (
                    <span className="text-[10px] text-zinc-500 animate-pulse">Procurando...</span>
                )}
            </div>

            {/* Partner Video Area */}
            <div className="relative aspect-video bg-black/50 group">
                {isConnected ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-zinc-300">
                            {partnerName || "Parceiro"}
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <Radio className="h-8 w-8 animate-pulse opacity-20" />
                        <span className="text-xs">Aguardando Parceiro...</span>
                    </div>
                )}
            </div>

            {/* Controls / Status */}
            <div className="p-3 space-y-3">

                {/* Status Indicator */}
                <div className={cn(
                    "rounded-lg p-2 text-center text-xs font-medium border",
                    isActive
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                )}>
                    {isActive ? "🔴 VOCÊ ESTÁ NO AR" : "💤 VOCÊ ESTÁ EM STANDBY"}
                </div>

                {/* Handover Requests */}
                <AnimatePresence>
                    {isHandoverPending ? (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-2"
                        >
                            <div className="flex items-center gap-2 text-yellow-500 pb-1">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs font-bold">Solicitação de Troca</span>
                            </div>
                            <p className="text-[10px] text-zinc-300">
                                Seu parceiro quer assumir o turno. Aceitar em <span className="text-white font-mono">{timeLeft}s</span>?
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-white/10" onClick={cancelHandover}>Ignorar</Button>
                                <Button size="sm" className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => {
                                    acceptHandover()
                                    onHandoverComplete() // Immediate switch for me
                                }}>
                                    Aceitar Troca
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        /* Normal Handover Button */
                        <Button
                            variant="secondary"
                            className="w-full h-9 text-xs flex items-center gap-2 bg-white/5 hover:bg-white/10 border-white/5"
                            onClick={requestHandover}
                            disabled={!isConnected}
                        >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Pedir Troca (Handover)
                        </Button>
                    )}
                </AnimatePresence>

            </div>
        </div>
    )
}
