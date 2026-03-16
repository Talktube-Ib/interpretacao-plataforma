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
        .select('role, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

    return (
        <div className="h-full relative bg-[#020617] text-white">
            {/* Ambient Background Glow for Dashboard */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
            </div>

            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar user={user} userRole={profile?.role || 'participant'} userAvatar={profile?.avatar_url} />
            </div>

            {/* Mobile Navigation - Glassmorphism */}
            <div className="md:hidden sticky top-0 z-[90] bg-black/40 backdrop-blur-xl border-b border-white/5 p-4 flex items-center shadow-xl">
                <MobileSidebar user={user} userRole={profile?.role || 'participant'} userAvatar={profile?.avatar_url} />
                <span className="ml-4 font-bold text-lg text-white tracking-tight">TalkTube</span>
            </div>

            <main className="md:pl-72 pb-10">
                {children}
            </main>
            <FloatingWhatsApp alwaysVisible type="support" />
        </div>
    )
}
