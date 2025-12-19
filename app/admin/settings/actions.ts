'use server'

import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin-logger'
import { revalidatePath } from 'next/cache'

export async function updatePlatformSettings(formData: FormData) {
    const supabase = await createClient()

    const maintenance_mode = formData.get('maintenance_mode') === 'on'
    const registration_open = formData.get('registration_open') === 'on'
    const max_concurrent_meetings = parseInt(formData.get('max_concurrent_meetings') as string)

    const { error } = await supabase
        .from('platform_settings')
        .update({
            maintenance_mode,
            registration_open,
            max_concurrent_meetings
        })
        .eq('id', 1)

    if (error) throw new Error('Failed to update settings')

    await logAdminAction({
        action: 'SETTINGS_UPDATE',
        targetResource: 'system',
        details: { maintenance_mode, registration_open, max_concurrent_meetings }
    })

    revalidatePath('/admin/settings')
}
