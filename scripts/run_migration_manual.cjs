const { Client } = require('pg');

// Connection string from backend/.env
const client = new Client({
    connectionString: "postgres://postgres:Conecta7%40senha@db.vdwhijmbelfnmpodpptn.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- Add columns if they don't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_site text;

-- Backfill data from custom_fields
UPDATE leads 
SET company = custom_fields->>'empresa' 
WHERE company IS NULL AND custom_fields->>'empresa' IS NOT NULL;

UPDATE leads 
SET company_site = custom_fields->>'site' 
WHERE company_site IS NULL AND custom_fields->>'site' IS NOT NULL;
`;

(async () => {
    try {
        await client.connect();
        console.log('Connected to database.');
        await client.query(sql);
        console.log('Migration successfully applied!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
})();
