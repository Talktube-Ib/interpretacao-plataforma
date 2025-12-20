
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspect() {
    console.log('Fetching profiles...')
    const { data: profiles, error } = await supabase.from('profiles').select('id, email, role, status')
    if (error) {
        console.error('Error:', error)
        return
    }
    console.table(profiles)
}

inspect()
