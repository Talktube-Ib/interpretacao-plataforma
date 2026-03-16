'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InterpreterSetupModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (langCode: string) => void
    availableLanguages: { code: string; name: string; flag: string }[]
    occupiedLanguages?: string[]
    userName?: string
}

export function InterpreterSetupModal({ isOpen, onClose, onSelect, availableLanguages }: InterpreterSetupModalProps) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card p-6 rounded-2xl text-card-foreground w-full max-w-sm border border-border shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold mb-1">Configuração de Intérprete</h2>
                <p className="text-sm text-muted-foreground mb-6">Selecione seu idioma de transmissão</p>
                <div className="grid gap-3">
                    {availableLanguages?.map((lang) => (
                        <Button
                            key={lang.code}
                            variant="secondary"
                            onClick={() => onSelect(lang.code)}
                            className="h-12 justify-start gap-3 rounded-xl border border-border/50 hover:border-[#06b6d4]/50 transition-all font-semibold"
                        >
                            <span className="text-xl">{lang.flag}</span>
                            {lang.name}
                        </Button>
                    ))}
                </div>
                <div className="mt-6">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    >
                        Pular por enquanto
                    </Button>
                </div>
            </div>
        </div>
    )
}
