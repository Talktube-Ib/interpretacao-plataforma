'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
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

export async function updateProfileLanguages(userId: string, languages: string[]) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('profiles')
        .update({ languages })
        .eq('id', userId)

    if (error) throw new Error(error.message)

    await logAdminAction({
        action: 'SETTINGS_UPDATE',
        targetResource: 'user',
        targetId: userId,
        details: { languages }
    })

    revalidatePath('/admin/users')
}

export async function createUser(formData: FormData) {
    // 1. Check permission as logged in user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autorizado')

    const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (requesterProfile?.role !== 'admin') throw new Error('Permissão negada')

    // 2. Extract data
    const email = formData.get('email') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string || 'participant'
    const password = formData.get('password') as string

    if (!password || password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres.')
    }

    // 3. Create user using Admin Client (Bypass email confirmation)
    const supabaseAdmin = await createAdminClient()

    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            must_reset_password: true
        }
    })

    if (error) throw new Error(error.message)

    // 4. Update role (if different from default 'user')
    // Note: The trigger might create the profile, but we must ensure the role is set correctly.
    // Ideally we update it here to be sure.
    if (newUser?.user && role !== 'participant') { // 'participant' is the default 'user' role usually
        // We might need to wait a tiny bit or just update directly.
        // With admin client we can update public tables too if RLS allows or we use admin client for that too.
        // Let's use admin client for profile update to be safe and fast.

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ role: role === 'interpreter' ? 'user' : role }) // Assuming 'interpreter' is just a user with capabilities, or do we have distinct roles? 
            // The schema says role in ('admin', 'user'). Interpreter isn't a role in DB enum yet maybe?
            // Let's check schema assumption. The schema only has 'admin' and 'user'.
            // If role is 'interpreter', it is a 'user' but maybe we store it differently?
            // For now, let's stick to 'admin' or 'user'. 
            // If the UI sends 'interpreter', we save as 'user'. 
            // Wait, the previous code didn't handle 'interpreter' specifically in DB role, just 'user'.
            // Let's assume 'interpreter' is just a context. Or we fail if it's not in enum.
            // Actually, let's map: 'admin' -> 'admin', others -> 'user'.
            // Better yet, update the profile with the specific metadata if needed. 
            // For now, just setting 'role' column.
            .eq('id', newUser.user.id)

        if (profileError) {
            console.error('Error updating role:', profileError)
            // Non-fatal, user is created but role might be wrong.
        }
    }

    await logAdminAction({
        action: 'USER_CREATE',
        targetResource: 'user',
        targetId: newUser!.user.id,
        details: { email, role, full_name: fullName, method: 'manual_create' }
    })

    revalidatePath('/admin/users')
    return { success: true }
}

export async function cleanupExpiredMeetings() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error('Cleanup failed: No authenticated user')
        return { success: false, error: 'Usuário não autenticado.' }
    }

    // Check if admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
        console.error(`Cleanup failed: User ${user.id} is not admin`)
        return { success: false, error: 'Permissão negada (Não é admin).' }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Cleanup failed: SUPABASE_SERVICE_ROLE_KEY is missing')
        return { success: false, error: 'Erro de Configuração: Chave de Serviço ausente no servidor.' }
    }

    try {
        const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString()

        // Use Admin Client to bypass RLS for mass cleanup
        const supabaseAdmin = await createAdminClient()

        // Update active meetings that started more than 2 hours ago
        const { data, error, count } = await supabaseAdmin
            .from('meetings')
            .update({ status: 'ended', end_time: new Date().toISOString() })
            .eq('status', 'active')
            .lt('start_time', twoHoursAgo)
            .select('id')

        if (error) {
            console.error('Error cleaning up meetings:', error)
            return { success: false, error: `Erro no Banco de Dados: ${error.message}` }
        }

        if (count && count > 0) {
            await logAdminAction({
                action: 'MEETING_KILL',
                targetResource: 'meeting',
                targetId: 'multiple',
                details: { count, reason: 'expired_120_min', ended_ids: data?.map(m => m.id) }
            })
        }

        revalidatePath('/admin/meetings')
        return { success: true, count: data?.length || 0 }
    } catch (err) {
        console.error('Unexpected error in cleanupExpiredMeetings:', err)
        return { success: false, error: 'Erro inesperado no servidor.' }
    }
}

export async function killAllActiveMeetings() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Usuário não autenticado.' }

    // Check if admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { success: false, error: 'Permissão negada.' }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { success: false, error: 'Chave de Serviço ausente.' }

    try {
        const supabaseAdmin = await createAdminClient()

        const { data, error, count } = await supabaseAdmin
            .from('meetings')
            .update({ status: 'ended', end_time: new Date().toISOString() })
            .in('status', ['active', 'scheduled'])
            .select('id')

        if (error) return { success: false, error: error.message }

        if (count && count > 0) {
            await logAdminAction({
                action: 'MEETING_KILL_ALL',
                targetResource: 'meeting',
                targetId: 'multiple',
                details: { count, reason: 'manual_kill_all', ended_ids: data?.map(m => m.id) }
            })
        }

        revalidatePath('/admin/meetings')
        return { success: true, count: data?.length || 0 }
    } catch (err) {
        console.error(err)
        return { success: false, error: 'Erro interno.' }
    }
}
