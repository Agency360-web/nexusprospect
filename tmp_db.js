const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:Conecta7%40senha@db.vdwhijmbelfnmpodpptn.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  
  console.log("Searching for FS Assados...");
  const res1 = await client.query(`SELECT id, name, status FROM campaigns WHERE name ILIKE '%FS Assados%'`);
  if (res1.rows.length === 0) {
    console.log("No campaign found.");
    await client.end();
    return;
  }
  
  const campaign = res1.rows[0];
  console.log(`Campaign Found: ID = ${campaign.id}, Name = ${campaign.name}, Status = ${campaign.status}`);
  
  const res2 = await client.query(`
    SELECT status, COUNT(*) 
    FROM campaign_messages 
    WHERE campaign_id = $1 
    GROUP BY status
  `, [campaign.id]);
  
  console.log(`\n--- RELATÓRIO DA CAMPANHA ---`);
  console.log(`ID da Campanha: ${campaign.id}`);
  
  if (res2.rows.length === 0) {
    console.log("Nenhum disparo foi registrado no banco até o momento na tabela campaign_messages para este ID.");
  } else {
    let total = 0;
    res2.rows.forEach(r => {
      console.log(`Status '${r.status}': ${r.count} leads`);
      total += parseInt(r.count);
    });
    console.log(`Total de leads vinculados na tabela: ${total}`);
  }
  
  await client.end();
}

run().catch(console.error);
