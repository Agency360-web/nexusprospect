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
        JSON.stringify({ success: false, message: 'Evolution API não configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY nos secrets do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Route by action param ────────────────────────────────────────────
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'
    const userId = user.id
    const instanceName = `user-${userId}`

    // ════════════════════════════════════════════════════════════════════════
    // ACTION: status — Check if user has a connection + live state
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'status') {
      const { data: connection, error: dbError } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (dbError) {
        console.error('DB error:', dbError)
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao consultar banco de dados' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!connection) {
        return new Response(
          JSON.stringify({ exists: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check live state from Evolution API
      let liveState = 'close'
      const evoResult = await callEvolution(
        `/instance/connectionState/${connection.instance}`,
        evolutionApiUrl,
        evolutionApiKey
      )

      if (evoResult.ok) {
        liveState = extractLiveState(evoResult.data)

        // Update DB status if changed
        const newStatus = liveState === 'open' ? 'connected' : (liveState === 'connecting' ? 'connecting' : 'pending')
        if (newStatus !== connection.status) {
          await supabaseAdmin
            .from('whatsapp_connections')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
        }
      }

      return new Response(
        JSON.stringify({
          exists: true,
          instance: connection.instance,
          status: connection.status,
          live_state: liveState,
          qrcode: connection.qrcode,
          created_at: connection.created_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTION: create — Create a new WhatsApp instance
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'create') {
      // Check if already exists in our DB (1 instance per user)
      const { data: existing } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({ success: false, message: 'Você já possui uma conexão ativa' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Try to delete any orphaned instance in Evolution API first (best effort)
      await callEvolution(
        `/instance/delete/${instanceName}`,
        evolutionApiUrl,
        evolutionApiKey,
        { method: 'DELETE' }
      )

      // Create instance in Evolution API
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

      // Save to DB
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
          message: 'Conexão criada! Escaneie o QR Code no seu WhatsApp.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTION: delete — Remove WhatsApp instance
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'delete') {
      // Get instance name from DB
      const { data: connection } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('instance')
        .eq('user_id', userId)
        .maybeSingle()

      if (!connection) {
        return new Response(
          JSON.stringify({ success: false, message: 'Conexão não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete from Evolution API (best effort)
      await callEvolution(
        `/instance/delete/${connection.instance}`,
        evolutionApiUrl,
        evolutionApiKey,
        { method: 'DELETE' }
      )

      // Delete from DB
      const { error: deleteError } = await supabaseAdmin
        .from('whatsapp_connections')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        console.error('DB delete error:', deleteError)
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
    // ACTION: qr — Get fresh QR code
    // ════════════════════════════════════════════════════════════════════════
    if (action === 'qr') {
      const { data: connection } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('instance')
        .eq('user_id', userId)
        .maybeSingle()

      if (!connection) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nenhuma conexão encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Request new QR from Evolution API
      const evoResult = await callEvolution(
        `/instance/connect/${connection.instance}`,
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
          .eq('user_id', userId)

        return new Response(
          JSON.stringify({ success: true, qrcode: qrcodeBase64 }),
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
