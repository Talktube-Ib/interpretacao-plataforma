
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://taexdxuqmhbdyfwctrey.supabase.co';
const supabaseKey = 'sb_secret_Uef8mNejAB2Oe59yLR7DvA_vSqxueTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const email = 'Alicelima70@gmail.com';

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log(JSON.stringify(profile, null, 2));
    }
}

checkUser();
