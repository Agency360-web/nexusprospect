import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

const ITEMS_PER_PAGE = 100;
const POLL_INTERVAL = 30000; // 30 segundos

const LeadRow = React.memo(({ 
    lead, 
    isSelected, 
    onToggle, 
    onDelete, 
    confirmDelete, 
    setConfirmDelete 
}: { 
    lead: GmapsLead, 
    isSelected: boolean, 
    onToggle: (id: string) => void,
    onDelete: (id: string) => void,
    confirmDelete: string | null,
    setConfirmDelete: (id: string | null) => void
}) => (
    <tr className="hover:bg-white transition-colors group">
        <td className="p-3 text-center">
            <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => onToggle(lead.id)}
                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/50"
            />
        </td>
        <td className="px-4 py-3.5">
            <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors uppercase">{lead.title}</span>
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
            {confirmDelete === lead.id ? (
                <div className="flex flex-col items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-100">
                    <button
                        type="button"
                        onClick={() => onDelete(lead.id)}
                        className="text-[9px] font-black text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded w-full transition-colors"
                    >
                        APAGAR
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-700"
                    >
                        CANCELAR
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setConfirmDelete(lead.id)}
                    className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remover Lead"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </td>
    </tr>
));

const GoogleMapsLeadSearch: React.FC = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<GmapsLead[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [phoneFilter, setPhoneFilter] = useState<'all' | 'with_phone' | 'without_phone'>('all');
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

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
                .limit(1000);

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

    // Reset page when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Deletar lead individual
    const deleteLead = async (id: string) => {
        try {
            const { error } = await supabase.from('leads_google_maps').delete().eq('id', id);
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

    const filteredLeads = useMemo(() => leads.filter(lead => {
        const matchesSearch = lead.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              lead.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              lead.address?.toLowerCase().includes(searchTerm.toLowerCase());
                              
        let matchesPhone = true;
        if (phoneFilter === 'with_phone') matchesPhone = !!lead.phone;
        if (phoneFilter === 'without_phone') matchesPhone = !lead.phone;
        
        return matchesSearch && matchesPhone;
    }), [leads, searchTerm, phoneFilter]);

    // Paginação
    const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
    
    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredLeads, currentPage]);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

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
        const paginatedIds = paginatedLeads.map(l => l.id);
        const allSelected = paginatedIds.every(id => selectedLeads.includes(id));

        if (allSelected) {
            setSelectedLeads(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            setSelectedLeads(prev => [...new Set([...prev, ...paginatedIds])]);
        }
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
                            placeholder="Buscar por nome, categoria ou endereço..." 
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
                                                checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id))}
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
                                    {paginatedLeads.map((lead) => (
                                        <LeadRow 
                                            key={lead.id}
                                            lead={lead}
                                            isSelected={selectedLeads.includes(lead.id)}
                                            onToggle={toggleLeadSelection}
                                            onDelete={deleteLead}
                                            confirmDelete={deleteConfirm}
                                            setConfirmDelete={setDeleteConfirm}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Paginação */}
                        {totalPages > 1 && (
                            <div className="bg-white border-t border-slate-100 p-4 flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-medium">
                                    Mostrando <span className="text-slate-900 font-bold">{startIndex + 1}</span> a <span className="text-slate-900 font-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredLeads.length)}</span> de <span className="text-slate-900 font-bold">{filteredLeads.length}</span> leads
                                </div>
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
                            </div>
                        )}
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
