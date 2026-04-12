import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { WEBHOOKS } from '../../config/webhooks';
import {
    ArrowLeft,
    Wifi,
    Loader2,
    Play,
    ChevronDown,
    CheckCircle2,
    RefreshCw,
    Users,
    Smartphone,
    Info,
    AlertCircle,
    XCircle,
    Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GroupExtractor: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);

    // Selection State
    const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');

    // Extractions State
    const [extractedData, setExtractedData] = useState<Record<string, { leadsCount: number; leads: any[]; isSaved: boolean }>>({});
    const [groupSaveState, setGroupSaveState] = useState<Record<string, { clientId: string; folderId: string; newFolderName: string; isSaving: boolean; }>>({});
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractingLeadsMap, setExtractingLeadsMap] = useState<Record<string, boolean>>({});
    const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);

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

    // Fetch Clients & Folders
    const fetchClientsAndFolders = async () => {
        if (!user) return;
        try {
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('name');
            if (clientsError) throw clientsError;
            
            const activeClients = clientsData || [];
            setClients(activeClients);

            if (activeClients.length > 0) {
                const clientIds = activeClients.map(c => c.id);
                const { data: foldersData, error: foldersError } = await supabase
                    .from('lead_folders')
                    .select('*')
                    .in('client_id', clientIds)
                    .order('name');
                if (foldersError) throw foldersError;
                setFolders(foldersData || []);
            }
        } catch (err) {
            console.error('Error fetching clients and folders:', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchInstances();
            fetchClientsAndFolders();
        }
    }, [user]);

    // Action
    const handleExtractAction = async () => {
        if (!selectedInstanceId) return;

        const selectedInstance = whatsappInstances.find(i => i.id == selectedInstanceId);
        if (!selectedInstance) {
            alert('Instância selecionada não encontrada.');
            return;
        }

        if (selectedInstance.status !== 'connected') {
            alert('A instância selecionada não está conectada. Conecte-a primeiro na seção de Conexões.');
            return;
        }

        setIsExtracting(true);
        setExportResult(null);

        try {
            const payload = {
                whatsapp_instance: selectedInstance,
                user_id: user?.id,
                user_email: user?.email,
            };

            const response = await fetch(WEBHOOKS.GROUP_LIST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resultData = await response.json();
                
                // Flexible parsing of groups list
                let groupsList = [];
                
                // Formato padrão n8n: [{ sucesso: true, grupos: [...] }]
                if (Array.isArray(resultData) && resultData.length > 0 && Array.isArray(resultData[0].grupos)) {
                    groupsList = resultData[0].grupos;
                } 
                // Formato de objeto direto: { sucesso: true, grupos: [...] }
                else if (resultData && typeof resultData === 'object' && Array.isArray(resultData.grupos)) {
                    groupsList = resultData.grupos;
                }
                // Fallbacks genéricos
                else if (Array.isArray(resultData)) {
                    groupsList = resultData;
                } else if (resultData && typeof resultData === 'object') {
                    const commonKeys = ['data', 'body', 'groups', 'items', 'output', 'json', 'results'];
                    for (const key of commonKeys) {
                        if (Array.isArray(resultData[key])) {
                            groupsList = resultData[key];
                            break;
                        }
                    }
                }

                // Normalizing n8n [{json:{...}}] format if present
                if (groupsList.length > 0 && groupsList[0].json) {
                    groupsList = groupsList.map((item: any) => item.json);
                }

                setGroups(groupsList);
            } else {
                setExportResult({ success: false, message: 'Erro ao se comunicar com o servidor.' });
            }
        } catch (error) {
            console.error('Error extracting groups:', error);
            setExportResult({ success: false, message: 'Houve um erro ao processar a resposta do servidor.' });
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGetLeadsAction = async (groupId: string) => {
        if (!selectedInstanceId || !groupId) return;

        const selectedInstance = whatsappInstances.find(i => i.id == selectedInstanceId);
        if (!selectedInstance) return;

        setExtractingLeadsMap(prev => ({ ...prev, [groupId]: true }));

        try {
            const payload = {
                whatsapp_instance: selectedInstance,
                group_id: groupId,
                user_id: user?.id,
                user_email: user?.email,
            };

            const response = await fetch(WEBHOOKS.GROUP_LEADS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resultData = await response.json();
                
                // Flexible parsing logic
                let extractions: any = null;

                if (Array.isArray(resultData) && resultData.length > 0 && resultData[0].participantes) {
                    extractions = resultData[0];
                } else if (resultData && typeof resultData === 'object' && resultData.participantes) {
                    extractions = resultData;
                } else if (Array.isArray(resultData) && resultData.length > 0 && resultData[0].json?.participantes) {
                    extractions = resultData[0].json;
                } else if (resultData && typeof resultData === 'object') {
                    // try to find any key that holds the array or object
                    const commonKeys = ['data', 'body', 'output', 'json', 'results'];
                    for (const key of commonKeys) {
                        if (resultData[key] && Array.isArray(resultData[key]) && resultData[key].length > 0 && resultData[key][0].participantes) {
                            extractions = resultData[key][0];
                            break;
                        } else if (resultData[key] && resultData[key].participantes) {
                            extractions = resultData[key];
                            break;
                        }
                    }
                }

                if (extractions && extractions.participantes && Array.isArray(extractions.participantes)) {
                    setExtractedData(prev => ({
                        ...prev,
                        [groupId]: {
                            leadsCount: extractions.total_leads || extractions.participantes.length,
                            leads: extractions.participantes,
                            isSaved: false
                        }
                    }));
                    
                    // Initial form state
                    setGroupSaveState(prev => ({
                        ...prev,
                        [groupId]: {
                            clientId: '',
                            folderId: '',
                            newFolderName: '',
                            isSaving: false
                        }
                    }));
                } else {
                    console.error("Payload não reconhecido:", resultData);
                    setExportResult({ success: false, message: 'Nenhum lead retornado pelo servidor ou formato inválido.' });
                }
            } else {
                setExportResult({ success: false, message: 'Falha ao solicitar extração dos leads.' });
            }
        } catch (error) {
            console.error('Error getting leads from group:', error);
            setExportResult({ success: false, message: 'Erro de rede ao tentar extrair leads.' });
        } finally {
            setExtractingLeadsMap(prev => ({ ...prev, [groupId]: false }));
        }
    };

    const handleSaveLeads = async (groupId: string) => {
        const saveState = groupSaveState[groupId];
        const extracted = extractedData[groupId];
        if (!saveState || !extracted || !user) return;

        if (!saveState.clientId) {
            setExportResult({ success: false, message: 'Por favor, selecione um cliente.' });
            return;
        }
        if (saveState.folderId === 'new' && !saveState.newFolderName.trim()) {
            setExportResult({ success: false, message: 'O nome da nova pasta não pode estar vazio.' });
            return;
        }
        if (saveState.folderId !== 'new' && !saveState.folderId) {
            setExportResult({ success: false, message: 'Por favor, selecione uma pasta ou crie uma nova.' });
            return;
        }

        setGroupSaveState(prev => ({
            ...prev,
            [groupId]: { ...saveState, isSaving: true }
        }));

        try {
            let finalFolderId = saveState.folderId;

            if (finalFolderId === 'new') {
                const { data: newFolder, error: folderError } = await supabase
                    .from('lead_folders')
                    .insert([{
                        name: saveState.newFolderName.trim(),
                        client_id: saveState.clientId
                    }])
                    .select()
                    .single();

                if (folderError) throw folderError;
                finalFolderId = newFolder.id;

                setFolders(prev => [...prev, newFolder]);
            }

            const leadsToInsert = extracted.leads.map(lead => {
                const rawPhone = String(lead.telefone || '');
                const cleanPhone = rawPhone.replace(/\D/g, '');
                
                return {
                    name: lead.nome || 'Contato sem nome',
                    phone: cleanPhone,
                    client_id: saveState.clientId,
                    user_id: user.id,
                    folder_id: finalFolderId
                };
            });

            const { error: leadsError } = await supabase
                .from('leads')
                .insert(leadsToInsert);

            if (leadsError) throw leadsError;

            // Updated view state upon success
            setExtractedData(prev => ({
                ...prev,
                [groupId]: { ...extracted, isSaved: true }
            }));
            
        } catch (err) {
            console.error("Error saving leads:", err);
            setExportResult({ success: false, message: 'Ocorreu um erro ao tentar salvar os leads no banco de dados.' });
        } finally {
            setGroupSaveState(prev => ({
                ...prev,
                [groupId]: { ...saveState, isSaving: false }
            }));
        }
    };

    const connectedInstances = whatsappInstances.filter(i => i.status === 'connected');
    const canExtract = selectedInstanceId && !isExtracting;

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
                            <Users className="text-brand-500" size={32} />
                            Extrator de Grupos
                        </h1>
                        <p className="text-slate-300 font-medium text-sm md:text-base">Liste todos os grupos do seu WhatsApp conectado num clique.</p>
                    </div>
                </div>
            </div>

            {/* Unified Toolbar */}
            <div className="transition-all duration-500">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                    
                    {/* Selectors */}
                    <div className="flex flex-col md:flex-row gap-3 flex-1 w-full xl:max-w-xl">
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
                                <option value="" disabled>1. WhatsApp de Origem</option>
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
                    </div>

                    {/* Action Area */}
                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 xl:mt-0">
                        <button
                            onClick={handleExtractAction}
                            disabled={!canExtract}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                        >
                            {isExtracting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <Play size={16} className="fill-current" />
                                    Listar Grupos
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Groups Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <th className="text-left px-6 py-4 font-bold text-[10px] uppercase tracking-wider w-1/2">
                                        <div className="flex items-center gap-2">
                                            Grupo / Comunidade
                                            {groups.length > 0 && !isExtracting && (
                                                <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-semibold tracking-normal lowercase">
                                                    {groups.length} {groups.length === 1 ? 'grupo listado' : 'grupos listados'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="text-left px-6 py-4 font-black text-[10px] uppercase tracking-wider border-l-2 border-slate-100 w-1/4">ID</th>
                                    <th className="text-center px-6 py-4 font-black text-[10px] uppercase tracking-wider w-auto">Status</th>
                                    <th className="px-6 py-4 w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isExtracting ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Loader2 size={32} className="animate-spin text-brand-500 mb-4" />
                                                <p className="text-slate-400 font-medium animate-pulse">Buscando grupos na instância...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : groups.length > 0 ? (
                                    groups.map((group, index) => {
                                        const groupId = group.id_grupo || group.id || group.jid || `group-${index}`;
                                        const groupName = group.nome_grupo || group.subject || group.name || group.fullName || 'Grupo sem Nome';
                                        
                                        return (
                                        <React.Fragment key={groupId}>
                                            <tr className={`hover:bg-slate-50 transition-colors group ${extractedData[groupId] && !extractedData[groupId].isSaved ? 'bg-slate-50/50 border-b-transparent' : extractedData[groupId]?.isSaved ? 'bg-slate-50' : 'bg-white'}`}>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-800 text-xs">
                                                        {groupName}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 bg-slate-50/50 group-hover:bg-white transition-colors">
                                                    <span className="flex w-fit items-center gap-1.5 text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                                                        {groupId}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleGetLeadsAction(groupId)}
                                                        disabled={extractingLeadsMap[groupId] || (extractedData[groupId] && extractedData[groupId].isSaved)}
                                                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all
                                                            ${extractingLeadsMap[groupId] 
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                                                : (extractedData[groupId] && extractedData[groupId].isSaved)
                                                                    ? 'bg-emerald-600 text-white cursor-default'
                                                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100/50'
                                                            }`}
                                                    >
                                                        {extractingLeadsMap[groupId] ? (
                                                            <>
                                                                <Loader2 size={10} className="animate-spin" />
                                                                Extraindo...
                                                            </>
                                                        ) : (extractedData[groupId] && extractedData[groupId].isSaved) ? (
                                                            <>
                                                                <CheckCircle2 size={10} strokeWidth={3} />
                                                                Leads Extraídos
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Download size={10} strokeWidth={3} />
                                                                Extrair Leads
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4"></td>
                                            </tr>
                                            
                                            {/* Extracted Leads Inline Bar */}
                                            {extractedData[groupId] && (
                                                <tr className={`border-b ${extractedData[groupId].isSaved ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/50 border-slate-200'}`}>
                                                    <td colSpan={4} className="px-6 py-3">
                                                        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                                                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                                                                <CheckCircle2 size={16} className="text-emerald-600" />
                                                                Leads extraídos: <span className="font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded text-xs leading-none">{extractedData[groupId].leadsCount}</span>
                                                            </div>

                                                            {!extractedData[groupId].isSaved ? (
                                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto">
                                                                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Deseja salvar em qual pasta?</span>
                                                                    
                                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                                        <select 
                                                                            value={groupSaveState[groupId]?.clientId || ''}
                                                                            onChange={e => {
                                                                                const cId = e.target.value;
                                                                                setGroupSaveState(prev => ({ ...prev, [groupId]: { ...prev[groupId], clientId: cId, folderId: '' } }));
                                                                            }}
                                                                            className="w-full sm:w-40 appearance-none bg-white border border-slate-200 py-1.5 px-3 text-xs font-semibold text-slate-700 rounded-lg focus:outline-none focus:border-brand-500"
                                                                        >
                                                                            <option value="" disabled>Selecione Cliente</option>
                                                                            {clients.map(c => (
                                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                                            ))}
                                                                        </select>

                                                                        {groupSaveState[groupId]?.clientId && (
                                                                            <select 
                                                                                value={groupSaveState[groupId]?.folderId || ''}
                                                                                onChange={e => setGroupSaveState(prev => ({ ...prev, [groupId]: { ...prev[groupId], folderId: e.target.value } }))}
                                                                                className="w-full sm:w-40 appearance-none bg-white border border-slate-200 py-1.5 px-3 text-xs font-semibold text-slate-700 rounded-lg focus:outline-none focus:border-brand-500"
                                                                            >
                                                                                <option value="" disabled>Selecione a Pasta</option>
                                                                                <option value="new" className="font-bold text-brand-600">+ Nova Pasta</option>
                                                                                {folders.filter(f => f.client_id === groupSaveState[groupId].clientId).map(f => (
                                                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </div>

                                                                    {groupSaveState[groupId]?.folderId === 'new' && (
                                                                        <input 
                                                                            type="text"
                                                                            placeholder="Nome da pasta"
                                                                            value={groupSaveState[groupId]?.newFolderName || ''}
                                                                            onChange={e => setGroupSaveState(prev => ({ ...prev, [groupId]: { ...prev[groupId], newFolderName: e.target.value } }))}
                                                                            className="w-full sm:w-40 bg-white border border-slate-200 py-1.5 px-3 text-xs font-semibold text-slate-700 rounded-lg focus:outline-none focus:border-brand-500"
                                                                        />
                                                                    )}

                                                                    <button 
                                                                        onClick={() => handleSaveLeads(groupId)}
                                                                        disabled={groupSaveState[groupId]?.isSaving || !groupSaveState[groupId]?.clientId || !groupSaveState[groupId]?.folderId || (groupSaveState[groupId]?.folderId === 'new' && !groupSaveState[groupId]?.newFolderName.trim())}
                                                                        className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-brand-500 text-white hover:bg-brand-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                                                                    >
                                                                        {groupSaveState[groupId]?.isSaving ? (
                                                                            <><Loader2 size={12} className="animate-spin" /> Salvando...</>
                                                                        ) : (
                                                                            <><Download size={12} /> Salvar Leads</>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold">
                                                                    <CheckCircle2 size={12} />
                                                                    Salvo em sua base!
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )})
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center text-slate-400 bg-slate-50 border-dashed">
                                            <div className="flex flex-col items-center justify-center">
                                                <Users size={48} className="text-slate-300 mb-4" />
                                                <p className="font-bold text-slate-500 text-sm">Nenhum grupo listado.</p>
                                                <p className="text-slate-400 text-xs mt-1">Clique no botão "Listar Grupos" para começar.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Error Notifications Only */}
            {exportResult && !exportResult.success && (
                <div className={`fixed bottom-8 right-8 z-50 animate-in slide-in-from-right duration-500`}>
                    <div className="p-4 rounded-2xl shadow-2xl flex items-center gap-4 border bg-rose-600 border-rose-500 text-white">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <RefreshCw size={24} />
                        </div>
                        <div>
                            <p className="font-black text-sm">Ocorreu um erro</p>
                            <p className="text-xs font-medium opacity-90">{exportResult.message}</p>
                        </div>
                        <button
                            onClick={() => setExportResult(null)}
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

export default GroupExtractor;
