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
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${apiUrl}${path}`
  const headers: Record<string, string> = {
    'apikey': apiKey,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  try {
    const res = await fetch(url, { ...options, headers })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    return { ok: res.ok, status: res.status, data }
  } catch (error) {
    console.error('Evolution API call failed:', error)
    return { ok: false, status: 0, data: { error: String(error) } }
  }
}

// ─── Extract QR code from various Evolution API response formats ─────────────
function extractQRCode(data: any): string | null {
  if (data?.qrcode?.base64) return data.qrcode.base64
  if (data?.qrcode?.code) return data.qrcode.code
  if (typeof data?.qrcode === 'string') return data.qrcode
  if (data?.base64) return data.base64
  if (data?.code) return data.code
  return null
}

// ─── Extract live state from Evolution API response ──────────────────────────
function extractLiveState(data: any): string {
  if (data?.instance?.state) return data.instance.state
  if (data?.state) return data.state
  return 'close'
}

// ─── Main Handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: Extract user from JWT ──────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Client with user's JWT to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service role client for DB operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // ── Evolution API config ─────────────────────────────────────────────
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Evolution API não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Route by action param ────────────────────────────────────────────
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'
    const userId = user.id

    // Parse body if method is POST/DELETE
    let body: any = {}
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.json()
      } catch {
        // Body might be empty
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTION: status — List all connections for user
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'status') {
      const { data: connections, error: dbError } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (dbError) {
        console.error('DB error:', dbError)
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao consultar banco de dados' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If no connections, return empty list
      if (!connections || connections.length === 0) {
        return new Response(
          JSON.stringify({ exists: false, connections: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Sync status with Evolution API for EACH connection
      // We do this in parallel to be faster
      const updatedConnections = await Promise.all(connections.map(async (conn) => {
        let liveState = 'close'
        const evoResult = await callEvolution(
          `/instance/connectionState/${conn.instance}`,
          evolutionApiUrl,
          evolutionApiKey
        )

        if (evoResult.ok) {
          liveState = extractLiveState(evoResult.data)

          // Update DB status if changed
          const newStatus = liveState === 'open' ? 'connected' : (liveState === 'connecting' ? 'connecting' : 'pending')
          if (newStatus !== conn.status) {
             // Fire and forget update to not block response too much
             supabaseAdmin
              .from('whatsapp_connections')
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq('id', conn.id)
              .then(({ error }) => { if (error) console.error('Failed to update status', error) })
             
             // Update local object to return correct state immediately
             conn.status = newStatus
          }
        }
        
        return {
          ...conn,
          live_state: liveState
        }
      }))

      return new Response(
        JSON.stringify({
          exists: true,
          connections: updatedConnections
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTION: create — Create a new WhatsApp instance (Limit 4)
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'create') {
      // 1. Check current count
      const { count, error: countError } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (countError) {
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao verificar conexões existentes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (count !== null && count >= 4) {
        return new Response(
          JSON.stringify({ success: false, message: 'Limite de 4 conexões por usuário atingido.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 2. Generate Unique Instance Name
      // Logic: user-{userId}-{shortRandom} to ensure uniqueness
      const shortRandom = Math.random().toString(36).substring(2, 6)
      const instanceName = `user-${userId}-${shortRandom}`

      // 3. Create instance in Evolution API
      const evoResult = await callEvolution(
        '/instance/create',
        evolutionApiUrl,
        evolutionApiKey,
        {
          method: 'POST',
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        }
      )

      if (!evoResult.ok && evoResult.status !== 200 && evoResult.status !== 201) {
        console.error('Evolution create failed:', evoResult)
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Erro ao criar instância na Evolution API',
            debug: evoResult.data,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const qrcodeBase64 = extractQRCode(evoResult.data)

      // 4. Save to DB
      const { error: insertError } = await supabaseAdmin
        .from('whatsapp_connections')
        .insert({
          user_id: userId,
          instance: instanceName,
          status: 'pending',
          qrcode: qrcodeBase64,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('DB insert error:', insertError)
        // Rollback: try to delete created instance
        await callEvolution(`/instance/delete/${instanceName}`, evolutionApiUrl, evolutionApiKey, { method: 'DELETE' })
        
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao salvar conexão no banco' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          instance: instanceName,
          qrcode: qrcodeBase64,
          message: 'Nova conexão criada! Escaneie o QR Code.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTION: delete — Remove specific WhatsApp instance
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'delete') {
      const instanceToDelete = body.instanceName || url.searchParams.get('instanceName')

      if (!instanceToDelete) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome da instância obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify ownership
      const { data: connection } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('id, instance')
        .eq('user_id', userId)
        .eq('instance', instanceToDelete)
        .maybeSingle()

      if (!connection) {
        return new Response(
          JSON.stringify({ success: false, message: 'Conexão não encontrada ou não pertence a você' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete from Evolution API (best effort)
      await callEvolution(
        `/instance/delete/${instanceToDelete}`,
        evolutionApiUrl,
        evolutionApiKey,
        { method: 'DELETE' }
      )

      // Delete from DB
      const { error: deleteError } = await supabaseAdmin
        .from('whatsapp_connections')
        .delete()
        .eq('id', connection.id)

      if (deleteError) {
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao remover do banco' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Conexão removida com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTION: qr — Get fresh QR code for specific instance
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'qr') {
      const instanceToRefresh = body.instanceName || url.searchParams.get('instanceName')
      
      if (!instanceToRefresh) {
        // Fallback: if user has only one connection, use that one (for backward compatibility if needed)
        // But for multiple support, we should require it.
        // Let's try to find the most recent 'pending' or 'connecting' one if not provided
        const { data: latest } = await supabaseAdmin
          .from('whatsapp_connections')
          .select('instance')
          .eq('user_id', userId)
          .neq('status', 'connected') // Only want disconnected ones
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          
        if (!latest) {
             return new Response(
            JSON.stringify({ success: false, message: 'Especifique a instância ou não há conexões pendentes.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        // Use the found one
      }
      
      const targetInstance = instanceToRefresh 

      // Verify ownership
      const { data: connection } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('id, instance')
        .eq('user_id', userId)
        .eq('instance', targetInstance)
        .maybeSingle()

      if (!connection) {
        return new Response(
          JSON.stringify({ success: false, message: 'Conexão não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Request new QR from Evolution API
      const evoResult = await callEvolution(
        `/instance/connect/${targetInstance}`,
        evolutionApiUrl,
        evolutionApiKey
      )

      if (!evoResult.ok) {
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao comunicar com Evolution API', debug: evoResult.data }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const qrcodeBase64 = extractQRCode(evoResult.data)

      if (qrcodeBase64) {
        // Update DB
        await supabaseAdmin
          .from('whatsapp_connections')
          .update({ qrcode: qrcodeBase64, updated_at: new Date().toISOString() })
          .eq('id', connection.id)

        return new Response(
          JSON.stringify({ success: true, qrcode: qrcodeBase64, instance: targetInstance }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ success: false, message: 'QR Code não disponível. A instância pode já estar conectada.', data: evoResult.data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── Unknown action ───────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ success: false, message: `Ação desconhecida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
