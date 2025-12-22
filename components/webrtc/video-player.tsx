import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicOff, VideoOff, Maximize2, Loader2, User, Hand } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
    stream?: MediaStream | null
    name: string
    role?: string
    micOff?: boolean
    cameraOff?: boolean
    handRaised?: boolean
    isSpeaking?: boolean
    volume?: number
    connectionState?: 'connecting' | 'connected' | 'failed' | 'disconnected'
    onSpeakingChange?: (isSpeaking: boolean) => void
    isPresentation?: boolean
}

export function RemoteVideo({ stream, name, role, micOff, cameraOff, handRaised, isSpeaking, volume = 1, connectionState = 'connected', onSpeakingChange, isPresentation }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume
        }
    }, [volume])

    const isConnecting = connectionState === 'connecting'

    return (
        <div className={cn(
            "group relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500",
            isSpeaking && "ring-4 ring-[#06b6d4] ring-offset-4 ring-offset-zinc-950 shadow-[0_0_30px_-10px_rgba(6,182,212,0.5)]",
        )}>
            {cameraOff || !stream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 backdrop-blur-3xl">
                    <div className="relative">
                        <div className="h-16 w-16 md:h-24 md:w-24 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                            <User className="h-8 w-8 md:h-12 md:w-12 text-zinc-600" />
                        </div>
                    </div>
                    <span className="mt-2 md:mt-4 text-zinc-400 font-medium tracking-tight text-xs md:text-base">{name}</span>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={cn(
                        "w-full h-full object-cover",
                        isPresentation ? "object-contain" : "object-cover"
                    )}
                />
            )}

            {/* OVERLAYS */}
            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 right-3 md:right-6 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 md:gap-3 bg-black/40 backdrop-blur-xl px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-white/10">
                    <span className="text-white text-[10px] md:text-sm font-bold tracking-tight">{name}</span>
                    {(role?.toLowerCase().includes('interpreter') || role?.toLowerCase().includes('admin')) && (
                        <div className="bg-[#06b6d4] h-1 w-1 md:h-1.5 md:w-1.5 rounded-full animate-pulse" />
                    )}
                </div>

                <div className="flex gap-1.5 md:gap-2">
                    {handRaised && (
                        <div className="bg-amber-500/20 backdrop-blur-xl border border-amber-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <Hand className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 animate-bounce" />
                        </div>
                    )}
                    {micOff && (
                        <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <MicOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500" />
                        </div>
                    )}
                </div>
            </div>

            {/* CONNECTING OVERLAY */}
            <AnimatePresence>
                {isConnecting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[2.5rem]"
                    >
                        <Loader2 className="h-8 w-8 text-[#06b6d4] animate-spin mb-4" />
                        <span className="text-zinc-400 text-sm font-medium">Conectando...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export function LocalVideo({ stream, name, role, micOff, cameraOff, handRaised, isSpeaking, onSpeakingChange }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className={cn(
            "group relative w-full h-full bg-zinc-900 rounded-[2.5rem] overflow-hidden transition-all duration-500",
            isSpeaking && "ring-4 ring-[#06b6d4] shadow-lg",
        )}>
            {cameraOff || !stream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                    <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="h-10 w-10 text-zinc-600" />
                    </div>
                    <span className="mt-3 text-zinc-400 text-sm font-medium tracking-tight">Você</span>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                />
            )}

            <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 right-3 md:right-6 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 bg-black/40 backdrop-blur-xl px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-white/10">
                    <span className="text-white text-[10px] md:text-sm font-bold tracking-tight">Você</span>
                    {(role?.toLowerCase().includes('interpreter') || role?.toLowerCase().includes('admin')) && (
                        <div className="bg-[#06b6d4] h-1 w-1 md:h-1.5 md:w-1.5 rounded-full animate-pulse" />
                    )}
                </div>
                <div className="flex gap-1.5 md:gap-2">
                    {handRaised && (
                        <div className="bg-amber-500/20 backdrop-blur-xl border border-amber-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <Hand className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500 animate-bounce" />
                        </div>
                    )}
                    {micOff && (
                        <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 p-1.5 md:p-2.5 rounded-xl md:rounded-2xl">
                            <MicOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500" />
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .mirror { transform: scaleX(-1); }
            `}</style>
        </div>
    )
}
