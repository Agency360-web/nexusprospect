import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    RefreshCw,
    ArrowLeft,
    Users,
    Wifi,
    Building2,
    Folder,
    Loader2,
    Play,
    ChevronDown,
    Plus,
    CheckCircle2,
    Smartphone,
    Trash2,
    FolderInput,
    ArrowRight,
    Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Client, LeadFolder, Lead } from '../../types';

export const ContactSynchronizer: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [folders, setFolders] = useState<LeadFolder[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(false);

    // Pagination & Selection State
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const leadsPerPage = 100;

    // Selection State
    const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');

    // New Folder State
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    // Bulk Actions State
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [targetMoveFolderId, setTargetMoveFolderId] = useState<string>('');

    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

    // Fetch Instances
    const fetchInstances = async () => {
        try {
            const { data, error } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setWhatsappInstances(data || []);
        } catch (err) {
            console.error('Error fetching instances:', err);
        }
    };

    // Fetch Clients
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

    // Fetch Folders
    const fetchFolders = async (clientId: string) => {
        try {
            const { data, error } = await supabase
                .from('lead_folders')
                .select('*')
                .eq('client_id', clientId)
                .order('name');
            if (error) throw error;
            const filtered = (data || []).filter(f => f.name?.toLowerCase() !== 'todos');
            setFolders(filtered);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    // Fetch Leads
    const fetchLeads = async (folderId: string) => {
        if (!folderId) {
            setLeads([]);
            return;
        }
        setLoadingLeads(true);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('folder_id', folderId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
            setCurrentPage(1);
            setSelectedLeads([]); // Reset selection on folder change
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoadingLeads(false);
        }
    };

    // Bulk Delete Leads
    const handleDeleteLeads = async () => {
        if (selectedLeads.length === 0) return;
        if (!window.confirm(`Tem certeza que deseja apagar DEFINITIVAMENTE os ${selectedLeads.length} contatos selecionados? Esta ação não pode ser desfeita.`)) return;
        
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
            alert('Erro ao excluir os contatos.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Bulk Move Leads
    const handleMoveLeads = async () => {
        if (selectedLeads.length === 0 || !targetMoveFolderId) return;
        
        setIsMoving(true);
        try {
            const { error } = await supabase
                .from('leads')
                .update({ folder_id: targetMoveFolderId })
                .in('id', selectedLeads);
                
            if (error) throw error;
            
            // Remove from current list and reset selection
            setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
            setSelectedLeads([]);
            setTargetMoveFolderId('');
            
            const targetFolder = folders.find(f => f.id == targetMoveFolderId);
            alert(`Sucesso! ${selectedLeads.length} contatos movidos para a pasta "${targetFolder?.name}".`);
            
        } catch (err) {
            console.error('Error moving leads:', err);
            alert('Erro ao mover os contatos.');
        } finally {
            setIsMoving(false);
        }
    };

    // Selection Helpers
    const paginatedLeads = leads.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage);
    
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

    // Create New Folder
    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !selectedClientId) return;
        setIsCreatingFolder(true);
        try {
            const { data, error } = await supabase
                .from('lead_folders')
                .insert([{ name: newFolderName.trim(), client_id: selectedClientId, user_id: user?.id }])
                .select()
                .single();

            if (error) throw error;

            setFolders(prev => [...prev, data]);
            setSelectedFolderId(data.id);
            setNewFolderName('');
            setShowNewFolderInput(false);
        } catch (err) {
            console.error('Error creating folder:', err);
            alert('Erro ao criar pasta.');
        } finally {
            setIsCreatingFolder(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchInstances();
            fetchClients();
        }
    }, [user]);

    useEffect(() => {
        if (selectedClientId) {
            fetchFolders(selectedClientId);
            setSelectedFolderId('');
        } else {
            setFolders([]);
        }
    }, [selectedClientId]);

    useEffect(() => {
        if (selectedFolderId) {
            fetchLeads(selectedFolderId);
        } else {
            setLeads([]);
        }
    }, [selectedFolderId]);

    // Sync Action
    const handleSyncAction = async () => {
        if (!selectedInstanceId || !selectedFolderId) return;

        const selectedInstance = whatsappInstances.find(i => i.id == selectedInstanceId);
        if (!selectedInstance) {
            alert('Instância selecionada não encontrada.');
            return;
        }

        if (selectedInstance.status !== 'connected') {
            alert('A instância selecionada não está conectada. Conecte-a primeiro na seção de Conexões.');
            return;
        }

        const selectedFolder = folders.find(f => f.id == selectedFolderId);
        if (!selectedFolder) {
            alert('Pasta selecionada não encontrada.');
            return;
        }

        setIsSyncing(true);
        setSyncResult(null);

        try {
            const payload = {
                whatsapp_instance: selectedInstance,
                client_id: selectedClientId,
                folder_id: selectedFolderId,
                folder_name: selectedFolder.name,
                user_id: user?.id
            };

            const response = await fetch('https://nexus360.infra-conectamarketing.site/webhook/sincronizador_de_contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const responseText = await response.text();
                let resultData;
                try {
                    resultData = JSON.parse(responseText);
                } catch (e) {
                    console.error('Failed to parse webhook response:', responseText);
                    throw new Error('O servidor retornou um formato de dados inválido.');
                }

                console.log('Webhook Response parsed:', resultData);
                
                // Extract contacts from possible response formats with high flexibility
                let contactsArray = [];
                if (Array.isArray(resultData)) {
                    contactsArray = resultData;
                } else if (resultData && typeof resultData === 'object') {
                    console.log('Searching for contacts in object keys:', Object.keys(resultData));
                    
                    // 1. Try most common n8n/API keys first
                    const commonKeys = ['data', 'body', 'contacts', 'leads', 'items', 'output', 'json', 'results', 'messages'];
                    for (const key of commonKeys) {
                        if (Array.isArray(resultData[key])) {
                            console.log(`Found array in key: "${key}"`);
                            contactsArray = resultData[key];
                            break;
                        }
                    }
                    
                    // 2. Fallback: find the first available property that is an array
                    if (contactsArray.length === 0) {
                        const firstArrayKey = Object.keys(resultData).find(key => Array.isArray(resultData[key]));
                        if (firstArrayKey) {
                            console.log(`Fallback: Found array in arbitrary key: "${firstArrayKey}"`);
                            contactsArray = resultData[firstArrayKey];
                        }
                    }
                    
                    // 3. Single object case: if the object itself looks like a contact
                    if (contactsArray.length === 0 && (resultData.jid || resultData.contact_name || resultData.name || resultData.phone)) {
                        console.log('Treating single object as a one-item contact list');
                        contactsArray = [resultData];
                    }
                }

                // Final cleaning for n8n [{json:{...}}] format
                if (contactsArray.length > 0 && contactsArray[0].json) {
                    contactsArray = contactsArray.map(item => item.json);
                }

                console.log('Final Processed Contacts Array:', contactsArray);

                let importedCount = 0;
                if (contactsArray.length > 0) {
                    // Transform the webhook data to match 'leads' table
                    const leadsToImport = contactsArray.map(item => {
                        let phone = '';
                        if (item.jid) {
                            phone = item.jid.split('@')[0];
                        } else if (item.phone) {
                            phone = String(item.phone).replace(/\D/g, '');
                        } else if (item.number) {
                            phone = String(item.number).replace(/\D/g, '');
                        }

                        return {
                            name: item.contact_name || item.contact_FirstName || item.name || item.fullName || 'Contato Sem Nome',
                            phone: phone,
                            client_id: selectedClientId,
                            folder_id: selectedFolderId,
                            user_id: user?.id
                        };
                    }).filter(l => l.phone);

                    console.log(`Ready to save ${leadsToImport.length} leads:`, leadsToImport);

                    if (leadsToImport.length > 0) {
                        importedCount = leadsToImport.length;
                        
                        // Try bulk upsert first
                        const { error: upsertError } = await supabase
                            .from('leads')
                            .upsert(leadsToImport, { onConflict: 'phone,folder_id' });
                        
                        if (upsertError) {
                            console.warn('Upsert failed, trying chunked insert:', upsertError.message || upsertError);
                            // Fallback to chunks of 50
                            const chunkSize = 50;
                            for (let i = 0; i < leadsToImport.length; i += chunkSize) {
                                const chunk = leadsToImport.slice(i, i + chunkSize);
                                const { error: insertError } = await supabase.from('leads').insert(chunk);
                                if (insertError) console.error('Chunk insert error:', insertError.message);
                            }
                        }
                    }
                }

                if (importedCount > 0) {
                    setSyncResult({ 
                        success: true, 
                        message: `Sincronização concluída! ${importedCount} contatos foram sincronizados.` 
                    });
                } else {
                    setSyncResult({ 
                        success: true, 
                        message: 'Sincronização finalizada, mas nenhum contato foi encontrado na resposta.' 
                    });
                }

                // Small delay to ensure Supabase indexing
                setTimeout(() => {
                    fetchLeads(selectedFolderId);
                }, 1000);
            } else {
                setSyncResult({ success: false, message: 'Erro ao se comunicar com o servidor de sincronização.' });
            }
        } catch (error) {
            console.error('Error syncing contacts:', error);
            setSyncResult({ success: false, message: 'Houve um erro de rede ao chamar o sincronizador.' });
        } finally {
            setIsSyncing(false);
        }
    };

    const connectedInstances = whatsappInstances.filter(i => i.status === 'connected');
    const canSync = selectedInstanceId && selectedFolderId && !isSyncing;

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
                            <RefreshCw className="text-brand-500" size={32} />
                            Sincronizador de Contatos
                        </h1>
                        <p className="text-slate-300 font-medium text-sm md:text-base">Mantenha seus leads do WhatsApp sincronizados e organizados por pastas.</p>
                    </div>
                </div>
            </div>

            {/* Unified Toolbar */}
            <div className="transition-all duration-500">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">

                    {/* Selectors */}
                    <div className="flex flex-col md:flex-row gap-3 flex-1 w-full">
                        {/* Instance Select */}
                        <div className="relative flex-1 group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                <Wifi size={16} />
                            </div>
                            <select
                                value={selectedInstanceId}
                                onChange={(e) => setSelectedInstanceId(e.target.value)}
                                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                            >
                                <option value="" disabled>1. WhatsApp para Sincronizar</option>
                                {connectedInstances.length > 0 ? (
                                    connectedInstances.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.profile_name || inst.instance || inst.instance_name || inst.name || `Instância ${String(inst.id || '').slice(0, 8)}`}
                                        </option>
                                    ))
                                ) : (
                                    <option value="" disabled>Nenhuma instância conectada</option>
                                )}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10" />
                        </div>

                        {/* Client Select */}
                        <div className={`relative flex-1 group transition-all duration-300 ${!selectedInstanceId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                <Building2 size={16} />
                            </div>
                            <select
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                            >
                                <option value="" disabled>2. Cliente</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10" />
                        </div>

                        {/* Folder Select + Create */}
                        <div className={`relative flex-1 group transition-all duration-300 ${!selectedClientId ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            {!showNewFolderInput ? (
                                <>
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                        <Folder size={16} />
                                    </div>
                                    <select
                                        value={selectedFolderId}
                                        onChange={(e) => {
                                            if (e.target.value === '__new__') {
                                                setShowNewFolderInput(true);
                                                setSelectedFolderId('');
                                            } else {
                                                setSelectedFolderId(e.target.value);
                                            }
                                        }}
                                        className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                                    >
                                        <option value="" disabled>3. Pasta de Destino</option>
                                        {folders.map(folder => (
                                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                                        ))}
                                        <option value="__new__">＋ Criar nova pasta...</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10" />
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                        placeholder="Nome da nova pasta..."
                                        autoFocus
                                        className="flex-1 pl-4 pr-4 py-2.5 bg-slate-50 hover:bg-white border border-brand-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                    />
                                    <button
                                        onClick={handleCreateFolder}
                                        disabled={!newFolderName.trim() || isCreatingFolder}
                                        className="p-2.5 bg-brand-500 text-slate-900 rounded-xl hover:bg-brand-400 transition-all disabled:opacity-50 flex-shrink-0"
                                        title="Criar pasta"
                                    >
                                        {isCreatingFolder ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
                                    </button>
                                    <button
                                        onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
                                        className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all flex-shrink-0 text-xs font-bold"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {selectedLeads.length > 0 ? (
                            <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300 w-full md:w-auto">
                                <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-100 rounded-xl text-slate-900 font-bold text-xs whitespace-nowrap">
                                    <CheckCircle2 size={14} className="text-brand-600" />
                                    <span>{selectedLeads.length} selecionados</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <div className="relative group min-w-[140px]">
                                        <select
                                            value={targetMoveFolderId}
                                            onChange={(e) => setTargetMoveFolderId(e.target.value)}
                                            className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2 pl-3 pr-8 font-bold text-[11px] text-slate-600 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 transition-all"
                                        >
                                            <option value="" disabled>Mover para...</option>
                                            {folders.filter(f => f.id !== selectedFolderId).map(folder => (
                                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:translate-y-0.5 z-10" />
                                    </div>

                                    <button
                                        onClick={handleMoveLeads}
                                        disabled={!targetMoveFolderId || isMoving}
                                        className="p-2 bg-brand-500 text-slate-900 hover:bg-brand-400 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                        title="Mover selecionados"
                                    >
                                        {isMoving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                    </button>

                                    <button 
                                        onClick={handleDeleteLeads}
                                        disabled={isDeleting}
                                        className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                        title="Excluir selecionados"
                                    >
                                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleSyncAction}
                                disabled={!canSync}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Sincronizando...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} className="fill-current" />
                                        Iniciar Sincronização
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area - Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-white border-b border-slate-200 text-slate-600">
                                    <th className="p-3 w-12 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeads.includes(l.id))}
                                            onChange={selectAllLeads}
                                            className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/50 cursor-pointer"
                                        />
                                    </th>
                                    <th className="text-left px-6 py-4 font-bold text-[10px] uppercase tracking-wider w-1/3">Contato / Lead</th>
                                    <th className="text-left px-6 py-4 font-black text-[10px] uppercase tracking-wider border-l-2 border-slate-50 w-1/4">Telefone</th>
                                    <th className="text-center px-6 py-4 font-black text-[10px] uppercase tracking-wider w-auto">Status</th>
                                    <th className="px-6 py-4 w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingLeads ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Loader2 size={32} className="animate-spin text-brand-500 mb-4" />
                                                <p className="text-slate-400 font-medium animate-pulse">Buscando contatos na pasta...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : leads.length > 0 ? (
                                    paginatedLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-white transition-colors group">
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedLeads.includes(lead.id)}
                                                    onChange={() => toggleLeadSelection(lead.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/50 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">{lead.name}</span>
                                            </td>
                                            <td className="px-6 py-4 bg-slate-50/50 group-hover:bg-white transition-colors">
                                                {lead.phone ? (
                                                    <span className="flex w-fit items-center gap-1.5 text-xs text-slate-700 bg-white px-2.5 py-1 rounded-md font-bold border border-slate-200 shadow-sm">
                                                        <Smartphone size={12} className="text-slate-400" />
                                                        {lead.phone}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-rose-400 font-medium italic">Sem telefone</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center gap-1 w-[80px] py-[3px] rounded-full text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                                                    <Clock size={10} strokeWidth={3} />
                                                    Pendente
                                                </span>
                                            </td>
                                            <td className="px-6 py-4"></td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-slate-400 bg-slate-50 border-dashed">
                                            <div className="flex flex-col items-center justify-center">
                                                {isSyncing ? (
                                                    <>
                                                        <Loader2 size={48} className="animate-spin text-brand-500/30 mb-4" />
                                                        <p className="font-bold text-slate-500 text-sm">Sincronização em andamento...</p>
                                                        <p className="text-slate-400 text-xs mt-1">Os contatos aparecerão aqui em breve.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Users size={48} className="text-slate-300 mb-4" />
                                                        <p className="font-bold text-slate-500 text-sm">Nenhum contato encontrado nesta pasta.</p>
                                                        <p className="text-slate-400 text-xs mt-1">Inicie uma sincronização ou selecione outra pasta.</p>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {leads.length > leadsPerPage && (
                        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                            <div className="text-xs text-slate-500 font-medium">
                                Mostrando <span className="font-bold text-slate-800">{(currentPage - 1) * leadsPerPage + 1}</span> a <span className="font-bold text-slate-800">{Math.min(currentPage * leadsPerPage, leads.length)}</span> de <span className="font-bold text-slate-800">{leads.length}</span> contatos
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all font-inter"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(leads.length / leadsPerPage)))}
                                    disabled={currentPage === Math.ceil(leads.length / leadsPerPage)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-all font-inter"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Notifications Only */}
            {syncResult && !syncResult.success && (
                <div className={`fixed bottom-8 right-8 z-50 animate-in slide-in-from-right duration-500`}>
                    <div className="p-4 rounded-2xl shadow-2xl flex items-center gap-4 border bg-rose-600 border-rose-500 text-white">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <RefreshCw size={24} />
                        </div>
                        <div>
                            <p className="font-black text-sm">Ocorreu um erro</p>
                            <p className="text-xs font-medium opacity-90">{syncResult.message}</p>
                        </div>
                        <button 
                            onClick={() => setSyncResult(null)}
                            className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={16} className="rotate-90" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactSynchronizer;
