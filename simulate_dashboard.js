
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://taexdxuqmhbdyfwctrey.supabase.co';
const supabaseKey = 'sb_secret_Uef8mNejAB2Oe59yLR7DvA_vSqxueTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateDashboard() {
    const userId = '409f20da-0997-4b6c-a7bb-1b96c688c411';
    console.log(`Simulating dashboard fetch for: ${userId}`);

    const start = Date.now();
    const [{ data: profile, error: pError }, { data: meetings, error: mError }] = await Promise.all([
        supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single(),
        supabase
            .from('meetings')
            .select('*')
            .eq('host_id', userId)
            .order('start_time', { ascending: true })
    ]);
    const end = Date.now();

    console.log(`Fetch took ${end - start}ms`);
    if (pError) console.error('Profile Error:', pError);
    if (mError) console.error('Meetings Error:', mError);
    console.log('Profile:', profile ? 'Found' : 'Not Found');
    console.log('Meetings count:', meetings ? meetings.length : 0);
}

simulateDashboard();
