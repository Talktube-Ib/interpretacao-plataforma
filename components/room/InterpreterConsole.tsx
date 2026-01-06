'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Headphones, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface InterpreterConsoleProps {
    active: boolean
    onToggleActive: () => void
    currentLanguage: string
    onLanguageChange: (lang: string) => void
    isListeningToFloor: boolean
    onListenToFloor: () => void
    onHandover: () => void
    availableLanguages: any[]
    allowedLanguages?: string[] // If restricted
    occupiedLanguages?: string[] // To warn if channel busy
}

export function InterpreterConsole({
    active,
    onToggleActive,
    currentLanguage,
    onLanguageChange,
    isListeningToFloor,
    onListenToFloor,
    onHandover,
    availableLanguages,
    allowedLanguages,
    occupiedLanguages
}: InterpreterConsoleProps) {

    const [isMinimized, setIsMinimized] = useState(false)

    // Filter languages if restricted
    const languages = allowedLanguages
        ? availableLanguages.filter(l => allowedLanguages.includes(l.code))
        : availableLanguages

    const currentLangName = languages.find(l => l.code === currentLanguage)?.name || "Selecionar"
    const currentLangFlag = languages.find(l => l.code === currentLanguage)?.flag || "🌐"

    return (
        <div className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center">

            <AnimatePresence mode="wait">
                {isMinimized ? (
                    // --- MINIMIZED VIEW ---
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-white/10 p-2 pl-4 rounded-full shadow-2xl cursor-pointer hover:bg-black/90 transition-colors group"
                        onClick={() => setIsMinimized(false)}
                    >
                        {/* Status Dot */}
                        <div className={cn(
                            "h-2.5 w-2.5 rounded-full animate-pulse",
                            active ? "bg-red-500 shadow-[0_0_8px_red]" : "bg-zinc-600"
                        )} />

                        <div className="flex flex-col leading-none">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                {active ? "ON AIR" : "MUTED"}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">{currentLangFlag}</span>
                                <span className={cn("text-xs font-bold", active ? "text-white" : "text-zinc-400")}>
                                    {currentLangName}
                                </span>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-white/10 mx-1" />

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-white/10 text-zinc-400"
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsMinimized(false)
                            }}
                        >
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                    </motion.div>
                ) : (
                    // --- EXPANDED VIEW (Minimalist) ---
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-black/90 backdrop-blur-2xl border border-white/10 p-3 rounded-[2rem] shadow-2xl flex items-center gap-3 md:gap-4 relative group"
                    >
                        {/* Toggle Minimize (Absolute Top Right for Cleaner Look) */}
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 border border-white/10 rounded-t-lg px-3 py-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                        >
                            <ChevronDown className="h-3 w-3" />
                            Minimizar
                        </button>

                        {/* Status & Mic Toggle */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant={active ? "destructive" : "secondary"}
                                size="icon"
                                className={cn(
                                    "h-12 w-12 rounded-2xl shadow-lg transition-all active:scale-95 border",
                                    active
                                        ? "bg-red-500 border-red-400 shadow-red-900/40 animate-pulse"
                                        : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                                )}
                                onClick={onToggleActive}
                            >
                                {active ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                            </Button>
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        {/* Channel Controls (Compact) */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 px-1">Saída</label>
                            <Select value={currentLanguage} onValueChange={onLanguageChange}>
                                <SelectTrigger className="w-[140px] h-9 bg-zinc-900/50 border-white/10 text-white font-medium text-xs rounded-lg focus:ring-0 focus:border-white/20">
                                    <SelectValue placeholder="Idioma" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] bg-zinc-950 border-white/10 text-zinc-300 z-[60]">
                                    <SelectItem value="floor" className="cursor-pointer focus:bg-zinc-900 focus:text-white text-xs">
                                        <div className="flex items-center gap-2">
                                            <span>🎙️</span>
                                            <span className="text-cyan-400">Original (Floor)</span>
                                        </div>
                                    </SelectItem>
                                    {languages.map((lang) => {
                                        const isOccupied = occupiedLanguages?.includes(lang.code) && currentLanguage !== lang.code
                                        return (
                                            <SelectItem
                                                key={lang.code}
                                                value={lang.code}
                                                disabled={isOccupied}
                                                className="cursor-pointer focus:bg-zinc-900 focus:text-white text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{lang.flag}</span>
                                                    <span>{lang.name}</span>
                                                    {isOccupied && <span className="text-[10px] text-red-500 ml-1">(Ocupado)</span>}
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Input Controls (Compact) */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 px-1">Entrada</label>
                            <div className="flex bg-zinc-900/50 rounded-lg p-0.5 border border-white/5">
                                <button
                                    onClick={onListenToFloor}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5",
                                        isListeningToFloor
                                            ? "bg-cyan-600/20 text-cyan-400 shadow-sm border border-cyan-500/20"
                                            : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    <Headphones className="h-3 w-3" />
                                    Original
                                </button>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        {/* Actions */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl"
                            onClick={onHandover}
                            title="Solicitar Troca (Handover)"
                        >
                            <ArrowRightLeft className="h-4 w-4" />
                        </Button>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
