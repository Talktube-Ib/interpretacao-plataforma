'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
    try {
        const supabase = await createClient()

        const email = formData.get('email') as string
        const password = formData.get('password') as string

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.warn(`Login attempt failed for ${email}:`, error.message)
            return {
                success: false,
                error: error.message === 'Invalid login credentials' ? 'login_error_invalid' : error.message
            }
        }

        redirect('/dashboard')
    } catch (err) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
            throw err // Deixa o Next.js lidar com redirect
        }
        console.error("CRITICAL LOGIN ERROR:", err)
        return { success: false, error: 'Internal Server Error' }
    }
}
