
import * as React from "react"
import { Mic, MicOff, RefreshCw, Radio, Settings2, Globe, Check, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LANGUAGES } from "@/lib/languages"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function InterpreterConsole({
    active,
    onToggleActive,
    currentLanguage,
    onLanguageChange,
    isListeningToFloor,
    onListenToFloor,
    onHandover,
    availableLanguages = LANGUAGES, // System available languages
    allowedLanguages, // Specific allowed languages for this user (if restricted)
    occupiedLanguages
}: {
    active: boolean,
    onToggleActive: () => void,
    currentLanguage: string,
    onLanguageChange: (lang: string) => void,
    isListeningToFloor: boolean,
    onListenToFloor: () => void,
    onHandover: () => void,
    availableLanguages?: typeof LANGUAGES,
    allowedLanguages?: string[],
    occupiedLanguages?: string[]
}) {
    const [isCollapsed, setIsCollapsed] = React.useState(false)

    // Filter available languages based on allowedLanguages if provided
    const selectableLanguages = React.useMemo(() => {
        if (!allowedLanguages || allowedLanguages.length === 0) return availableLanguages
        return availableLanguages.filter(l => allowedLanguages.includes(l.code))
    }, [availableLanguages, allowedLanguages])

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-auto max-w-[95%] z-50 flex flex-col items-center gap-2">

            {/* Main Control Strip */}
            <div className={cn(
                "bg-black/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex items-center gap-2 transition-all duration-300",
                isCollapsed ? "opacity-50 scale-95" : "scale-100"
            )}>

                {/* 1. Language Selector (Integrated) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            disabled={allowedLanguages && allowedLanguages.length === 1 && allowedLanguages[0] === currentLanguage}
                            className="h-12 pl-2 pr-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center gap-3 active:scale-95 transition-all text-left disabled:opacity-100 disabled:cursor-default"
                        >
                            <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                <Globe className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Canal de Saída</span>
                                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                    {selectableLanguages.find(l => l.code === currentLanguage)?.flag}
                                    {selectableLanguages.find(l => l.code === currentLanguage)?.name || "Selecione..."}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="w-56 max-h-[300px] overflow-y-auto custom-scrollbar bg-zinc-900 border-zinc-800 p-1 rounded-xl shadow-2xl">
                        <DropdownMenuLabel className="text-[10px] uppercase text-zinc-500 font-bold px-2 py-1.5">Mudar para</DropdownMenuLabel>
                        {selectableLanguages.map((lang) => {
                            // Check if locked excluding current selection (if we are the one occupying it, it's fine, but occupiedLanguages usually comes from peers only? 
                            // Actually RoomPage should pass occupied including self if self is filtering peers? 
                            // Usually occupiedLanguages = list of codes taken by OTHERS.
                            const isLocked = occupiedLanguages?.includes(lang.code) && currentLanguage !== lang.code

                            return (
                                <DropdownMenuItem
                                    key={lang.code}
                                    disabled={isLocked}
                                    onClick={() => !isLocked && onLanguageChange(lang.code)}
                                    className={cn(
                                        "rounded-lg p-2.5 flex items-center justify-between cursor-pointer text-xs font-medium focus:bg-white/5",
                                        currentLanguage === lang.code ? "bg-purple-500/20 text-purple-400" : "text-zinc-300",
                                        isLocked && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{lang.flag}</span>
                                        <span>{lang.name}</span>
                                        {isLocked && <span className="text-[9px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded ml-2">OCUPADO</span>}
                                    </div>
                                    {currentLanguage === lang.code && <Check className="h-3 w-3" />}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-8 bg-white/10 mx-1" />

                {/* 2. Floor Toggle */}
                <Button
                    variant="ghost"
                    onClick={onListenToFloor}
                    className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                        isListeningToFloor
                            ? "bg-[#06b6d4] text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                    )}
                    title="Ouvir Piso (Original)"
                >
                    <Radio className={cn("h-5 w-5", isListeningToFloor && "animate-pulse")} />
                </Button>

                {/* 3. On Air (Mic) */}
                <Button
                    variant="ghost"
                    onClick={onToggleActive}
                    className={cn(
                        "h-12 px-6 rounded-xl flex items-center gap-2 transition-all font-bold uppercase text-[10px] tracking-widest",
                        active
                            ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                    )}
                >
                    {active ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    <span>{active ? "No Ar" : "Mute"}</span>
                </Button>

                {/* 4. Handover */}
                <Button
                    variant="ghost"
                    onClick={onHandover}
                    className="h-12 w-12 rounded-xl bg-white/5 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all"
                    title="Solicitar Troca (Handover)"
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>

                {/* 5. Collapse/Expand Toggle (Optional, sleek handle) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="md:hidden absolute -top-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur border border-white/10 rounded-full p-0.5 text-zinc-500"
                >
                    {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
            </div>
        </div>
    )
}
