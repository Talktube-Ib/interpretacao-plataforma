
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://taexdxuqmhbdyfwctrey.supabase.co';
const supabaseKey = 'sb_secret_Uef8mNejAB2Oe59yLR7DvA_vSqxueTU'; // SERVICE ROLE

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkAuthUser() {
    const id = '409f20da-0997-4b6c-a7bb-1b96c688c411';
    console.log(`Checking auth user: ${id}`);

    const { data: { user }, error } = await supabase.auth.admin.getUserById(id);

    if (error) {
        console.error('Error fetching auth user:', error);
    } else {
        console.log('User Metadata:', JSON.stringify(user.user_metadata, null, 2));
    }
}

checkAuthUser();
