import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xbaicwisrxzjbyiwfapa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYWljd2lzcnh6amJ5aXdmYXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5OTIzODksImV4cCI6MjA1MTU2ODM4OX0.3XpZlxHFWq04euiNJq0LZQytt4uTedWCb8vZDj-3xwo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
