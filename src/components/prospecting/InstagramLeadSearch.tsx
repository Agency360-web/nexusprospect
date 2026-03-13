import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Search, MapPin, Phone, Mail, Instagram, ExternalLink, Calendar, CheckCircle2, ChevronDown, Filter, Download, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const InstagramLeadSearch: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [showFolderAssign, setShowFolderAssign] = useState(false);

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
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all text-sm font-medium"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold whitespace-nowrap shadow-sm">
            <Filter size={16} className="text-pink-500" />
            Filtros
          </button>
          
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          
          <button 
            onClick={fetchLeads}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold whitespace-nowrap shadow-md shadow-slate-900/20"
          >
            Atualizar Leads
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-pink-50 border border-pink-100 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-pink-700 font-bold px-2">
            <CheckCircle2 size={20} />
            <span>{selectedLeads.length} leads selecionados</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 hover:text-slate-900 rounded-lg text-sm font-bold transition-colors border border-slate-200 shadow-sm"
            >
              <Download size={16} />
              Exportar CSV
            </button>
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors border border-red-100 shadow-sm"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={selectAllLeads}
                    className="w-4 h-4 rounded border-slate-300 text-pink-500 focus:ring-pink-500/50"
                  />
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Métricas</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato Público</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bio / Link</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Carregando leads do Instagram...</p>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Instagram size={28} className="text-pink-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum lead encontrado</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                      Você ainda não extraiu nenhum lead do Instagram ou a busca não retornou resultados.
                    </p>
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
                        className="w-4 h-4 rounded border-slate-300 text-pink-500 focus:ring-pink-500/50"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center p-[2px] shadow-sm">
                           <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                              <Instagram size={18} className="text-pink-600" />
                           </div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {lead.username ? `@${lead.username}` : 'Sem Username'}
                            {lead.username && (
                              <a href={`https://instagram.com/${lead.username}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-500 transition-colors">
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
                            className="text-xs font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1 truncate"
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
        
        {/* Pagination Info */}
        {!loading && filteredLeads.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-sm text-slate-500 font-medium">
            <div>
              Mostrando <strong className="text-slate-800">{filteredLeads.length}</strong> leads
              {searchTerm && <span> (filtrados)</span>}
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

    </div>
  );
};

export default InstagramLeadSearch;
