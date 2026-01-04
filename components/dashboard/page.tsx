
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import DashboardClient from './dashboard-client'
import { ensureWelcomeMessage } from './actions'

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const isDemo = cookieStore.get('demo_mode')?.value === 'true'

    let user = null
    let profile = null
    let meetings: any[] | null = []

    if (isDemo) {
        user = { id: 'demo-user', email: 'demo@interpret.io' }
        profile = { role: 'demo', full_name: 'Demo User', personal_meeting_id: 'demo-room' }
        meetings = [
            { id: 'demo-meeting-1', title: 'Reunião de Exemplo 01', start_time: new Date().toISOString(), host_id: 'demo' },
            { id: 'demo-meeting-2', title: 'Pauta Trimestral', start_time: new Date(Date.now() + 86400000).toISOString(), host_id: 'demo' }
        ]
    } else {
        const supabase = await createClient()
        const { data: userData } = await supabase.auth.getUser()
        user = userData.user

        if (!user) {
            redirect('/login')
        }

        // Ensure Welcome Message (Async, don't await blocking)
        ensureWelcomeMessage().catch(console.error)

        const { data: profileData } = await supabase
            .from('profiles')
            .select('role, full_name, limits, personal_meeting_id')
            .eq('id', user.id)
            .single()
        profile = profileData

        const { data: meetingsData } = await supabase
            .from('meetings')
            .select('*')
            .or(`host_id.eq.${user.id}`)
            .neq('title', 'Reunião Instantânea')
            .neq('status', 'ended')
            .order('start_time', { ascending: true })
        meetings = meetingsData
    }

    return <DashboardClient user={user} profile={profile} meetings={meetings} isDemo={isDemo} />
}
