
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileSidebar } from '@/components/mobile-sidebar'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Strict Admin Check
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'

    if (role !== 'admin') {
        // Redirect non-admins back to dashboard
        redirect('/dashboard')
    }

    return (
        <div className="h-full relative bg-[#020817] text-white">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar user={user} userRole={role} />
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden sticky top-0 z-[90] bg-[#020817]/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center">
                <MobileSidebar user={user} userRole={role} />
                <span className="ml-4 font-bold text-lg text-white">Admin Panel</span>
            </div>

            <main className="md:pl-72 h-full">
                {children}
            </main>
        </div>
    )
}
