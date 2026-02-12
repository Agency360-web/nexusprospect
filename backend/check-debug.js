
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching WhatsApp connections...');
    try {
        const connections = await prisma.whatsappConnection.findMany();
        console.log('Connections:', JSON.stringify(connections, null, 2));

        const clients = await prisma.client.findMany({ select: { id: true, name: true } });
        console.log('Clients (sample):', clients.slice(0, 3));
        
        // Check if we have any campaigns stuck
        const campaigns = await prisma.dispatchCampaign.findMany({ 
            where: { status: 'em_andamento' },
            include: { leads: { select: { status: true } } }
        });
        console.log('Stuck Campaigns:', JSON.stringify(campaigns.map(c => ({
            id: c.id,
            totalLeads: c.leads.length,
            leadsByStatus: c.leads.reduce((acc, l) => {
                acc[l.status] = (acc[l.status] || 0) + 1;
                return acc;
            }, {})
        })), null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
