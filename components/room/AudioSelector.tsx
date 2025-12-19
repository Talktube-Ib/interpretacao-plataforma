import * as React from "react"
import { Headphones, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioSelectorProps {
    languages: { code: string; label: string }[]
    activeLanguage: string
    onLanguageChange: (code: string) => void
    onMuteOriginal?: (muted: boolean) => void
}

export function AudioSelector({
    languages,
    activeLanguage,
    onLanguageChange,
}: AudioSelectorProps) {
    return (
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border border-border shadow-sm">
            <Headphones className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground hidden sm:block">Áudio:</span>

            <div className="relative">
                <select
                    className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer pr-4"
                    value={activeLanguage}
                    onChange={(e) => onLanguageChange(e.target.value)}
                >
                    <option value="floor" className="bg-background text-foreground">Piso (Original)</option>
                    {languages.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-background text-foreground">
                            {lang.label}
                        </option>
                    ))}
                </select>
            </div>

            {activeLanguage !== 'floor' && (
                <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
                    <Volume2 className="h-3 w-3 text-primary" />
                    <span className="text-[10px] text-primary font-bold animate-pulse">TRADUÇÃO ATIVA</span>
                </div>
            )}
        </div>
    )
}
