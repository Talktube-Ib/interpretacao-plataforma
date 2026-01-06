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
    MessageSquare,
    Megaphone,
    Activity,
    HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from './mode-toggle'
import { Logo } from './logo'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLanguage } from './providers/language-provider'
import { LanguageSwitcher } from './language-switcher'

interface SidebarProps {
    user: { email?: string }
    userRole: string
    userAvatar?: string | null
    userName?: string // Added prop
    unreadMessagesCount?: number
}

export function Sidebar({ user, userRole, userAvatar, userName, unreadMessagesCount = 0 }: SidebarProps) {
    const pathname = usePathname()
    const { t } = useLanguage()

    const routes = [
        {
            label: t('sidebar.dashboard'),
            icon: LayoutDashboard,
            href: '/dashboard',
        },
        {
            label: t('sidebar.agenda'),
            icon: Calendar,
            href: '/dashboard/agenda',
        },
        {
            label: t('sidebar.messages'),
            icon: MessageSquare,
            href: '/dashboard/messages',
            badge: unreadMessagesCount
        },
        {
            label: t('sidebar.settings'),
            icon: Settings,
            href: '/dashboard/settings',
        },
        // Added Help Link
        {
            label: 'Ajuda',
            icon: HelpCircle,
            href: '/dashboard/help',
        },
    ]

    const adminRoutes = [
        {
            label: 'Visão Geral',
            icon: Activity,
            href: '/admin',
        },
        {
            label: t('sidebar.users'),
            icon: Users,
            href: '/admin/users',
        },
        {
            label: t('sidebar.meetings'),
            icon: Video,
            href: '/admin/meetings',
        },
        {
            label: t('sidebar.announcements'),
            icon: Megaphone,
            href: '/admin/messages',
        },
        {
            label: t('sidebar.audit_logs'),
            icon: Shield,
            href: '/admin/security/audit',
        },
        {
            label: t('sidebar.reports'),
            icon: BarChart3,
            href: '/admin/reports',
        },
    ]

    return (
        <div className="flex flex-col h-full bg-card border-r border-border dark:bg-gradient-to-b dark:from-[#1e3a8a] dark:to-[#0f172a] shadow-xl transition-all duration-300">
            {/* Branding Header */}
            <div className="flex items-center justify-center p-6 pb-2">
                <Logo className="scale-125 transition-transform hover:scale-130 duration-300" />
            </div>

            <div className="text-center text-[10px] text-muted-foreground dark:text-blue-200/50 uppercase tracking-[0.3em] font-bold mb-6">
                {t('sidebar.video_conferencing')}
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                    <div>
                        <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground dark:text-blue-300/60 uppercase tracking-wider">
                            {t('sidebar.main_menu')}
                        </h3>
                        <div className="space-y-1">
                            {routes.map((route) => {
                                const isActive = pathname === route.href || (route.href.includes('?tab=') && pathname === route.href.split('?')[0] && window?.location?.search?.includes(route.href.split('?')[1]))
                                return (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        className={cn(
                                            'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-xl transition-all relative',
                                            isActive
                                                ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_-12px_rgba(6,182,212,0.5)] border border-cyan-500/10'
                                                : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'
                                        )}
                                    >
                                        <div className="flex items-center flex-1">
                                            <route.icon className={cn('h-4 w-4 mr-3 transition-colors', isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-white')} />
                                            <span className={cn("flex-1 tracking-wide", isActive ? "font-bold" : "font-medium")}>{route.label}</span>
                                            {/* Badge */}
                                            {/* Force strict number check to avoid '0' rendering */}
                                            {typeof route.badge === 'number' && route.badge > 0 && (
                                                <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-md shadow-red-500/20">
                                                    {route.badge}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    {userRole === 'admin' && (
                        <div>
                            <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground dark:text-blue-300/60 uppercase tracking-wider mt-6">
                                {t('sidebar.administration')}
                            </h3>
                            <div className="space-y-1">
                                {adminRoutes.map((route) => {
                                    const isActive = pathname === route.href
                                    return (
                                        <Link
                                            key={route.href}
                                            href={route.href}
                                            className={cn(
                                                'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-xl transition-all relative',
                                                isActive
                                                    ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_-12px_rgba(6,182,212,0.5)] border border-cyan-500/10'
                                                    : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'
                                            )}
                                        >
                                            <div className="flex items-center flex-1">
                                                <route.icon className={cn('h-4 w-4 mr-3 transition-colors', isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-white')} />
                                                <span className={cn("tracking-wide", isActive ? "font-bold" : "font-medium")}>
                                                    {route.label}
                                                </span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 bg-muted/30 dark:bg-[#0f172a]/50 backdrop-blur-md border-t border-border dark:border-white/5 mx-4 mb-4 rounded-3xl mt-auto shadow-inner">
                <div className="flex items-center gap-x-3 mb-4">
                    <Avatar className="h-10 w-10 border-2 border-background dark:border-white/10 shadow-lg shadow-cyan-500/20">
                        <AvatarImage src={userAvatar || ''} />
                        <AvatarFallback className="bg-gradient-to-tr from-[#22d3ee] to-blue-500 text-white font-bold">
                            {user.email?.[0].toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-foreground dark:text-white truncate max-w-[120px]" title={userName || user.email}>
                            {userName || user.email?.split('@')[0]}
                        </span>
                        <span className="text-[10px] text-muted-foreground dark:text-blue-300/80 font-bold uppercase tracking-wider">
                            {userRole === 'admin' ? t('common.role_admin') : (userRole === 'interpreter' ? 'INTÉRPRETE' : t('common.role_user'))}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-end mb-4 gap-2">
                    <LanguageSwitcher />
                    <ModeToggle />
                </div>

                <form action="/auth/signout" method="post">
                    <Button variant="ghost" className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-500/10 dark:text-red-300/80 dark:hover:text-red-200 dark:hover:bg-red-500/20 rounded-xl font-bold text-xs h-8">
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('sidebar.signout')}
                    </Button>
                </form>
            </div>
        </div>
    )
}
