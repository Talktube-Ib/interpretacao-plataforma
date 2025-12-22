
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const isDemo = cookieStore.get('demo_mode')?.value === 'true'

    let user = null
    let role = 'participant'
    let avatar = null
    let unreadCount = 0

    if (isDemo) {
        // Mock Data for Demo
        user = {
            id: 'demo-user',
            email: 'demo@interpret.io',
            user_metadata: { full_name: 'Demo User' },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
        }
        role = 'demo_viewer'
        avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo'
    } else {
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        user = data.user

        if (!user) {
            redirect('/login')
        }

        // Fetch role and avatar efficiently (and last read time)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, avatar_url, last_read_announcements_at')
            .eq('id', user.id)
            .single()

        role = profile?.role || user.user_metadata?.role || 'participant'
        avatar = profile?.avatar_url
        const lastRead = profile?.last_read_announcements_at || '2000-01-01'

        // Count unread announcements
        const { count } = await supabase
            .from('announcements')
            .select('id', { count: 'exact', head: true })
            .gt('created_at', lastRead)

        unreadCount = count || 0
    }

    return (
        <div className="h-full relative bg-[#020817] text-white">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar user={user} userRole={role} userAvatar={avatar} unreadMessagesCount={unreadCount || 0} />
            </div>
            <main className="md:pl-72 h-full">
                {children}
            </main>
        </div>
    )
}
