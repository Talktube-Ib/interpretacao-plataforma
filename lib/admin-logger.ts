import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type AdminAction =
    | 'USER_BAN'
    | 'USER_UNBAN'
    | 'USER_PROMOTE'
    | 'USER_SUSPEND'
    | 'MEETING_FORCE_END'
    | 'MEETING_LOCK'
    | 'SETTINGS_UPDATE'

interface LogParams {
    action: AdminAction
    targetResource: 'user' | 'meeting' | 'system'
    targetId?: string
    details: Record<string, unknown>
}

export async function logAdminAction({ action, targetResource, targetId, details }: LogParams) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error('Attempted to log admin action without authenticated user')
        return
    }

    // Get IP (optional, strictly server-side)
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const { error } = await supabase.from('audit_logs').insert({
        admin_id: user.id,
        action,
        target_resource: targetResource,
        target_id: targetId,
        details,
        ip_address: ip
    })

    if (error) {
        console.error('Failed to write audit log:', error)
    }
}
