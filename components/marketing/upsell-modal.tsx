'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Rocket, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface UpsellModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function UpsellModal({ isOpen, onOpenChange }: UpsellModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <div className="mx-auto bg-[#07dfe2]/10 p-4 rounded-full mb-4">
                        <Rocket className="w-10 h-10 text-[#07dfe2]" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-[#07dfe2] to-[#4318ff] bg-clip-text text-transparent">
                        Leve sua experiência para o próximo nível
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-400 text-base mt-2">
                        Você está participando como convidado. Sabia que pode ter sua própria sala profissional?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#07dfe2] flex-shrink-0" />
                        <span className="text-sm">Tradução simultânea ilimitada</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#07dfe2] flex-shrink-0" />
                        <span className="text-sm">Gravação de reuniões em HD</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#07dfe2] flex-shrink-0" />
                        <span className="text-sm">Personalização com sua marca</span>
                    </div>
                </div>

                <DialogFooter className="flex-col gap-3 sm:flex-col">
                    <Button
                        asChild
                        className="w-full bg-gradient-to-r from-[#07dfe2] to-[#4318ff] hover:opacity-90 text-white font-bold h-12 rounded-xl"
                    >
                        <Link href="https://interpretbrasil.com/#pricing" target="_blank">
                            Quero Minha Sala Própria
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="w-full text-zinc-500 hover:text-zinc-300"
                    >
                        Continuar como convidado
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
