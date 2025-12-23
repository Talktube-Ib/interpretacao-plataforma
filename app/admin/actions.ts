'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/admin-logger'

export async function updateUserRole(userId: string, newRole: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        // Get previous role for logging
        const { data: oldProfile } = await supabase.from('profiles').select('role').eq('id', userId).single()

        const { error } = await supabase
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

        const { error } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', userId)

        if (error) return { success: false, error: error.message }

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
        return { success: true }
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

        const supabaseAdmin = await createAdminClient()

        // Manual Cascade Delete - Delete related records first
        // 0. Manual cleanup of potential blockers

        // 0.0 Clean up Storage (Avatars) - Files owned by user prevent auth deletion
        const { data: userFiles } = await supabaseAdmin.storage.from('avatars').list('', {
            search: userId // This might effectively filter files starting with userId
        })

        if (userFiles && userFiles.length > 0) {
            // Filter strictly to ensure we only get this user's files (files start with userId)
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

        // 0.1 Delete messages (sent by user)
        const { error: msgError } = await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
        if (msgError) console.error('Error deleting messages:', msgError)

        // 0.2 Delete ALL meeting participants where user is involved
        const { error: partError } = await supabaseAdmin.from('meeting_participants').delete().eq('user_id', userId)
        if (partError) console.error('Error deleting user participation:', partError)

        // 0.3 CRITICAL: Delete participants from meetings HOSTED by this user
        // If we don't do this, we can't delete the meetings, which means we can't delete the user.
        const { data: userMeetings } = await supabaseAdmin.from('meetings').select('id').eq('host_id', userId)
        if (userMeetings && userMeetings.length > 0) {
            const meetingIds = userMeetings.map(m => m.id)
            const { error: hostPartError } = await supabaseAdmin
                .from('meeting_participants')
                .delete()
                .in('meeting_id', meetingIds)

            if (hostPartError) console.error('Error cleaning up hosted meeting participants:', hostPartError)
        }

        // 2. Delete meetings where user is host
        const { error: meetingError } = await supabaseAdmin.from('meetings').delete().eq('host_id', userId)
        if (meetingError) console.error('Error deleting meetings:', meetingError)

        // 3. Delete announcements (created by user)
        const { error: annError } = await supabaseAdmin.from('announcements').delete().eq('created_by', userId)
        if (annError) console.error('Error deleting announcements:', annError)

        // 4. Delete profile (usually cascades, but good to be explicit)
        const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
        if (profileError) console.error('Error deleting profile:', profileError)

        // 5. Delete audit logs (where user was the actor)
        const { error: auditError } = await supabaseAdmin.from('audit_logs').delete().eq('admin_id', userId)
        if (auditError) console.error('Error deleting audit logs:', auditError)

        // 6. Finally delete from Auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) {
            console.error('Delete User Auth Error:', error)
            // Diagnostic message
            return {
                success: false,
                error: `Erro Auth: ${error.message} (Verifique logs para detalhes de cascata)`
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
        const { error } = await supabase
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

        const { error } = await supabase
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
        const supabaseAdmin = await createAdminClient()

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

        const { error } = await supabase
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
