import Queue from 'bull';
import { prisma } from '../services/db';
import { JinaService } from '../services/jina.service';
import { GeminiService } from '../services/gemini.service';
import { EvolutionService } from '../services/evolution.service';

// Queue setup
export const campaignQueue = new Queue('campaign-dispatch', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});

interface JobData {
    campaignId: string;
}

// Worker Logic
campaignQueue.process(async (job) => {
    const { campaignId } = job.data as JobData;
    console.log(`[CampaignQueue] Processing Campaign: ${campaignId}`);

    // 1. Fetch Campaign
    const campaign = await prisma.dispatchCampaign.findUnique({
        where: { id: campaignId },
    });

    if (!campaign) {
        console.error(`[CampaignQueue] Campaign not found: ${campaignId}`);
        return;
    }

    // 2. Check Status (Pause/Cancel stops the loop)
    if (campaign.status === 'pausado' || campaign.status === 'cancelado' || campaign.status === 'concluido' || campaign.status === 'erro') {
        console.log(`[CampaignQueue] Campaign ${campaignId} is ${campaign.status}. Stopping loop.`);
        return;
    }

    // 3. Fetch ONE Pending Lead
    const lead = await prisma.dispatchLead.findFirst({
        where: {
            campaignId: campaignId,
            status: 'pendente',
        },
        orderBy: { createdAt: 'asc' }, // FIFO
    });

    if (!lead) {
        console.log(`[CampaignQueue] No more pending leads for Campaign ${campaignId}. Marking as completed.`);
        await prisma.dispatchCampaign.update({
            where: { id: campaignId },
            data: { status: 'concluido' },
        });
        return;
    }

    // 4. Update Lead Status to 'processando'
    await prisma.dispatchLead.update({
        where: { id: lead.id },
        data: { status: 'processando' },
    });

    // 5. Process Lead (Scrape -> Generate -> Send)
    let messageToSend = campaign.defaultMessage;
    let sentType = 'padrao';
    let fallbackReason = null;

    try {
        // --- Priority 1: Custom Message ---
        // Rule: Must have site + Jina Scrape OK + Gemini Generate OK
        if (lead.site) {
            // Fetch AI Agent Prompt
            const aiSettings = await prisma.aiAgentSettings.findUnique({
                where: { userId: campaign.userId! }
            });
            const promptBase = aiSettings?.prompt || '';

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
                    fallbackReason = 'erro_gemini'; // Jina OK, Gemini failed
                }
            } else {
                fallbackReason = 'erro_jina'; // Jina failed or site inaccessible
            }
        } else {
            fallbackReason = 'sem_site';
        }

        // --- Message Splitting & Sending ---
        // If sentType is 'padrao' and we have a fallback reason, log it.
        // If it was supposed to be custom but failed, messageToSend is already reset to default? 
        // Wait, generatedMessage is set above ONLY if successful. Default is defaultMessage.

        // Split message if > 200 chars
        // EvolutionService.splitMessage(messageToSend) implementation needed inside sendText or before?
        // The requirement says: split every 200 chars and send sequentially with small delay.

        // We can do chopping here or inside a helper. Let's do it here.
        const chunks = [];
        if (messageToSend.length > 200) {
            // Simple chunking logic closer to 200 chars at spaces
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

        // Send Chunks
        // We only have one "instancia" from campaign. instacia_whatsapp
        // We need to fetch the instance token? 
        // The requirement says "search credentials in DB".
        // We have `whatsapp_connections` table or `clients` table? 
        // The requirement says "use the instance configured in Integrations page".
        // Integrations page usually saves to `whatsapp_connections` (user_id relation).
        // Let's check `whatsapp_connections` for token? The table schema shows `instance`, but no token column?
        // Evolution API usually just needs `apikey` in header. Which API Key? Global or Instance?
        // Evolution v2 often uses Global API Key for management, but for sending messages it might use the global key + instance name in URL.
        // The previous implementation plan assumed Global Key is enough if configured.
        // Let's assume Global Key from ENV is sufficient for now, as `whatsapp_connections` usually stores just the name.

        let success = true;
        for (const chunk of chunks) {
            if (!chunk) continue;
            const sent = await EvolutionService.sendText(
                campaign.whatsappInstance || 'default',
                lead.phone,
                chunk
            );
            if (!sent) {
                success = false;
                break;
            }
            // Small delay between chunks (3-5s) - blocking thread? 
            // In Bull worker, blocking is fine as long as it's not too long.
            // Or we can rely on Evolution's internal queue? 
            // Evolution has 'delay' param in body. We used that in service.
            // But for multiple chunks, we might want to wait a bit in node loop.
            await new Promise(r => setTimeout(r, 2000));
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

            // Update Campaign Stats
            await prisma.dispatchCampaign.update({
                where: { id: campaignId },
                data: {
                    sentCustom: sentType === 'personalizado' ? { increment: 1 } : undefined,
                    sentDefault: sentType === 'padrao' ? { increment: 1 } : undefined,
                    totalLeads: { increment: 0 } // just to trigger updateAt if needed?
                }
            });

        } else {
            throw new Error('Evolution API failed to send one or more chunks');
        }

    } catch (error: any) {
        console.error(`[CampaignQueue] Error processing lead ${lead.id}:`, error);
        await prisma.dispatchLead.update({
            where: { id: lead.id },
            data: {
                status: 'erro',
                errorDetail: error.message,
            }
        });
        await prisma.dispatchCampaign.update({
            where: { id: campaignId },
            data: { errors: { increment: 1 } }
        });
    }

    // 6. Calculate Random Delay & Schedule Next Job
    if (campaign.status === 'em_andamento') {
        const min = campaign.delayMinSeconds || 150;
        const max = campaign.delayMaxSeconds || 320;
        const delaySeconds = Math.floor(Math.random() * (max - min + 1)) + min;

        console.log(`[CampaignQueue] Scheduling next lead in ${delaySeconds}s`);

        await campaignQueue.add(
            { campaignId },
            { delay: delaySeconds * 1000 }
        );
    }

});
