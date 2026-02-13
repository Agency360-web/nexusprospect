import OpenAI from 'openai';

export class OpenAIService {
    static async generateMessage(
        apiKey: string,
        modelName: string,
        promptBase: string,
        leadData: { name: string; company?: string; phone?: string; site?: string },
        scrapedContent: string
    ): Promise<string | null> {
        try {
            const openai = new OpenAI({ apiKey });

            const finalPrompt = `
${promptBase}

---

DADOS DO LEAD:
- Nome: ${leadData.name || 'N/A'}
- Empresa: ${leadData.company || 'N/A'}
- Telefone: ${leadData.phone || 'N/A'}
- Site: ${leadData.site || 'N/A'}

CONTEÚDO EXTRAÍDO DO SITE DO LEAD:
${scrapedContent.substring(0, 15000)} 
(Conteúdo truncado se for muito longo)

---

Com base nessas informações, crie uma sequência de mensagens de WhatsApp altamente personalizadas para prospecção deste lead. Siga rigorosamente o formato e as instruções do prompt acima. A resposta deve conter APENAS o texto da mensagem a ser enviada, sem explicações adicionais.
      `;

            console.log(`[OpenAIService] Generating message using ${modelName}...`);
            const completion = await openai.chat.completions.create({
                messages: [{ role: 'user', content: finalPrompt }],
                model: modelName || 'gpt-3.5-turbo',
            });

            return completion.choices[0].message.content?.trim() || null;
        } catch (error: any) {
            console.error('[OpenAIService] Error generating content:', error.message);
            return null;
        }
    }
}
