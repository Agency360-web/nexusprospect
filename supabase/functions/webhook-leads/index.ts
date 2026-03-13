import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const url = new URL(req.url)

    // Ler a webhook key da URL (ex: ?key=NEXUS-XXXXXXXXX)
    const webhookKey = url.searchParams.get('key')

    if (!webhookKey) {
      return new Response(JSON.stringify({ error: 'Webhook key ausente. Adicione ?key=SUA_CHAVE na URL.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Criar cliente Supabase com Service Role (bypassa RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar o user_id correspondente à webhook_key na tabela profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('webhook_key', webhookKey)
      .single()

    if (profileError || !profile) {
      console.error('Webhook key inválida ou não encontrada:', webhookKey, profileError)
      return new Response(JSON.stringify({ error: 'Webhook key inválida ou não encontrada.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = profile.id

    // Parse do body (Webhook Data)
    const rawBody = await req.json()
    const payloadRoot = rawBody?.body || rawBody
    
    // Normalizar para uma lista de itens
    let itemsToProcess: any[] = []
    const detectedSource = (payloadRoot.source || payloadRoot.origin || 'unknown').toLowerCase()

    if (Array.isArray(payloadRoot.items)) {
      itemsToProcess = payloadRoot.items
    } else if (Array.isArray(payloadRoot)) {
      itemsToProcess = payloadRoot
    } else {
      itemsToProcess = [payloadRoot]
    }

    console.log(`Processando ${itemsToProcess.length} itens. Origem detectada no root: ${detectedSource}`)

    const cnpjLeads: any[] = []
    const mapsLeads: any[] = []
    const instaLeads: any[] = []
    const results = []

    for (const item of itemsToProcess) {
      // Determinar a origem do item
      let itemSource = detectedSource || 'unknown'
      
      // Mapeamento de apelidos (aliases) conhecidos primeiramente
      if (itemSource.includes('cnpj') || itemSource.includes('cdd')) itemSource = 'cnpj'
      if (itemSource.includes('google_maps') || itemSource.includes('maps')) itemSource = 'google_maps'
      if (itemSource.includes('instagram') || itemSource.includes('insta')) itemSource = 'instagram'

      // Se a origem ainda não for uma das tabelas finais, tentamos detectar pelas chaves do item
      const knownTables = ['cnpj', 'google_maps', 'instagram']
      if (!knownTables.includes(itemSource)) {
        if (item.cnpj || item.razao_social) itemSource = 'cnpj'
        else if (item.title && (item.address || item.phone || item.website)) itemSource = 'google_maps'
        else if (item.username) itemSource = 'instagram'
      }
      
      console.log(`Item processado: ${itemSource} (detectado a partir de ${detectedSource})`)

      if (itemSource === 'cnpj') {
        cnpjLeads.push({
          user_id: userId,
          cnpj: item.cnpj || '',
          razao_social: item.razao_social || '',
          nome_fantasia: item.nome_fantasia || '',
          telefone: item.telefone || '',
          email: item.email || '',
          whatsapp: !!(item.whatsapp === true || item.whatsapp === 'true' || item.whatsapp === 1),
          logradouro: item.logradouro || item.address || '',
          numero: item.numero || '',
          complemento: item.complemento || '',
          bairro: item.bairro || '',
          municipio: item.municipio || item.city || '',
          uf: item.uf || item.state || '',
          cep: item.cep || '',
          cnae_principal: item.cnae_principal || '',
          situacao: item.situacao || '',
          status: 'new'
        })
      } else if (itemSource === 'google_maps') {
        mapsLeads.push({
          user_id: userId,
          title: item.title,
          category: item.category || '',
          address: item.address || '',
          city: item.city || '',
          neighborhood: item.neighborhood || '',
          phone: item.phone || item.phone_number || '',
          website: item.website || '',
          instagram: item.instagram || '',
          facebook: item.facebook || '',
          linkedin: item.linkedin || '',
          emails: Array.isArray(item.emails) ? item.emails : [],
          rating: typeof item.rating === 'number' ? item.rating : null,
          reviews_count: typeof item.reviews === 'number' ? item.reviews : null,
          status: 'new'
        })
      } else if (itemSource === 'instagram') {
        instaLeads.push({
          user_id: userId,
          username: item.username,
          full_name: item.full_name || '',
          follower_count: typeof item.follower_count === 'number' ? item.follower_count : null,
          following_count: typeof item.following_count === 'number' ? item.following_count : null,
          biography: item.biography || '',
          external_url: item.external_url || '',
          public_email: item.public_email || '',
          public_phone_number: item.public_phone_number || item.contact_phone_number || '',
          is_business_account: item.is_business_account === true,
          status: 'new'
        })
      } else {
        console.warn(`Item ignorado. Nenhuma correspondência para: ${JSON.stringify(Object.keys(item))}`)
      }
    }

    const summary = []

    if (cnpjLeads.length > 0) {
      console.log(`Executando insert bulk de ${cnpjLeads.length} leads em leads_cnpj`)
      const { error } = await supabaseClient.from('leads_cnpj').insert(cnpjLeads)
      if (error) throw new Error(`Erro ao inserir leads de CNPJ: ${error.message}`)
      summary.push(`${cnpjLeads.length} leads de CNPJ`)
    }

    if (mapsLeads.length > 0) {
      console.log(`Executando insert bulk de ${mapsLeads.length} leads em leads_google_maps`)
      const { error } = await supabaseClient.from('leads_google_maps').insert(mapsLeads)
      if (error) throw new Error(`Erro ao inserir leads de Google Maps: ${error.message}`)
      summary.push(`${mapsLeads.length} leads de Google Maps`)
    }

    if (instaLeads.length > 0) {
      console.log(`Executando insert bulk de ${instaLeads.length} leads em leads_instagram`)
      const { error } = await supabaseClient.from('leads_instagram').insert(instaLeads)
      if (error) throw new Error(`Erro ao inserir leads de Instagram: ${error.message}`)
      summary.push(`${instaLeads.length} leads de Instagram`)
    }

    if (summary.length === 0) {
      throw new Error(`Nenhum lead válido foi processado. Verifique o formato dos itens. Chaves do primeiro item: ${itemsToProcess.length > 0 ? Object.keys(itemsToProcess[0]).join(', ') : 'vazio'}`)
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Sucesso: ${summary.join(', ')}`,
      processed_count: itemsToProcess.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })


  } catch (error: any) {
    console.error('Erro na Edge Function webhook-leads:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
