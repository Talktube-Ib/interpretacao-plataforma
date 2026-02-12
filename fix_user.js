
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://taexdxuqmhbdyfwctrey.supabase.co';
const supabaseKey = 'sb_secret_Uef8mNejAB2Oe59yLR7DvA_vSqxueTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUser() {
    const id = '409f20da-0997-4b6c-a7bb-1b96c688c411';
    const cleanName = 'Maria Alice Intérprete';

    console.log(`Fixing user: ${id}`);

    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        user_metadata: { full_name: cleanName }
    });

    if (authError) {
        console.error('Error updating auth metadata:', authError);
    } else {
        console.log('Auth metadata updated.');
    }

    const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: cleanName })
        .eq('id', id);

    if (profileError) {
        console.error('Error updating profile:', profileError);
    } else {
        console.log('Profile updated.');
    }
}

fixUser();
