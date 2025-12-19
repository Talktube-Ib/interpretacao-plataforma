
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tqfswjzzhgzrgezeekpv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnN3anp6aGd6cmdlemVla3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI4NjQsImV4cCI6MjA4MTY0ODg2NH0.8En12vGguTvbXUfQRIZgG_FYfzM-psgdNJFET4ZfjY8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking connection...');
    const { data, error } = await supabase.from('meetings').select('*').limit(1);

    if (error) {
        console.error('Error connecting:', error);
    } else {
        console.log('Connection successful. Data:', data);
    }
}

check();
