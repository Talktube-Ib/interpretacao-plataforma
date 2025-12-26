'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/admin-logger'

async function ensureAdminClient() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing via process.env')
        throw new Error('Configuração: Chave de Serviço (Service Role) ausente no servidor.')
    }
    return createAdminClient()
}

export async function debugAdminConnection() {
    try {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!key) return { success: false, message: 'SUPABASE_SERVICE_ROLE_KEY is undefined' }

        const preview = key.substring(0, 5) + '...' + key.substring(key.length - 5)
        const isServiceRole = key.startsWith('eyJ') // Simplified JWT check

        if (!isServiceRole) return { success: false, message: `Key format invalid (Starts with ${key.substring(0, 8)}...). Expected JWT (eyJ...).` }

        const admin = await ensureAdminClient()
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })

        if (error) return { success: false, message: `Client Error: ${error.message}` }

        return { success: true, message: `Connected! Key: ${preview}, Users Found: ${data.users.length}` }
    } catch (e: any) {
        return { success: false, message: `Exception: ${e.message}` }
    }
}

export async function updateUserRole(userId: string, newRole: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        // Get previous role for logging
        const { data: oldProfile } = await supabase.from('profiles').select('role').eq('id', userId).single()

        const supabaseAdmin = await ensureAdminClient()

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)

        if (error) return { success: false, error: error.message }

        await logAdminAction({
            action: 'USER_PROMOTE',
            targetResource: 'user',
            targetId: userId,
            details: { old_role: oldProfile?.role, new_role: newRole }
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned', reason?: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const { data: oldProfile } = await supabase.from('profiles').select('status').eq('id', userId).single()

        const supabaseAdmin = await ensureAdminClient()

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ status })
            .eq('id', userId)
            .select()

        if (error) {
            console.error('Error updating user status:', error)
            return { success: false, error: error.message }
        }

        const updatedCount = data?.length || 0
        const newStatus = data?.[0]?.status


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
        return { success: true, message: `Status atualizado de ${oldProfile?.status} para ${newStatus}. Linhas afetadas: ${updatedCount}` }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function deleteUser(userId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        // Verify Admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') return { success: false, error: 'Unauthorized' }

        const supabaseAdmin = await ensureAdminClient()

        // 1. Manual cleanup of Storage (Avatars) - Files owned by user prevent tidy cleanup if not removed
        const { data: userFiles } = await supabaseAdmin.storage.from('avatars').list('', {
            search: userId
        })

        if (userFiles && userFiles.length > 0) {
            const filesToDelete = userFiles
                .filter(f => f.name.startsWith(userId))
                .map(f => f.name)

            if (filesToDelete.length > 0) {
                const { error: storageError } = await supabaseAdmin.storage
                    .from('avatars')
                    .remove(filesToDelete)

                if (storageError) console.error('Error deleting user avatars:', storageError)
            }
        }

        // 2. Delete User from Auth (Cascades to profile and other tables via ON DELETE CASCADE)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) {
            console.error('Delete User Auth Error:', error)
            return {
                success: false,
                error: `Erro Auth: ${error.message}`
            }
        }

        await logAdminAction({
            action: 'USER_DELETE',
            targetResource: 'user',
            targetId: userId,
            details: {}
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function updateUserLimits(userId: string, limits: Record<string, unknown>) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = await ensureAdminClient()
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ limits })
            .eq('id', userId)

        if (error) return { success: false, error: error.message }

        await logAdminAction({
            action: 'SETTINGS_UPDATE', // Reusing or create USER_LIMITS_UPDATE
            targetResource: 'user',
            targetId: userId,
            details: { new_limits: limits }
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function updateProfileLanguages(userId: string, languages: string[]) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const supabaseAdmin = await ensureAdminClient()
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ languages })
            .eq('id', userId)

        if (error) return { success: false, error: error.message }

        await logAdminAction({
            action: 'SETTINGS_UPDATE',
            targetResource: 'user',
            targetId: userId,
            details: { languages }
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function createUser(formData: FormData) {
    try {
        // 1. Check permission as logged in user
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Não autorizado' }

        const { data: requesterProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (requesterProfile?.role !== 'admin') return { success: false, error: 'Permissão negada' }

        // 2. Extract data
        const rawEmail = formData.get('email') as string
        const email = rawEmail?.trim()
        const fullName = (formData.get('fullName') as string)?.trim()
        const role = formData.get('role') as string || 'participant'
        const password = formData.get('password') as string

        // Extract languages (expecting JSON string)
        let languages: string[] = []
        try {
            const rawLang = formData.get('languages') as string
            if (rawLang) languages = JSON.parse(rawLang)
        } catch (e) {
            console.error('Error parsing languages:', e)
        }

        if (!email || !email.includes('@')) {
            return { success: false, error: 'Email inválido.' }
        }

        if (!password || password.length < 6) {
            return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' }
        }

        // 3. Create user using Admin Client (Bypass email confirmation)
        const supabaseAdmin = await ensureAdminClient()

        // We assume the DB constraint has been updated to allow 'interpreter'
        // If not, this might fail or trigger needs update. 
        // For safety/legacy compatibility, we keep 'user' in metadata if strict 'admin'/'user' check exists in triggers,
        // but we'll try to pass the real role.
        const metadataRole = role === 'admin' ? 'admin' : (role === 'interpreter' ? 'interpreter' : 'user')

        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: metadataRole,
                must_reset_password: true
            }
        })

        if (error) {
            console.error('Supabase createUser error:', error)
            return { success: false, error: error.message }
        }

        // 4. Update role and languages in profiles (Use UPSERT for robustness)
        if (newUser?.user) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: newUser.user.id,
                    email: email,
                    full_name: fullName,
                    role: role === 'participant' ? 'user' : role,
                    languages: languages,
                    status: 'active'
                })

            if (profileError) {
                console.error('Error upserting profile:', profileError)
                // We don't return error here to avoid blocking creation if just profile update fails, 
                // but ideally implementation should be transactional.
            }
        }

        await logAdminAction({
            action: 'USER_CREATE',
            targetResource: 'user',
            targetId: newUser!.user.id,
            details: { email, role, full_name: fullName, languages, method: 'manual_create' }
        })

        revalidatePath('/admin/users')
        return { success: true }
    } catch (err: any) {
        console.error('Unexpected error in createUser:', err)
        return { success: false, error: err.message || 'Erro inesperado ao criar usuário.' }
    }
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
        const supabaseAdmin = await ensureAdminClient()

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
        const supabaseAdmin = await ensureAdminClient()

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

export async function createAnnouncement(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: 'Unauthorized' }

        // Verify Admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') return { success: false, error: 'Unauthorized' }

        const title = formData.get('title') as string
        const content = formData.get('content') as string

        if (!title || !content) return { success: false, error: 'Campos obrigatórios' }

        const supabaseAdmin = await ensureAdminClient()
        const { error } = await supabaseAdmin
            .from('announcements')
            .insert({
                title,
                content,
                created_by: user.id
            })

        if (error) return { success: false, error: error.message }

        revalidatePath('/dashboard/messages') // Update user view
        revalidatePath('/admin/messages') // Update admin view

        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
