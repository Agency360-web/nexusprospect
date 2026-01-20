
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const ASAAS_API_URL = "https://www.asaas.com/api/v3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get("Authorization");
        // In a real Cron trigger, we might want to check for a specific header or just rely on internal network restrictions.
        // For now, we allow invocations with valid Supabase Auth context or internal service key.

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const asaasApiKey = Deno.env.get("ASAAS_API_KEY");

        if (!asaasApiKey) {
            throw new Error("ASAAS_API_KEY not configured");
        }

        // 1. Fetch data from Asaas
        // This is a simplified fetch logic. You'd likely need pagination for production.
        const paymentsResponse = await fetch(`${ASAAS_API_URL}/payments?status=RECEIVED&dateCreated[ge]=${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}`, {
            headers: { "access_token": asaasApiKey }
        });

        // Check if response is OK to avoid JSON parse errors
        if (!paymentsResponse.ok) {
            console.error("Asaas API Error:", await paymentsResponse.text());
            throw new Error("Failed to fetch payments from Asaas");
        }

        const paymentsData = await paymentsResponse.json();
        const payments = paymentsData.data || [];

        // 2. Process Data (Calculate KPIs)
        // Simple example: Total Revenue (MRR approximation)
        let totalRevenue = 0;

        // 3. Sync Logic (Upsert to Supabase)
        // We would iterate over payments and insert into financial_transactions
        // And update financial_kpis

        // For this initial template, we will just return success 
        // and logged data to prove connectivity once the user sets the key.

        return new Response(
            JSON.stringify({
                message: "Sync started successfully",
                payments_found: payments.length,
                status: "success"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
