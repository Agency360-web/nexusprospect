
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
  Trash2
} from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie múltiplos tenants e seus ambientes isolados.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? "Novo Cliente" : "Editar Cliente"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Section 1: Company Info */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Dados da Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nome Fantasia (Interno)</label>
                <input
                  type="text"
                  placeholder="Ex: Tech Solutions"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.name}
                  onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Razão Social</label>
                <input
                  type="text"
                  placeholder="Ex: Tech Solutions Ltda"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.corporateName}
                  onChange={e => setClientForm({ ...clientForm, corporateName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.cnpj}
                  onChange={e => setClientForm({ ...clientForm, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">E-mail</label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.email}
                  onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.phone}
                  onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nome do Responsável</label>
              <input
                type="text"
                placeholder="Quem assina o contrato?"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                value={clientForm.contactPerson}
                onChange={e => setClientForm({ ...clientForm, contactPerson: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Address */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Endereço Completo</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-bold text-slate-700">CEP</label>
                <input
                  type="text"
                  placeholder="00000-000"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.zipCode}
                  onChange={e => setClientForm({ ...clientForm, zipCode: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-bold text-slate-700">Endereço (Rua, Número, Comp)</label>
                <input
                  type="text"
                  placeholder="Av. Paulista, 1000 - Cj 10"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.address}
                  onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.neighborhood}
                  onChange={e => setClientForm({ ...clientForm, neighborhood: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Cidade</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.city}
                  onChange={e => setClientForm({ ...clientForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Estado</label>
                <input
                  type="text"
                  placeholder="UF"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.state}
                  onChange={e => setClientForm({ ...clientForm, state: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contract Defaults */}
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Dados Padrão do Contrato</h3>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Serviços Contratados</label>
              <textarea
                placeholder="Descrição resumida dos serviços..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 min-h-[60px]"
                value={clientForm.defaultServices}
                onChange={e => setClientForm({ ...clientForm, defaultServices: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Prazo do Contrato</label>
                <input
                  type="text"
                  placeholder="Ex: 12 meses"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.defaultTerm}
                  onChange={e => setClientForm({ ...clientForm, defaultTerm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Valor Total</label>
                <input
                  type="text"
                  placeholder="Ex: R$ 5.000,00"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.defaultValue}
                  onChange={e => setClientForm({ ...clientForm, defaultValue: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Forma de Pagamento</label>
                <input
                  type="text"
                  placeholder="Ex: Boleto Bancário"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.defaultPaymentMethod}
                  onChange={e => setClientForm({ ...clientForm, defaultPaymentMethod: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Condições de Pagamento</label>
                <input
                  type="text"
                  placeholder="Ex: Dia 10 de cada mês"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                  value={clientForm.defaultPaymentConditions}
                  onChange={e => setClientForm({ ...clientForm, defaultPaymentConditions: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Obs */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="text-sm font-bold text-slate-700">Observações Gerais</label>
            <textarea
              placeholder="Notas internas sobre o cliente..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 min-h-[80px]"
              value={clientForm.observations}
              onChange={e => setClientForm({ ...clientForm, observations: e.target.value })}
            />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 flex items-center space-x-2"
            >
              {createLoading && <Loader2 size={16} className="animate-spin" />}
              <span>{modalMode === 'create' ? 'Criar Cliente' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar cliente por nome ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer relative"
            >
              <div className="relative z-10 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Building2 size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${client.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                        <Circle size={6} className={`mr-1.5 fill-current ${client.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>

                      {client.totalNumbers > 0 && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border ${client.onlineNumbers === client.totalNumbers
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : client.onlineNumbers > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}>
                          <Wifi size={10} />
                          {client.onlineNumbers}/{client.totalNumbers} Online
                        </span>
                      )}
                    </div>

                    {/* Gear Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuClientId(activeMenuClientId === client.id ? null : client.id)}
                        className={`p-2 rounded-lg transition-colors ${activeMenuClientId === client.id ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                      >
                        <Settings size={18} />
                      </button>

                      {activeMenuClientId === client.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuClientId(null)} />
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                            <button
                              onClick={(e) => { setActiveMenuClientId(null); handleOpenEdit(e, client); }}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
                            >
                              <Edit2 size={16} />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={(e) => { setActiveMenuClientId(null); handleDeleteClient(e, client.id); }}
                              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-rose-50 text-rose-500 text-sm font-medium transition-colors border-t border-slate-50"
                            >
                              <Trash2 size={16} />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1">{client.name}</h3>
                <p className="text-sm text-slate-500 mb-6">{client.email}</p>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center text-xs text-slate-400">
                    <Calendar size={14} className="mr-1.5" />
                    <span>Desde {new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>

              {/* Subtle background decoration */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -right-4 -top-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                  <Building2 size={120} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientManager;
