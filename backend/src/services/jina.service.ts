import axios from 'axios';

export class JinaService {
    private static readonly BASE_URL = 'https://r.jina.ai/';

    static async scrape(url: string): Promise<string | null> {
        try {
            if (!url) return null;

            // Ensure URL has protocol
            if (!url.startsWith('http')) {
                url = `https://${url}`;
            }

            const targetUrl = `${this.BASE_URL}${url}`;
            console.log(`[JinaService] Scraping: ${targetUrl}`);

            const response = await axios.get(targetUrl, {
                timeout: 30000, // 30s timeout
                headers: {
                    'X-Target-Selector': 'body' // Optional: Focus on body content
                }
            });

            if (response.status === 200 && response.data) {
                return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            }

            return null;
        } catch (error: any) {
            console.error(`[JinaService] Error scraping ${url}:`, error.message);
            return null;
        }
    }
}
