
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    // Fallback constants
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tqfswjzzhgzrgezeekpv.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnN3anp6aGd6cmdlemVla3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI4NjQsImV4cCI6MjA4MTY0ODg2NH0.8En12vGguTvbXUfQRIZgG_FYfzM-psgdNJFET4ZfjY8';

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
