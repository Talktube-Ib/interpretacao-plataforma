import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicOff, VideoOff, Maximize2, Loader2, User } from 'lucide-react'
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
                        <div className="h-24 w-24 rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                            <User className="h-12 w-12 text-zinc-600" />
                        </div>
                    </div>
                    <span className="mt-4 text-zinc-400 font-medium tracking-tight">{name}</span>
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
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10">
                    <span className="text-white text-sm font-bold tracking-tight">{name}</span>
                    {role === 'interpreter' && (
                        <div className="bg-[#06b6d4] h-1.5 w-1.5 rounded-full animate-pulse" />
                    )}
                </div>

                <div className="flex gap-2">
                    {micOff && (
                        <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 p-2.5 rounded-2xl">
                            <MicOff className="h-4 w-4 text-red-500" />
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

            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10">
                    <span className="text-white text-sm font-bold tracking-tight">Você</span>
                </div>
                {micOff && (
                    <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 p-2.5 rounded-2xl">
                        <MicOff className="h-4 w-4 text-red-500" />
                    </div>
                )}
            </div>

            <style jsx>{`
                .mirror { transform: scaleX(-1); }
            `}</style>
        </div>
    )
}
