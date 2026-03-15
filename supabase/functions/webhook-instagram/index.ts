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
    const webhookKey = url.searchParams.get('key')

    if (!webhookKey) {
      return new Response(JSON.stringify({ error: 'Webhook key missing. Add ?key=YOUR_KEY to the URL.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find the user_id corresponding to the webhook_key
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('webhook_key', webhookKey)
      .single()

    if (profileError || !profile) {
      console.error('Invalid or not found webhook key:', webhookKey, profileError)
      return new Response(JSON.stringify({ error: 'Invalid or not found webhook key.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = profile.id

    // Parse payload
    const rawBody = await req.json()
    const payloadRoot = rawBody?.body || rawBody
    
    let itemsToProcess: any[] = []
    if (Array.isArray(payloadRoot.items)) {
      itemsToProcess = payloadRoot.items
    } else if (Array.isArray(payloadRoot)) {
      itemsToProcess = payloadRoot
    } else {
      itemsToProcess = [payloadRoot]
    }

    console.log(`[Instagram Webhook] Processing ${itemsToProcess.length} items for user ${userId}`)

    const leadsToInsert = itemsToProcess.map(item => {
      return {
        user_id: userId,
        username: item.username || '',
        full_name: item.full_name || '',
        biography: item.biography || '',
        external_url: item.external_url || '',
        follower_count: typeof item.follower_count === 'number' ? item.follower_count : (parseInt(item.follower_count) || null),
        following_count: typeof item.following_count === 'number' ? item.following_count : (parseInt(item.following_count) || null),
        public_email: item.public_email || item.email || '',
        public_phone_number: item.public_phone_number || item.contact_phone_number || item.phone || '',
        is_business_account: item.is_business_account === true || item.is_business === true,
        status: 'new'
      }
    })

    if (leadsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('leads_instagram')
        .insert(leadsToInsert)

      if (insertError) {
        throw new Error(`Error inserting leads into leads_instagram: ${insertError.message}`)
      }
    } else {
      throw new Error('No valid leads found in the payload.')
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully processed ${leadsToInsert.length} Instagram leads.`,
      count: leadsToInsert.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('[Instagram Webhook] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
