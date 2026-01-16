
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Webhook as WebhookIcon,
  Smartphone,
  History,
  Settings,
  Plus,
  Play,
  Activity,
  Zap,
  CheckCircle2,
  Copy,
  Trash2,
  Globe,
  MoreVertical,
  Check,
  Users,
  Tag as TagIcon,
  Search,
  Filter,
  FileUp,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Lock,
  Wifi,
  WifiOff,
  Target,
  Mail,
  AtSign
} from 'lucide-react';
import { WebhookConfig, WhatsAppNumber, Lead, Tag, Client, EmailSender } from '../types';
import ClientGoals from './ClientGoals';
import ClientOverviewGoals from './ClientOverviewGoals';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';

const ClientDetail: React.FC = () => {
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'numbers' | 'webhooks' | 'leads' | 'campaigns' | 'goals'>('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [emailSenders, setEmailSenders] = useState<EmailSender[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);

  // Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'lead' | 'webhook' | 'number' | 'email' | 'success'>('none');
  const [modalLoading, setModalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', company: '', tags: '' });
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', type: 'inbound' as const });
  const [newNumber, setNewNumber] = useState({ nickname: '', phone: '' });
  const [newEmail, setNewEmail] = useState({ email: '', provider: 'smtp', fromName: '' });
  const [leadType, setLeadType] = useState<'whatsapp' | 'email'>('whatsapp');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Stats State
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeTags: 0,
    optInRate: '0%',
    bounces: 0
  });

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const payload: any = {
        client_id: clientId,
        name: newLead.name,
        status: 'valid',
        tags: newLead.tags ? newLead.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        custom_fields: { empresa: newLead.company }
      };

      if (leadType === 'whatsapp') {
        payload.phone = newLead.phone;
      } else {
        payload.email = newLead.email;
        // Ensure we explicitly send phone as null if it's an email lead, 
        // though Supabase might handle it.
        payload.phone = null;
      }

      const { error } = await supabase.from('leads').insert(payload);
      if (error) throw error;
      setActiveModal('none');
      setNewLead({ name: '', phone: '', email: '', company: '', tags: '' });
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
        const tagsIdx = headers.findIndex(h => h.toLowerCase().includes('etiquetas') || h.toLowerCase().includes('tags'));

        if (nameIdx === -1 || contactIdx === -1) {
          alert('Formato inválido. Colunas obrigatórias: Nome, Telefone/E-mail');
          return;
        }

        const leadsToInsert = rows.slice(1).map(row => {
          const cols = row.split(';').length > 1 ? row.split(';') : row.split(',');
          const name = cols[nameIdx]?.trim();
          const contact = cols[contactIdx]?.trim();
          const tagsRaw = tagsIdx !== -1 ? cols[tagsIdx]?.trim() : '';

          if (!name || !contact) return null;

          // Parse tags if needed, assuming comma separated inside the column? 
          // For now, let's simple string split
          const tagsList = tagsRaw ? tagsRaw.split('|').map(t => t.trim()) : [];

          return {
            client_id: clientId,
            name,
            [isEmail ? 'email' : 'phone']: contact,
            tags: tagsList, // We need to handle tag ID creation or text tags. 
            // The DB expects tags text[], but frontend logic often uses IDs. 
            // The user prompt implies text labels. I will save text for now.
            status: 'valid'
          };
        }).filter(l => l !== null);

        if (leadsToInsert.length > 0) {
          const { error } = await supabase.from('leads').insert(leadsToInsert);
          if (error) throw error;
          setSuccessMessage(`${leadsToInsert.length} leads importados com sucesso!`);
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


  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('webhook_configs').insert({
        client_id: clientId,
        name: newWebhook.name,
        url: newWebhook.url,
        type: newWebhook.type,
        method: 'POST',
        active: true
      });
      if (error) throw error;
      setActiveModal('none');
      setNewWebhook({ name: '', url: '', type: 'inbound' });
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao criar webhook'); }
    finally { setModalLoading(false); }
  };

  const handleCreateNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('whatsapp_numbers').insert({
        client_id: clientId,
        nickname: newNumber.nickname,
        phone: newNumber.phone,
        status: 'active',
        daily_limit: 1000,
        sent_today: 0
      });
      if (error) throw error;
      setActiveModal('none');
      setNewNumber({ nickname: '', phone: '' });
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao vincular número'); }
    finally { setModalLoading(false); }
  };

  const handleCreateEmailSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('email_senders').insert({
        client_id: clientId,
        email: newEmail.email,
        provider: newEmail.provider,
        from_name: newEmail.fromName,
        status: 'active',
        daily_limit: 500
      });
      if (error) throw error;
      setActiveModal('none');
      setNewEmail({ email: '', provider: 'smtp', fromName: '' });
      setSuccessMessage('E-mail vinculado com sucesso!');
      setActiveModal('success');
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao vincular e-mail'); }
    finally { setModalLoading(false); }
  };

  useEffect(() => {
    if (clientId) fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      setLoading(true);

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
          email: clientData.email
        });
      }

      // 2. Fetch Leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('client_id', clientId);

      if (leadsData) {
        setLeads(leadsData.map((l: any) => ({
          id: l.id,
          clientId: l.client_id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          tags: l.tags || [],
          customFields: l.custom_fields || {},
          status: l.status
        })));
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

      // 4. Fetch Numbers
      const { data: numbersData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('client_id', clientId);

      if (numbersData) {
        setNumbers(numbersData.map((n: any) => ({
          id: n.id,
          clientId: n.client_id,
          nickname: n.nickname,
          phone: n.phone,
          status: n.status,
          dailyLimit: n.daily_limit,
          sentToday: n.sent_today
        })));
      }

      // 4.5 Fetch Email Senders
      const { data: emailsData } = await supabase
        .from('email_senders')
        .select('*')
        .eq('client_id', clientId);

      if (emailsData) {
        setEmailSenders(emailsData.map((e: any) => ({
          id: e.id,
          clientId: e.client_id,
          email: e.email,
          provider: e.provider,
          fromName: e.from_name,
          status: e.status,
          dailyLimit: e.daily_limit,
          sentToday: e.sent_today
        })));
      }

      // 5. Fetch Webhooks
      const { data: webhooksData } = await supabase
        .from('webhook_configs')
        .select('*')
        .eq('client_id', clientId);

      if (webhooksData) {
        setWebhooks(webhooksData.map((w: any) => ({
          id: w.id,
          clientId: w.client_id,
          name: w.name,
          url: w.url,
          type: w.type,
          method: w.method,
          active: w.active,
          headers: w.headers || {}
        })));
      }

      // Update stats based on fetched data
      setStats({
        totalLeads: leadsData?.length || 0,
        activeTags: tagsData?.length || 0,
        optInRate: leadsData?.length ? '100%' : '-', // Placeholder logic
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/clients" className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono uppercase tracking-widest">ID: {clientId?.substring(0, 8)}...</span>
            </div>
            <p className="text-sm text-slate-500">Gestão de ambiente isolado e audiência</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => alert('Configurações em breve')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Settings size={16} />
            <span>Configurar</span>
          </button>
          <Link to="/new-campaign" className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-900/10">
            <Plus size={18} />
            <span>Nova Campanha</span>
          </Link>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 flex px-2 overflow-x-auto no-scrollbar rounded-t-3xl">
        <TabButton id="overview" label="Geral" icon={Activity} />
        <TabButton id="numbers" label="Canais" icon={Smartphone} />
        <TabButton id="webhooks" label="Webhooks" icon={WebhookIcon} />
        <TabButton id="leads" label="Leads" icon={Users} />
        <TabButton id="campaigns" label="Campanhas" icon={History} />
        <TabButton id="goals" label="Metas" icon={Target} />
      </div>

      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center space-x-2">
                  <Users size={18} className="text-slate-400" />
                  <span>Resumo da Audiência</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Leads</div>
                    <div className="text-2xl font-black text-slate-900">{stats.totalLeads}</div>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 text-center">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Opt-in</div>
                    <div className="text-2xl font-black text-emerald-700">{stats.optInRate}</div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tags Ativas</div>
                    <div className="text-2xl font-black text-slate-900">{stats.activeTags}</div>
                  </div>
                  <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 text-center">
                    <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-1">Bounces</div>
                    <div className="text-2xl font-black text-rose-700">{stats.bounces}</div>
                  </div>
                </div>
              </div>

              <ClientOverviewGoals clientId={clientId!} />

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center space-x-2">
                  <Zap size={18} className="text-slate-400" />
                  <span>Ações Rápidas de Growth</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center space-x-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all text-left group">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors"><FileUp size={20} /></div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Importar Lista CSV</div>
                      <div className="text-xs text-slate-500">Mapeamento dinâmico de campos</div>
                    </div>
                  </button>
                  <button className="flex items-center space-x-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all text-left group">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors"><TagIcon size={20} /></div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Segmentação Avançada</div>
                      <div className="text-xs text-slate-500">Criar réguas por etiquetas</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-lg font-bold mb-1">Endpoint Token</h4>
                  <p className="text-slate-400 text-xs mb-6 leading-relaxed">Use este segredo para autenticar requisições via webhook externas para este tenant.</p>
                  <div className="bg-white/10 p-4 rounded-2xl flex items-center justify-between backdrop-blur-sm border border-white/10">
                    <code className="text-xs font-mono truncate mr-4">
                      sk_live_{clientId?.replace(/-/g, '').substring(0, 8)}...
                    </code>
                    <button onClick={() => copyToClipboard(`sk_live_${clientId?.replace(/-/g, '')}`, 'cid')} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                      {copied === 'cid' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-10">
                  <Lock size={120} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-slate-400" />
                  Status da Instância
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${numbers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      <span className="text-xs font-medium text-slate-600">Primary Instance</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${numbers.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {numbers.length > 0 ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                      <span className="text-xs font-medium text-slate-400">Secondary Gateway</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'numbers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Canais de Disparo Ativos</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveModal('email')}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  <Plus size={14} />
                  <span>Vincular Novo E-mail</span>
                </button>
                <button
                  onClick={() => setActiveModal('number')}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  <Plus size={14} />
                  <span>Vincular Novo Número</span>
                </button>
              </div>
            </div>

            {/* WhatsApp Numbers Grid */}
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">WhatsApp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {numbers.map((num, i) => {
                // Determine status based on num.status
                const isOnline = num.status === 'active' || num.status === 'connected';
                return (
                  <div key={num.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-4">
                        <div className={`p-4 rounded-2xl relative ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                          <Smartphone size={24} />
                          {isOnline && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{num.nickname}</h4>
                          <p className="text-xs font-mono text-slate-500">{num.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">Sincronizado há 2m</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Uso do Limite Diário</span>
                        <span className="text-xs font-bold text-slate-900">{num.sentToday} / {num.dailyLimit}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${num.sentToday > num.dailyLimit * 0.9 ? 'bg-amber-500' : 'bg-slate-900'}`}
                          style={{ width: `${(num.sentToday / num.dailyLimit) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-between items-center">
                      <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-bold">SP</div>
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-bold text-slate-400">+</div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"><RefreshCw size={16} /></button>
                        <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-slate-900">Integrações de Entrada/Saída</h3>
                <button
                  onClick={() => setActiveModal('webhook')}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  <Plus size={14} />
                  <span>Configurar Webhook</span>
                </button>
              </div>

              <div className="space-y-4">
                {webhooks.map(wh => (
                  <div key={wh.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${wh.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                        <WebhookIcon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{wh.name}</span>
                          <span className="text-[8px] bg-slate-200 px-1 py-0.5 rounded font-bold uppercase text-slate-500">{wh.type}</span>
                        </div>
                        <code className="text-[10px] text-slate-400 font-mono mt-1 block truncate max-w-xs">{wh.url}</code>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Testar</button>
                      <button className="p-2 text-slate-400 hover:text-slate-900"><Copy size={16} /></button>
                      <button className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead / Identificação</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Segmentação</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900">{lead.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-tight">{lead.customFields.empresa}</div>
                      </td>
                      <td className="px-8 py-5 font-mono text-slate-500 font-medium">
                        {lead.phone || lead.email}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {lead.tags.map(tid => {
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
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <span>{leads.length} Contatos listados</span>
                <div className="flex space-x-4">
                  <button className="hover:text-slate-900">Anterior</button>
                  <button className="hover:text-slate-900">Próximo</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                <History size={48} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">Histórico de Disparos</h4>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">Visualize relatórios detalhados de entrega, abertura e erros de campanhas passadas deste cliente.</p>
              </div>
              <Link to="/new-campaign" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-slate-900/10">
                Iniciar Primeiro Disparo
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <ClientGoals clientId={clientId!} />
        )}
      </div>

      {/* Modals */}

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

      <Modal isOpen={activeModal === 'webhook'} onClose={() => setActiveModal('none')} title="Configurar Webhook">
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nome do Webhook" value={newWebhook.name} onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })} required />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="URL de Destino" value={newWebhook.url} onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })} required />
          <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newWebhook.type} onChange={e => setNewWebhook({ ...newWebhook, type: e.target.value as any })}>
            <option value="inbound">Inbound (Recebimento)</option>
            <option value="outbound">Outbound (Envio)</option>
            <option value="status">Status (Entregas)</option>
          </select>
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'number'} onClose={() => setActiveModal('none')} title="Vincular WhatsApp">
        <form onSubmit={handleCreateNumber} className="space-y-4">
          <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl mb-4">Para conectar, você precisará escanear o QR Code após o cadastro.</div>
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Apelido do Número" value={newNumber.nickname} onChange={e => setNewNumber({ ...newNumber, nickname: e.target.value })} required />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Número (Ex: 5511999999999)" value={newNumber.phone} onChange={e => setNewNumber({ ...newNumber, phone: e.target.value })} required />
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Vincular'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'email'} onClose={() => setActiveModal('none')} title="Vincular Conta de E-mail">
        <form onSubmit={handleCreateEmailSender} className="space-y-4">
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nome do Remetente" value={newEmail.fromName} onChange={e => setNewEmail({ ...newEmail, fromName: e.target.value })} required />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Endereço de E-mail" type="email" value={newEmail.email} onChange={e => setNewEmail({ ...newEmail, email: e.target.value })} required />
          <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newEmail.provider} onChange={e => setNewEmail({ ...newEmail, provider: e.target.value })}>
            <option value="smtp">SMTP Personalizado</option>
            <option value="sendgrid">SendGrid API</option>
            <option value="aws">AWS SES</option>
            <option value="resend">Resend</option>
          </select>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-bold">Configurações de Autenticação</p>
            <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm mb-2" placeholder="API Key / Senha SMTP" type="password" />
            <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" placeholder="Host (para SMTP)" disabled={newEmail.provider !== 'smtp'} />
          </div>
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Vincular'}</button></div>
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
