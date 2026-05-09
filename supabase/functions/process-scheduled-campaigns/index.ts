import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const WEBHOOK_BASE_URL = Deno.env.get('WEBHOOK_BASE_URL') || 'https://nexus360.infra-conectamarketing.site/webhook'
const CAMPAIGN_DISPATCH_WEBHOOK = `${WEBHOOK_BASE_URL}/nexus-disparos`

// UAZAPI Base (in case we need to fetch media directly if not stored locally, though here media is a URL)
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://nexus-360.uazapi.com'

serve(async (req) => {
    // Basic Security: Require POST method or auth header
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    // In pg_cron, headers might not be present unless configured, but for direct REST calls we enforce it.
    if (authHeader && authHeader !== `Bearer ${serviceRoleKey}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey ?? ''
        )

        // 1. Fetch campaigns with status 'scheduled'
        const { data: campaigns, error: campError } = await supabaseAdmin
            .from('campaigns')
            .select('*')
            .eq('status', 'scheduled')

        if (campError) {
            throw new Error(`Error fetching scheduled campaigns: ${campError.message}`)
        }

        if (!campaigns || campaigns.length === 0) {
            return new Response(JSON.stringify({ message: "No scheduled campaigns found" }), { headers: { "Content-Type": "application/json" } })
        }

        const now = new Date()
        let processedCount = 0

        for (const campaign of campaigns) {
            const config = campaign.configuration || {}
            if (!config.scheduledAt) continue

            const scheduledDate = new Date(config.scheduledAt)
            
            // Se o tempo de agendamento já passou (ou é exatamente agora), processar
            if (scheduledDate <= now) {
                console.log(`Processing scheduled campaign: ${campaign.id} for user: ${campaign.user_id}`)

                // 2. Fetch connections para o usuário dono da campanha
                const { data: userConnections, error: connErr } = await supabaseAdmin
                    .from('whatsapp_connections')
                    .select('*')
                    .eq('user_id', campaign.user_id)

                if (connErr) {
                    console.error(`Error fetching connections for user ${campaign.user_id}:`, connErr)
                    continue
                }

                const activeConnections = (userConnections || []).filter((c: any) => c.status === 'connected' || c.status === 'open')

                if (activeConnections.length === 0) {
                    // Instância Desconectada!
                    // Marcar a campanha com erro ou log.
                    await supabaseAdmin
                        .from('campaigns')
                        .update({ status: 'cancelled', configuration: { ...config, error: 'Todas as instâncias estão desconectadas no momento do agendamento.' } })
                        .eq('id', campaign.id)
                    continue
                }

                // 3. Validação e Seleção de Instância
                let instancesData;
                if (config.campaignType === 'multi-ai') {
                    // Try to use originally selected
                    instancesData = (config.selectedConnections || []).map((inst: string) => {
                        const conn = activeConnections.find((c: any) => c.instance === inst);
                        if (!conn) return null;
                        return {
                            instance: inst,
                            token: conn.token || null,
                            profileName: conn.profile_name || inst,
                            phoneNumber: conn.phone_number || null,
                        };
                    }).filter(Boolean);

                    // If NO instances are available from the selected ones, fallback to first active
                    if (instancesData.length === 0) {
                        instancesData = [{
                            instance: activeConnections[0].instance,
                            token: activeConnections[0].token || null,
                            profileName: activeConnections[0].profile_name || activeConnections[0].instance,
                            phoneNumber: activeConnections[0].phone_number || null,
                        }];
                    }
                } else {
                    // Single instance
                    let connToUse = activeConnections.find((c: any) => c.instance === config.selectedConnection);
                    if (!connToUse) {
                        console.log(`Original connection ${config.selectedConnection} disconnected. Falling back to ${activeConnections[0].instance}`)
                        connToUse = activeConnections[0];
                    }
                    instancesData = [{
                        instance: connToUse.instance,
                        token: connToUse.token || null,
                        profileName: connToUse.profile_name || connToUse.instance,
                        phoneNumber: connToUse.phone_number || null,
                    }];
                }

                // 4. Handle media
                let fileBase64 = null;
                if (config.mediaUrl) {
                    try {
                        const response = await fetch(config.mediaUrl);
                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                        fileBase64 = `data:${blob.type || config.mediaType || 'application/octet-stream'};base64,${base64}`;
                    } catch (err) {
                        console.error(`Erro ao converter mediaUrl para base64 (Campanha ${campaign.id}):`, err);
                    }
                }

                const payload = {
                    campaignType: config.campaignType,
                    name: campaign.name,
                    minDelay: config.minDelay,
                    maxDelay: config.maxDelay,
                    messageDelay: config.messageDelay,
                    messageText: config.messageText,
                    selectedLeads: config.fullSelectedLeads || [],
                    clientId: config.clientId,
                    folderId: config.folderId || null,
                    folderName: config.folderName || 'Todas as Pastas',
                    userId: campaign.user_id,
                    campaignId: campaign.id,
                    file: fileBase64,
                    mimetype: config.mediaType || null,
                    fileName: config.mediaName || null,
                    instance: instancesData[0]?.instance,
                    instanceToken: instancesData[0]?.token,
                    instances: instancesData,
                    instanceCount: instancesData.length,
                };

                // 5. Update Status
                await supabaseAdmin
                    .from('campaigns')
                    .update({ 
                        status: 'active', 
                        configuration: { 
                            ...config, 
                            selectedConnection: instancesData[0]?.instance,
                            dispatchedVia: 'automated_scheduler'
                        } 
                    })
                    .eq('id', campaign.id);

                // 6. Dispatch Webhook
                try {
                    await fetch(CAMPAIGN_DISPATCH_WEBHOOK, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });
                    console.log(`Webhook disparado para campanha: ${campaign.id}`);
                } catch (webhookErr) {
                    console.error(`Erro ao disparar webhook para campanha ${campaign.id}:`, webhookErr);
                }

                processedCount++;
            }
        }

        return new Response(JSON.stringify({ 
            message: `Processed ${processedCount} scheduled campaigns`,
            processed: processedCount
        }), { headers: { "Content-Type": "application/json" } })

    } catch (error) {
        console.error('Edge Function error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal Server Error' }),
            { headers: { 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
