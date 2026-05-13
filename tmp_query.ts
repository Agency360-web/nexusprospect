import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Searching for campaign 'FS Assados'...");
  const { data: campaigns, error: campErr } = await supabase
    .from('campaigns')
    .select('id, name')
    .ilike('name', '%FS Assados%');

  if (campErr) {
    console.error("Error fetching campaigns:", campErr);
    return;
  }

  if (!campaigns || campaigns.length === 0) {
    console.log("No campaigns found with that name.");
    return;
  }

  const campaignId = campaigns[0].id;
  console.log(`Found campaign: ${campaigns[0].name} (ID: ${campaignId})`);

  console.log("Fetching leads from campaign_messages...");
  const { data: messages, error: msgErr } = await supabase
    .from('campaign_messages')
    .select('status')
    .eq('campaign_id', campaignId);

  if (msgErr) {
    console.error("Error fetching messages:", msgErr);
    return;
  }

  if (!messages || messages.length === 0) {
    console.log("No records found in campaign_messages for this campaign.");
    return;
  }

  const counts: Record<string, number> = {};
  messages.forEach(m => {
    counts[m.status] = (counts[m.status] || 0) + 1;
  });

  console.log(`Total leads in DB: ${messages.length}`);
  console.log("Status counts:", counts);
}

run();
