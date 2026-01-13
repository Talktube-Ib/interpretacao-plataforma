
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import DashboardClient from './dashboard-client'
import { ensureWelcomeMessage } from './actions'

export default async function DashboardPage() {
    const cookieStore = await cookies()

    let user = null
    let profile = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let meetings: any[] | null = []

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    user = userData.user

    if (!user) {
        redirect('/login')
    }

    // Ensure Welcome Message (Async, don't await blocking)
    ensureWelcomeMessage().catch(console.error)

    // Parallelize data fetching for Profile and Meetings
    const [profileResult, meetingsResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('role, full_name, limits, personal_meeting_id')
            .eq('id', user.id)
            .single(),
        supabase
            .from('meetings')
            .select('*')
            .or(`host_id.eq.${user.id}`)
            .neq('title', 'Reunião Instantânea')
            .neq('status', 'ended')
            .order('start_time', { ascending: true })
    ])

    profile = profileResult.data
    meetings = meetingsResult.data


    return <DashboardClient user={user} profile={profile} meetings={meetings} isDemo={false} />
}
