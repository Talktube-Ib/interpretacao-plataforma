import * as React from "react"
import { Mic, MicOff, RefreshCw, Radio, Settings2, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function InterpreterConsole({
    active,
    onToggleActive,
    currentLanguage,
    isListeningToFloor,
    onListenToFloor,
    onHandover
}: {
    active: boolean,
    onToggleActive: () => void,
    currentLanguage: string,
    isListeningToFloor: boolean,
    onListenToFloor: () => void,
    onHandover: () => void
}) {
    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-black/60 backdrop-blur-2xl border border-white/10 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Status Bar */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2.5">
                    <div className="relative flex h-3 w-3">
                        {active && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        )}
                        <span className={cn(
                            "relative inline-flex rounded-full h-3 w-3 border border-black/20",
                            active ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-zinc-600 focus:outline-none"
                        )}></span>
                    </div>
                    <span className={cn(
                        "font-black uppercase text-[10px] md:text-xs tracking-tighter transition-colors",
                        active ? "text-red-500" : "text-zinc-500"
                    )}>
                        {active ? 'No Ar (On Air)' : 'Em Standby'}
                    </span>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                    <Languages className="h-3 w-3 text-[#06b6d4]" />
                    <span className="text-[10px] md:text-xs text-white font-black uppercase tracking-widest">
                        Canal: <span className="text-[#06b6d4] ml-1">{currentLanguage}</span>
                    </span>
                </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <Button
                    variant="ghost"
                    className={cn(
                        "h-14 md:h-16 flex flex-col items-center justify-center gap-1 rounded-xl md:rounded-2xl transition-all active:scale-95",
                        isListeningToFloor
                            ? "bg-[#06b6d4] text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-[#06b6d4]/90"
                            : "bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5"
                    )}
                    onClick={onListenToFloor}
                >
                    <Radio className={cn("h-4 w-4 md:h-5 md:w-5", isListeningToFloor ? "animate-pulse" : "")} />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight">Ouvir Piso</span>
                </Button>

                <Button
                    variant="ghost"
                    className={cn(
                        "h-14 md:h-16 flex flex-col items-center justify-center gap-1 rounded-xl md:rounded-2xl transition-all active:scale-95",
                        active
                            ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-600"
                            : "bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5"
                    )}
                    onClick={onToggleActive}
                >
                    {active ? <MicOff className="h-5 w-5 md:h-6 md:w-6" /> : <Mic className="h-5 w-5 md:h-6 md:w-6" />}
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-tight">
                        {active ? 'Mute' : 'Entrar no Ar'}
                    </span>
                </Button>

                <Button
                    variant="ghost"
                    className="h-14 md:h-16 flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-500 text-zinc-400 border border-white/5 rounded-xl md:rounded-2xl transition-all active:scale-95"
                    onClick={onHandover}
                >
                    <RefreshCw className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight">Handover</span>
                </Button>
            </div>

            {/* Hint Text for Mobile */}
            <div className="mt-2.5 text-center block md:hidden">
                <p className="text-[8px] text-zinc-600 uppercase font-black tracking-[0.2em]">Console do Intérprete</p>
            </div>
        </div>
    )
}
