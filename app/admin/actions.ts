'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/admin-logger'

export async function updateUserRole(userId: string, newRole: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Get previous role for logging
    const { data: oldProfile } = await supabase.from('profiles').select('role').eq('id', userId).single()

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

    if (error) throw new Error(error.message)

    await logAdminAction({
        action: 'USER_PROMOTE',
        targetResource: 'user',
        targetId: userId,
        details: { old_role: oldProfile?.role, new_role: newRole }
    })

    revalidatePath('/admin/users')
}

export async function updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned', reason?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: oldProfile } = await supabase.from('profiles').select('status').eq('id', userId).single()

    const { error } = await supabase
        .from('profiles')
        .update({
            status,
            active: status === 'active' // Keep legacy active column in sync
        })
        .eq('id', userId)

    if (error) throw new Error(error.message)

    const actionMap: Record<string, 'USER_UNBAN' | 'USER_SUSPEND' | 'USER_BAN'> = {
        'active': 'USER_UNBAN',
        'suspended': 'USER_SUSPEND',
        'banned': 'USER_BAN'
    }

    await logAdminAction({
        action: actionMap[status],
        targetResource: 'user',
        targetId: userId,
        details: { old_status: oldProfile?.status, new_status: status, reason }
    })

    revalidatePath('/admin/users')
}

export async function updateUserLimits(userId: string, limits: Record<string, unknown>) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('profiles')
        .update({ limits })
        .eq('id', userId)

    if (error) throw new Error(error.message)

    await logAdminAction({
        action: 'SETTINGS_UPDATE', // Reusing or create USER_LIMITS_UPDATE
        targetResource: 'user',
        targetId: userId,
        details: { new_limits: limits }
    })

    revalidatePath('/admin/users')
}
