
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqfswjzzhgzrgezeekpv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnN3anp6aGd6cmdlemVla3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI4NjQsImV4cCI6MjA4MTY0ODg2NH0.8En12vGguTvbXUfQRIZgG_FYfzM-psgdNJFET4ZfjY8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing login for admin@interpreta.ai...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@interpreta.ai',
        password: 'password123'
    });

    if (error) {
        console.log('Login failed:', error.message);
    } else {
        console.log('Login successful! Session created.');
    }
}

test();
