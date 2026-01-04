'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Headphones, ArrowRightLeft, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

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

    // Filter languages if restricted
    const languages = allowedLanguages
        ? availableLanguages.filter(l => allowedLanguages.includes(l.code))
        : availableLanguages

    return (
        <div className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-purple-500/50 p-4 rounded-3xl shadow-[0_0_50px_rgba(147,51,234,0.3)] z-[50] flex flex-col md:flex-row items-center gap-6 w-[90%] md:w-auto max-w-4xl animate-in slide-in-from-bottom-10 fade-in duration-500">

            {/* Status Indicactor */}
            <div className="flex items-center gap-3 border-r border-white/10 pr-6 mr-2">
                <div className={cn(
                    "h-3 w-3 rounded-full animate-pulse",
                    active ? "bg-red-500 shadow-[0_0_10px_red]" : "bg-zinc-600"
                )} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</span>
                    <span className={cn("text-sm font-bold", active ? "text-red-400" : "text-zinc-400")}>
                        {active ? "ON AIR" : "MUTED"}
                    </span>
                </div>
            </div>

            {/* Input Channel (Listening) */}
            <div className="flex flex-col gap-1.5 min-w-[140px]">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <Headphones className="h-3 w-3" /> Incoming
                </div>
                <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                    <Button
                        variant={isListeningToFloor ? "default" : "ghost"}
                        size="sm"
                        onClick={onListenToFloor}
                        className={cn(
                            "flex-1 h-8 text-xs font-bold rounded-lg transition-all",
                            isListeningToFloor ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        Floor
                    </Button>
                    {/* Relay options could go here */}
                </div>
            </div>

            <ArrowRightLeft className="hidden md:block text-zinc-600 h-5 w-5" />

            {/* Output Channel (Speaking) */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <Mic className="h-3 w-3" /> Outgoing Channel
                </div>
                <div className="flex flex-wrap gap-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                    {languages.map((lang) => {
                        const isOccupied = occupiedLanguages?.includes(lang.code) && currentLanguage !== lang.code
                        return (
                            <Button
                                key={lang.code}
                                variant={currentLanguage === lang.code ? "default" : "ghost"}
                                size="sm"
                                onClick={() => onLanguageChange(lang.code)}
                                disabled={isOccupied} // Prevent taking occupied channel? Or just warn?
                                className={cn(
                                    "h-8 text-xs font-bold rounded-lg transition-all px-3",
                                    currentLanguage === lang.code
                                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50"
                                        : "text-zinc-400 hover:text-white",
                                    isOccupied && "opacity-50 cursor-not-allowed decoration-slice"
                                )}
                                title={isOccupied ? "Channel busy" : lang.name}
                            >
                                <span className="mr-1.5">{lang.flag}</span>
                                {lang.code.toUpperCase()}
                            </Button>
                        )
                    })}
                </div>
            </div>

            <div className="w-px h-10 bg-white/10 hidden md:block mx-2" />

            {/* Controls */}
            <div className="flex items-center gap-3">
                <Button
                    variant={active ? "destructive" : "secondary"}
                    size="icon"
                    className={cn(
                        "h-14 w-14 rounded-2xl shadow-xl transition-all active:scale-95 border-2",
                        active ? "bg-red-500 border-red-400 shadow-red-900/40 animate-pulse" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                    )}
                    onClick={onToggleActive}
                >
                    {active ? <Mic className="h-6 w-6 text-white" /> : <MicOff className="h-6 w-6 text-zinc-400" />}
                </Button>

                <Button
                    variant="outline"
                    className="h-14 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-2xl font-bold gap-2 px-6"
                    onClick={onHandover}
                >
                    <ArrowRightLeft className="h-4 w-4" />
                    Handover
                </Button>
            </div>

        </div>
    )
}
