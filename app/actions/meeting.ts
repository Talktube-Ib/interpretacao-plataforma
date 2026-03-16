'use server'

import { createClient } from '@/lib/supabase/server'

export async function checkAndEndMeeting(meetingId: string) {
    try {
        const supabase = await createClient()

        const { data: meeting, error: fetchError } = await supabase
            .from('meetings')
            .select('start_time, status, host_id')
            .eq('id', meetingId)
            .maybeSingle()

        if (fetchError) throw fetchError
        if (!meeting) return { error: 'Meeting not found' }
        if (meeting.status === 'ended') return { expired: true }

        if (meeting.start_time) {
            const startTime = new Date(meeting.start_time).getTime()
            const now = Date.now()
            const diffMinutes = (now - startTime) / (1000 * 60)

            // 120 minutes limit
            if (diffMinutes > 120) {
                // End the meeting
                const { error: updateError } = await supabase
                    .from('meetings')
                    .update({ status: 'ended', end_time: new Date().toISOString() })
                    .eq('id', meetingId)
                
                if (updateError) throw updateError

                return { expired: true }
            }
        }

        return { expired: false }
    } catch (err) {
        console.error(`Error in checkAndEndMeeting (${meetingId}):`, err)
        return { error: 'Internal Server Error', details: String(err) }
    }
}

export async function restartPersonalMeeting(meetingId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: 'Unauthorized' }

        // Check ownership
        const { data: meeting, error: fetchError } = await supabase
            .from('meetings')
            .select('host_id')
            .eq('id', meetingId)
            .maybeSingle()

        if (fetchError) throw fetchError

        if (meeting?.host_id === user.id) {
            // It's their meeting. Restart it.
            const { error: updateError } = await supabase
                .from('meetings')
                .update({
                    status: 'active',
                    start_time: new Date().toISOString(),
                    end_time: null
                })
                .eq('id', meetingId)
            
            if (updateError) throw updateError

            return { success: true }
        }

        return { success: false, error: 'Forbidden' }
    } catch (err) {
        console.error(`Error in restartPersonalMeeting (${meetingId}):`, err)
        return { success: false, error: 'Internal Server Error' }
    }
}

export async function endMeeting(meetingId: string, force: boolean = false) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        // Check if user is host
        const { data: meeting, error: fetchError } = await supabase
            .from('meetings')
            .select('host_id')
            .eq('id', meetingId)
            .maybeSingle()

        if (fetchError) throw fetchError

        if (!force && (!meeting || meeting.host_id !== user.id)) {
            return { error: 'Only host can end meeting' }
        }

        const { error: updateError } = await supabase
            .from('meetings')
            .update({
                status: 'ended',
                end_time: new Date().toISOString()
            })
            .eq('id', meetingId)

        if (updateError) throw updateError
        return { success: true }
    } catch (err) {
        console.error(`Error in endMeeting (${meetingId}):`, err)
        return { error: 'Internal Server Error' }
    }
}
