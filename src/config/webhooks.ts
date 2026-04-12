/**
 * Configuração Central de Webhooks do Nexus Prospect
 * 
 * Centraliza todos os endpoints n8n consumidos pelo frontend para facilitar 
 * a gestão de ambientes (Dev/Prod) e aumentar a segurança.
 */

const BASE_URL = import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://nexus360.infra-conectamarketing.site/webhook';

export const WEBHOOKS = {
  // Autenticação e Login
  AUTH_VERIFY: `${BASE_URL}/verifica_usuarios`,
  
  // WhatsApp e Contatos
  WA_VERIFIER: `${BASE_URL}/verificador_numero`,
  CONTACT_SYNC: `${BASE_URL}/sincronizador_de_contatos`,
  CONTACT_EXPORT: `${BASE_URL}/adicionar_contatos_em_massa`,
  
  // Grupos
  GROUP_LIST: `${BASE_URL}/get_grupos`,
  GROUP_LEADS: `${BASE_URL}/get_leads_grupos`,
  
  // Campanhas
  CAMPAIGN_DISPATCH: `${BASE_URL}/nexus-disparos`,
  CAMPAIGN_PRO_V2: `${BASE_URL}/b997708c-4ed3-4106-a3ed-88ff9e843816`,
  
  // Agentes de IA (Configurados via Env Vars específicas no AiAgents.tsx)
  AGENT_CREATE: import.meta.env.VITE_WEBHOOK_URL_CREATE_AGENT,
  AGENT_STATUS: import.meta.env.VITE_WEBHOOK_URL_STATUS_AGENT,
};
