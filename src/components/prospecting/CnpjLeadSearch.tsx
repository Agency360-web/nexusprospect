import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Search, Building2, Phone, Mail, ExternalLink, Calendar, CheckCircle2, Filter, Download, Trash2, MapPin, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import TransferLeadsModal from './TransferLeadsModal';

const CnpjLeadSearch: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    fetchLeads();
    fetchFolders();
  }, [user]);

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

  const filteredLeads = leads.filter(lead => 
    lead.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lead.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleLeadSelection = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
    );
  };

  const selectAllLeads = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
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
    ].join('\\n');

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
    const cleaned = cnpj.replace(/\\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})/, "$1.$2.$3/$4-$5");
    }
    return cnpj;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por Razão Social, CNPJ ou Nome Fantasia..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-medium"
          />
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
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
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
              ) : filteredLeads.length === 0 && searchTerm ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 text-xs">
                    Nenhum lead encontrado para "{searchTerm}"
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    Nenhum lead disponível
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
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
                    <td className="p-4">
                      <div className="space-y-1.5">
                        {lead.telefone && (
                          <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md w-fit
                            ${lead.whatsapp ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                            <Phone size={12} />
                            {lead.telefone}
                            {lead.whatsapp && <span className="text-[10px] ml-1 bg-green-200 text-green-800 px-1 rounded">WA</span>}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 truncate max-w-[180px]" title={lead.email}>
                            <Mail size={12} className="text-slate-400 flex-shrink-0" />
                            {lead.email}
                          </div>
                        )}
                        {!lead.telefone && !lead.email && (
                          <span className="text-xs text-slate-400 italic">Sem contato</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-1.5 text-xs text-slate-600">
                          <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="truncate max-w-[200px]" title={`${lead.logradouro}, ${lead.numero} - ${lead.bairro}`}>
                            {lead.logradouro ? `${lead.logradouro}, ${lead.numero || 'SN'}` : 'Endereço não informado'}
                          </div>
                        </div>
                        {(lead.municipio || lead.uf) && (
                          <div className="text-xs font-medium text-slate-700 ml-4">
                            {lead.municipio}{lead.municipio && lead.uf ? ' - ' : ''}{lead.uf}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        {lead.cnae_principal && (
                          <div className="text-[10px] leading-tight text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 truncate max-w-[200px]" title={lead.cnae_principal}>
                            <strong>CNAE:</strong> {lead.cnae_principal}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {lead.situacao && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
                              ${lead.situacao.includes('ATIVA') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {lead.situacao}
                            </span>
                          )}
                          {lead.porte && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              {lead.porte}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold
                        ${lead.status === 'contacted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        lead.status === 'converted' ? 'bg-green-50 text-green-700 border border-green-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full 
                          ${lead.status === 'contacted' ? 'bg-blue-500' :
                          lead.status === 'converted' ? 'bg-green-500' :
                          'bg-slate-500'}`}
                        />
                        {lead.status === 'contacted' ? 'Contatado' :
                         lead.status === 'converted' ? 'Convertido' : 'Novo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Info */}
        {!loading && filteredLeads.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-sm text-slate-500 font-medium">
            <div>
              Mostrando <strong className="text-slate-800">{filteredLeads.length}</strong> empresas
              {searchTerm && <span> (filtradas)</span>}
            </div>
            {/* Simple placeholder pagination */}
            <div className="flex items-center gap-1 opacity-50 cursor-not-allowed" title="Paginação será implementada em breve">
              <button className="px-3 py-1 border border-slate-200 rounded-md">Anterior</button>
              <button className="px-3 py-1 border border-slate-200 rounded-md bg-white text-slate-800">1</button>
              <button className="px-3 py-1 border border-slate-200 rounded-md">Próxima</button>
            </div>
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
