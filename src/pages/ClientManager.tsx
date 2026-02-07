
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building2,
  Calendar,
  ChevronRight,
  Wifi,
  Circle,
  Loader2,
  X,
  Settings,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  Phone,
  User,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  CreditCard,
  ClipboardList,
  ShieldCheck
} from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../services/supabase';
import Modal from '../components/ui/Modal';

interface ClientWithStats extends Client {
  onlineNumbers: number;
  totalNumbers: number;
}

const ClientManager: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
  const [activeMenuClientId, setActiveMenuClientId] = useState<string | null>(null);

  const [clientForm, setClientForm] = useState({
    name: '', // Nome Fantasia
    corporateName: '', // Razão Social
    cnpj: '',
    email: '',
    phone: '',
    contactPerson: '', // Responsável

    // Address
    zipCode: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',

    // Contract Defaults
    defaultServices: '',
    defaultTerm: '',
    defaultValue: '',
    defaultPaymentMethod: '',
    defaultPaymentConditions: '',

    observations: ''
  });

  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  // Get user from auth
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingClient(null);
    setClientForm({
      name: '', corporateName: '', cnpj: '', email: '', phone: '', contactPerson: '',
      zipCode: '', address: '', neighborhood: '', city: '', state: '',
      defaultServices: '', defaultTerm: '', defaultValue: '', defaultPaymentMethod: '', defaultPaymentConditions: '',
      observations: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, client: ClientWithStats) => {
    e.stopPropagation(); // Prevent navigation
    setModalMode('edit');
    setEditingClient(client);
    setClientForm({
      name: client.name,
      corporateName: client.corporateName || '',
      cnpj: client.cnpj || '',
      email: client.email,
      phone: client.phone || '',
      contactPerson: client.contactPerson || '',

      zipCode: client.zipCode || '',
      address: client.address || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || '',

      defaultServices: client.defaultServices || '',
      defaultTerm: client.defaultTerm || '',
      defaultValue: client.defaultValue || '',
      defaultPaymentMethod: client.defaultPaymentMethod || '',
      defaultPaymentConditions: client.defaultPaymentConditions || '',

      observations: client.observations || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClient = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este cliente? Todas as campanhas, leads e configurações serão perdidas.')) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
      fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Erro ao excluir cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !user) return;

    setCreateLoading(true);
    try {
      if (modalMode === 'create') {
        const { error } = await supabase.from('clients').insert({
          name: clientForm.name,
          corporate_name: clientForm.corporateName,
          cnpj: clientForm.cnpj,
          email: clientForm.email,
          phone: clientForm.phone,
          contact_person: clientForm.contactPerson,

          zip_code: clientForm.zipCode,
          address: clientForm.address,
          neighborhood: clientForm.neighborhood,
          city: clientForm.city,
          state: clientForm.state,

          default_services: clientForm.defaultServices,
          default_term: clientForm.defaultTerm,
          default_value: clientForm.defaultValue,
          default_payment_method: clientForm.defaultPaymentMethod,
          default_payment_conditions: clientForm.defaultPaymentConditions,

          observations: clientForm.observations,
          status: 'active',
          user_id: user.id
        });
        if (error) throw error;
      } else if (modalMode === 'edit' && editingClient) {
        const { error } = await supabase.from('clients').update({
          name: clientForm.name,
          corporate_name: clientForm.corporateName,
          cnpj: clientForm.cnpj,
          email: clientForm.email,
          phone: clientForm.phone,
          contact_person: clientForm.contactPerson,

          zip_code: clientForm.zipCode,
          address: clientForm.address,
          neighborhood: clientForm.neighborhood,
          city: clientForm.city,
          state: clientForm.state,

          default_services: clientForm.defaultServices,
          default_term: clientForm.defaultTerm,
          default_value: clientForm.defaultValue,
          default_payment_method: clientForm.defaultPaymentMethod,
          default_payment_conditions: clientForm.defaultPaymentConditions,

          observations: clientForm.observations
        }).eq('id', editingClient.id);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchClients(); // Refresh list
    } catch (err) {
      console.error('Error saving client:', err);
      alert('Erro ao salvar cliente.');
    } finally {
      setCreateLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // In a real scenario, we would join with numbers table to get stats
      // For now, mapping to 0/0 stats or mock stats until numbers table is fully populated
      const clientsWithStats = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        corporateName: c.corporate_name,
        cnpj: c.cnpj,
        status: c.status,
        createdAt: c.created_at,
        email: c.email || '',
        phone: c.phone || '',
        contactPerson: c.contact_person,

        address: c.address,
        zipCode: c.zip_code,
        neighborhood: c.neighborhood,
        city: c.city,
        state: c.state,

        defaultServices: c.default_services,
        defaultTerm: c.default_term,
        defaultValue: c.default_value,
        defaultPaymentMethod: c.default_payment_method,
        defaultPaymentConditions: c.default_payment_conditions,
        google_sheets_config: c.google_sheets_config,

        observations: c.observations || '',
        onlineNumbers: 0, // Placeholder: requires joining or separate count query
        totalNumbers: 0
      }));

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight flex flex-col md:flex-row items-center gap-3">
            <Building2 className="text-yellow-500" size={32} />
            Gestão de Clientes
          </h1>
          <p className="text-slate-300 font-medium text-sm md:text-base">Administre seus tenants, configure ambientes isolados e monitore o status de cada operação.</p>
        </div>
        <div className="relative z-10 w-full md:w-auto">
          <button
            onClick={handleOpenCreate}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95 text-sm md:text-base"
          >
            <Plus size={20} />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? "Novo Cliente" : "Editar Cliente"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Section 1: Company Info */}
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dados da Empresa</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Nome Fantasia (Interno)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Building2 size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Tech Solutions"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={clientForm.name}
                    onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Razão Social</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Building2 size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Tech Solutions Ltda"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={clientForm.corporateName}
                    onChange={e => setClientForm({ ...clientForm, corporateName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">CNPJ</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <ShieldCheck size={16} className="lucide-building-2" />
                  </div>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={clientForm.cnpj}
                    onChange={e => setClientForm({ ...clientForm, cnpj: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">E-mail</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    placeholder="contato@empresa.com"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={clientForm.email}
                    onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Telefone / WhatsApp</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Phone size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={clientForm.phone}
                    onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-600 ml-1">Nome do Responsável</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Quem assina o contrato?"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={clientForm.contactPerson}
                  onChange={e => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <MapPin size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Endereço Completo</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 md:col-span-1">
                <label className="text-[13px] font-bold text-slate-600 ml-1">CEP</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <MapPin size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="00000-000"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    value={clientForm.zipCode}
                    onChange={e => setClientForm({ ...clientForm, zipCode: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-3">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Endereço (Rua, Número, Comp)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                    <MapPin size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Av. Paulista, 1000 - Cj 10"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    value={clientForm.address}
                    onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  value={clientForm.neighborhood}
                  onChange={e => setClientForm({ ...clientForm, neighborhood: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Cidade</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  value={clientForm.city}
                  onChange={e => setClientForm({ ...clientForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Estado</label>
                <input
                  type="text"
                  placeholder="UF"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  value={clientForm.state}
                  onChange={e => setClientForm({ ...clientForm, state: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contract Defaults */}
          <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <FileText size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dados Padrão do Contrato</h3>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-600 ml-1">Serviços Contratados</label>
              <div className="relative group">
                <div className="absolute top-3 left-4 pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                  <ClipboardList size={16} />
                </div>
                <textarea
                  placeholder="Descrição resumida dos serviços..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all min-h-[80px]"
                  value={clientForm.defaultServices}
                  onChange={e => setClientForm({ ...clientForm, defaultServices: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Prazo do Contrato</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                    <Clock size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: 12 meses"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    value={clientForm.defaultTerm}
                    onChange={e => setClientForm({ ...clientForm, defaultTerm: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Valor Total</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                    <DollarSign size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: R$ 5.000,00"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    value={clientForm.defaultValue}
                    onChange={e => setClientForm({ ...clientForm, defaultValue: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Forma de Pagamento</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                    <CreditCard size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Boleto Bancário"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    value={clientForm.defaultPaymentMethod}
                    onChange={e => setClientForm({ ...clientForm, defaultPaymentMethod: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-600 ml-1">Condições de Pagamento</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                    <ClipboardList size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Dia 10 de cada mês"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    value={clientForm.defaultPaymentConditions}
                    onChange={e => setClientForm({ ...clientForm, defaultPaymentConditions: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Obs */}
          <div className="space-y-3 pt-2">
            <label className="text-[13px] font-bold text-slate-600 ml-1 flex items-center gap-2">
              <FileText size={14} className="text-slate-400" />
              Observações Gerais
            </label>
            <textarea
              placeholder="Notas internas sobre o cliente..."
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all min-h-[100px]"
              value={clientForm.observations}
              onChange={e => setClientForm({ ...clientForm, observations: e.target.value })}
            />
          </div>

          <div className="pt-6 flex justify-end items-center gap-4 sticky bottom-0 bg-white py-4 border-t border-slate-100 -mx-6 px-6 z-10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
            >
              {createLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span>{modalMode === 'create' ? 'Criar Cliente' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-[#ffd700] transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#ffd700] focus:ring-4 focus:ring-[#ffd700]/20 transition-all shadow-sm group-hover:shadow-md"
        />
        <div className="hidden md:flex absolute inset-y-0 right-0 pr-4 items-center pointer-events-none">
          <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-400 border border-slate-200">CTRL K</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
            <div className="w-12 h-12 border-4 border-brand-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-400 font-medium animate-pulse">Carregando clientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              <div className="relative z-10 p-6 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3.5 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300 shadow-sm">
                    <Building2 size={24} />
                  </div>

                  {/* Gear Menu */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActiveMenuClientId(activeMenuClientId === client.id ? null : client.id)}
                      className={`p-2 rounded-xl transition-all duration-200 ${activeMenuClientId === client.id ? 'bg-slate-100 text-slate-900 ring-2 ring-slate-200' : 'text-slate-300 hover:bg-slate-50 hover:text-slate-600'}`}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeMenuClientId === client.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuClientId(null)} />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Ações do Cliente
                          </div>
                          <button
                            onClick={(e) => { setActiveMenuClientId(null); handleOpenEdit(e, client); }}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-bold transition-colors"
                          >
                            <Edit2 size={16} />
                            <span>Editar Dados</span>
                          </button>
                          <button
                            onClick={(e) => { setActiveMenuClientId(null); handleDeleteClient(e, client.id); }}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-rose-50 text-rose-500 text-sm font-bold transition-colors border-t border-slate-50"
                          >
                            <Trash2 size={16} />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900 mb-1 line-clamp-1" title={client.name}>{client.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-1" title={client.email || 'Sem e-mail'}>{client.email || '—'}</p>
                </div>

                <div className="flex flex-wrap gap-2 mt-auto">
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${client.status === 'active'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                    <Circle size={6} className={`mr-1.5 fill-current ${client.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                    {client.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>

                  {client.totalNumbers > 0 ? (
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-lg border ${client.onlineNumbers === client.totalNumbers
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200'
                      : client.onlineNumbers > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                      <Wifi size={12} />
                      {client.onlineNumbers}/{client.totalNumbers} Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1 rounded-lg border border-dashed border-slate-200 text-slate-400 bg-slate-50/50">
                      Sem Conexões
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
                  <div className="flex items-center text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                    <Calendar size={12} className="mr-1.5" />
                    <span>{new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>

              {/* Decorative Background */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientManager;
