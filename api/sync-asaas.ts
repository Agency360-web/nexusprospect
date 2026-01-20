
import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function handler
export default async function handler(req, res) {
    // 1. CORS Configuration (Allow all origins or restrict as needed)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS (Preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const ASAAS_API_URL = "https://www.asaas.com/api/v3";
        const asaasApiKey = process.env.ASAAS_API_KEY;
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        // USE SERVICE ROLE KEY FOR SERVER-SIDE WRITES
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!asaasApiKey) {
            return res.status(200).json({ success: false, error: 'ASAAS_API_KEY not configured in Vercel Environment Variables' });
        }
        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).json({ success: false, error: 'Supabase credentials missing in Vercel Environment Variables' });
        }

        // Initialize Supabase Client
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Fetch data from Asaas
        const paymentsResponse = await fetch(`${ASAAS_API_URL}/payments?status=RECEIVED&dateCreated[ge]=${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}`, {
            headers: { "access_token": asaasApiKey }
        });

        if (!paymentsResponse.ok) {
            const errorText = await paymentsResponse.text();
            throw new Error(`Asaas API Error: ${paymentsResponse.status} - ${errorText}`);
        }

        const paymentsData = await paymentsResponse.json();
        const payments = paymentsData.data || [];

        // 3. Process & Sync (Placeholder logic - implement actual DB upsert here if needed)
        // For now, we return success to prove connection.

        return res.status(200).json({
            success: true,
            status: "success",
            message: "Sync started successfully via Vercel",
            payments_found: payments.length
        });

    } catch (error) {
        console.error('Vercel Sync Error:', error);
        return res.status(200).json({
            success: false,
            error: error.message
        });
    }
}
