import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vdwhijmbelfnmpodpptn.supabase.co';
const supabaseKey = 'sb_publishable_3oXn9vwEMcq4EyUQEaqj4A_FkltJ8xv';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name');

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Campaigns seen with anon key:', data);
  }
}

run();
