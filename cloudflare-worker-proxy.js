/**
 * Cloudflare Worker — Proxy de Webhook para Supabase Edge Function
 * 
 * Este worker recebe requisições em:
 *   https://conectalab.sbs/webhook/leads?key=NEXUS-XXXXXXXXX
 * 
 * E encaminha para:
 *   https://vdwhijmbelfnmpodpptn.supabase.co/functions/v1/webhook-leads?key=NEXUS-XXXXXXXXX
 * 
 * O domínio Supabase nunca é exposto ao usuário final.
 */

const SUPABASE_FUNCTION_URL = 'https://vdwhijmbelfnmpodpptn.supabase.co/functions/v1/webhook-leads';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkd2hpam1iZWxmbm1wb2RwcHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzOTc0NjcsImV4cCI6MjA4Mzk3MzQ2N30.NYn2CJ6ht2kAtz6Gk79kX3yNZjPzAehBS4Uh84JrfUQ';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Só aceita requests no path /webhook/leads
    if (!url.pathname.startsWith('/webhook/leads')) {
      return new Response('Not Found', { status: 404 });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Montar a URL de destino preservando query params (?key=NEXUS-XXXXX)
    const targetUrl = `${SUPABASE_FUNCTION_URL}${url.search}`;

    // Criar headers para a requisição ao Supabase (inclui autenticação)
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    proxyHeaders.set('apikey', SUPABASE_ANON_KEY);
    proxyHeaders.set('Content-Type', 'application/json');

    // Clonar a request original e encaminhar para o Supabase
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    });

    // Enviar e retornar a resposta do Supabase
    const response = await fetch(proxyRequest);

    // Copiar a resposta mas adicionar CORS headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
