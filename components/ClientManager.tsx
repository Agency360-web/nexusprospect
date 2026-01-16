
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
  X
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
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  // Get user from auth
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail || !user) return;

    setCreateLoading(true);
    try {
      const { error } = await supabase.from('clients').insert({
        name: newClientName,
        email: newClientEmail,
        status: 'active',
        user_id: user.id
      });

      if (error) throw error;

      setIsModalOpen(false);
      setNewClientName('');
      setNewClientEmail('');
      fetchClients(); // Refresh list
    } catch (err) {
      console.error('Error creating client:', err);
      alert('Erro ao criar cliente.');
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
        status: c.status,
        createdAt: c.created_at,
        email: c.email || '',
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
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Cliente">
        <form onSubmit={createClient} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Nome da Empresa</label>
            <input
              type="text"
              placeholder="Ex: Tech Solutions Ltda"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Email Administrativo</label>
            <input
              type="email"
              placeholder="admin@empresa.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
              value={newClientEmail}
              onChange={e => setNewClientEmail(e.target.value)}
              required
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
              <span>Criar Cliente</span>
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
              className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Building2 size={24} />
                </div>
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

              {/* Subtle background decoration */}
              <div className="absolute -right-4 -top-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <Building2 size={120} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientManager;
