
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://taexdxuqmhbdyfwctrey.supabase.co';
const supabaseKey = 'sb_secret_Uef8mNejAB2Oe59yLR7DvA_vSqxueTU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'profiles' });
    // Since I don't have this RPC, I'll try to insert a dummy interpreter to see if it fails.

    console.log('Testing insertion of a dummy interpreter...');
    const dummyId = '00000000-0000-0000-0000-000000000000'; // Invalid but let's see

    // Better: try to update Alicelima's role to 'interpreter' again (it should already be that)
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'interpreter' })
        .eq('email', 'Alicelima70@gmail.com');

    if (updateError) {
        console.error('Update failed. Constraint might be broken:', updateError.message);
    } else {
        console.log('Update successful. Role "interpreter" is allowed.');
    }
}

checkConstraint();
