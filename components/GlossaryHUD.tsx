'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Languages, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useSmartGlossary } from '@/hooks/useSmartGlossary'
import { cn } from '@/lib/utils'

interface GlossaryHUDProps {
    meetingId: string
    isInterpreter: boolean
    targetLanguage: string
    isActive: boolean
    onClose: () => void
}

export function GlossaryHUD({ meetingId, isInterpreter, targetLanguage, isActive, onClose }: GlossaryHUDProps) {
    const {
        isListening,
        transcript,
        startListening,
        stopListening,
        isSupported,
        error: speechError
    } = useSpeechRecognition(targetLanguage === 'original' ? 'pt-BR' : targetLanguage) // Assuming original is PT for now, should map properly

    const { detectedTerms, loading } = useSmartGlossary(meetingId, transcript)

    // Auto-start listening if active
    useEffect(() => {
        if (isActive && isSupported && !isListening) {
            startListening()
        } else if (!isActive && isListening) {
            stopListening()
        }
    }, [isActive, isSupported])

    // Debug / Demo Mock
    // useEffect(() => {
    //     const terms = ['Blockchain', 'P2P', 'Latência', 'Handover']
    //     let i = 0
    //     const interval = setInterval(() => {
    //          // Mock detection
    //     }, 3000)
    //     return () => clearInterval(interval)
    // }, [])

    if (!isActive) return null

    return (
        <div className="fixed top-24 left-4 z-[40] w-80 pointer-events-none">
            {/* Header / Controls (Pointer Events Auto) */}
            <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-t-xl p-3 flex items-center justify-between pointer-events-auto shadow-xl">
                <div className="flex items-center gap-2 text-[#06b6d4]">
                    <BrainCircuit className={cn("h-4 w-4", isListening && "animate-pulse")} />
                    <span className="text-xs font-bold tracking-wider font-mono">SMART GLOSSARY</span>
                </div>
                <div className="flex items-center gap-2">
                    {!isSupported && <span className="text-[10px] text-red-400">Navegador não suportado</span>}
                    {speechError && <span className="text-[10px] text-red-400" title={speechError}>Erro no Audio</span>}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={onClose}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Transcription Stream (Subtle) */}
            <div className="bg-black/60 backdrop-blur-sm px-3 py-2 border-x border-white/10 text-[10px] text-zinc-400 font-mono h-16 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <p className="break-words opacity-70 italic">{transcript.slice(-100) || "Aguardando áudio..."}</p>
            </div>

            {/* Detected Terms List */}
            <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-b-xl p-2 space-y-2 min-h-[100px]">
                <AnimatePresence mode='popLayout'>
                    {detectedTerms.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-4 text-zinc-600 text-xs italic"
                        >
                            Nenhum termo técnico detectado.
                        </motion.div>
                    ) : (
                        detectedTerms.map((term) => (
                            <motion.div
                                key={term.id}
                                layout
                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="bg-[#06b6d4]/10 border-l-2 border-[#06b6d4] p-2 rounded-r-md shadow-lg"
                            >
                                <div className="text-xs font-bold text-white flex justify-between items-center">
                                    <span>{term.term}</span>
                                    {/* <span className="text-[10px] bg-black/40 px-1 rounded text-[#06b6d4]">Detectado</span> */}
                                </div>
                                {term.definition && (
                                    <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                                        {term.definition}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
