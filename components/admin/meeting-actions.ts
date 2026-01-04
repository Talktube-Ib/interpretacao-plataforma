'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/admin-logger'

export async function forceEndMeeting(meetingId: string, reason: string = 'Intervenção Administrativa') {
    const supabase = await createClient()

    // Verify requester is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('meetings')
        .update({
            status: 'ended',
            end_time: new Date().toISOString()
        })
        .eq('id', meetingId)

    if (error) throw new Error(error.message)

    await logAdminAction({
        action: 'MEETING_FORCE_END',
        targetResource: 'meeting',
        targetId: meetingId,
        details: { reason }
    })

    revalidatePath('/admin/meetings')
}
