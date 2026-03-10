'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function backfillUsernames() {
    const supabase = await createAdminClient()

    // Get all profiles without username
    console.log('💎 Starting Diamond Backfill for usernames...')
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email')
        .is('username', null)

    if (error) {
        console.error('❌ Diamond Backfill Error:', error)
        return { success: false, error: error.message }
    }

    console.log(`💎 Found ${profiles?.length || 0} profiles needing backfill.`)

    if (!profiles || profiles.length === 0) return { success: true, count: 0 }

    let backfilledCount = 0
    for (const profile of profiles) {
        if (!profile.email) continue

        let baseUsername = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
        let username = baseUsername
        let counter = 0

        // Ensure uniqueness (basic check)
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle()

        if (existing) {
            counter++
            username = `${baseUsername}${counter}`
            // Simple loop protection
            if (counter > 10) break
        }

        console.log(`💎 Attempting to update profile ${profile.id} with username: ${username}`)
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ username })
            .eq('id', profile.id)

        if (updateError) {
            console.error(`❌ Failed to update profile ${profile.id}:`, updateError)
        } else {
            console.log(`✅ Successfully backfilled profile ${profile.id} with username: ${username}`)
            backfilledCount++
        }
    }

    // Final check for currently logged in user to avoid stale state
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
        console.log(`💎 Diamond Investigation: Checking session user ${currentUser.id}`)
        const { data: currProfile } = await supabase.from('profiles').select('username').eq('id', currentUser.id).maybeSingle()
        if (currProfile && !currProfile.username) {
            console.log('💎 Diamond: Forcing username for current user session...')
            const newUsername = 'user-' + Math.random().toString(36).substring(2, 7)
            await supabase.from('profiles').update({ username: newUsername }).eq('id', currentUser.id)
            return { success: true, count: 1, message: 'Force synced current user' }
        }
    }

    console.log(`💎 Diamond Backfill complete. Total users updated: ${backfilledCount}`)
    return { success: true, count: backfilledCount }
}
