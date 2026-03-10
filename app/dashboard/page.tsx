import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const [{ data: profile }, { data: meetings }] = await Promise.all([
        supabase
            .from('profiles')
            .select('id, full_name, personal_meeting_id')
            .eq('id', user.id)
            .single(),
        supabase
            .from('meetings')
            .select('*')
            .eq('host_id', user.id)
            .order('start_time', { ascending: true })
    ])

    return <DashboardClient
        user={user}
        profile={profile || { id: user.id }}
        meetings={meetings || []}
        isDemo={false}
    />
}
