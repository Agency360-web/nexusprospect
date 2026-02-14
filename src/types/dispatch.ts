export interface DispatchCampaign {
    id: string;
    userId: string;
    name: string;
    status: 'draft' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado' | 'erro' | 'agendado';
    totalLeads: number;
    sentCustom: number;
    sentDefault: number;
    skipped: number;
    errors: number;
    delayMinSeconds: number;
    delayMaxSeconds: number;
    defaultMessage: string;
    whatsappInstance: string;
    createdAt: string;
    updatedAt: string;
    scheduledAt?: string;
}

export interface DispatchLead {
    id: string;
    campaignId: string;
    name: string;
    phone: string;
    company?: string;
    site?: string;
    status: 'pendente' | 'processando' | 'enviado_personalizado' | 'enviado_padrao' | 'pulado' | 'erro';
    fallbackReason?: string;
    generatedMessage?: string;
    errorDetail?: string;
    sentAt?: string;
    createdAt: string;
}

export interface DispatchStatusResponse {
    campaign: DispatchCampaign;
    currentLead?: DispatchLead;
}
