import express from 'express';
import cors from 'cors';
import { prisma } from './services/db';
import { campaignQueue } from './queues/campaign.queue';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// --- API Endpoints ---

// List Campaigns
app.get('/api/campaigns', async (req, res) => {
    // In a real app, filter by req.user.id (from auth middleware)
    // For now, fetch all or restrict via query if needed
    const campaigns = await prisma.dispatchCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            // Include stats? Stats are columns in the table, so yes.
        }
    });
    res.json(campaigns);
});

// Create Campaign
app.post('/api/campaigns', async (req, res) => {
    const {
        name,
        leads, // Array of { name, phone, company, site }
        defaultMessage,
        delayMin,
        delayMax,
        instanceName,
        userId
    } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
        res.status(400).json({ error: 'Lista de leads inválida' });
        return;
    }

    try {
        const campaign = await prisma.dispatchCampaign.create({
            data: {
                name,
                defaultMessage,
                delayMinSeconds: delayMin,
                delayMaxSeconds: delayMax,
                whatsappInstance: instanceName,
                userId: userId, // Should come from auth token
                totalLeads: leads.length,
                status: 'draft'
            }
        });

        // Bulk insert leads
        const leadsData = leads.map((l: any) => ({
            campaignId: campaign.id,
            name: l.name,
            phone: l.phone,
            company: l.company,
            site: l.site,
            status: 'pendente'
        }));

        await prisma.dispatchLead.createMany({
            data: leadsData
        });

        res.json(campaign);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Start Campaign
app.post('/api/campaigns/:id/start', async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.dispatchCampaign.update({
            where: { id },
            data: { status: 'em_andamento' }
        });

        // Trigger in-memory processor
        CampaignProcessor.start(id);

        res.json({ success: true, status: 'em_andamento' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Pause Campaign
app.post('/api/campaigns/:id/pause', async (req, res) => {
    const { id } = req.params;

    await prisma.dispatchCampaign.update({
        where: { id },
        data: { status: 'pausado' }
    });

    // Stop in-memory processor
    CampaignProcessor.stop(id);

    res.json({ success: true, status: 'pausado' });
});

// Get Campaign Status (Monitor)
app.get('/api/campaigns/:id/status', async (req, res) => {
    const { id } = req.params;

    const campaign = await prisma.dispatchCampaign.findUnique({
        where: { id }
    });

    if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
    }

    // Get current processing lead if any
    const processingLead = await prisma.dispatchLead.findFirst({
        where: { campaignId: id, status: 'processando' }
    });

    res.json({
        campaign,
        currentLead: processingLead
    });
});

// Get WhatsApp Instances
app.get('/api/whatsapp/instances', async (req, res) => {
    // In a real app, filter by req.user.id
    const instances = await prisma.whatsappConnection.findMany({
        where: { status: 'connected' }
    });
    res.json(instances);
});

// Initialize Campaign Processor
import { CampaignProcessor } from './services/campaign.processor';

// Resume active and start scheduler
CampaignProcessor.resumeAll();
CampaignProcessor.startScheduler();

app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
