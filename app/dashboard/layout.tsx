
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch role and avatar efficiently (and last read time)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, avatar_url, last_read_announcements_at')
        .eq('id', user.id)
        .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    const avatar = profile?.avatar_url
    const lastRead = profile?.last_read_announcements_at || '2000-01-01'

    // Count unread announcements
    const { count: unreadCount } = await supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', lastRead)

    return (
        <div className="h-full relative bg-background">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar user={user} userRole={role} userAvatar={avatar} unreadMessagesCount={unreadCount || 0} />
            </div>
            <main className="md:pl-72 h-full">
                {children}
            </main>
        </div>
    )
}
