
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    // Fallback to hardcoded values if env vars fail
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tqfswjzzhgzrgezeekpv.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnN3anp6aGd6cmdlemVla3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI4NjQsImV4cCI6MjA4MTY0ODg2NH0.8En12vGguTvbXUfQRIZgG_FYfzM-psgdNJFET4ZfjY8';

    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not Set')

    return createBrowserClient(supabaseUrl, supabaseKey)
}

