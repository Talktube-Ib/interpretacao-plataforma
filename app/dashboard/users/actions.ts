'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function inviteUser(formData: FormData) {
    const supabase = await createClient()

    // Check if the current user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Unauthorized')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error('Apenas administradores podem convidar usuários.')
    }

    const email = formData.get('email') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string || 'user'

    // Note: In a real production environment with high security, 
    // you would use the Supabase Admin API (service_role) to create users.
    // For this implementation, we assume the client has adequate permissions 
    // or we use the invite/create logic available.

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
            full_name: fullName,
            role: role
        }
    })

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/users')
    return { success: true }
}

export async function deleteUser(userId: string | FormData) {
    const supabase = await createClient()

    // Handle both direct call and FormData (bind)
    const targetId = typeof userId === 'string' ? userId : userId.get('userId') as string
    if (!targetId) throw new Error('ID do usuário não fornecido.')

    // Check if the current user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Unauthorized')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir usuários.')
    }

    // We use the admin API to delete the user from Auth
    const { error } = await supabase.auth.admin.deleteUser(targetId)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/users')
    return { success: true }
}
