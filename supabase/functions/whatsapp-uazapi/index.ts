import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://nexus-360.uazapi.com'
const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN') || ''

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Authenticate user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) {
            return new Response(
                JSON.stringify({ error: 'Não autorizado' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Admin Supabase client for DB operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Parse action from body
        const body = req.method === 'DELETE' ? {} : await req.json()
        const { action, connection_id, phone } = body as {
            action?: string;
            connection_id?: number;
            phone?: string;
        }

        // ============================
        // ACTION: CREATE INSTANCE
        // ============================
        if (action === 'create') {
            // Check instance limit
            const { data: existing, error: countErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .select('id, plan_limit')
                .eq('user_id', user.id)

            if (countErr) throw new Error(`Erro ao verificar conexões: ${countErr.message}`)

            const planLimit = existing?.[0]?.plan_limit || 1
            if (existing && existing.length >= planLimit) {
                return new Response(
                    JSON.stringify({ error: `Limite de ${planLimit} instância(s) atingido. Exclua uma conexão existente ou faça upgrade do plano.` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
                )
            }

            // Create instance on Uazapi
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            const randomCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            const instanceName = `nexus360-${randomCode}`

            const uazapiRes = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'admintoken': UAZAPI_ADMIN_TOKEN,
                },
                body: JSON.stringify({
                    name: instanceName,
                    systemName: 'nexus360',
                }),
            })

            if (!uazapiRes.ok) {
                const errorText = await uazapiRes.text()
                throw new Error(`Uazapi create error: ${uazapiRes.status} - ${errorText}`)
            }

            const uazapiData = await uazapiRes.json()

            // Persist in DB
            const { data: dbRecord, error: insertErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .insert({
                    user_id: user.id,
                    instance: instanceName,
                    instance_id: uazapiData.instance?.id || null,
                    token: uazapiData.token || uazapiData.instance?.token || null,
                    server_url: UAZAPI_BASE_URL,
                    status: 'disconnected',
                    plan_limit: planLimit,
                })
                .select()
                .single()

            if (insertErr) throw new Error(`DB insert error: ${insertErr.message}`)

            return new Response(
                JSON.stringify({ success: true, connection: dbRecord, uazapi: uazapiData }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ============================
        // ACTION: CONNECT (QR CODE)
        // ============================
        if (action === 'connect') {
            if (!connection_id) {
                return new Response(
                    JSON.stringify({ error: 'connection_id é obrigatório' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            // Get connection from DB
            const { data: conn, error: connErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .select('*')
                .eq('id', connection_id)
                .eq('user_id', user.id)
                .single()

            if (connErr || !conn) {
                return new Response(
                    JSON.stringify({ error: 'Conexão não encontrada' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }

            // Call Uazapi connect
            const connectBody: Record<string, string> = {}
            if (phone) connectBody.phone = phone

            const uazapiRes = await fetch(`${UAZAPI_BASE_URL}/instance/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'token': conn.token,
                },
                body: JSON.stringify(connectBody),
            })

            if (!uazapiRes.ok) {
                const errorText = await uazapiRes.text()
                throw new Error(`Uazapi connect error: ${uazapiRes.status} - ${errorText}`)
            }

            const uazapiData = await uazapiRes.json()

            // Update status in DB
            await supabaseAdmin
                .from('whatsapp_connections')
                .update({
                    status: uazapiData.instance?.status || 'connecting',
                    qrcode: uazapiData.instance?.qrcode || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', connection_id)

            return new Response(
                JSON.stringify({
                    success: true,
                    qrcode: uazapiData.instance?.qrcode || null,
                    paircode: uazapiData.instance?.paircode || null,
                    status: uazapiData.instance?.status || 'connecting',
                    instance: uazapiData.instance,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ============================
        // ACTION: STATUS (LIVE CHECK)
        // ============================
        if (action === 'status') {
            if (!connection_id) {
                return new Response(
                    JSON.stringify({ error: 'connection_id é obrigatório' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            const { data: conn, error: connErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .select('*')
                .eq('id', connection_id)
                .eq('user_id', user.id)
                .single()

            if (connErr || !conn) {
                return new Response(
                    JSON.stringify({ error: 'Conexão não encontrada' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }

            // Fetch live status from Uazapi
            const uazapiRes = await fetch(`${UAZAPI_BASE_URL}/instance/status`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'token': conn.token,
                },
            })

            if (!uazapiRes.ok) {
                // Return DB status as fallback
                return new Response(
                    JSON.stringify({
                        success: true,
                        live_status: conn.status,
                        fallback: true,
                        connection: conn,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }

            const uazapiData = await uazapiRes.json()
            const liveStatus = uazapiData.instance?.status || uazapiData.status || conn.status

            // Update DB with live data
            const updatePayload: Record<string, unknown> = {
                status: liveStatus,
                updated_at: new Date().toISOString(),
            }

            if (uazapiData.instance?.profileName) {
                updatePayload.profile_name = uazapiData.instance.profileName
            }
            if (uazapiData.instance?.profilePicUrl) {
                updatePayload.profile_pic_url = uazapiData.instance.profilePicUrl
            }
            if (uazapiData.instance?.owner) {
                updatePayload.phone_number = uazapiData.instance.owner
            }

            await supabaseAdmin
                .from('whatsapp_connections')
                .update(updatePayload)
                .eq('id', connection_id)

            return new Response(
                JSON.stringify({
                    success: true,
                    live_status: liveStatus,
                    connection: { ...conn, ...updatePayload },
                    instance: uazapiData.instance || uazapiData,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ============================
        // ACTION: DISCONNECT
        // ============================
        if (action === 'disconnect') {
            if (!connection_id) {
                return new Response(
                    JSON.stringify({ error: 'connection_id é obrigatório' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            const { data: conn, error: connErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .select('*')
                .eq('id', connection_id)
                .eq('user_id', user.id)
                .single()

            if (connErr || !conn) {
                return new Response(
                    JSON.stringify({ error: 'Conexão não encontrada' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }

            const uazapiRes = await fetch(`${UAZAPI_BASE_URL}/instance/disconnect`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'token': conn.token,
                },
            })

            if (!uazapiRes.ok) {
                const errorText = await uazapiRes.text()
                throw new Error(`Uazapi disconnect error: ${uazapiRes.status} - ${errorText}`)
            }

            // Update DB
            await supabaseAdmin
                .from('whatsapp_connections')
                .update({
                    status: 'disconnected',
                    qrcode: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', connection_id)

            return new Response(
                JSON.stringify({ success: true, status: 'disconnected' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ============================
        // ACTION: DELETE
        // ============================
        if (action === 'delete') {
            if (!connection_id) {
                return new Response(
                    JSON.stringify({ error: 'connection_id é obrigatório' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            const { data: conn, error: connErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .select('*')
                .eq('id', connection_id)
                .eq('user_id', user.id)
                .single()

            if (connErr || !conn) {
                return new Response(
                    JSON.stringify({ error: 'Conexão não encontrada' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                )
            }

            // Delete from Uazapi
            const uazapiRes = await fetch(`${UAZAPI_BASE_URL}/instance`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'token': conn.token,
                },
            })

            // Even if Uazapi fails, remove from DB
            if (!uazapiRes.ok) {
                console.error('Uazapi delete failed, removing from DB anyway:', await uazapiRes.text())
            }

            const { error: deleteErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .delete()
                .eq('id', connection_id)
                .eq('user_id', user.id)

            if (deleteErr) throw new Error(`DB delete error: ${deleteErr.message}`)

            return new Response(
                JSON.stringify({ success: true, message: 'Instância removida com sucesso' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // ============================
        // ACTION: LIST (user's connections)
        // ============================
        if (action === 'list') {
            const { data: connections, error: listErr } = await supabaseAdmin
                .from('whatsapp_connections')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })

            if (listErr) throw new Error(`List error: ${listErr.message}`)

            return new Response(
                JSON.stringify({ success: true, connections: connections || [], plan_limit: connections?.[0]?.plan_limit || 1 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // Unknown action
        return new Response(
            JSON.stringify({ error: `Ação desconhecida: ${action}. Ações válidas: create, connect, disconnect, delete, status, list` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )

    } catch (error) {
        console.error('WhatsApp Uazapi Edge Function error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
