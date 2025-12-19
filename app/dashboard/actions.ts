'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createInstantMeeting() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
        .from('meetings')
        .insert({
            host_id: user.id,
            title: 'Reunião Instantânea',
            start_time: new Date().toISOString(),
            status: 'active',
            allowed_languages: ['pt', 'en'] // Default languages
        })
        .select()
        .single()

    if (error) throw new Error(error.message)

    redirect(`/room/${data.id}`)
}
