import * as React from "react"
import { Mic2, Settings2, Globe, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface InterpreterControlsProps {
    role: string
    isHost?: boolean
    currentLanguage?: string
    onLanguageChange: (lang: string) => void
}

import { LANGUAGES } from "@/lib/languages"

export function InterpreterControls({ role, isHost, currentLanguage = 'floor', onLanguageChange }: InterpreterControlsProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    const r = (role || '').toLowerCase()
    const canInterpret = r.includes('interpreter') || r.includes('admin') || isHost
    if (!canInterpret) return null

    return (
        <div className="fixed bottom-24 right-6 z-50">
            {isOpen ? (
                <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 w-72 mb-4 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-500/10 p-2 rounded-lg">
                                <Mic2 className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Console do Intérprete</h3>
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Canal de Saída</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <span className="sr-only">Fechar</span>
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    onLanguageChange(lang.code)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all text-sm font-medium",
                                    currentLanguage === lang.code
                                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                                        : "bg-accent/30 text-foreground hover:bg-accent hover:pl-4"
                                )}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="text-lg">{lang.flag}</span>
                                    {lang.name}
                                </span>
                                {currentLanguage === lang.code && <Check className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-auto bg-[#020817]/80 backdrop-blur-xl border border-purple-500/30 hover:border-purple-500/50 text-foreground rounded-full shadow-2xl px-4 gap-3 group transition-all"
                >
                    <div className="bg-purple-500 p-1.5 rounded-full group-hover:scale-110 transition-transform">
                        <Mic2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex flex-col items-start text-xs pr-2">
                        <span className="text-muted-foreground font-semibold text-[10px] uppercase">Interpretando para</span>
                        <span className="font-bold flex items-center gap-1.5">
                            {LANGUAGES.find(l => l.code === currentLanguage)?.flag}
                            {LANGUAGES.find(l => l.code === currentLanguage)?.name || "Selecione..."}
                        </span>
                    </div>
                </Button>
            )}
        </div>
    )
}
