import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { FloatingWhatsApp } from '@/components/floating-whatsapp'

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

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="h-full relative bg-[#020817]">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar user={user} userRole={profile?.role || 'participant'} userAvatar={profile?.avatar_url} />
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden sticky top-0 z-[90] bg-[#020817]/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center">
                <MobileSidebar user={user} userRole={profile?.role || 'participant'} userAvatar={profile?.avatar_url} />
                <span className="ml-4 font-bold text-lg text-foreground">TalkTube</span>
            </div>

            <main className="md:pl-72 pb-10">
                {children}
            </main>
            <FloatingWhatsApp alwaysVisible type="support" />
        </div>
    )
}
