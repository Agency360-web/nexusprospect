import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Search, Building2, Phone, Mail, ExternalLink, Calendar, CheckCircle2, Filter, Download, Trash2, MapPin, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import TransferLeadsModal from './TransferLeadsModal';

const ITEMS_PER_PAGE = 100;

const LeadRowCNPJ = React.memo(({ 
  lead, 
  isSelected, 
  onToggle,
  formatCNPJ
}: { 
  lead: any, 
  isSelected: boolean, 
  onToggle: (id: string) => void,
  formatCNPJ: (cnpj: string) => string
}) => (
  <tr className="hover:bg-slate-50/80 transition-colors group">
    <td className="p-4 text-center">
      <input 
        type="checkbox" 
        checked={isSelected}
        onChange={() => onToggle(lead.id)}
        className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500/50"
      />
    </td>
    <td className="p-4">
      <div className="font-bold text-slate-800 truncate max-w-[250px]" title={lead.razao_social}>
        {lead.razao_social || 'Sem Razão Social'}
      </div>
      <div className="flex flex-col mt-0.5">
        <span className="text-xs text-slate-500 truncate max-w-[250px]" title={lead.nome_fantasia}>
          {lead.nome_fantasia || '—'}
        </span>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
            {formatCNPJ(lead.cnpj)}
          </span>
        </div>
      </div>
    </td>
    <td className="p-4 whitespace-nowrap">
      <div className="space-y-1.5">
        {lead.telefone && (
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md w-fit
            ${lead.whatsapp ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
            <Phone size={12} />
            {lead.telefone}
            {lead.whatsapp && <span className="text-[10px] ml-1 bg-green-200 text-green-800 px-1 rounded">WA</span>}
          </div>
        )}
        {lead.email && lead.email !== '—' && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded w-fit">
            <Mail size={11} className="text-slate-400 fill-slate-400" />
            {lead.email}
          </div>
        )}
      </div>
    </td>
    <td className="p-4">
      <div className="text-xs text-slate-700 font-bold max-w-[200px] truncate">
        {lead.municipio} / {lead.uf}
      </div>
      <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate" title={`${lead.logradouro}, ${lead.numero}`}>
        {lead.logradouro}, {lead.numero}
        {lead.bairro && ` - ${lead.bairro}`}
      </div>
    </td>
    <td className="p-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Calendar size={10} />
          {lead.abertura}
          <span className="text-[9px] bg-slate-100 px-1 rounded ml-1 italic font-bold text-slate-400 uppercase">Abertura</span>
        </div>
        <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={lead.cnae_principal_desc}>
          {lead.cnae_principal_desc}
        </div>
      </div>
    </td>
    <td className="p-4 text-center">
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
        ${lead.situacao === 'ATIVA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
        {lead.situacao}
      </span>
    </td>
    <td className="p-4 text-right">
      <button className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100">
        <ExternalLink size={16} />
      </button>
    </td>
  </tr>
));

const CnpjLeadSearch: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with_phone' | 'without_phone'>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);

  const ITEMS_PER_PAGE = 100;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLeads();
    fetchFolders();
  }, [user]);

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchLeads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads_cnpj')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar leads do CNPJ:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('lead_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (!error && data) {
        setFolders(data);
      }
    } catch (err) {
      console.error('Erro ao buscar pastas:', err);
    }
  };

  const filteredLeads = useMemo(() => leads.filter(lead => {
    const matchesSearch = lead.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase());
                          
    let matchesPhone = true;
    if (phoneFilter === 'with_phone') matchesPhone = !!lead.telefone;
    if (phoneFilter === 'without_phone') matchesPhone = !lead.telefone;
    
    return matchesSearch && matchesPhone;
  }), [leads, searchTerm, phoneFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const toggleLeadSelection = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
    );
  };

  const selectAllLeads = () => {
    const paginatedIds = paginatedLeads.map(l => l.id);
    const allSelected = paginatedIds.every(id => selectedLeads.includes(id));

    if (allSelected) {
      setSelectedLeads(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedLeads(prev => [...new Set([...prev, ...paginatedIds])]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} empresas?`)) return;
    
    try {
      const { error } = await supabase
        .from('leads_cnpj')
        .delete()
        .in('id', selectedLeads);
        
      if (error) throw error;
      
      setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
      setSelectedLeads([]);
    } catch (err) {
      console.error('Erro ao deletar leads:', err);
      alert('Erro ao excluir leads.');
    }
  };

  const handleExportCSV = () => {
    const leadsToExport = selectedLeads.length > 0 
      ? leads.filter(l => selectedLeads.includes(l.id))
      : filteredLeads;

    if (leadsToExport.length === 0) return;

    const headers = ['CNPJ', 'Razão Social', 'Nome Fantasia', 'Telefone', 'Email', 'Endereço', 'Bairro', 'Cidade', 'UF', 'CNAE', 'Situação', 'Data Extração'];
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(l => [
        `"${l.cnpj || ''}"`,
        `"${(l.razao_social || '').replace(/"/g, '""')}"`,
        `"${(l.nome_fantasia || '').replace(/"/g, '""')}"`,
        `"${l.telefone || ''}"`,
        `"${l.email || ''}"`,
        `"${l.logradouro || ''}, ${l.numero || 'SN'} - ${l.complemento || ''}"`,
        `"${l.bairro || ''}"`,
        `"${l.municipio || ''}"`,
        `"${l.uf || ''}"`,
        `"${l.cnae_principal || ''}"`,
        `"${l.situacao || ''}"`,
        new Date(l.created_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_cnpj_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return cnpj;
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por Razão Social, CNPJ ou Nome Fantasia..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-medium"
            />
          </div>
          <select
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value as any)}
              className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm font-medium text-slate-600 sm:w-auto w-full outline-none appearance-none pr-8 cursor-pointer bg-no-repeat"
              style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1em 1em'
              }}
          >
              <option value="all">Todos os contatos</option>
              <option value="with_phone">Com Telefone</option>
              <option value="without_phone">Sem Telefone</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {selectedLeads.length > 0 ? (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 font-bold text-xs whitespace-nowrap">
                <CheckCircle2 size={14} />
                <span>{selectedLeads.length} selecionados</span>
              </div>
              
              <button 
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
              >
                <Send size={14} />
                Transferir
              </button>
              
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-bold transition-all active:scale-95 flex-shrink-0"
              >
                <Download size={14} />
                Exportar
              </button>

              <button 
                onClick={handleDeleteSelected}
                className="flex items-center justify-center w-9 h-9 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all border border-slate-200 shadow-sm active:scale-95 flex-shrink-0"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={fetchLeads}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold whitespace-nowrap shadow-md shadow-slate-900/20"
            >
              Atualizar Leads
            </button>
          )}
        </div>
      </div>


      {/* Table Area */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {leads.length > 0 ? (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-400">
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id))}
                        onChange={selectAllLeads}
                        className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500/50"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Empresa</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Contato</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Localização</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Detalhes</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-center">Status</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 font-medium text-xs">Carregando leads do CNPJ...</p>
                      </td>
                    </tr>
                  ) : paginatedLeads.length === 0 && searchTerm ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 text-xs">
                        Nenhum lead encontrado para "{searchTerm}"
                      </td>
                    </tr>
                  ) : paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        Nenhum lead disponível
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead) => (
                      <LeadRowCNPJ 
                        key={lead.id}
                        lead={lead}
                        isSelected={selectedLeads.includes(lead.id)}
                        onToggle={toggleLeadSelection}
                        formatCNPJ={formatCNPJ}
                      />
                    ))
                  )}
                </tbody>
            </table>
          </div>

          {!loading && filteredLeads.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-sm text-slate-500 font-medium font-sans">
              <div>
                Mostrando <strong className="text-slate-800">{startIndex + 1}</strong> a <strong className="text-slate-800">{Math.min(startIndex + ITEMS_PER_PAGE, filteredLeads.length)}</strong> de <strong className="text-slate-800">{filteredLeads.length}</strong> leads
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Anterior
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          currentPage === i + 1
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Próximo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
          <Building2 size={48} className="mx-auto mb-4 text-slate-300" />
        <p className="font-bold text-slate-500 text-sm">Nenhum lead de CNPJ encontrado</p>
        <p className="text-xs mt-1.5 max-w-sm mx-auto text-slate-400">
          Inicie uma pesquisa de CNPJ para extrair leads e eles aparecerão aqui automaticamente.
        </p>
      </div>
    )}
  </div>

      <TransferLeadsModal 
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        selectedLeads={leads.filter(l => selectedLeads.includes(l.id))}
        sourceType="cnpj"
        onTransferComplete={() => {
            setSelectedLeads([]);
            fetchLeads();
        }}
      />
    </div>
  );
};

export default CnpjLeadSearch;
