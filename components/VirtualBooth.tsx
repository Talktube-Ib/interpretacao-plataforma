'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, ArrowRightLeft, Radio, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useVirtualBooth } from '@/hooks/useVirtualBooth'
import {
    LiveKitRoom,
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    useTracks,
    useParticipants,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

interface VirtualBoothProps {
    roomId: string
    userId: string
    userLanguage: string
    onHandoverComplete: () => void
    isActive: boolean
}

export function VirtualBooth({
    roomId,
    userId,
    userLanguage,
    onHandoverComplete,
    isActive
}: VirtualBoothProps) {
    return (
        <LiveKitWrapper
            roomId={roomId}
            userId={userId}
            userLanguage={userLanguage}
            onHandoverComplete={onHandoverComplete}
            isActive={isActive}
        />
    )
}

function LiveKitWrapper({ roomId, userId, userLanguage, onHandoverComplete, isActive }: VirtualBoothProps) {
    const {
        liveKitToken,
        isHandoverPending,
        handoverDeadline,
        requestHandover,
        acceptHandover,
        cancelHandover,
        connectionState
    } = useVirtualBooth(roomId, userId, userLanguage)

    const [isMuted, setIsMuted] = useState(false)

    // FIX: Detectar parceiro de cabine para o Handover (Bug 3)
    const participants = useParticipants()
    const otherInterpreter = useMemo(() => {
        return participants.find(p => {
            try {
                const meta = JSON.parse(p.metadata || '{}')
                // Procura por outro intérprete que não seja o próprio usuário
                return meta.role === 'interpreter' && p.identity !== userId
            } catch {
                return false
            }
        })
    }, [participants, userId])

    if (!liveKitToken) return null

    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={liveKitToken}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: '100%', width: '100%' }}
            className="fixed top-24 right-4 z-[40] w-64 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl h-auto"
        >
            {/* Header */}
            <div className="bg-white/5 p-3 flex items-center justify-between z-50 relative">
                <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", connectionState === 'connected' ? "bg-green-500" : "bg-yellow-500 animate-pulse")} />
                    <span className="text-xs font-bold text-zinc-100 font-mono tracking-wider">CABINE VIRTUAL</span>
                </div>
                {connectionState !== 'connected' && (
                    <span className="text-[10px] text-zinc-500 animate-pulse">Conectando...</span>
                )}
            </div>

            <div className="relative aspect-video bg-black/50 group">
                <BoothVideo />

                {/* Mute Overlay */}
                <div className="absolute bottom-2 right-2 z-10">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 rounded-full bg-black/60 hover:bg-black/80"
                        onClick={() => setIsMuted(!isMuted)}
                    >
                        {isMuted ? <MicOff className="h-3 w-3 text-red-500" /> : <Mic className="h-3 w-3 text-white" />}
                    </Button>
                </div>
            </div>

            {/* Controls / Status */}
            <div className="p-3 space-y-3 relative z-50 bg-zinc-900">
                <div className={cn(
                    "rounded-lg p-2 text-center text-xs font-medium border",
                    isActive
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                )}>
                    {isActive ? "🔴 VOCÊ ESTÁ NO AR" : "💤 VOCÊ ESTÁ EM STANDBY"}
                </div>

                <HandoverControls
                    isPending={isHandoverPending}
                    deadline={handoverDeadline}
                    onAccept={acceptHandover}
                    onCancel={() => {
                        if (otherInterpreter) cancelHandover(otherInterpreter.identity)
                        else cancelHandover()
                    }}
                    onRequest={() => {
                        if (otherInterpreter) {
                            requestHandover(otherInterpreter.identity)
                        } else {
                            // Feedback caso não haja parceiro
                            console.warn("Nenhum parceiro de cabine detectado para a troca.")
                        }
                    }}
                    onComplete={onHandoverComplete}
                    canRequest={!!otherInterpreter}
                />
            </div>

            <RoomAudioRenderer muted={isMuted} />
        </LiveKitRoom>
    )
}

function BoothVideo() {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    return (
        <GridLayout tracks={tracks} style={{ height: '100%' }}>
            <ParticipantTile />
        </GridLayout>
    )
}

interface HandoverControlsProps {
    isPending: boolean
    deadline: number | null
    onAccept: () => void
    onCancel: () => void
    onRequest: () => void
    onComplete: () => void
    canRequest: boolean
}

function HandoverControls({ isPending, deadline, onAccept, onCancel, onRequest, onComplete, canRequest }: HandoverControlsProps) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    useEffect(() => {
        if (isPending && deadline) {
            const interval = setInterval(() => {
                const diff = Math.ceil((deadline - Date.now()) / 1000)
                setTimeLeft(diff > 0 ? diff : 0)
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [isPending, deadline])

    return (
        <AnimatePresence>
            {isPending ? (
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
                        Aceitar em <span className="text-white font-mono">{timeLeft}s</span>?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-white/10" onClick={onCancel}>Ignorar</Button>
                        <Button size="sm" className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => {
                            onAccept()
                            onComplete()
                        }}>
                            Aceitar
                        </Button>
                    </div>
                </motion.div>
            ) : (
                <Button
                    variant="secondary"
                    disabled={!canRequest}
                    className={cn(
                        "w-full h-9 text-xs flex items-center gap-2 bg-white/5 hover:bg-white/10 border-white/5",
                        !canRequest && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={onRequest}
                >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    {canRequest ? "Pedir Troca" : "Aguardando Parceiro"}
                </Button>
            )}
        </AnimatePresence>
    )
}
