'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Calendar,
    Settings,
    Users,
    Shield,
    LogOut,
    Video,
    BarChart3,
    MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from './mode-toggle'
import { Logo } from './logo'
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarProps {
    user: { email?: string }
    userRole: string
}

export function Sidebar({ user, userRole }: SidebarProps) {
    const pathname = usePathname()

    const routes = [
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            href: '/dashboard',
        },
        {
            label: 'Agenda',
            icon: Calendar,
            href: '/dashboard/agenda',
        },
        {
            label: 'Mensagens',
            icon: MessageSquare,
            href: '/dashboard/messages',
        },
        {
            label: 'Configurações',
            icon: Settings,
            href: '/dashboard/settings',
        },
    ]

    const adminRoutes = [
        {
            label: 'Gestão de Usuários',
            icon: Users,
            href: '/admin/users',
        },
        {
            label: 'Salas e Reuniões',
            icon: Video,
            href: '/admin/meetings',
        },
        {
            label: 'Logs de Auditoria',
            icon: Shield,
            href: '/admin/security/audit',
        },
        {
            label: 'Relatórios',
            icon: BarChart3,
            href: '/admin/reports',
        },
    ]

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-[#1e3a8a] to-[#0f172a] text-white shadow-2xl overflow-hidden">
            {/* Branding Header */}
            <div className="flex items-center justify-center p-6 pb-2">
                <Logo className="scale-125" />
            </div>

            <div className="text-center text-[10px] text-blue-200/50 uppercase tracking-[0.3em] font-bold mb-6">
                Video Conferencing
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4">
                <div className="space-y-4">
                    <div>
                        <h3 className="mb-2 px-4 text-xs font-semibold text-blue-300/60 uppercase tracking-wider">
                            Menu Principal
                        </h3>
                        <div className="space-y-1">
                            {routes.map((route) => {
                                const isActive = pathname === route.href
                                return (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        className={cn(
                                            'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-2xl transition-all relative',
                                            isActive
                                                ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm'
                                                : 'text-blue-100/60 hover:text-white hover:bg-white/5'
                                        )}
                                    >
                                        <div className="flex items-center flex-1">
                                            <route.icon className={cn('h-5 w-5 mr-3', isActive ? 'text-[#22d3ee]' : 'text-blue-300/50 group-hover:text-white')} />
                                            {route.label}
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    {userRole === 'admin' && (
                        <div>
                            <h3 className="mb-2 px-4 text-xs font-semibold text-blue-300/60 uppercase tracking-wider mt-6">
                                Administração
                            </h3>
                            <div className="space-y-1">
                                {adminRoutes.map((route) => {
                                    const isActive = pathname === route.href
                                    return (
                                        <Link
                                            key={route.href}
                                            href={route.href}
                                            className={cn(
                                                'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-2xl transition-all relative',
                                                isActive
                                                    ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm'
                                                    : 'text-blue-100/60 hover:text-white hover:bg-white/5'
                                            )}
                                        >
                                            <div className="flex items-center flex-1">
                                                <route.icon className={cn('h-5 w-5 mr-3', isActive ? 'text-amber-400' : 'text-blue-300/50 group-hover:text-white')} />
                                                {route.label}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer / User Profile */}
            <div className="p-4 bg-[#0f172a]/50 backdrop-blur-md border-t border-white/5 mx-4 mb-4 rounded-3xl mt-auto shadow-inner">
                <div className="flex items-center gap-x-3 mb-4">
                    <div className="h-10 w-10 round-full rounded-full bg-gradient-to-tr from-[#22d3ee] to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 shrink-0 border-2 border-white/10">
                        {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
                        <span className="text-[10px] text-blue-300/80 font-bold uppercase tracking-wider">
                            {userRole === 'admin' ? 'Admin' : 'Usuário'}
                        </span>
                    </div>
                    <div className="ml-auto">
                        <ModeToggle />
                    </div>
                </div>
                <form action="/auth/signout" method="post">
                    <Button variant="ghost" className="w-full justify-center text-red-300/80 hover:text-red-200 hover:bg-red-500/20 rounded-xl font-bold text-xs h-8">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                    </Button>
                </form>
            </div>
        </div>
    )
}
