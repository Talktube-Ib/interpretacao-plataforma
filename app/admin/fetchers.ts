import { createClient } from '@/lib/supabase/server'

export async function getAdminStats() {
    const supabase = await createClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    return await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('meetings').select('*', { count: 'exact', head: true }),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('created_at').filter('created_at', 'gte', sevenDaysAgo),
        supabase.from('meetings').select('start_time, end_time').eq('status', 'ended').not('end_time', 'is', null),
        supabase.from('platform_settings').select('max_concurrent_meetings').eq('id', 1).single()
    ])
}
