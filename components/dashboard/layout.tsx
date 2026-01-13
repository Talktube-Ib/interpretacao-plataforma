import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()

    let user = null
    let role = 'participant'
    let avatar = null
    let fullName = null
    let unreadCount = 0

    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user

    if (!user) {
        redirect('/login')
    }

    // Fetch role, avatar, full_name, and last read time
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, avatar_url, full_name, last_read_announcements_at')
        .eq('id', user.id)
        .single()

    role = profile?.role || user.user_metadata?.role || 'participant'
    avatar = profile?.avatar_url
    fullName = profile?.full_name || user.user_metadata?.full_name
    const lastRead = profile?.last_read_announcements_at || '2000-01-01'

    // Count unread announcements
    const { count } = await supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', lastRead)

    unreadCount = count || 0

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* Mobile Header / Nav */}
            <MobileNav
                user={user}
                userRole={role}
                userAvatar={avatar}
                userName={fullName || user.user_metadata?.full_name || user.email?.split('@')[0]}
                unreadMessagesCount={unreadCount || 0}
            />

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full w-72 flex-col fixed inset-y-0 z-[80]">
                <Sidebar
                    user={user}
                    userRole={role}
                    userAvatar={avatar}
                    userName={fullName || user.user_metadata?.full_name || user.email?.split('@')[0]}
                    unreadMessagesCount={unreadCount || 0}
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 md:pl-72 h-full overflow-y-auto relative">
                <div className="h-full">
                    {children}
                </div>
            </main>
        </div>
    )
}
