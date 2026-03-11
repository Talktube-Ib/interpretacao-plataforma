'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function InterpreterSetupModal(props: any) {
    if (!props.isOpen) return null
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card p-6 rounded-2xl text-card-foreground w-full max-w-sm border border-border shadow-2xl relative">
                <button
                    onClick={() => props.onClose?.()}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold mb-1">Configuração de Intérprete</h2>
                <p className="text-sm text-muted-foreground mb-6">Selecione seu idioma de transmissão</p>
                <div className="grid gap-3">
                    {props.availableLanguages?.map((lang: any) => (
                        <Button
                            key={lang.code}
                            variant="secondary"
                            onClick={() => props.onSelect(lang.code)}
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
                        onClick={() => props.onClose?.()}
                        className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    >
                        Pular por enquanto
                    </Button>
                </div>
            </div>
        </div>
    )
}
