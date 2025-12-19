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
    BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from './mode-toggle'

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
            color: 'text-sky-500',
        },
        {
            label: 'Agenda',
            icon: Calendar,
            href: '/dashboard/agenda',
            color: 'text-violet-500',
        },
        {
            label: 'Configurações',
            icon: Settings,
            href: '/dashboard/settings',
            color: 'text-pink-700',
        },
    ]

    const adminRoutes = [
        {
            label: 'Usuários',
            icon: Users,
            href: '/admin/users',
            color: 'text-orange-700',
        },
        {
            label: 'Reuniões',
            icon: Video,
            href: '/admin/meetings',
            color: 'text-emerald-500',
        },
        {
            label: 'Configurações',
            icon: Settings,
            href: '/admin/settings',
            color: 'text-zinc-400',
        },
        {
            label: 'Auditoria',
            icon: Shield,
            href: '/admin/security/audit',
            color: 'text-red-400',
        },
        {
            label: 'Relatórios',
            icon: BarChart3,
            href: '/admin/reports',
            color: 'text-blue-500',
        },
    ]

    return (
        <div className="space-y-4 py-6 flex flex-col h-full bg-card text-card-foreground border-r border-border shadow-2xl transition-colors duration-300">
            <div className="px-6 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center mb-14 group">
                    <div className="p-2 rounded-xl bg-[#06b6d4]/10 mr-3 group-hover:bg-[#06b6d4]/20 transition-colors">
                        <Video className="h-6 w-6 text-[#06b6d4]" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter italic">
                        Interpreta<span className="text-[#06b6d4]">.ai</span>
                    </h1>
                </Link>

                <div className="space-y-2">
                    {routes.map((route) => {
                        const isActive = pathname === route.href
                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    'text-sm group flex p-3 w-full justify-start font-semibold cursor-pointer rounded-xl transition-all relative overflow-hidden',
                                    isActive
                                        ? 'text-foreground bg-accent shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                )}
                            >
                                <div className="flex items-center flex-1 z-10">
                                    <route.icon className={cn('h-5 w-5 mr-3 transition-colors', isActive ? route.color : 'text-zinc-500 group-hover:text-white')} />
                                    {route.label}
                                </div>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#06b6d4] rounded-r-full shadow-[0_0_10px_#06b6d4]" />
                                )}
                            </Link>
                        )
                    })}
                </div>

                {userRole === 'admin' && (
                    <div className="mt-10">
                        <h2 className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Admin Control</h2>
                        <div className="space-y-2">
                            {adminRoutes.map((route) => {
                                const isActive = pathname === route.href
                                return (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        className={cn(
                                            'text-sm group flex p-3 w-full justify-start font-semibold cursor-pointer rounded-xl transition-all relative',
                                            isActive
                                                ? 'text-foreground bg-accent'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                        )}
                                    >
                                        <div className="flex items-center flex-1">
                                            <route.icon className={cn('h-5 w-5 mr-3 transition-colors', isActive ? route.color : 'text-zinc-500 group-hover:text-white')} />
                                            {route.label}
                                        </div>
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#06b6d4] rounded-r-full shadow-[0_0_10px_#06b6d4]" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 py-4 border-t border-border bg-accent/20">
                <div className="flex items-center justify-between gap-x-3 mb-4 p-3 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-x-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#06b6d4] to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-[#06b6d4]/20 shrink-0">
                            {user.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-foreground truncate">{user.email}</span>
                            <span className="text-[10px] text-[#06b6d4] font-black uppercase tracking-tighter">
                                {userRole === 'admin' ? 'Administrador' : 'Usuário'}
                            </span>
                        </div>
                    </div>
                    <ModeToggle />
                </div>
                <form action="/auth/signout" method="post">
                    <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-bold">
                        <LogOut className="h-5 w-5 mr-3" />
                        Sair da Conta
                    </Button>
                </form>
            </div>
        </div>
    )
}
