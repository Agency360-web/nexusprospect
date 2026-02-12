import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class EvolutionService {
    private static readonly API_URL = process.env.EVOLUTION_API_URL || 'https://api.conectalab.sbs';
    private static readonly GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || '';

    /**
     * Send a text message via Evolution API
     */
    static async sendText(
        instanceName: string,
        number: string,
        text: string,
        instanceToken?: string
    ): Promise<boolean> {
        try {
            // Clean phone number (remove +, spaces, dashes)
            const cleanNumber = number.replace(/\D/g, '');

            // Construct endpoint
            // POST /message/sendText/{instance}
            const endpoint = `${this.API_URL}/message/sendText/${instanceName}`;

            console.log(`[EvolutionService] Sending to ${cleanNumber} via ${instanceName}`);

            const response = await axios.post(
                endpoint,
                {
                    number: cleanNumber,
                    text: text,
                    delay: 1200, // Simulated typing delay (1.2s)
                    linkPreview: false
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': instanceToken || this.GLOBAL_API_KEY
                    }
                }
            );

            if (response.status === 200 || response.status === 201) {
                return true;
            }

            console.error(`[EvolutionService] Failed status: ${response.status}`, response.data);
            return false;

        } catch (error: any) {
            console.error(`[EvolutionService] Error sending message:`, error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Split message into chunks of ~200 chars without breaking words
     */
    static splitMessage(message: string, chunkSize: number = 200): string[] {
        if (message.length <= chunkSize) return [message];

        const chunks: string[] = [];
        let currentChunk = '';
        const words = message.split(' ');

        for (const word of words) {
            if ((currentChunk + ' ' + word).length <= chunkSize) {
                currentChunk += (currentChunk ? ' ' : '') + word;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = word;
                // Handle pathologically long words? For now, let them slide or force break if needed,
                // but typically not an issue in normal text.
                if (currentChunk.length > chunkSize) {
                    // Force split if a single word is huge
                    const subChunks = currentChunk.match(new RegExp(`.{1,${chunkSize}}`, 'g'));
                    if (subChunks) {
                        chunks.push(...subChunks.slice(0, -1));
                        currentChunk = subChunks[subChunks.length - 1];
                    }
                }
            }
        }
        if (currentChunk) chunks.push(currentChunk);

        return chunks;
    }
}
