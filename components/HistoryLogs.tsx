
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  Calendar,
  Megaphone,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Tab = 'campaigns' | 'transmissions';

const HistoryLogs: React.FC = () => {
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('last30');

  // Data State
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on search change
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch on filter/page/tab change
  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, statusFilter, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let query: any;

      // Select Table
      if (activeTab === 'campaigns') {
        query = supabase
          .from('campaigns')
          .select('*, clients(name)', { count: 'exact' });
      } else {
        query = supabase
          .from('transmissions')
          .select('*, clients(name)', { count: 'exact' });
      }

      // Apply Search
      if (searchTerm) {
        if (activeTab === 'campaigns') {
          query = query.ilike('name', `%${searchTerm}%`);
        } else {
          query = query.or(`recipient.ilike.%${searchTerm}%`);
        }
      }

      // Apply Status Filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply Date Filter
      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'last30') {
        startDate.setDate(now.getDate() - 30);
      } else if (dateRange === 'thisMonth') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }
      // 'all' does nothing

      if (dateRange !== 'all') {
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: resultData, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setData(resultData || []);
      setTotalCount(count || 0);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
            <Filter className="text-red-500" size={32} />
            Relatórios de Disparos
          </h1>
          <p className="text-slate-300 font-medium w-full">Histórico completo e detalhado de todas as campanhas e integrações realizadas.</p>
        </div>
        <div className="relative z-10 flex gap-3">
          <button className="flex items-center space-x-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95">
            <Download size={20} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col space-y-4">
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => handleTabChange('campaigns')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'campaigns'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
          >
            <Megaphone size={16} />
            <span>Campanhas (Webhook)</span>
          </button>
          <button
            onClick={() => handleTabChange('transmissions')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'transmissions'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
          >
            <MessageSquare size={16} />
            <span>Mensagens Individuais</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-2 items-center shadow-sm">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder={activeTab === 'campaigns' ? "Buscar por nome da campanha..." : "Buscar por destinatário..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium"
            />
          </div>
          <div className="flex items-center space-x-2 w-full md:w-auto p-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl px-4 py-3 outline-none flex-1 md:flex-none hover:bg-slate-100 transition-colors cursor-pointer focus:border-brand-500"
            >
              <option value="all">Status: Todos</option>
              <option value="completed">Concluídos/Enviados</option>
              <option value="sending">Em Processamento</option>
              <option value="failed">Falhas</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl px-4 py-3 outline-none flex-1 md:flex-none hover:bg-slate-100 transition-colors cursor-pointer focus:border-brand-500"
            >
              <option value="last30">Últimos 30 dias</option>
              <option value="today">Hoje</option>
              <option value="thisMonth">Este Mês</option>
              <option value="all">Todo o Período</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                {activeTab === 'campaigns' ? (
                  <>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">Nome da Campanha</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente (Tenant)</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5"></th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">Destinatário</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente (Tenant)</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-20">
                    <Loader2 className="animate-spin h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-400 mt-2 font-medium">Carregando dados...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <Search size={32} />
                      </div>
                      <p className="font-medium">Nenhum registro encontrado com os filtros atuais.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                    {activeTab === 'campaigns' ? (
                      <>
                        <td className="px-8 py-5 pl-10">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                              <Megaphone size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{item.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{item.message}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-slate-600">
                          {item.clients?.name || 'Desconhecido'}
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                              item.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                            <Circle size={6} className="mr-1.5 fill-current" />
                            {item.status === 'completed' ? 'Concluído' : item.status === 'sending' ? 'Enviando' : item.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right pr-8">
                          <button className="text-slate-300 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-all">
                            <MoreVertical size={20} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-8 py-5 pl-10">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                              <ExternalLink size={18} />
                            </div>
                            <span className="text-sm font-bold text-slate-900">{item.recipient || 'Sem destinatário'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-xs font-black uppercase text-slate-400">
                          {item.channel}
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-slate-600">
                          {item.clients?.name || 'Desconhecido'}
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                          {new Date(item.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${item.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                              item.status === 'read' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                            <Circle size={6} className="mr-1.5 fill-current" />
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="bg-slate-50/50 px-8 py-5 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {loading ? 'Carregando...' : `Mostrando ${data.length} de ${totalCount} resultados`}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Numbers Snippet */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Simple logic to show first 5 pages or adjust window. 
                // For simplicity here, just showing up to 5 or logic around current.
                // Let's simplify to just Current Loop if total < 5, else just logic.
                // Simplified approach:
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 2 + i;
                }
                if (p > totalPages) return null;

                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${currentPage === p
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading || totalPages === 0}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryLogs;
