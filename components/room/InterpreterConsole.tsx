import * as React from "react"
import { Mic, MicOff, RefreshCw, Radio } from "lucide-react"
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-black/80 backdrop-blur-xl border border-border p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${active ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="font-bold uppercase text-sm tracking-wider">
                        {active ? 'No Ar (On Air)' : 'Em Standby'}
                    </span>
                </div>
                <div className="text-xs text-muted-foreground uppercase font-bold">
                    Canal: {currentLanguage}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Button
                    variant={isListeningToFloor ? "default" : "outline"}
                    className={cn(
                        "h-16 flex flex-col items-center justify-center gap-1 border-dashed transition-all",
                        isListeningToFloor ? "bg-[#06b6d4] text-white border-[#06b6d4]" : "text-muted-foreground"
                    )}
                    onClick={onListenToFloor}
                >
                    <Radio className="h-5 w-5" />
                    <span className="text-xs">Ouvir Piso</span>
                </Button>

                <Button
                    variant={active ? "destructive" : "default"}
                    className={cn("h-16 flex flex-col items-center justify-center gap-1 transition-all", active ? "ring-4 ring-red-500/20" : "")}
                    onClick={onToggleActive}
                >
                    {active ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    <span className="text-xs font-bold">{active ? 'Cortar Som (Mute)' : 'Entrar no Ar'}</span>
                </Button>

                <Button
                    variant="secondary"
                    className="h-16 flex flex-col items-center justify-center gap-1 hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors"
                    onClick={onHandover}
                >
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-xs">Passar Vez (Handover)</span>
                </Button>
            </div>
        </div>
    )
}
