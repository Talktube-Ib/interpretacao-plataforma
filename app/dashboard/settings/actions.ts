'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const fullName = formData.get('fullName') as string
    const languages = formData.get('languages') as string // comma separated

    const langArray = languages ? languages.split(',').map(l => l.trim().toLowerCase()).filter(l => l.length > 0) : []

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            limits: {
                languages: langArray
            }
        })
        .eq('id', user.id)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard/settings')
}
