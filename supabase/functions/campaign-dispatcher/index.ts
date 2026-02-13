import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helper: Call Evolution API ──────────────────────────────────────────────
async function callEvolution(
    path: string,
    apiUrl: string,
    apiKey: string,
    body: any = null
): Promise<{ ok: boolean; status: number; data: any }> {
    try {
        const url = `${apiUrl}${path}`
        const headers = {
            'apikey': apiKey,
            'Content-Type': 'application/json',
        }

        const options: RequestInit = {
            method: body ? 'POST' : 'GET',
            headers,
            body: body ? JSON.stringify(body) : undefined
        }

        const res = await fetch(url, options)
        const text = await res.text()
        let data: any
        try { data = JSON.parse(text) } catch { data = { raw: text } }

        return { ok: res.ok, status: res.status, data }
    } catch (error) {
        console.error('Evolution API call failed:', error)
        return { ok: false, status: 0, data: { error: String(error) } }
    }
}

// ─── Main Handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
        const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

        if (!evolutionApiUrl || !evolutionApiKey) {
            throw new Error('Evolution API not configured')
        }

        // Service role client to bypass RLS and read all campaigns
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Get Active Campaigns
        const { data: campaigns, error: campaignError } = await supabase
            .from('campanhas_disparo')
            .select('*')
            .eq('status', 'em_andamento')

        if (campaignError) throw campaignError

        const results = []

        // 2. Process each campaign
        for (const campaign of campaigns || []) {
            const instanceName = campaign.instancia_whatsapp // e.g., "user-uuid" or "instance_name"
            if (!instanceName) continue;

            // 3. Get Pending Leads (Batch size 5 to avoid timeouts)
            const { data: leads, error: leadsError } = await supabase
                .from('disparo_leads')
                .select('*')
                .eq('campanha_id', campaign.id)
                .eq('status', 'pendente')
                .limit(5)

            if (leadsError) {
                console.error(`Error fetching leads for campaign ${campaign.id}:`, leadsError)
                continue
            }

            if (!leads || leads.length === 0) {
                // No more leads? Mark campaign as completed? 
                // For now, let's check count. If total matches processed, mark done.
                // We'll skip auto-complete for now to keep logic simple.
                continue
            }

            // 4. Send messages
            for (const lead of leads) {
                // Mark as processing
                await supabase.from('disparo_leads').update({ status: 'processando' }).eq('id', lead.id)

                // Generate message (simple replacement for now)
                let message = campaign.mensagem_padrao || ''
                message = message.replace('{{nome}}', lead.nome_lead || '')
                message = message.replace('{{empresa}}', lead.empresa || '')

                // Send
                const result = await callEvolution(
                    `/message/sendText/${instanceName}`,
                    evolutionApiUrl,
                    evolutionApiKey,
                    {
                        number: lead.telefone, // Ensure format is correct (Evolution handles various formats usually)
                        text: message,
                        options: {
                            delay: 1200, // 1.2s delay simulated by API if supported, else we rely on our batching
                            presence: 'composing' // "typing..."
                        }
                    }
                )

                // Update Status
                if (result.ok) {
                    await supabase.from('disparo_leads').update({
                        status: 'enviado_padrao',
                        sent_at: new Date().toISOString(),
                        generated_message: message
                    }).eq('id', lead.id)

                    // Increment counter
                    await supabase.rpc('increment_campaign_counter', {
                        campaign_id: campaign.id,
                        field: 'enviados_padrao'
                    }).catch(async () => {
                        // Fallback if RPC doesn't exist: manual read-update (race condition risk but ok for mvp)
                        // Actually, let's just ignore counter update optimization for this step or do a raw update
                        const { data: c } = await supabase.from('campanhas_disparo').select('enviados_padrao').eq('id', campaign.id).single()
                        await supabase.from('campanhas_disparo').update({ enviados_padrao: (c?.enviados_padrao || 0) + 1 }).eq('id', campaign.id)
                    })

                    results.push({ lead: lead.id, status: 'sent' })
                } else {
                    await supabase.from('disparo_leads').update({
                        status: 'erro',
                        error_detail: JSON.stringify(result.data)
                    }).eq('id', lead.id)

                    // Increment error
                    const { data: c } = await supabase.from('campanhas_disparo').select('erros').eq('id', campaign.id).single()
                    await supabase.from('campanhas_disparo').update({ erros: (c?.erros || 0) + 1 }).eq('id', campaign.id)

                    results.push({ lead: lead.id, status: 'error', error: result.data })
                }
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length, details: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Dispatcher error:', error)
        return new Response(
            JSON.stringify({ success: false, error: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
