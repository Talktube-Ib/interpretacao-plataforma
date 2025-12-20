'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
        return { error: 'As senhas não coincidem.' }
    }

    if (password.length < 6) {
        return { error: 'A senha deve ter pelo menos 6 caracteres.' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password,
        data: { must_reset_password: false } // Clear the flag
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
