
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Settings,
  Plus,
  CheckCircle2,
  Trash2,
  MoreVertical,
  Users,
  Search,
  FileUp,
  Target,
  Mail,
  FileSpreadsheet,
  Key,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Smartphone,
  Download,
  RefreshCw,
  Activity
} from 'lucide-react';
import { Lead, Tag, Client, OperationalCost } from '../types';
import ClientGoals from '../components/ClientGoals';
import ClientCredentials from '../components/ClientCredentials';
import ClientOverview from '../components/ClientOverview/ClientOverview';
import { supabase } from '../services/supabase';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

// Interface locally defined for Financial Transactions
interface Transaction {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: number;
  description: string;
  category: string;
  status: 'pendente' | 'pago' | 'atrasado';
  client_name?: string;
  payment_method?: string;
  created_at?: string;
}

const ClientDetail: React.FC = () => {
  const { user } = useAuth();
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'goals' | 'credentials' | 'costs'>('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [costs, setCosts] = useState<OperationalCost[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<Transaction[]>([]);

  // Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'lead' | 'success' | 'client-config' | 'backup' | 'cost'>('none');
  const [modalLoading, setModalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Client Config State
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    observations: '',
    cnpj: '',
    corporateName: '',
    address: '',
    status: 'active' as Client['status'],
    whatsapp_instance_url: '',
    whatsapp_token: ''
  });

  // Costs State
  const [newCost, setNewCost] = useState({ description: '', category: 'Infrastructure', value: '', date: new Date().toISOString().split('T')[0] });
  const [costFilterMonth, setCostFilterMonth] = useState(new Date().getMonth());
  const [costFilterYear, setCostFilterYear] = useState(new Date().getFullYear());



  // Pagination State for Leads
  const [leadPage, setLeadPage] = useState(1);
  const leadsPerPage = 50;

  const handleDownloadCSV = () => {
    if (leads.length === 0) return;

    // CSV Headers
    const headers = ['ID', 'Nome', 'Telefone', 'Email', 'Empresa', 'Status', 'Tags', 'Data Criação'];

    // CSV Rows
    const rows = leads.map(lead => [
      lead.id,
      lead.name,
      lead.phone,
      lead.email || '',
      lead.customFields?.empresa || '',
      lead.status,
      (lead.tags || []).map(t => {
        const tag = tags.find(tag => tag.id === t);
        return tag ? tag.name : t;
      }).join('; '),
      new Date(lead.createdAt || new Date().toISOString()).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${client?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };








  // Bulk Actions State
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Form State
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', company: '', site: '', tags: '' });
  const [leadType, setLeadType] = useState<'whatsapp' | 'email'>('whatsapp');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Stats State
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeTags: 0,
    optInRate: '0%',
    bounces: 0
  });

  // Helper to ensure tags exist in the DB and return their IDs
  const ensureTagsExist = async (tagNames: string[]): Promise<string[]> => {
    if (!tagNames || tagNames.length === 0) return [];
    if (!clientId) return [];

    const uniqueNames = [...new Set(tagNames.map(t => t.trim()).filter(t => t))];
    if (uniqueNames.length === 0) return [];

    // 1. Find existing tags
    const { data: existingTags } = await supabase
      .from('tags')
      .select('id, name')
      .eq('client_id', clientId)
      .in('name', uniqueNames);

    const existingNames = existingTags?.map(t => t.name) || [];
    const missingNames = uniqueNames.filter(name => !existingNames.includes(name));

    const finalTagIds: string[] = existingTags?.map(t => t.id) || [];

    // 2. Create missing tags
    if (missingNames.length > 0) {
      const newTagsPayload = missingNames.map(name => ({
        client_id: clientId,
        name: name,
        color: `bg-${['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'indigo'][Math.floor(Math.random() * 7)]}-100 text-slate-700` // Random color
      }));

      const { data: createdTags, error } = await supabase
        .from('tags')
        .insert(newTagsPayload)
        .select('id');

      if (!error && createdTags) {
        createdTags.forEach(t => finalTagIds.push(t.id));
      } else {
        console.error('Error creating tags:', error);
      }
    }

    return finalTagIds;
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    setModalLoading(true);
    try {
      // Process tags first
      const rawTags = newLead.tags ? newLead.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      const tagIds = await ensureTagsExist(rawTags);

      const payload: any = {
        client_id: clientId,
        name: newLead.name,
        status: 'valid',
        company: newLead.company,
        company_site: newLead.site,
        tags: tagIds, // Save UUIDs
      };

      if (leadType === 'whatsapp') {
        payload.phone = newLead.phone;
      } else {
        payload.email = newLead.email;
        payload.phone = null;
      }

      const { data: insertedLead, error } = await supabase.from('leads').insert(payload).select().single();

      if (error) throw error;
      setActiveModal('none');
      setNewLead({ name: '', phone: '', email: '', company: '', site: '', tags: '' });

      fetchData();
    } catch (err) { console.error(err); alert('Erro ao criar lead'); }
    finally { setModalLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        if (rows.length < 2) return;

        const headers = rows[0].split(';').length > 1 ? rows[0].split(';') : rows[0].split(',');
        const isEmail = headers.some(h => h.toLowerCase().includes('e-mail') || h.toLowerCase().includes('email'));
        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('nome'));
        const contactIdx = headers.findIndex(h => h.toLowerCase().includes(isEmail ? 'e-mail' : 'telefone') || h.toLowerCase().includes(isEmail ? 'email' : 'phone'));

        const companyIdx = headers.findIndex(h => h.toLowerCase().includes('empresa') || h.toLowerCase().includes('company'));
        const siteIdx = headers.findIndex(h => h.toLowerCase().includes('site') || h.toLowerCase().includes('website') || h.toLowerCase().includes('url'));
        const tagsIdx = headers.findIndex(h => h.toLowerCase().includes('etiquetas') || h.toLowerCase().includes('tags'));

        if (nameIdx === -1 || contactIdx === -1) {
          alert('Formato inválido. Colunas obrigatórias: Nome, Telefone/E-mail');
          return;
        }

        // Pre-process all unique tags from the file
        const allTags = new Set<string>();
        rows.slice(1).forEach(row => {
          const cols = row.split(';').length > 1 ? row.split(';') : row.split(',');
          const tagsRaw = tagsIdx !== -1 ? cols[tagsIdx]?.trim() : '';
          if (tagsRaw) {
            tagsRaw.split('|').forEach(t => allTags.add(t.trim()));
          }
        });

        // Ensure all tags exist in bulk
        await ensureTagsExist(Array.from(allTags));
        // Re-fetch tags to get latest IDs map (or we could return map from ensureTagsExist, but fetching is safer for sync)
        const { data: latestTags } = await supabase.from('tags').select('id, name').eq('client_id', clientId);

        const leadsToInsert = rows.slice(1).map(row => {
          const cols = row.split(';').length > 1 ? row.split(';') : row.split(',');
          const name = cols[nameIdx]?.trim();
          const contact = cols[contactIdx]?.trim();
          const company = companyIdx !== -1 ? cols[companyIdx]?.trim() : '';
          const site = siteIdx !== -1 ? cols[siteIdx]?.trim() : '';
          const tagsRaw = tagsIdx !== -1 ? cols[tagsIdx]?.trim() : '';

          if (!name || !contact) return null;

          const rowTags = tagsRaw ? tagsRaw.split('|').map(t => t.trim()).filter(t => t) : [];
          const rowTagIds = rowTags.map(tagName => {
            const found = latestTags?.find(lt => lt.name === tagName);
            return found ? found.id : null;
          }).filter(id => id !== null);

          return {
            client_id: clientId,
            name,
            [isEmail ? 'email' : 'phone']: contact,
            company,
            company_site: site,
            tags: rowTagIds,
            status: 'valid'
          };
        }).filter(l => l !== null);

        if (leadsToInsert.length > 0) {
          // Process in batches of 1000
          const batchSize = 1000;
          let importedCount = 0;
          for (let i = 0; i < leadsToInsert.length; i += batchSize) {
            const batch = leadsToInsert.slice(i, i + batchSize);
            const { error } = await supabase.from('leads').insert(batch);
            if (error) throw error;
            importedCount += batch.length;
          }

          setSuccessMessage(`${importedCount} leads importados com sucesso!`);
          setActiveModal('success');
          fetchData();
        }

      } catch (err) {
        console.error(err);
        alert('Erro ao processar arquivo');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };


  const handleOpenClientConfig = () => {
    if (!client) return;
    setClientForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      observations: client.observations || '',
      cnpj: client.cnpj || '',
      corporateName: client.corporateName || '',
      address: client.address || '',
      status: client.status || 'active',
      whatsapp_instance_url: client.whatsapp_instance_url || '',
      whatsapp_token: client.whatsapp_token || ''
    });
    setActiveModal('client-config');
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('clients').update({
        name: clientForm.name,
        email: clientForm.email,
        phone: clientForm.phone,
        observations: clientForm.observations,
        cnpj: clientForm.cnpj,
        corporate_name: clientForm.corporateName,
        address: clientForm.address,
        status: clientForm.status,
        whatsapp_instance_url: clientForm.whatsapp_instance_url,
        whatsapp_token: clientForm.whatsapp_token
      }).eq('id', clientId);

      if (error) throw error;
      setActiveModal('none');
      fetchData(); // Refresh all data
    } catch (err) { console.error(err); alert('Erro ao atualizar cliente'); }
    finally { setModalLoading(false); }
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} leads? Esta ação não pode ser desfeita.`)) return;

    try {
      setLoading(true);

      // We still use batching to avoid hitting request size limits on the RPC call
      const batchSize = 1000;
      for (let i = 0; i < selectedLeads.length; i += batchSize) {
        const batch = selectedLeads.slice(i, i + batchSize);

        // Use the RPC for more robust deletion
        const { error } = await supabase.rpc('delete_leads_in_bulk', {
          lead_ids: batch
        });

        if (error) {
          console.error('RPC Error:', error);
          throw new Error(error.message || 'Erro inesperado na função de banco de dados');
        }
      }

      // Optimistic update
      setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
      const countDeleted = selectedLeads.length;
      setSelectedLeads([]);

      // Update stats
      setStats(prev => ({
        ...prev,
        totalLeads: prev.totalLeads - countDeleted
      }));

      setSuccessMessage(`${countDeleted} leads excluídos com sucesso!`);
      setActiveModal('success');

    } catch (error: any) {
      console.error('Error deleting leads:', error);
      alert(`Erro crítico ao excluir leads: ${error.message || 'Erro no servidor'}. Verifique o console ou contate o suporte.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const handleCreateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('operational_costs').insert({
        client_id: clientId,
        description: newCost.description,
        category: newCost.category,
        value: parseFloat(newCost.value.replace('R$', '').replace('.', '').replace(',', '.').trim()),
        date: newCost.date
      });

      if (error) throw error;

      setActiveModal('none');
      setNewCost({ description: '', category: 'Infrastructure', value: '', date: new Date().toISOString().split('T')[0] });
      setSuccessMessage('Custo adicionado com sucesso!');
      setActiveModal('success');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar custo');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm('Excluir este custo?')) return;
    try {
      const { error } = await supabase.from('operational_costs').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir custo');
    }
  };

  const toggleSelectLead = (id: string) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(prev => prev.filter(lid => lid !== id));
    } else {
      setSelectedLeads(prev => [...prev, id]);
    }
  };

  useEffect(() => {
    if (clientId) {
      console.log('useEffect triggered. clientId:', clientId, 'user:', user?.id);
      fetchData();
    }
  }, [clientId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('fetchData started. User:', user?.id);

      // 1. Fetch Client Info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) console.error('Error fetching client:', clientError);

      if (clientData) {
        setClient({
          id: clientData.id,
          name: clientData.name,
          status: clientData.status,
          createdAt: clientData.created_at,
          email: clientData.email,
          phone: clientData.phone,
          observations: clientData.observations,
          cnpj: clientData.cnpj,
          corporateName: clientData.corporate_name,
          address: clientData.address,
          google_sheets_config: clientData.google_sheets_config,
          whatsapp_instance_url: clientData.whatsapp_instance_url,
          whatsapp_token: clientData.whatsapp_token
        });
      }

      // 2. Fetch Leads (with batching to bypass 1000 limit)
      let allLeads: any[] = [];
      let lastPageSize = 1000;
      let offset = 0;

      while (lastPageSize === 1000) {
        const { data: batch, error: leadsError } = await supabase
          .from('leads')
          .select('*')
          .eq('client_id', clientId)
          .range(offset, offset + 999);

        if (leadsError) {
          console.error('Error fetching leads:', leadsError);
          break;
        }

        if (batch) {
          allLeads = [...allLeads, ...batch];
          lastPageSize = batch.length;
          offset += 1000;
        } else {
          lastPageSize = 0;
        }
      }

      if (allLeads.length > 0) {
        setLeads(allLeads.map((l: any) => ({
          id: l.id,
          clientId: l.client_id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          tags: l.tags || [],
          customFields: l.custom_fields || {},
          status: l.status,
          isSynced: l.is_synced
        })));
      } else {
        setLeads([]);
      }

      // 3. Fetch Tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .eq('client_id', clientId);

      if (tagsData) {
        setTags(tagsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          clientId: t.client_id,
          color: t.color || 'bg-slate-100 text-slate-600'
        })));
      }

      // 6. Fetch Costs
      const { data: costsData } = await supabase
        .from('operational_costs')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (costsData) {
        setCosts(costsData.map((c: any) => ({
          id: c.id,
          clientId: c.client_id,
          description: c.description,
          category: c.category,
          value: c.value,
          date: c.date,
          createdAt: c.created_at
        })));
      }

      // 7. Fetch Financial Transactions (for dynamic revenue)
      if (user?.id) {
        const { data: trxData } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('user_id', user.id);

        if (trxData) {
          // We store all transactions for this user, filtering happens in render
          // This is efficient enough for now as transaction count per user isn't huge
          // Alternatively, we could filter by client_name here if strictly needed, 
          // but client name might not always match perfectly if edited, so getting all allows soft matching if needed later.
          // For this implementation, we will trust client_name matches.
          setFinancialTransactions(trxData.map((t: any) => ({
            id: t.id,
            user_id: t.user_id,
            transaction_date: t.transaction_date,
            amount: t.amount,
            description: t.description,
            category: t.category,
            status: t.status,
            client_name: t.client_name,
            payment_method: t.payment_method,
            created_at: t.created_at
          })));
        }
      }

      // Update stats based on fetched data
      setStats({
        totalLeads: allLeads.length,
        activeTags: tagsData?.length || 0,
        optInRate: allLeads.length ? '100%' : '-', // Placeholder logic
        bounces: 0 // Placeholder as we don't track bounces yet
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all shrink-0 ${activeTab === id
        ? 'border-slate-900 text-slate-900 font-bold'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
        }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;
  }

  if (!client) {
    return <div>Cliente não encontrado</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <Link to="/clients" className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 shadow-sm shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono uppercase tracking-widest shrink-0">ID: {clientId?.substring(0, 8)}...</span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 truncate">Gestão de ambiente isolado e audiência</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleOpenClientConfig}
            className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Settings size={16} />
            <span>Configurar</span>
          </button>
          <Link to="/new-campaign" className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-900/10">
            <Plus size={18} />
            <span className="truncate">Nova Campanha</span>
          </Link>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-16 lg:top-0 z-20 flex px-2 overflow-x-auto no-scrollbar rounded-t-3xl">
        <TabButton id="overview" label="Geral" icon={Activity} />
        <TabButton id="leads" label="Leads" icon={Users} />
        <TabButton id="goals" label="Metas" icon={Target} />
        <TabButton id="credentials" label="Acessos" icon={Key} />
        <TabButton id="costs" label="Custos" icon={DollarSign} />
      </div>

      <div className="pt-4">


        {activeTab === 'overview' && client && (
          <ClientOverview client={client} onUpdate={() => {
            supabase.from('clients').select('*').eq('id', clientId!).single().then(({ data }) => {
              if (data) setClient(data);
            });
          }} />
        )}

        {activeTab === 'leads' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filtrar por nome, telefone ou tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-medium"
                />
              </div>
              <div className="flex items-center space-x-2">

                <button
                  onClick={() => setActiveModal('lead-type-selection' as any)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10"
                >
                  <Plus size={14} />
                  <span>Add Lead</span>
                </button>
                <div onClick={() => fileInputRef.current?.click()}>
                  <button className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <FileUp size={20} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative">

              {/* Bulk Actions Bar */}
              {selectedLeads.length > 0 && (
                <div className="absolute top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 z-10 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold">{selectedLeads.length} selecionados</span>
                    <button onClick={() => setSelectedLeads([])} className="text-xs text-slate-400 hover:text-white underline">Cancelar</button>
                  </div>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center space-x-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Excluir Selecionados</span>
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-5 w-12">
                        <input
                          type="checkbox"
                          checked={leads.length > 0 && selectedLeads.length === leads.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </th>
                      <th className="px-2 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Lead / Identificação</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Empresa</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Site</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">WhatsApp</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Segmentação</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Status</th>
                      <th className="px-8 py-5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {leads
                      .filter(lead =>
                        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (lead.phone || '').includes(searchTerm) ||
                        (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (lead.tags || []).some(tid => {
                          const tag = tags.find(t => t.id === tid);
                          return tag?.name.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                      )
                      .slice((leadPage - 1) * leadsPerPage, leadPage * leadsPerPage)
                      .map(lead => (
                        <tr key={lead.id} className={`hover:bg-slate-50/50 transition-colors ${selectedLeads.includes(lead.id) ? 'bg-slate-50' : ''}`}>
                          <td className="px-8 py-5">
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => toggleSelectLead(lead.id)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                          </td>
                          <td className="px-2 py-5">
                            <div className="font-bold text-slate-900">{lead.name}</div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-sm text-slate-600 font-medium">{lead.company || '-'}</div>
                          </td>
                          <td className="px-8 py-5">
                            {lead.company_site ? (
                              <a
                                href={lead.company_site.startsWith('http') ? lead.company_site : `https://${lead.company_site}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate max-w-[150px] block"
                              >
                                {lead.company_site}
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-8 py-5 font-mono text-slate-500 font-medium">
                            {lead.phone || lead.email}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-wrap gap-1.5">
                              {(lead.tags || []).map(tid => {
                                const tag = tags.find(t => t.id === tid);
                                return tag ? (
                                  <span key={tid} className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${tag.color}`}>
                                    {tag.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${lead.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                              <CheckCircle2 size={10} className="mr-1" />
                              {lead.status === 'valid' ? 'Validado' : 'Erro'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button className="text-slate-300 hover:text-slate-900 transition-colors">
                              <MoreVertical size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <span>{leads.length} Contatos listados</span>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400">Página {leadPage} de {Math.ceil(leads.length / leadsPerPage)}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setLeadPage(p => Math.max(1, p - 1))}
                      disabled={leadPage === 1}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setLeadPage(p => Math.min(Math.ceil(leads.length / leadsPerPage), p + 1))}
                      disabled={leadPage >= Math.ceil(leads.length / leadsPerPage)}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {activeTab === 'goals' && (
          <ClientGoals clientId={clientId!} />
        )}

        {activeTab === 'credentials' && (
          <ClientCredentials clientId={clientId!} />
        )}

        {activeTab === 'costs' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Financial Calculations */}
            {(() => {
              const currentMonthRevenue = financialTransactions
                .filter(t => {
                  // Métodos de Normalização
                  const normalize = (s: string) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const getDigits = (s: string) => (s || '').replace(/\D/g, '');

                  const tClientName = normalize(t.client_name);
                  const tDigits = getDigits(t.client_name || ''); // Use only client_name for now, description can be ambiguous

                  const clientName = normalize(client?.name);
                  const corporateName = normalize(client?.corporateName);
                  const clientDocument = getDigits(client?.cnpj); // Pode ser CPF ou CNPJ

                  // 1. Busca por Documento (Prioritária)
                  // Verifica se os dígitos do documento do cliente estão presentes nos dígitos da transação
                  // Exigimos pelo menos 11 dígitos (CPF) para evitar falsos positivos
                  // Se tDigits for maior que 3 mas for igual a clientDocument, match
                  const hasDocumentMatch = clientDocument.length >= 11 && tDigits.includes(clientDocument);

                  // 2. Busca por Nome (Secundária)
                  const hasNameMatch =
                    tClientName === clientName ||
                    (corporateName && tClientName === corporateName) ||
                    (clientName.length > 3 && tClientName.includes(clientName)) ||
                    (corporateName && corporateName.length > 3 && tClientName.includes(corporateName)) ||
                    (tClientName.length > 3 && clientName.includes(tClientName));


                  const isClientMatch = hasDocumentMatch || hasNameMatch;

                  const trxDate = new Date(new Date(t.transaction_date).getTime() + new Date(t.transaction_date).getTimezoneOffset() * 60000);
                  const isMonthMatch = trxDate.getMonth() === costFilterMonth;
                  const isYearMatch = trxDate.getFullYear() === costFilterYear;
                  const isStatusMatch = (t.status || '').toLowerCase() === 'pago';

                  if (isClientMatch) {
                    console.log('Match Detail (Document-First):', {
                      tClient: t.client_name,
                      docMatch: hasDocumentMatch,
                      nameMatch: hasNameMatch,
                      match: isMonthMatch && isYearMatch && isStatusMatch
                    });
                  }

                  return isClientMatch && isMonthMatch && isYearMatch && isStatusMatch;
                })
                .reduce((acc, curr) => acc + curr.amount, 0);

              console.log('Calculated Revenue:', currentMonthRevenue);

              const currentMonthCosts = costs
                .filter(c => {
                  const d = new Date(c.date);
                  return d.getMonth() === costFilterMonth && d.getFullYear() === costFilterYear;
                })
                .reduce((acc, curr) => acc + curr.value, 0);

              const realProfit = currentMonthRevenue - currentMonthCosts;
              const margin = currentMonthRevenue > 0 ? (realProfit / currentMonthRevenue) * 100 : 0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Receita Mensal</h3>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <TrendingUp size={18} />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentMonthRevenue)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Calculado (Transações Pagas)</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Custos ({new Date(costFilterYear, costFilterMonth).toLocaleString('default', { month: 'short' })})</h3>
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                        <TrendingDown size={18} />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentMonthCosts)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Despesas Operacionais</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lucro Real</h3>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <DollarSign size={18} />
                      </div>
                    </div>
                    <div className={`text-2xl font-black ${realProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realProfit)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Receita - Custos</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Margem</h3>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <PieChart size={18} />
                      </div>
                    </div>
                    <div className={`text-2xl font-black ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {margin.toFixed(1)}%
                    </div>
                    <p className="text-xs text-slate-400 mt-1">% de Lucro</p>
                  </div>
                </div>
              );
            })()}

            {/* Costs List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h3 className="font-bold text-slate-900">Detalhamento de Custos</h3>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <select
                      value={costFilterMonth}
                      onChange={(e) => setCostFilterMonth(parseInt(e.target.value))}
                      className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2 py-1"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select
                      value={costFilterYear}
                      onChange={(e) => setCostFilterYear(parseInt(e.target.value))}
                      className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2 py-1"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal('cost')}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
                >
                  <Plus size={14} />
                  <span>Novo Custo</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Descrição</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {costs
                      .filter(c => {
                        const d = new Date(c.date);
                        return d.getMonth() === costFilterMonth && d.getFullYear() === costFilterYear;
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                          Nenhum custo registrado neste período.
                        </td>
                      </tr>
                    ) : (
                      costs
                        .filter(c => {
                          const d = new Date(c.date);
                          return d.getMonth() === costFilterMonth && d.getFullYear() === costFilterYear;
                        })
                        .map(cost => (
                          <tr key={cost.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 font-medium text-slate-900">{cost.description}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{cost.category}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{new Date(cost.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost.value)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteCost(cost.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}

      <Modal isOpen={activeModal === 'cost'} onClose={() => setActiveModal('none')} title="Adicionar Custo Operacional">
        <form onSubmit={handleCreateCost} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Servidor AWS, Licença de Software..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
              value={newCost.description}
              onChange={e => setNewCost({ ...newCost, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Categoria</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                value={newCost.category}
                onChange={e => setNewCost({ ...newCost, category: e.target.value })}
              >
                <option value="Infrastructure">Infraestrutura</option>
                <option value="License">Licenças</option>
                <option value="Labor">Mão de Obra</option>
                <option value="Marketing">Marketing / Mídia</option>
                <option value="Other">Outros</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Data</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                value={newCost.date}
                onChange={e => setNewCost({ ...newCost, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Valor (R$)</label>
            <input
              type="text"
              placeholder="0,00"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all font-mono"
              value={newCost.value}
              onChange={e => setNewCost({ ...newCost, value: e.target.value })}
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-50 flex items-center gap-2"
            >
              {modalLoading && <Loader2 size={16} className="animate-spin" />}
              Adicionar Custo
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'lead-type-selection' as any} onClose={() => setActiveModal('none')} title="Tipo de Contato">
        <div className="grid grid-cols-2 gap-4 pb-4">
          <button
            onClick={() => { setLeadType('whatsapp'); setActiveModal('lead'); }}
            className="flex flex-col items-center justify-center p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-100 transition-all group"
          >
            <div className="p-3 bg-emerald-200 rounded-full mb-3 text-emerald-800 group-hover:scale-110 transition-transform"><Smartphone size={24} /></div>
            <span className="font-bold text-emerald-900">WhatsApp Lead</span>
            <span className="text-xs text-emerald-600/70 text-center mt-1">Contato via número</span>
          </button>
          <button
            onClick={() => { setLeadType('email'); setActiveModal('lead'); }}
            className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl hover:border-blue-500 hover:bg-blue-100 transition-all group"
          >
            <div className="p-3 bg-blue-200 rounded-full mb-3 text-blue-800 group-hover:scale-110 transition-transform"><Mail size={24} /></div>
            <span className="font-bold text-blue-900">E-mail Lead</span>
            <span className="text-xs text-blue-600/70 text-center mt-1">Contato via e-mail</span>
          </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'lead'} onClose={() => setActiveModal('none')} title={`Novo Lead (${leadType === 'whatsapp' ? 'WhatsApp' : 'E-mail'})`}>
        <form onSubmit={handleCreateLead} className="space-y-4">
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nome Completo" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} required />
          {leadType === 'whatsapp' ? (
            <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Telefone (Ex: 5511999999999)" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} required />
          ) : (
            <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="E-mail (ex: nome@empresa.com)" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} required type="email" />
          )}
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Empresa (Opcional)" value={newLead.company} onChange={e => setNewLead({ ...newLead, company: e.target.value })} />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Etiquetas (separadas por vírgula)" value={newLead.tags} onChange={e => setNewLead({ ...newLead, tags: e.target.value })} />
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar'}</button></div>
        </form>
      </Modal>





      <Modal isOpen={activeModal === 'client-config'} onClose={() => setActiveModal('none')} title="Configurações do Cliente">
        <form onSubmit={handleUpdateClient} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Informações Básicas</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="Nome do Cliente" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required />
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Razão Social" value={clientForm.corporateName} onChange={e => setClientForm({ ...clientForm, corporateName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Contato</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="E-mail" type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Telefone / WhatsApp" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Dados Fiscais / Localização</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="CNPJ" value={clientForm.cnpj} onChange={e => setClientForm({ ...clientForm, cnpj: e.target.value })} />
                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-24 resize-none" placeholder="Endereço Completo" value={clientForm.address} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Status do Contrato</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none"
                  value={clientForm.status}
                  onChange={e => setClientForm({ ...clientForm, status: e.target.value as any })}
                >
                  <option value="active">Ativo (Em dia)</option>
                  <option value="inactive">Inativo (Pausado)</option>
                  <option value="overdue">Inadimplente</option>
                  <option value="terminated">Contrato Encerrado</option>
                </select>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3 ml-1 flex items-center gap-2">
              <Smartphone size={14} className="text-emerald-500" />
              Configuração WhatsApp (API)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-mono"
                placeholder="URL da Instância (Ex: https://...)"
                value={clientForm.whatsapp_instance_url || ''}
                onChange={e => setClientForm({ ...clientForm, whatsapp_instance_url: e.target.value })}
              />
              <input
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-mono"
                placeholder="Token de Acesso"
                value={clientForm.whatsapp_token || ''}
                onChange={e => setClientForm({ ...clientForm, whatsapp_token: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Observações Internas</label>
            <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-20" placeholder="Observações sobre o cliente..." value={clientForm.observations} onChange={e => setClientForm({ ...clientForm, observations: e.target.value })} />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">{modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}</button>
          </div>
        </form>
      </Modal>










      <Modal isOpen={activeModal === 'success'} onClose={() => setActiveModal('none')} title="">
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-300">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Sucesso!</h3>
          <p className="text-slate-500">{successMessage}</p>
          <button
            onClick={() => setActiveModal('none')}
            className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors w-full"
          >
            Continuar
          </button>
        </div>
      </Modal>
    </div >
  );
};

export default ClientDetail;
