
import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
        <div className="h-full relative bg-background text-foreground">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
                <Sidebar user={user} userRole={role} />
            </div>
            <main className="md:pl-72 h-full">
                {children}
            </main>
        </div>
    )
}
