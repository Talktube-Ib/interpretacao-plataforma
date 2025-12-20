import { createClient } from '@/lib/supabase/server'

export async function getAdminStats() {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    return await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }), // Total Users
        supabase.from('meetings').select('*', { count: 'exact', head: true }), // Total Meetings
        supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('status', 'active'), // Active Meetings

        // Recent Users (7 Days) - For stat card
        supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo),

        // Growth Data (30 Days) - Users
        supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at'),

        // Growth Data (30 Days) - Meetings
        supabase.from('meetings').select('created_at, status').gte('created_at', thirtyDaysAgo).order('created_at'),

        // Completed Meetings (All time for total minutes)
        supabase.from('meetings').select('start_time, end_time').eq('status', 'ended').not('end_time', 'is', null),

        // Platform Settings
        supabase.from('platform_settings').select('max_concurrent_meetings').eq('id', 1).single(),

        // Audit Logs
        supabase.from('audit_logs')
            .select(`
                id, action, created_at, details, target_resource,
                admin:admin_id (email)
            `)
            .order('created_at', { ascending: false })
            .limit(10)
    ])
}
