'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function checkAndEndMeeting(meetingId: string) {
    const supabase = await createClient()

    const { data: meeting } = await supabase
        .from('meetings')
        .select('start_time, status, host_id')
        .eq('id', meetingId)
        .single()

    if (!meeting) return { error: 'Meeting not found' }
    if (meeting.status === 'ended') return { expired: true }

    if (meeting.start_time) {
        const startTime = new Date(meeting.start_time).getTime()
        const now = Date.now()
        const diffMinutes = (now - startTime) / (1000 * 60)

        // 120 minutes limit
        if (diffMinutes > 120) {
            // End the meeting
            await supabase
                .from('meetings')
                .update({ status: 'ended', end_time: new Date().toISOString() })
                .eq('id', meetingId)

            return { expired: true }
        }
    }

    return { expired: false }
}

export async function restartPersonalMeeting(meetingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false }

    // Check ownership
    const { data: meeting } = await supabase
        .from('meetings')
        .select('host_id')
        .eq('id', meetingId)
        .single()

    if (meeting?.host_id === user.id) {
        // It's their meeting. Restart it.
        await supabase
            .from('meetings')
            .update({
                status: 'active',
                start_time: new Date().toISOString(),
                end_time: null
            })
            .eq('id', meetingId)

        return { success: true }
    }

    return { success: false }
}

export async function endMeeting(meetingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Check if user is host
    const { data: meeting } = await supabase
        .from('meetings')
        .select('host_id')
        .eq('id', meetingId)
        .single()

    if (!meeting || meeting.host_id !== user.id) {
        return { error: 'Only host can end meeting' }
    }

    const { error } = await supabase
        .from('meetings')
        .update({
            status: 'ended',
            end_time: new Date().toISOString()
        })
        .eq('id', meetingId)

    if (error) return { error: error.message }
    return { success: true }
}
