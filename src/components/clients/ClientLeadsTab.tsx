import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Lead, LeadFolder } from '../../types';
import { 
    Folder, 
    Users, 
    Plus, 
    Upload, 
    Search, 
    Trash2, 
    MoreVertical, 
    Loader2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    ArrowRightLeft,
    X
} from 'lucide-react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

interface ClientLeadsTabProps {
    clientId: string;
}

const ITEMS_PER_PAGE = 100;

export const ClientLeadsTab: React.FC<ClientLeadsTabProps> = ({ clientId }) => {
    const [folders, setFolders] = useState<LeadFolder[]>([]);
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const [activeModal, setActiveModal] = useState<'none' | 'new-folder' | 'new-lead' | 'import-leads' | 'move-leads'>('none');
    const [modalLoading, setModalLoading] = useState(false);

    const [newFolderName, setNewFolderName] = useState('');
    const [newLeadForm, setNewLeadForm] = useState({ name: '', phone: '', company: '', website: '' });
    const [importText, setImportText] = useState('');
    const [targetFolderId, setTargetFolderId] = useState<string>('');

    const fetchData = async () => {
        try {
            setLoading(true);
            setSelectedLeads([]);

            // 1. Fetch Folders
            const { data: folderData, error: folderError } = await supabase
                .from('lead_folders')
                .select('*')
                .eq('client_id', clientId)
                .order('name', { ascending: true });

            if (folderError) throw folderError;

            const loadedFolders = folderData || [];
            setFolders(loadedFolders);

            if (loadedFolders.length > 0 && !activeFolderId) {
                setActiveFolderId(loadedFolders[0].id);
            }

            // 2. Fetch ALL Leads for active folder (local search approved)
            if (activeFolderId) {
                const { data: leadsData, error: leadsError } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('client_id', clientId)
                    .eq('folder_id', activeFolderId)
                    .order('created_at', { ascending: false });

                if (leadsError) throw leadsError;
                setLeads(leadsData || []);
            } else {
                setLeads([]);
            }

        } catch (err) {
            console.error('Error fetching leads data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId, activeFolderId]);

    // Selection & Pagination Logic
    const toggleLeadSelection = (id: string) => {
        setSelectedLeads(prev =>
            prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
        );
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(l =>
            l.name.toLowerCase().includes(search.toLowerCase()) ||
            (l.phone && l.phone.includes(search))
        );
    }, [leads, search]);

    const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLeads = useMemo(() => {
        return filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredLeads, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, activeFolderId]);

    const selectAllLeads = () => {
        const paginatedIds = paginatedLeads.map(l => l.id);
        const allSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedLeads.includes(id));

        if (allSelected) {
            setSelectedLeads(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            setSelectedLeads(prev => [...new Set([...prev, ...paginatedIds])]);
        }
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (selectedLeads.length === 0) return;
        if (!confirm(`Deseja excluir DEFINITIVAMENTE os ${selectedLeads.length} leads selecionados?`)) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase.from('leads').delete().in('id', selectedLeads);
            if (error) throw error;
            setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
            setSelectedLeads([]);
        } catch (err) {
            console.error('Erro ao excluir leads em massa:', err);
            alert('Erro ao excluir leads.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkMove = async () => {
        if (!targetFolderId) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ folder_id: targetFolderId })
                .in('id', selectedLeads);

            if (error) throw error;
            setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
            setSelectedLeads([]);
            setActiveModal('none');
            alert(`${selectedLeads.length} leads movidos com sucesso!`);
        } catch (err) {
            console.error('Erro ao mover leads:', err);
            alert('Erro ao mover leads.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setModalLoading(true);
        try {
            const { data, error } = await supabase
                .from('lead_folders')
                .insert([{ name: newFolderName, client_id: clientId, user_id: user?.id }])
                .select()
                .single();

            if (error) throw error;

            setNewFolderName('');
            setActiveModal('none');
            setActiveFolderId(data.id);
            fetchData();
        } catch (err) {
            console.error('Erro ao criar pasta:', err);
            alert('Erro ao criar pasta.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!confirm('Excluir esta pasta? Todos os leads dentro dela também serão removidos.')) return;
        try {
            const { error } = await supabase.from('lead_folders').delete().eq('id', folderId);
            if (error) throw error;
            if (activeFolderId === folderId) setActiveFolderId(null);
            fetchData();
        } catch (err) {
            console.error('Erro ao excluir pasta:', err);
        }
    };

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeFolderId) {
            alert('Crie ou selecione uma pasta primeiro.');
            return;
        }
        setModalLoading(true);
        try {
            const { error } = await supabase
                .from('leads')
                .insert([{
                    ...newLeadForm,
                    client_id: clientId,
                    folder_id: activeFolderId
                }]);

            if (error) throw error;

            setNewLeadForm({ name: '', phone: '', company: '', website: '' });
            setActiveModal('none');
            fetchData();
        } catch (err) {
            console.error('Erro ao criar lead:', err);
            alert('Erro ao adicionar lead.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleImportLeads = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeFolderId || !importText.trim()) return;
        setModalLoading(true);
        try {
            const lines = importText.split('\n').filter(l => l.trim() !== '');
            const newLeads = lines.map(line => {
                // Ex: Lucas Renato - 43999572256
                const parts = line.split('-').map(p => p.trim());
                return {
                    name: parts[0] || 'Desconhecido',
                    phone: parts[1] || parts[0] || '',
                    client_id: clientId,
                    folder_id: activeFolderId
                }
            });

            if (newLeads.length === 0) return;

            const { error } = await supabase
                .from('leads')
                .insert(newLeads);

            if (error) throw error;

            setImportText('');
            setActiveModal('none');
            fetchData();
            alert(`${newLeads.length} leads importados com sucesso!`);
        } catch (error) {
            console.error('Erro ao importar leads:', error);
            alert('Erro ao realizar a importação em massa.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm('Remover lead?')) return;
        try {
            const { error } = await supabase.from('leads').delete().eq('id', leadId);
            if (error) throw error;
            setLeads(prev => prev.filter(l => l.id !== leadId));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Folders Sidebar */}
                <div className="w-full lg:w-72 shrink-0 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pastas de Leads</h3>
                        <button 
                            onClick={() => setActiveModal('new-folder')} 
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-900 transition-all shadow-sm"
                            title="Nova Pasta"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        {folders.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nenhuma pasta</p>
                            </div>
                        ) : (
                            folders.map(folder => (
                                <div key={folder.id} className="group flex items-center gap-1">
                                    <button
                                        onClick={() => setActiveFolderId(folder.id)}
                                        className={`flex-1 flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${activeFolderId === folder.id
                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-1'
                                            : 'hover:bg-white border border-transparent hover:border-slate-100 text-slate-500 hover:text-slate-900 shadow-none hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3 truncate">
                                            <Folder size={18} className={activeFolderId === folder.id ? 'text-amber-400' : 'text-slate-300'} />
                                            <span className="font-bold text-sm truncate">{folder.name}</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleDeleteFolder(folder.id)}
                                        className="p-2.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Leads Content */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px] relative">
                        
                        {/* Bulk Action Bar (Overlay) */}
                        {selectedLeads.length > 0 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-6">
                                    <div className="flex items-center space-x-2 border-r border-slate-700 pr-6 mr-2">
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black">
                                            {selectedLeads.length}
                                        </div>
                                        <span className="text-sm font-bold truncate max-w-[120px]">
                                            Selecionados
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={() => setActiveModal('move-leads')}
                                            className="flex items-center space-x-2 px-3 py-1.5 hover:bg-slate-800 rounded-xl text-sm font-bold transition-colors text-blue-400"
                                        >
                                            <ArrowRightLeft size={16} />
                                            <span>Mover</span>
                                        </button>
                                        <button 
                                            onClick={handleBulkDelete}
                                            className="flex items-center space-x-2 px-3 py-1.5 hover:bg-slate-800 rounded-xl text-sm font-bold transition-colors text-rose-400"
                                        >
                                            <Trash2 size={16} />
                                            <span>Excluir</span>
                                        </button>
                                        <button 
                                            onClick={() => setSelectedLeads([])}
                                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors ml-2"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Controls Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar nos leads atuais..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="hidden md:flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-4 py-3 rounded-2xl">
                                    <Users size={14} className="mr-2" />
                                    {filteredLeads.length} Total
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    disabled={!activeFolderId || isProcessing}
                                    onClick={() => setActiveModal('import-leads')}
                                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 disabled:opacity-50 text-sm font-black transition-all shadow-sm"
                                >
                                    <Upload size={18} />
                                    <span>Importar</span>
                                </button>
                                <button
                                    disabled={!activeFolderId || isProcessing}
                                    onClick={() => setActiveModal('new-lead')}
                                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 disabled:opacity-50 text-sm font-black shadow-xl shadow-slate-900/10 transition-all"
                                >
                                    <Plus size={20} />
                                    <span>Novo Lead</span>
                                </button>
                            </div>
                        </div>

                        {/* Pagination & Select All Controls */}
                        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white text-xs">
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <div 
                                        onClick={selectAllLeads}
                                        className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                                            paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id))
                                            ? 'bg-slate-900 border-slate-900'
                                            : 'border-slate-200 group-hover:border-slate-400'
                                        }`}
                                    >
                                        {(paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id))) && (
                                            <CheckCircle2 size={12} className="text-white" />
                                        )}
                                    </div>
                                    <span className="font-bold text-slate-500">Selecionar Página</span>
                                </label>
                            </div>

                            <div className="flex items-center space-x-3 font-bold text-slate-500">
                                <span>Página {currentPage} de {totalPages || 1}</span>
                                <div className="flex items-center space-x-1">
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button 
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full space-y-4">
                                    <Loader2 size={40} className="animate-spin text-slate-200" />
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Carregando Leads...</p>
                                </div>
                            ) : !activeFolderId ? (
                                <div className="flex flex-col items-center justify-center h-full p-20 text-center space-y-6">
                                    <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                                        <Folder size={48} />
                                    </div>
                                    <div className="max-w-xs">
                                        <h3 className="font-black text-slate-900 text-xl">Nenhuma pasta ativa</h3>
                                        <p className="text-slate-500 text-sm mt-3 leading-relaxed">Selecione uma pasta ao lado para visualizar os leads desta audiência.</p>
                                    </div>
                                </div>
                            ) : filteredLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full p-20 text-center space-y-6">
                                    <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                                        <Users size={48} />
                                    </div>
                                    <div className="max-w-xs">
                                        <h3 className="font-black text-slate-900 text-xl">Sem leads nesta pasta</h3>
                                        <p className="text-slate-500 text-sm mt-3 leading-relaxed">Adicione leads manualmente ou importe uma lista de contatos para começar.</p>
                                    </div>
                                </div>
                            ) : (
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead className="bg-white sticky top-0 border-b border-slate-100 z-10">
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                                            <th className="px-6 py-4 w-12"></th>
                                            <th className="px-6 py-4">Nome</th>
                                            <th className="px-6 py-4 hidden md:table-cell">Telefone / WhatsApp</th>
                                            <th className="px-6 py-4 hidden lg:table-cell">Empresa</th>
                                            <th className="px-6 py-4">Cadastro</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedLeads.map(lead => (
                                            <tr key={lead.id} className={`group hover:bg-slate-50/50 transition-all ${selectedLeads.includes(lead.id) ? 'bg-blue-50/30' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div 
                                                        onClick={() => toggleLeadSelection(lead.id)}
                                                        className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer ${
                                                            selectedLeads.includes(lead.id)
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'border-slate-200 group-hover:border-slate-400 bg-white'
                                                        }`}
                                                    >
                                                        {selectedLeads.includes(lead.id) && (
                                                            <CheckCircle2 size={12} className="text-white" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{lead.name}</div>
                                                        <div className="md:hidden text-xs text-slate-500 mt-1">{lead.phone}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="flex items-center space-x-2 text-slate-600 font-mono text-xs font-bold bg-slate-100 w-fit px-3 py-1.5 rounded-lg">
                                                        <span>{lead.phone || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <div className="text-slate-500 text-sm font-medium truncate max-w-[150px]">{lead.company || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                                        <Calendar size={12} className="mr-1.5" />
                                                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => handleDeleteLead(lead.id)}
                                                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={activeModal === 'new-folder'} onClose={() => setActiveModal('none')} title="Nova Pasta de Leads">
                <form onSubmit={handleCreateFolder} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Audiência</label>
                        <input
                            type="text"
                            placeholder="Ex: Landing Page - Março 2024"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setActiveModal('none')} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                        <button type="submit" disabled={modalLoading} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 flex items-center gap-2 shadow-xl shadow-slate-900/10">
                            {modalLoading && <Loader2 size={18} className="animate-spin" />} Criar Pasta
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'new-lead'} onClose={() => setActiveModal('none')} title="Cadastrar Novo Lead">
                <form onSubmit={handleCreateLead} className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input placeholder="Ex: João da Silva" required value={newLeadForm.name} onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                            <input placeholder="Ex: 5511999999999" required value={newLeadForm.phone} onChange={e => setNewLeadForm({ ...newLeadForm, phone: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Empresa (Opcional)</label>
                            <input placeholder="Nome da Empresa" value={newLeadForm.company} onChange={e => setNewLeadForm({ ...newLeadForm, company: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600" />
                        </div>
                    </div>
                    <div className="pt-6 flex flex-col gap-3">
                        <button type="submit" disabled={modalLoading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 flex justify-center items-center gap-2 shadow-xl shadow-slate-900/10">
                            {modalLoading && <Loader2 size={18} className="animate-spin" />} Salvar Lead
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'import-leads'} onClose={() => setActiveModal('none')} title="Importação em Massa">
                <form onSubmit={handleImportLeads} className="space-y-4">
                    <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start space-x-3">
                            <Users className="text-blue-500 shrink-0 mt-0.5" size={18} />
                            <div className="text-xs leading-relaxed text-blue-800">
                                <strong>Dica de Formato:</strong> Cole uma lista com um contato por linha.<br/>
                                Exemplo: <code>Nome do Lead - 5511999999999</code>
                            </div>
                        </div>
                        <textarea
                            placeholder="Lucas Renato - 43999572256&#10;Maria Silva - 11988887777"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all text-sm font-mono h-60 resize-none font-bold"
                            value={importText}
                            onChange={e => setImportText(e.target.value)}
                            required
                        />
                    </div>
                    <div className="pt-4 space-y-3">
                        <button type="submit" disabled={modalLoading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 flex justify-center items-center gap-2 shadow-xl shadow-slate-900/10">
                            {modalLoading && <Loader2 size={18} className="animate-spin" />} Iniciar Importação
                        </button>
                        <button type="button" onClick={() => setActiveModal('none')} className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'move-leads'} onClose={() => setActiveModal('none')} title="Mover Leads Selecionados">
                <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start space-x-3">
                        <ArrowRightLeft className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs leading-relaxed text-amber-800 font-medium">
                            Você está movendo <strong>{selectedLeads.length} leads</strong> para uma nova audiência. Eles deixarão de aparecer na pasta atual.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Selecione a Pasta de Destino</label>
                        <select 
                            value={targetFolderId} 
                            onChange={(e) => setTargetFolderId(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%236b7280%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27/%3E%3C/svg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat"
                        >
                            <option value="">Escolha uma pasta...</option>
                            {folders.filter(f => f.id !== activeFolderId).map(folder => (
                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-6 flex flex-col gap-3">
                        <button 
                            onClick={handleBulkMove}
                            disabled={!targetFolderId || isProcessing}
                            className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 flex justify-center items-center gap-2 shadow-xl shadow-slate-900/10 disabled:opacity-50"
                        >
                            {isProcessing && <Loader2 size={18} className="animate-spin" />} Mover Agora
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
