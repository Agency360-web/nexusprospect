import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export class GeminiService {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    private static model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    static async generateMessage(
        promptBase: string,
        leadData: { name: string; company?: string; phone?: string; site?: string },
        scrapedContent: string
    ): Promise<string | null> {
        try {
            const finalPrompt = `
${promptBase}

---

DADOS DO LEAD:
- Nome: ${leadData.name || 'N/A'}
- Empresa: ${leadData.company || 'N/A'}
- Telefone: ${leadData.phone || 'N/A'}
- Site: ${leadData.site || 'N/A'}

CONTEÚDO EXTRAÍDO DO SITE DO LEAD:
${scrapedContent.substring(0, 20000)} 
(Conteúdo truncado se for muito longo)

---

Com base nessas informações, crie uma sequência de mensagens de WhatsApp altamente personalizadas para prospecção deste lead. Siga rigorosamente o formato e as instruções do prompt acima. A resposta deve conter APENAS o texto da mensagem a ser enviada, sem explicações adicionais.
      `;

            console.log('[GeminiService] Generating message...');
            const result = await this.model.generateContent(finalPrompt);
            const response = await result.response;
            const text = response.text();

            return text.trim();
        } catch (error: any) {
            console.error('[GeminiService] Error generating content:', error.message);
            return null;
        }
    }
}
