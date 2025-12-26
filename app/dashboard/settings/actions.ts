'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: 'Unauthorized' }

        const fullName = formData.get('fullName') as string
        const jobTitle = formData.get('jobTitle') as string
        const company = formData.get('company') as string
        const bio = formData.get('bio') as string
        const languages = formData.get('languages') as string // comma separated

        const langArray = languages ? languages.split(',').map(l => l.trim().toLowerCase()).filter(l => l.length > 0) : []

        const { data: profile } = await supabase
            .from('profiles')
            .select('limits')
            .eq('id', user.id)
            .single()

        const currentLimits = profile?.limits || {}

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                job_title: jobTitle,
                company: company,
                bio: bio,
                languages: langArray,
                limits: {
                    ...currentLimits,
                }
            })
            .eq('id', user.id)

        if (error) return { success: false, error: error.message }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erro inesperado' }
    }
}

export async function updatePassword(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: 'Unauthorized' }

        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (!password || password.length < 6) {
            return { success: false, error: 'A senha deve ter pelo menos 6 caracteres.' }
        }

        if (password !== confirmPassword) {
            return { success: false, error: 'As senhas não coincidem.' }
        }

        const { error } = await supabase.auth.updateUser({ password })

        if (error) return { success: false, error: error.message }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Erro inesperado' }
    }
}
