'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'

interface MobileNavProps {
    user: Record<string, unknown> & { id?: string }
    userRole: string
    userAvatar?: string | null
    userName?: string
    unreadMessagesCount?: number
}

export function MobileNav(props: MobileNavProps) {
    const [open, setOpen] = useState(false)

    return (
        <div className="md:hidden">
            <div className="flex items-center justify-between p-4 border-b bg-card">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(true)}
                    className="hover:bg-accent"
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <div className="font-bold text-primary">Interpreta AI</div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Mobile Sidebar Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
                    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setOpen(false)}
            />

            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-[101] w-72 bg-card transform transition-transform duration-300 ease-in-out",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="absolute right-4 top-4 z-[102] md:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpen(false)}
                        className="rounded-full bg-slate-900/10 dark:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <Sidebar {...props} />
            </div>
        </div>
    )
}
