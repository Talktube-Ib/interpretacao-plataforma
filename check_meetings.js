
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://taexdxuqmhbdyfwctrey.supabase.co';
const supabaseKey = 'sb_secret_Uef8mNejAB2Oe59yLR7DvA_vSqxueTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMeetings() {
    const userId = '409f20da-0997-4b6c-a7bb-1b96c688c411';

    const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', userId);

    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(meetings, null, 2));
    }
}

checkMeetings();
