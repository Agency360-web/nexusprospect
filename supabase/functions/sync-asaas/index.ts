
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const ASAAS_API_URL = "https://www.asaas.com/api/v3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const asaasApiKey = Deno.env.get("ASAAS_API_KEY");

        // If key is missing, return success: false instead of crashing
        if (!asaasApiKey) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "ASAAS_API_KEY not configured in Supabase Secrets"
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
            );
        }

        // 1. Fetch data from Asaas
        const paymentsResponse = await fetch(`${ASAAS_API_URL}/payments?status=RECEIVED&dateCreated[ge]=${new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]}`, {
            headers: { "access_token": asaasApiKey }
        });

        if (!paymentsResponse.ok) {
            const errorText = await paymentsResponse.text();
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Asaas API Error: ${paymentsResponse.status} - ${errorText}`
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
            );
        }

        const paymentsData = await paymentsResponse.json();
        const payments = paymentsData.data || [];

        // 2. Process & Sync (Placeholder for now)

        return new Response(
            JSON.stringify({
                message: "Sync started successfully",
                payments_found: payments.length,
                status: "success",
                success: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
