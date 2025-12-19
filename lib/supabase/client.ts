
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Safe Debug Logging
    if (typeof window !== 'undefined') {
        console.log('Supabase URL:', supabaseUrl)
        console.log('Supabase Key:', supabaseKey ? `Set (${supabaseKey.substring(0, 5)}...)` : 'MISSING/UNDEFINED')
    }

    return createBrowserClient(supabaseUrl, supabaseKey)
}

