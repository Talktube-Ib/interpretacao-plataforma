const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tqfswjzzhgzrgezeekpv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnN3anp6aGd6cmdlemVla3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI4NjQsImV4cCI6MjA4MTY0ODg2NH0.8En12vGguTvbXUfQRIZgG_FYfzM-psgdNJFET4ZfjY8');

async function run() {
    const { data, error } = await supabase.from('profiles').select('languages').limit(1);
    if (error) {
        console.log('Error selecting languages:', error.message);
    } else {
        console.log('Languages column exists. Sample data:', data);
    }
}
run();
