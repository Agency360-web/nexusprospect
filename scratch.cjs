const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.vdwhijmbelfnmpodpptn:Conecta7%40senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?options=-c%20search_path%3Dpublic',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');
    
    const campaignId = '82606975-d11f-40e1-af5f-3e34ddd77c25';
    
    const campRes = await client.query("SELECT id, name, status FROM campaigns WHERE id = $1", [campaignId]);
    console.log('Campaign Info:', campRes.rows);
    
    const msgRes = await client.query("SELECT status, count(*) FROM campaign_messages WHERE campaign_id = $1 GROUP BY status", [campaignId]);
    console.log('Message stats for ID:', msgRes.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
