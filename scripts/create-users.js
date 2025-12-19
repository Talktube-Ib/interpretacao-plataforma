
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqfswjzzhgzrgezeekpv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnN3anp6aGd6cmdlemVla3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI4NjQsImV4cCI6MjA4MTY0ODg2NH0.8En12vGguTvbXUfQRIZgG_FYfzM-psgdNJFET4ZfjY8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser(email, password, role, name) {
    console.log(`Creating user: ${email} (${role})...`);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                role: role
            }
        }
    });

    if (error) {
        console.error(`Error creating ${email}:`, error.message);
        return;
    }

    if (data.session) {
        console.log(`Success! User ${email} created and logged in automatically.`);
    } else if (data.user) {
        console.log(`User ${email} created but REQUIRES EMAIL CONFIRMATION. ID: ${data.user.id}`);
    } else {
        console.log(`Unexpected state for ${email}`);
    }
}

async function main() {
    await createUser('admin@interpreta.ai', 'password123', 'admin', 'Admin User');
    await createUser('host@interpreta.ai', 'password123', 'host', 'Host User');
    await createUser('interpreter@interpreta.ai', 'password123', 'interpreter', 'Interpreter User');
}

main();
