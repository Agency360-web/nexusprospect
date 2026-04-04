import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Smartphone, 
    ArrowLeft, 
    Users, 
    Building2, 
    Folder, 
    Trash2, 
    Loader2, 
    Play, 
    XCircle, 
    CheckCircle2, 
    ChevronLeft, 
    ChevronRight,
    Filter,
    ChevronDown,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Client, LeadFolder, Lead } from '../../types';
import Modal from '../../components/ui/Modal';

const ITEMS_PER_PAGE = 100;

export const WhatsAppVerifier: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Data State
    const [clients, setClients] = useState<Client[]>([]);
    const [folders, setFolders] = useState<LeadFolder[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    
    // Selection State
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    
    // Leads Table State
    const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'unknown' | 'pending'>('all');
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Action State
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatuses, setVerificationStatuses] = useState<Record<string, 'valid' | 'invalid' | 'unknown'>>({});
    const [isDeleting, setIsDeleting] = useState(false);
    const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);

    const fetchInstances = async () => {
        try {
            const { data, error } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            if (data) {
                setWhatsappInstances(data);
            }
        } catch (err) {
            console.error('Error fetching instances:', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchClients();
            fetchInstances();
        }
    }, [user]);
    useEffect(() => {
        if (selectedClientId) {
            fetchFolders(selectedClientId);
            setLeads([]);
            setSelectedFolderId('');
            setSelectedLeads([]);
        }
    }, [selectedClientId]);

    useEffect(() => {
        if (selectedFolderId) {
            fetchLeads(selectedFolderId);
            setSelectedLeads([]);
        } else {
            setLeads([]);
        }
    }, [selectedFolderId]);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user?.id)
                .order('name');
            if (error) throw error;
            setClients(data || []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    };

    const fetchFolders = async (clientId: string) => {
        try {
            const { data, error } = await supabase
                .from('lead_folders')
                .select('*')
                .eq('client_id', clientId)
                .order('name');
            if (error) throw error;
            const filtered = (data || []).filter(f => f.name.toLowerCase() !== 'todos');
            setFolders(filtered);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const fetchLeads = async (folderId: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('folder_id', folderId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLeads = useMemo(() => leads.filter(lead => {
        const currentStatus = verificationStatuses[lead.id] || 'pending';
        if (statusFilter === 'all') return true;
        return currentStatus === statusFilter;
    }), [leads, verificationStatuses, statusFilter]);

    const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    
    const paginatedLeads = useMemo(() => {
        return filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredLeads, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter]);

    const toggleLeadSelection = (id: string) => {
        setSelectedLeads(prev =>
            prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
        );
    };

    const selectAllLeads = () => {
        const paginatedIds = paginatedLeads.map(l => l.id);
        const allSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedLeads.includes(id));

        if (allSelected) {
            setSelectedLeads(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            setSelectedLeads(prev => [...new Set([...prev, ...paginatedIds])]);
        }
    };

    const handleDeleteLeads = async () => {
        if (selectedLeads.length === 0) return;
        if (!window.confirm(`Tem certeza que deseja apagar DEFINITIVAMENTE os ${selectedLeads.length} leads selecionados do banco de dados?`)) return;
        
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .in('id', selectedLeads);
                
            if (error) throw error;
            
            setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
            setSelectedLeads([]);
            
        } catch (err) {
            console.error('Error deleting leads:', err);
            alert('Erro ao excluir os leads.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleVerifierAction = async () => {
        if (selectedLeads.length === 0) return;

        const activeInstances = whatsappInstances.filter(i => i.status === 'connected');
        if (activeInstances.length === 0) {
            alert('Você precisa de pelo menos uma instância de WhatsApp conectada para realizar esta verificação. Acesse a seção de Conexões na plataforma.');
            return;
        }

        setIsVerifying(true);
        try {
            const payloadLeads = leads
                .filter(l => selectedLeads.includes(l.id))
                .map(l => ({
                    id: l.id,
                    name: l.name,
                    phone: l.phone,
                    company: l.company
                }));

            const payload = {
                client_id: selectedClientId,
                folder_id: selectedFolderId,
                total_leads: payloadLeads.length,
                leads: payloadLeads,
                whatsapp_instances: activeInstances
            };

            const response = await fetch('https://nexus360.infra-conectamarketing.site/webhook/verificador_numero', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const resultBytes = await response.text();
            let resultData;
            try {
                resultData = JSON.parse(resultBytes);
                // process statuses and capture updated phones
                const newStatuses: Record<string, 'valid' | 'invalid' | 'unknown'> = { ...verificationStatuses };
                const updatedPhonesMap: Record<string, string> = {};
                const dbUpdates: any[] = [];
                
                if (resultData.leads_validos && Array.isArray(resultData.leads_validos)) {
                    resultData.leads_validos.forEach((l: any) => {
                        if (l.id) {
                            newStatuses[l.id] = 'valid';
                            if (l.phone) {
                                updatedPhonesMap[l.id] = l.phone;
                                dbUpdates.push( supabase.from('leads').update({ phone: l.phone }).eq('id', l.id) );
                            }
                        }
                    });
                }
                
                if (resultData.leads_invalidos && Array.isArray(resultData.leads_invalidos)) {
                    resultData.leads_invalidos.forEach((l: any) => {
                        if (l.id) {
                            newStatuses[l.id] = 'invalid';
                            if (l.phone) {
                                updatedPhonesMap[l.id] = l.phone;
                                dbUpdates.push( supabase.from('leads').update({ phone: l.phone }).eq('id', l.id) );
                            }
                        }
                    });
                }
                
                // Trigger all DB update simultaneously
                if (dbUpdates.length > 0) {
                    await Promise.allSettled(dbUpdates);
                }

                // Mark remaining selected leads (not returned as valid/invalid) as 'unknown'
                selectedLeads.forEach(id => {
                    if (!newStatuses[id]) {
                        newStatuses[id] = 'unknown';
                    }
                });

                setVerificationStatuses(newStatuses);
                
                // Update local UI immediately
                setLeads(prev => prev.map(lead => {
                    if (updatedPhonesMap[lead.id]) {
                        return { ...lead, phone: updatedPhonesMap[lead.id] };
                    }
                    return lead;
                }));
                
            } catch (e) {
                // Ignore parse errors, just show network alert below if needed
                console.error('Error parsing verifier response:', e);
            }

            // Mute the raw modal instead we visually process it on the UI table
            // setIsResultModalOpen(true);
        } catch (error) {
            console.error('Error verifiying numbers:', error);
            alert('Houve um erro de rede ao chamar o verificador.');
        } finally {
            setIsVerifying(false);
            // Optionally, we keep leads selected so user can see what they just verified
            // or we clear selection, let's keep it selected so user can click Delete easily
        }
    };

    return (
        <div className="flex flex-col gap-6 lg:gap-8 pb-20 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <button
                        onClick={() => navigate('/tools')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-slate-300 hover:text-white"
                        title="Voltar para Ferramentas"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                            <Smartphone className="text-brand-500" size={32} />
                            Verificador de WhatsApp
                        </h1>
                        <p className="text-slate-300 font-medium text-sm md:text-base">Valide se as listas de números possuem o WhatsApp habilitado antes do disparo.</p>
                    </div>
                </div>
            </div>

            {/* Unified Toolbar */}
            <div className="transition-all duration-500">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                    
                    {/* Filters & Search */}
                    <div className="flex flex-col md:flex-row gap-3 flex-1 w-full">
                        {/* Client Select */}
                        <div className="relative flex-1 group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                <Building2 size={16} />
                            </div>
                            <select
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                            >
                                <option value="" disabled>1. Cliente</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10" />
                        </div>

                        {/* Folder Select */}
                        <div className={`relative flex-1 group transition-all duration-300 ${!selectedClientId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                <Folder size={16} />
                            </div>
                            <select
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                            >
                                <option value="" disabled>2. Pasta</option>
                                {folders.map(folder => (
                                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10" />
                        </div>

                        {/* Status Filter */}
                        <div className="relative flex-1 group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                <Filter size={16} />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                            >
                                <option value="all">3. Todos os Contatos</option>
                                <option value="valid">Exibir Válidos</option>
                                <option value="invalid">Exibir Inválidos</option>
                                <option value="unknown">Exibir Incertos</option>
                                <option value="pending">Exibir Pendentes</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        {selectedLeads.length > 0 ? (
                            <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold text-xs whitespace-nowrap">
                                    <CheckCircle2 size={14} />
                                    <span>{selectedLeads.length} selecionados para verificação</span>
                                </div>
                                
                                <button 
                                    onClick={handleDeleteLeads}
                                    disabled={isDeleting || isVerifying}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-xl text-sm font-bold transition-all active:scale-95 flex-shrink-0 disabled:opacity-50"
                                    title="Excluir selecionados"
                                >
                                    {isDeleting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                    <span className="hidden xl:inline">Excluir</span>
                                </button>
                                
                                <button 
                                    onClick={handleVerifierAction}
                                    disabled={isVerifying || isDeleting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 flex-shrink-0 disabled:opacity-50"
                                >
                                    {isVerifying ? (
                                        <>
                                           <Loader2 size={16} className="animate-spin" />
                                           Processando...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={16} className="fill-current" />
                                            Iniciar Verificação
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl text-sm font-bold shadow-sm cursor-not-allowed">
                                Selecione leads abaixo
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-white border-b border-slate-200 text-slate-600">
                                        <th className="p-3 w-10 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id))}
                                                onChange={selectAllLeads}
                                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/50"
                                            />
                                        </th>
                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Contato / Lead</th>
                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider border-l-2 border-slate-50">Telefone para Checar</th>
                                        <th className="text-center px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Status WhatsApp</th>
                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Empresa (Opcional)</th>
                                        <th className="px-4 py-3 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Loader2 size={32} className="animate-spin text-slate-300 mb-4" />
                                                    <p className="text-slate-400 font-medium animate-pulse">Carregando contatos...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginatedLeads.length > 0 ? (
                                        paginatedLeads.map((lead) => (
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
                                                    <span className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{lead.name}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-top pt-4 whitespace-nowrap bg-slate-50/50">
                                                    {lead.phone ? (
                                                        <span className="flex w-fit items-center gap-1.5 text-xs text-slate-700 bg-white px-2.5 py-1 rounded-md font-bold border border-slate-200 shadow-sm">
                                                            <Smartphone size={12} className="text-slate-400" />
                                                            {lead.phone}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-rose-400 font-medium italic">Sem telefone</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center align-top pt-4 whitespace-nowrap">
                                                    {verificationStatuses[lead.id] === 'valid' ? (
                                                        <span className="inline-flex items-center justify-center gap-1 w-[80px] py-[3px] rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                                                            <CheckCircle2 size={10} strokeWidth={3} />
                                                            Válido
                                                        </span>
                                                    ) : verificationStatuses[lead.id] === 'invalid' ? (
                                                        <span className="inline-flex items-center justify-center gap-1 w-[80px] py-[3px] rounded-full text-[9px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700">
                                                            <XCircle size={10} strokeWidth={3} />
                                                            Inválido
                                                        </span>
                                                    ) : verificationStatuses[lead.id] === 'unknown' ? (
                                                        <span className="inline-flex items-center justify-center gap-1 w-[80px] py-[3px] rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                                                            <AlertCircle size={10} strokeWidth={3} />
                                                            Incerto
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-2 w-[80px] py-[3px] rounded-full text-[9px] font-bold text-slate-400 bg-slate-100 uppercase tracking-wide">
                                                            Pendente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 align-top pt-4">
                                                    {lead.company ? (
                                                        <span className="text-sm text-slate-500">{lead.company}</span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5"></td>
                                           </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-16 text-center text-slate-400 bg-slate-50 border-dashed">
                                                <Users size={48} className="mx-auto mb-4 text-slate-300" />
                                                <p className="font-bold text-slate-500 text-sm">
                                                    {!selectedFolderId ? 'Selecione um cliente e uma pasta para listar os contatos.' : 'Nenhum lead nesta pasta'}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Paginação */}
                        {totalPages > 1 && (
                            <div className="bg-white border-t border-slate-100 p-4 flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-medium flex gap-1">
                                    Página <span className="text-slate-900 font-bold">{currentPage}</span> de <span className="text-slate-900 font-bold">{totalPages}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Anterior
                                    </button>
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
                </div>
            </div>
    );
};

export default WhatsAppVerifier;
