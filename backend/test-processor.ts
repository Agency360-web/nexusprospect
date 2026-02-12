
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
const envPath = path.join(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}
console.log('DATABASE_URL:', process.env.DATABASE_URL); // Debug log

import { CampaignProcessor } from './src/services/campaign.processor';
import { prisma } from './src/services/db';

async function main() {
    console.log('Testing CampaignProcessor...', CampaignProcessor);

    // Create a dummy campaign
    const campaign = await prisma.dispatchCampaign.create({
        data: {
            name: 'Test Processor ' + Date.now(),
            defaultMessage: 'Hello Test',
            delayMinSeconds: 1,
            delayMaxSeconds: 2,
            status: 'draft'
        }
    });

    console.log('Created campaign:', campaign.id);

    // Create a dummy lead
    await prisma.dispatchLead.create({
        data: {
            campaignId: campaign.id,
            name: 'Test Lead',
            phone: '5511999999999', // Invalid number, should fail or be mocked? 
            // Evolution service will try to send. 
            // If Evolution is not reachable (Redis issue), it might fail there.
            // But we removed Redis dependency in Processor! 
            // We still need Evolution API to be reachable via HTTP.
            status: 'pendente'
        }
    });

    // Start
    await prisma.dispatchCampaign.update({
        where: { id: campaign.id },
        data: { status: 'em_andamento' }
    });

    CampaignProcessor.start(campaign.id);

    console.log('Started processor. Waiting 5s...');
    await new Promise(r => setTimeout(r, 5000));

    // Check status
    const updatedLead = await prisma.dispatchLead.findFirst({
        where: { campaignId: campaign.id }
    });
    console.log('Lead Status:', updatedLead?.status);
    console.log('Error Detail:', updatedLead?.errorDetail);

    // Stop
    CampaignProcessor.stop(campaign.id);
    await prisma.dispatchCampaign.update({ where: { id: campaign.id }, data: { status: 'cancelado' } });
}

main().catch(console.error).finally(() => prisma.$disconnect());
