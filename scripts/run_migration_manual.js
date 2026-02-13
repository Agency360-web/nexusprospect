const { Client } = require('pg');

const client = new Client({
    connectionString: "postgres://postgres:Conecta7%40senha@db.vdwhijmbelfnmpodpptn.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

const sql = `
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_site text;
`;

(async () => {
    try {
        await client.connect();
        await client.query(sql);
        console.log('Migration successfully applied!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
})();
