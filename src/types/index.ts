
export interface Client {
  id: string;
  name: string; // Internal/Display name (Nome Fantasia)
  status: 'active' | 'inactive' | 'overdue' | 'terminated';
  createdAt: string;
  email: string;
  phone?: string;
  observations?: string;

  // Company Data
  corporateName?: string; // Razão Social
  cnpj?: string;
  contactPerson?: string; // Responsável

  // Address
  address?: string; // Endereço completo (Rua, Número, Compl)
  zipCode?: string; // CEP
  neighborhood?: string; // Bairro
  city?: string;
  state?: string;

  // Contract Defaults
  defaultServices?: string;
  defaultTerm?: string;
  defaultValue?: string;
  defaultPaymentMethod?: string;
  defaultPaymentConditions?: string;

  contract_start_date?: string;
  contract_value?: number;
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

export interface ContractTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
  // Make these optional if they aren't always present
}

export interface Contract {
  id: string;
  user_id: string;
  template_id?: string;
  client_name: string;
  status: 'draft' | 'generated' | 'sent_to_signature' | 'signed';
  variables: Record<string, string>;
  content_snapshot: string;
  created_at: string;
}

export interface OperationalCost {
  id: string;
  clientId: string;
  description: string;
  category: string;
  value: number;
  date: string;
  createdAt: string;
}


export interface Meeting {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  date: string;
  link?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Note {
  id: string;
  clientId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export interface Complaint {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  severity: 'low' | 'medium' | 'high';
  date: string;
  resolutionNotes?: string;
  createdAt: string;
}


