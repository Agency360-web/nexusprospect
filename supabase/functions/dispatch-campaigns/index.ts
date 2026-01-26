import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Hono } from "https://esm.sh/hono"

const app = new Hono()

app.all('*', async (c) => {
    console.log(`Resource requested: ${c.req.method} ${c.req.url}`)
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        // 1. Atomically pick campaigns using SELECT FOR UPDATE SKIP LOCKED
        // This prevents multiple function runs from processing the same campaign
        console.log('Fetching scheduled campaigns...')
        const { data: pickedCampaigns, error: pickError } = await supabase.rpc('pick_scheduled_campaigns')

        if (pickError) {
            console.error('RPC Error picking campaigns:', pickError)
            throw pickError
        }

        console.log(`Picked ${pickedCampaigns?.length || 0} campaigns.`)

        if (!pickedCampaigns || pickedCampaigns.length === 0) {
            return c.json({ status: 'no_campaigns' })
        }

        const results = []

        for (const campaign of pickedCampaigns) {
            try {
                // Fetch webhook config (robustly)
                const { data: webhooks, error: webhookError } = await supabase
                    .from('webhook_configs')
                    .select('*')
                    .eq('client_id', campaign.client_id)
                    .eq('active', true)
                    .eq('type', 'outbound') // Assuming outbound is for dispatches
                    .limit(1)

                const webhook = webhooks?.[0]

                if (!webhook) {
                    throw new Error(`No active outbound webhook found for client ${campaign.client_id}`)
                }

                // Fire Webhook
                const response = await fetch(webhook.url, {
                    method: webhook.method || 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(webhook.headers || {})
                    },
                    body: JSON.stringify(campaign.transmission_payload),
                    signal: AbortSignal.timeout(30000) // 30s timeout
                })

                if (!response.ok) {
                    throw new Error(`Webhook responded with ${response.status}: ${await response.text()}`)
                }

                // Mark as completed
                await supabase
                    .from('campaigns')
                    .update({ status: 'completed' })
                    .eq('id', campaign.id)

                results.push({ id: campaign.id, status: 'success' })

            } catch (err: any) {
                console.error(`Failed to dispatch campaign ${campaign.id}:`, err)

                // Mark as failed and log error
                await supabase
                    .from('campaigns')
                    .update({
                        status: 'failed',
                        error_log: err.message || String(err)
                    })
                    .eq('id', campaign.id)

                results.push({ id: campaign.id, status: 'failed', error: err.message })
            }
        }

        return c.json({ status: 'processed', results })

    } catch (err: any) {
        console.error('Fatal error in dispatch-campaigns:', err)
        return c.json({ error: err.message }, 500)
    }
})

serve(app.fetch)
