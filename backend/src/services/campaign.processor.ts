import { prisma } from './db';
import { EvolutionService } from './evolution.service';
import { JinaService } from './jina.service';
import { GeminiService } from './gemini.service';

/**
 * CampaignProcessor - Internal Loop (No Redis)
 * Handles campaign execution using recursive setTimeout based on DB state.
 */
export class CampaignProcessor {
    // Map to track active timeouts (for debugging or forceful stopping if needed)
    private static activeCampaigns = new Map<string, NodeJS.Timeout>();

    /**
     * Start processing a campaign
     * Checks if it's already running to avoid duplicates?
     * The DB status 'em_andamento' is the source of truth.
     */
    static start(campaignId: string) {
        console.log(`[CampaignProcessor] Starting campaign ${campaignId}`);
        // Clear any existing timeout for this campaign to be safe
        this.stop(campaignId);

        // Start the loop immediately
        this.process(campaignId);
    }

    /**
     * Stop processing (clears timeout)
     */
    static stop(campaignId: string) {
        const timeout = this.activeCampaigns.get(campaignId);
        if (timeout) {
            clearTimeout(timeout);
            this.activeCampaigns.delete(campaignId);
            console.log(`[CampaignProcessor] Stopped loop for campaign ${campaignId}`);
        }
    }

    /**
     * Resume all 'em_andamento' campaigns on server startup
     */
    static async resumeAll() {
        console.log('[CampaignProcessor] Resuming all active campaigns...');
        try {
            const activeCampaigns = await prisma.dispatchCampaign.findMany({
                where: { status: 'em_andamento' },
                select: { id: true }
            });

            for (const campaign of activeCampaigns) {
                this.start(campaign.id);
            }
            console.log(`[CampaignProcessor] Resumed ${activeCampaigns.length} campaigns.`);
        } catch (error) {
            console.error('[CampaignProcessor] Error resuming campaigns:', error);
        }
    }

    /**
     * Main Processing Loop
     */
    private static async process(campaignId: string) {
        try {
            // 1. Fetch Campaign & Config
            const campaign = await prisma.dispatchCampaign.findUnique({
                where: { id: campaignId }
            });

            // Stop if not found or status changed
            if (!campaign) return;
            if (campaign.status !== 'em_andamento') {
                console.log(`[CampaignProcessor] Campaign ${campaignId} is ${campaign.status}. Stopping.`);
                this.stop(campaignId);
                return;
            }

            // 2. Fetch ONE Pending Lead (FIFO)
            const lead = await prisma.dispatchLead.findFirst({
                where: {
                    campaignId: campaignId,
                    status: 'pendente'
                },
                orderBy: { createdAt: 'asc' }
            });

            // 3. If no leads, mark complete
            if (!lead) {
                console.log(`[CampaignProcessor] Campaign ${campaignId} has no more leads. Marking as completed.`);
                await prisma.dispatchCampaign.update({
                    where: { id: campaignId },
                    data: { status: 'concluido' }
                });
                this.stop(campaignId);
                return;
            }

            // 4. Update Lead Status -> Processing
            await prisma.dispatchLead.update({
                where: { id: lead.id },
                data: { status: 'processando' }
            });

            // 5. Process (Logic copied from queue)
            let messageToSend = campaign.defaultMessage;
            let sentType = 'padrao';
            let fallbackReason = null;

            try {
                // AI Customization Logic
                if (lead.site) {
                    const aiSettings = await prisma.aiAgentSettings.findFirst({
                        where: { userId: campaign.userId! }
                    });
                    const promptBase = aiSettings?.prompt || '';

                    // Scrape logic
                    const scrapedContent = await JinaService.scrape(lead.site);

                    if (scrapedContent) {
                        const generated = await GeminiService.generateMessage(
                            promptBase,
                            { name: lead.name || '', company: lead.company || '', phone: lead.phone, site: lead.site },
                            scrapedContent
                        );

                        if (generated) {
                            messageToSend = generated;
                            sentType = 'personalizado';
                        } else {
                            fallbackReason = 'erro_gemini';
                        }
                    } else {
                        fallbackReason = 'erro_jina';
                    }
                } else {
                    fallbackReason = 'sem_site';
                }

                // Chunking Logic
                const chunks = [];
                if (messageToSend.length > 200) {
                    let tempMsg = messageToSend;
                    while (tempMsg.length > 0) {
                        let cutIndex = 200;
                        if (tempMsg.length > 200) {
                            const spaceIndex = tempMsg.lastIndexOf(' ', 200);
                            if (spaceIndex > 0) cutIndex = spaceIndex;
                        }
                        chunks.push(tempMsg.substring(0, cutIndex).trim());
                        tempMsg = tempMsg.substring(cutIndex).trim();
                    }
                } else {
                    chunks.push(messageToSend);
                }

                // Sending Logic
                let success = true;
                for (const chunk of chunks) {
                    if (!chunk) continue;

                    const sent = await EvolutionService.sendText(
                        campaign.whatsappInstance || 'default', // Fallback to 'default' if empty
                        lead.phone,
                        chunk
                    );

                    if (!sent) {
                        success = false;
                        break;
                    }

                    // Small delay between chunks (2s)
                    if (chunks.length > 1) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                if (success) {
                    await prisma.dispatchLead.update({
                        where: { id: lead.id },
                        data: {
                            status: sentType === 'personalizado' ? 'enviado_personalizado' : 'enviado_padrao',
                            generatedMessage: messageToSend,
                            fallbackReason: fallbackReason,
                            sentAt: new Date(),
                        }
                    });

                    // Update Counters
                    const updateData: any = {
                        updatedAt: new Date()
                    };
                    if (sentType === 'personalizado') updateData.sentCustom = { increment: 1 };
                    if (sentType === 'padrao') updateData.sentDefault = { increment: 1 };

                    await prisma.dispatchCampaign.update({
                        where: { id: campaignId },
                        data: updateData
                    });
                } else {
                    throw new Error('Falha no envio (Evolution API)');
                }

            } catch (error: any) {
                console.error(`[CampaignProcessor] Error on lead ${lead.id}:`, error.message);
                await prisma.dispatchLead.update({
                    where: { id: lead.id },
                    data: {
                        status: 'erro',
                        errorDetail: error.message
                    }
                });
                await prisma.dispatchCampaign.update({
                    where: { id: campaignId },
                    data: { errors: { increment: 1 } }
                });
            }

            // 6. Schedule Next Run
            const min = campaign.delayMinSeconds || 60; // Default 1 min
            const max = campaign.delayMaxSeconds || 180; // Default 3 min
            const delaySeconds = Math.floor(Math.random() * (max - min + 1)) + min;

            console.log(`[CampaignProcessor] Campaign ${campaignId}: Next lead in ${delaySeconds}s`);

            const timeout = setTimeout(() => this.process(campaignId), delaySeconds * 1000);
            this.activeCampaigns.set(campaignId, timeout);

        } catch (fatalError) {
            console.error(`[CampaignProcessor] Fatal error in loop for ${campaignId}:`, fatalError);
            // Don't stop forever? Maybe retry in 1 minute?
            // For now, let's stop to avoid infinite error loops.
            this.stop(campaignId);
            // Or better: update campaign to 'error'
            /*
            await prisma.dispatchCampaign.update({
                where: { id: campaignId },
                data: { status: 'erro' }
            });
            */
        }
    }
}
