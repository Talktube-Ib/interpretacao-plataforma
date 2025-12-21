"use client"

import { AlertTriangle, Lock } from "lucide-react"
import { Button } from "./ui/button"
import { exitDemoMode } from "@/app/actions/demo"

export function DemoBanner() {
    return (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 py-2 px-4 shadow-sm backdrop-blur-sm">
            <div className="container mx-auto flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-amber-500 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Modo de Demonstração (Acesso Limitado)</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:inline text-muted-foreground text-xs">
                        As alterações feitas aqui não serão salvas permanentemente.
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs hover:bg-amber-500/10 text-amber-600"
                        onClick={() => exitDemoMode()}
                    >
                        Sair do Demo
                    </Button>
                </div>
            </div>
        </div>
    )
}
