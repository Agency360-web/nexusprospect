import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    MapPin,
    Search,
    ExternalLink,
    Download,
    Trash2,
    RefreshCw,
    Star,
    Phone,
    Globe,
    Building2,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertCircle,
    Link2,
    Unlink,
    Chrome,
    Zap,
    Timer,
    Send,
} from 'lucide-react';
import TransferLeadsModal from './TransferLeadsModal';

interface GmapsLead {
    id: string;
    title: string;
    phone: string | null;
    address: string | null;
    website: string | null;
    rating: string | null;
    reviews_count: string | null;
    category: string | null;
    created_at: string;
}

const POLL_INTERVAL = 15000; // 15s

const GoogleMapsLeadSearch: React.FC = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<GmapsLead[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Carregar leads do Supabase
    const fetchLeads = useCallback(async (isBackground = false) => {
        if (!user) return;
        if (!isBackground) setLoading(true); // Don't show loading spinner on background polls

        try {
            const { data, error } = await supabase
                .from('leads_google_maps')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;

            setLeads(data || []);

        } catch (err) {
            console.error('Erro ao carregar leads:', err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [user]);

    // Setup the automated polling
    useEffect(() => {
        fetchLeads(); // initial fetch

        intervalRef.current = setInterval(() => {
            fetchLeads(true);
        }, POLL_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchLeads]);

    // Deletar lead individual
    const deleteLead = async (id: string) => {
        try {
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (error) throw error;
            setLeads(prev => prev.filter(l => l.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Erro ao deletar lead:', err);
        }
    };

    // Deletar múltiplos
    const deleteSelectedLeads = async () => {
        if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} leads?`)) return;
        try {
            const { error } = await supabase.from('leads_google_maps').delete().in('id', selectedLeads);
            if (error) throw error;
            setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
            setSelectedLeads([]);
        } catch (err) {
            console.error('Erro ao deletar leads:', err);
        }
    };

    const filteredLeads = leads.filter(lead => 
        lead.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        lead.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportCSV = () => {
        if (selectedLeads.length === 0) return;
        
        const leadsToExport = leads.filter(l => selectedLeads.includes(l.id));
        const headers = ['Nome', 'Categoria', 'Endereço', 'Avaliação', 'Reviews', 'Website', 'Data'];
        const csvContent = [
            headers.join(','),
            ...leadsToExport.map(l => [
                `"${l.title || ''}"`,
                `"${l.category || ''}"`,
                `"${(l.address || '').replace(/"/g, '""')}"`,
                l.rating || 0,
                l.reviews_count || 0,
                `"${l.website || ''}"`,
                new Date(l.created_at).toLocaleDateString('pt-BR')
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_google_maps_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleLeadSelection = (id: string) => {
        setSelectedLeads(prev =>
            prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
        );
    };

    const selectAllLeads = () => {
        if (selectedLeads.length === filteredLeads.length && filteredLeads.length > 0) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(filteredLeads.map(l => l.id));
        }
    };


    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">

            {/* Search and Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome, categoria ou endereço..." 
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
                                onClick={deleteSelectedLeads}
                                className="flex items-center justify-center w-9 h-9 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all border border-slate-200 shadow-sm active:scale-95 flex-shrink-0"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => fetchLeads(false)}
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
                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Empresa / Detalhes</th>
                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Telefone</th>
                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Métrica (Rating)</th>
                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Website / Fonte</th>
                                        <th className="px-4 py-3 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-white transition-colors group">
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedLeads.includes(lead.id)}
                                                    onChange={() => toggleLeadSelection(lead.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/50"
                                                />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{lead.title}</span>
                                                {(lead.category || lead.address) && (
                                                    <div className="text-[10px] text-slate-400 mt-1 flex flex-col gap-0.5">
                                                        {lead.category && <span className="truncate max-w-[250px]">{lead.category}</span>}
                                                        {lead.address && <span className="truncate max-w-[250px]">{lead.address}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 align-top pt-4">
                                                {lead.phone ? (
                                                    <span className="flex w-fit items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-bold border border-emerald-100">
                                                        <Phone size={10} className="fill-emerald-600" />
                                                        {lead.phone}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300 font-medium italic">Sem telefone</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 align-top pt-4">
                                                {lead.rating ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-700 font-bold">
                                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                                            {lead.rating}
                                                        </span>
                                                        {lead.reviews_count && (
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{lead.reviews_count} Reviews</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 align-top pt-4">
                                                {lead.website ? (
                                                    <a
                                                        href={lead.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-blue-600 font-bold max-w-[140px] truncate bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors w-fit"
                                                        title={lead.website}
                                                    >
                                                        <Globe size={10} />
                                                        {(() => { try { return new URL(lead.website).hostname.replace('www.', ''); } catch { return lead.website; } })()}
                                                    </a>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 align-middle text-right">
                                                {deleteConfirm === lead.id ? (
                                                    <div className="flex flex-col items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteLead(lead.id)}
                                                            className="text-[9px] font-black text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded w-full transition-colors"
                                                        >
                                                            APAGAR
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="text-[9px] font-bold text-slate-500 hover:text-slate-700"
                                                        >
                                                            CANCELAR
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteConfirm(lead.id)}
                                                        className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Remover Lead"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                        <MapPin size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="font-bold text-slate-500 text-sm">Nenhum lead extraído ainda</p>
                        <p className="text-xs mt-1.5 max-w-sm mx-auto text-slate-400">
                            Configure seu Webhook na extensão, abra o Google Maps pelo navegador e as pesquisas extras irão aparecer aqui automaticamente.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                /* Estilos extras se precisar */
            `}</style>
            
            <TransferLeadsModal 
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                selectedLeads={leads.filter(l => selectedLeads.includes(l.id))}
                sourceType="google_maps"
                onTransferComplete={() => {
                    setSelectedLeads([]);
                    fetchLeads(false);
                }}
            />
        </div>
    );
};

export default GoogleMapsLeadSearch;
