import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Search, MapPin, Phone, Mail, Instagram, ExternalLink, Calendar, CheckCircle2, ChevronDown, Filter, Download, Trash2, ArrowRight, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import TransferLeadsModal from './TransferLeadsModal';

const InstagramLeadSearch: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [showFolderAssign, setShowFolderAssign] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchFolders();
  }, [user]);

  const fetchLeads = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads_instagram')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar leads do Instagram:', err);
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
    lead.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lead.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.biography?.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} leads?`)) return;
    
    try {
      const { error } = await supabase
        .from('leads_instagram')
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

    const headers = ['Username', 'Nome Completo', 'Biografia', 'Seguidores', 'Seguindo', 'Email Público', 'Telefone Público', 'URL Externa', 'Data'];
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(l => [
        `"${l.username || ''}"`,
        `"${l.full_name || ''}"`,
        `"${(l.biography || '').replace(/"/g, '""')}"`,
        l.follower_count || 0,
        l.following_count || 0,
        `"${l.public_email || ''}"`,
        `"${l.public_phone_number || ''}"`,
        `"${l.external_url || ''}"`,
        new Date(l.created_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_instagram_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por @username, nome ou palavra na bio..." 
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
                        className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/50"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Perfil</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Métricas</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Contato Público</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Bio / Link</th>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-center">Status</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 font-medium text-xs">Carregando leads do Instagram...</p>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 && searchTerm ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <p className="text-slate-500 font-medium text-xs">Nenhum lead encontrado para "{searchTerm}"</p>
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center p-[2px] shadow-sm">
                           <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                              <Instagram size={18} className="text-blue-600" />
                           </div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {lead.username ? `@${lead.username}` : 'Sem Username'}
                            {lead.username && (
                              <a href={`https://instagram.com/${lead.username}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[150px]" title={lead.full_name}>
                            {lead.full_name || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-flex w-fit">
                          <strong className="text-slate-800 mr-1">{lead.follower_count?.toLocaleString() || '0'}</strong> seg.
                        </span>
                        <span className="text-xs font-medium text-slate-500 px-2 py-0.5 inline-flex w-fit">
                          {lead.following_count?.toLocaleString() || '0'} sgdo.
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5">
                        {lead.public_phone_number ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-green-50 text-green-700 px-2 py-1 rounded-md w-fit">
                            <Phone size={12} />
                            {lead.public_phone_number}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 px-2 py-1">—</div>
                        )}
                        {lead.public_email && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 truncate max-w-[150px]" title={lead.public_email}>
                            <Mail size={12} className="text-slate-400 flex-shrink-0" />
                            {lead.public_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5 max-w-[200px]">
                        <p className="text-xs text-slate-600 line-clamp-2" title={lead.biography}>
                          {lead.biography || <span className="text-slate-400 italic">Sem biografia</span>}
                        </p>
                        {lead.external_url && (
                          <a 
                            href={lead.external_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 truncate"
                            title={lead.external_url}
                          >
                            <ExternalLink size={10} />
                            {lead.external_url.replace(/^https?:\/\//i, '')}
                          </a>
                        )}
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
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
            <Instagram size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-bold text-slate-500 text-sm">Nenhum lead encontrado no Instagram</p>
            <p className="text-xs mt-1.5 max-w-sm mx-auto text-slate-400">
              Utilize nossa extensão para extrair leads diretamente do Instagram e eles aparecerão aqui automaticamente.
            </p>
          </div>
        )}
      </div>

      <TransferLeadsModal 
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        selectedLeads={leads.filter(l => selectedLeads.includes(l.id))}
        sourceType="instagram"
        onTransferComplete={() => {
            setSelectedLeads([]);
            fetchLeads();
        }}
      />
    </div>
  );
};

export default InstagramLeadSearch;
