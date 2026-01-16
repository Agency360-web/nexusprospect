
import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Removed mockCampaigns

const HistoryLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transmissions, setTransmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransmissions();
  }, []);

  const fetchTransmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transmissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransmissions(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatórios de Disparos</h1>
          <p className="text-slate-500 mt-1">Histórico completo de todas as campanhas e integrações.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <Filter size={20} />
          </button>
          <button className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            <Download size={18} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome da campanha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select className="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2.5 outline-none flex-1 md:flex-none">
            <option>Status: Todos</option>
            <option>Concluídos</option>
            <option>Em Processamento</option>
            <option>Falhas</option>
          </select>
          <select className="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2.5 outline-none flex-1 md:flex-none">
            <option>Data: Últimos 30 dias</option>
            <option>Hoje</option>
            <option>Este Mês</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Destinatário/Batch</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Canal</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <Loader2 className="animate-spin h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-400 mt-2">Carregando histórico...</p>
                  </td>
                </tr>
              ) : transmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <p className="text-sm text-slate-400">Nenhum registro de disparo encontrado.</p>
                  </td>
                </tr>
              ) : (
                transmissions.filter(t =>
                  t.recipient?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <ExternalLink size={18} />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{item.recipient || 'Sem destinatário'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-bold uppercase">
                      {item.channel}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-tighter ${item.status === 'sent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        item.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          item.status === 'read' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        <Circle size={6} className="mr-1.5 fill-current" />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-all">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <span className="text-sm text-slate-500">
            {loading ? 'Carregando...' : `Mostrando ${transmissions.length} resultados`}
          </span>
          <div className="flex items-center space-x-2">
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed">
              <ChevronLeft size={18} />
            </button>
            <button className="px-3 py-1 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-md shadow-slate-900/10">1</button>
            <button className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">2</button>
            <button className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">3</button>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryLogs;
