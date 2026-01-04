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

async function setupAdmin() {
    const email = 'admin@talktube.com.br';
    const password = 'admin123';

    console.log(`Setting up admin user: ${email}...`);

    // 1. Check if user exists in Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const existingUser = users.users.find(u => u.email === email);
    let userId;

    if (existingUser) {
        console.log('User exists. Updating password and role...');
        userId = existingUser.id;

        // Update password and metadata
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            {
                password: password,
                user_metadata: { role: 'admin', full_name: 'Admin Master' },
                email_confirm: true
            }
        );

        if (updateError) {
            console.error('Error updating auth user:', updateError);
        } else {
            console.log('Auth user updated successfully.');
        }

    } else {
        console.log('User does not exist. Creating new admin user...');

        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: 'admin', full_name: 'Admin Master' }
        });

        if (createError) {
            console.error('Error creating user:', createError);
            return;
        }

        userId = createData.user.id;
        console.log('Auth user created successfully.');
    }

    // 2. Ensure Profile exists and is Admin (public schema)
    console.log('Syncing public.profiles...');

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: email,
            role: 'admin',
            full_name: 'Admin Master',
            status: 'active'
        });

    if (profileError) {
        console.error('Error updating profiles table:', profileError);
    } else {
        console.log('public.profiles synced successfully.');
    }

    console.log('Done! Admin setup complete.');
}

setupAdmin();
