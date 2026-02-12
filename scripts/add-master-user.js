require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function addMasterUser() {
    const email = 'matheusaleks@gmail.com';
    const password = '211198';

    console.log(`Adding new master user: ${email}...`);

    // 1. Create or Update user in Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const existingUser = users.users.find(u => u.email === email);
    let userId;

    if (existingUser) {
        console.log('User already exists in Auth. Updating password and metadata...');
        userId = existingUser.id;

        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            {
                password: password,
                user_metadata: { role: 'admin', full_name: 'Matheus Master' },
                email_confirm: true
            }
        );

        if (updateError) {
            console.error('Error updating auth user:', updateError);
            return;
        }
    } else {
        console.log('Creating new auth user...');
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: 'admin', full_name: 'Matheus Master' }
        });

        if (createError) {
            console.error('Error creating user:', createError);
            return;
        }

        userId = createData.user.id;
    }

    // 2. Force Admin role in public.profiles
    console.log('Ensuring admin role in public.profiles...');
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: email,
            role: 'admin',
            full_name: 'Matheus Master',
            status: 'active'
        });

    if (profileError) {
        console.error('Error updating profiles table:', profileError);
    } else {
        console.log('User created and set as Admin successfully.');
    }
}

addMasterUser();
