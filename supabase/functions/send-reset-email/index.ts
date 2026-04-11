import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-mail é obrigatório.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 1. Use Service Role to generate a password recovery link
    //    This does NOT send any email — it just returns the magic link.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://www.nexusprospect.com.br/#/reset-password',
      },
    })

    if (linkError) {
      // If user not found, respond generically to avoid user enumeration attack
      console.error('generateLink error:', linkError.message)
      return new Response(
        JSON.stringify({ success: true }), // Always return success to avoid exposing valid emails
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const resetLink = linkData.properties?.action_link

    if (!resetLink) {
      throw new Error('Não foi possível gerar o link de recuperação.')
    }

    // 2. Send email via Resend API
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Nexus Prospect <noreply@nexusprospect.com.br>',
        to: [email],
        subject: 'Redefinição de Senha — Nexus Prospect',
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background-color:#0a0a0a;padding:32px 40px;text-align:center;">
                        <span style="font-size:24px;font-weight:900;color:#FFD700;letter-spacing:-0.5px;">NEXUS</span>
                        <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;"> PROSPECT</span>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:40px 40px 32px;">
                        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0f172a;">Redefinição de senha</h1>
                        <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                          Recebemos uma solicitação para redefinir a senha da sua conta Nexus Prospect associada a <strong style="color:#0f172a;">${email}</strong>.
                        </p>
                        <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
                          Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong style="color:#0f172a;">1 hora</strong>.
                        </p>

                        <!-- CTA Button -->
                        <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                          <tr>
                            <td style="background-color:#FFD700;border-radius:12px;">
                              <a href="${resetLink}" 
                                 style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:700;color:#000000;text-decoration:none;letter-spacing:0.2px;">
                                Redefinir minha senha →
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Security notice -->
                        <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;">
                          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
                            🔒 Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.
                          </p>
                        </div>

                        <p style="margin:24px 0 0;font-size:12px;color:#cbd5e1;line-height:1.5;">
                          Ou copie e cole este link no seu navegador:<br>
                          <a href="${resetLink}" style="color:#94a3b8;word-break:break-all;">${resetLink}</a>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#94a3b8;">
                          © 2026 Nexus Prospect — Todos os direitos reservados.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text()
      console.error('Resend error:', errorBody)
      throw new Error(`Falha ao enviar e-mail: ${errorBody}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail de recuperação enviado com sucesso.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('send-reset-email error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno ao processar a solicitação.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
