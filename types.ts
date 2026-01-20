
export interface Client {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'overdue' | 'terminated';
  createdAt: string;
  email: string;
  phone?: string;
  observations?: string;
  cnpj?: string;
  corporateName?: string;
  address?: string;
}

export type WebhookType = 'inbound' | 'outbound' | 'status';

export interface WebhookConfig {
  id: string;
  clientId: string;
  name: string;
  url: string;
  type: WebhookType;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  active: boolean;
  headers: Record<string, string>;
}

export interface WhatsAppNumber {
  id: string;
  clientId: string;
  nickname: string;
  phone: string;
  status: 'active' | 'inactive' | 'blocked';
  dailyLimit: number;
  sentToday: number;
}

export interface EmailSender {
  id: string;
  clientId: string;
  email: string;
  provider: string;
  fromName: string;
  status: 'active' | 'inactive' | 'unverified';
  dailyLimit: number;
  sentToday: number;
}

export interface Tag {
  id: string;
  name: string;
  clientId: string;
  color: string;
}

export interface Lead {
  id: string;
  clientId: string;
  name: string;
  email?: string;
  phone: string;
  tags: string[];
  customFields: Record<string, string>;
  status: 'valid' | 'invalid' | 'pending';
}

export type MediaType = 'none' | 'image' | 'video' | 'audio' | 'pdf';

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  message: string;
  mediaUrl?: string;
  mediaType: MediaType;
  createdAt: string;
  scheduledAt?: string;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  errorCount: number;
  status: 'draft' | 'running' | 'completed' | 'paused' | 'scheduled';
  numberIds: string[];
  webhookIds: string[];
  targetTagIds: string[];
}

export interface Goal {
  id: string;
  clientId: string;
  month: number;
  year: number;
  channel: 'email' | 'whatsapp';
  weeklyTargets: number[]; // Array of 4 (or 5) weekly targets
  monthlyTarget: number;
  annualTarget: number;
}

export interface GoalsMetric {
  target: number;
  actual: number;
  percentage: number;
  remaining: number;
  status: 'pending' | 'on_track' | 'completed' | 'exceeded';
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  status: 'pending' | 'completed';
  checklist: { text: string; completed: boolean }[];
  createdAt: string;
}
