import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    try {
        const payload = await req.json();
        const eventType = payload.event;
        const body = payload.data;

        console.log(`Received event: ${eventType}`, JSON.stringify(body));

        if (eventType === "MESSAGES_UPSERT") {
            const message = body.messages[0];
            if (!message) return new Response("OK");

            const chatId = message.key.remoteJid;
            const fromMe = message.key.fromMe;
            const text = message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                (message.message?.imageMessage ? "[Imagem]" : "[Mídia]");
            const timestamp = new Date(message.messageTimestamp * 1000).toISOString();
            const type = message.message?.imageMessage ? "image" :
                message.message?.audioMessage ? "audio" :
                    message.message?.videoMessage ? "video" :
                        message.message?.documentMessage ? "document" : "text";

            // Identify the client based on the instance name or a custom parameter
            // For this implementation, we assume the instance name matches our client id or we search by matching instance_url
            // Note: In a production environment, you'd pass a clientId in the webhook URL or map it.

            const { data: client } = await supabase
                .from('clients')
                .select('id')
                .eq('whatsapp_instance_url', payload.instanceUrl) // This assumes payload has instanceUrl or you extract it
                .single();

            if (!client) {
                console.error("Client not found for instance:", payload.instance);
                return new Response("Client not found", { status: 404 });
            }

            // 1. Update or Insert Chat
            await supabase.from('whatsapp_chats').upsert({
                id: chatId,
                client_id: client.id,
                name: message.pushName || chatId,
                last_message: text,
                unread_count: fromMe ? 0 : 1, // Basic logic for unread
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

            // 2. Insert Message
            await supabase.from('whatsapp_messages').insert({
                id: message.key.id,
                chat_id: chatId,
                client_id: client.id,
                text: text,
                type: type,
                from_me: fromMe,
                timestamp: timestamp,
                status: 'delivered'
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
