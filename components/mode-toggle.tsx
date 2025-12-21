"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    const { setTheme } = useTheme()

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted/20 border border-border text-muted-foreground hover:text-primary transition-all dark:bg-white/5 dark:border-white/10 dark:text-zinc-400 dark:hover:text-white">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Alternar tema</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent align="end" className="z-[100] bg-white dark:bg-[#020817] border border-gray-200 dark:border-white/10 text-foreground dark:text-white rounded-xl shadow-2xl">
                    <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer rounded-lg hover:bg-muted dark:hover:bg-white/5">
                        Claro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer rounded-lg hover:bg-muted dark:hover:bg-white/5">
                        Escuro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer rounded-lg hover:bg-muted dark:hover:bg-white/5">
                        Sistema
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    )
}
