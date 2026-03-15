import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Building2, 
    FolderPlus, 
    Plus, 
    Search, 
    ChevronRight, 
    Users, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    UserPlus
} from 'lucide-react';
import Modal from '../ui/Modal';

interface LeadSource {
    type: 'google_maps' | 'instagram' | 'cnpj';
    data: any[];
}

interface TransferLeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLeads: any[];
    sourceType: 'google_maps' | 'instagram' | 'cnpj';
    onTransferComplete: () => void;
}

const TransferLeadsModal: React.FC<TransferLeadsModalProps> = ({
    isOpen,
    onClose,
    selectedLeads,
    sourceType,
    onTransferComplete
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Selection state
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    
    // Creation mode state
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    
    // New entity forms
    const [newClientName, setNewClientName] = useState('');
    const [newFolderName, setNewFolderName] = useState('');

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            fetchClients();
            // Reset states
            setStatus('idle');
            setErrorMessage('');
            setSelectedClientId('');
            setSelectedFolderId('');
            setIsCreatingClient(false);
            setIsCreatingFolder(false);
            setNewClientName('');
            setNewFolderName('');
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (selectedClientId && !isCreatingClient) {
            fetchFolders(selectedClientId);
        } else {
            setFolders([]);
            setSelectedFolderId('');
        }
    }, [selectedClientId, isCreatingClient]);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
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
                .select('id, name')
                .eq('client_id', clientId)
                .order('name');
            if (error) throw error;
            setFolders(data || []);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const normalizeLeadData = (lead: any) => {
        const base = {
            user_id: user?.id,
            client_id: null as string | null,
            folder_id: null as string | null,
            source: sourceType,
            created_at: new Date().toISOString()
        };

        if (sourceType === 'google_maps') {
            return {
                ...base,
                name: lead.title,
                phone: lead.phone,
                company: lead.title,
                website: lead.website,
                address: lead.address,
                rating: lead.rating,
                reviews: lead.reviews_count,
                specialties: lead.category
            };
        }

        if (sourceType === 'instagram') {
            return {
                ...base,
                name: lead.full_name || lead.username,
                phone: lead.public_phone_number,
                company: lead.username,
                website: lead.external_url,
                address: null,
                rating: null,
                reviews: null,
                specialties: lead.biography
            };
        }

        if (sourceType === 'cnpj') {
            return {
                ...base,
                name: lead.nome_fantasia || lead.razao_social,
                phone: lead.telefone,
                company: lead.razao_social,
                website: null,
                address: `${lead.logradouro}, ${lead.numero} - ${lead.bairro}, ${lead.municipio} - ${lead.uf}`,
                rating: null,
                reviews: null,
                specialties: lead.cnae_principal
            };
        }

        return base;
    };

    const handleTransfer = async () => {
        if (!user) return;
        
        // Validation
        if (isCreatingClient && !newClientName.trim()) {
            alert('Por favor, insira o nome do novo cliente.');
            return;
        }
        if (!isCreatingClient && !selectedClientId) {
            alert('Por favor, selecione um cliente.');
            return;
        }
        if (isCreatingFolder && !newFolderName.trim()) {
            alert('Por favor, insira o nome da nova pasta.');
            return;
        }

        setStatus('loading');
        try {
            let clientId = selectedClientId;
            let folderId = selectedFolderId;

            // 1. Create client if needed
            if (isCreatingClient) {
                const { data: clientData, error: clientError } = await supabase
                    .from('clients')
                    .insert([{ 
                        name: newClientName, 
                        user_id: user.id,
                        status: 'active'
                    }])
                    .select()
                    .single();
                
                if (clientError) throw clientError;
                clientId = clientData.id;
            }

            // 2. Create folder if needed
            if (isCreatingFolder || (isCreatingClient && newFolderName.trim())) {
                const { data: folderData, error: folderError } = await supabase
                    .from('lead_folders')
                    .insert([{ 
                        name: newFolderName || 'Geral', 
                        client_id: clientId,
                        user_id: user.id 
                    }])
                    .select()
                    .single();
                
                if (folderError) throw folderError;
                folderId = folderData.id;
            }

            // 3. Prepare normalized leads
            const leadsToInsert = selectedLeads.map(lead => ({
                ...normalizeLeadData(lead),
                client_id: clientId,
                folder_id: folderId || null
            }));

            // 4. Batch insert into 'leads'
            const { error: insertError } = await supabase
                .from('leads')
                .insert(leadsToInsert);
            
            if (insertError) throw insertError;

            // 5. Delete from source table
            const sourceTable = sourceType === 'google_maps' ? 'leads_google_maps' : 
                               sourceType === 'instagram' ? 'leads_instagram' : 'leads_cnpj';
            
            const { error: deleteError } = await supabase
                .from(sourceTable)
                .delete()
                .in('id', selectedLeads.map(l => l.id));
            
            if (deleteError) throw deleteError;

            setStatus('success');
            setTimeout(() => {
                onTransferComplete();
                onClose();
            }, 1500);

        } catch (err: any) {
            console.error('Transfer error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Erro ao realizar a transferência.');
        }
    };

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transferir Leads Extraídos"
            size="md"
        >
            <div className="space-y-6">
                {status === 'success' ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={48} className="text-green-600" />
                        </div>
                        <h4 className="text-xl font-black text-slate-800">Transferência Concluída!</h4>
                        <p className="text-slate-500 mt-2 font-medium">
                            {selectedLeads.length} leads foram movidos para o cliente com sucesso.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex items-center gap-5 transition-all shadow-2xl shadow-slate-200 group overflow-hidden relative">
                            {/* Accent glow */}
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-700" />
                            
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <Users className="text-amber-400" size={24} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-sm font-black text-white leading-tight uppercase tracking-widest">
                                    <span className="text-amber-400">{selectedLeads.length}</span> leads para transferência
                                </p>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold leading-relaxed uppercase tracking-wider max-w-[280px]">
                                    Serão movidos permanentemente para a base do cliente selecionado.
                                </p>
                            </div>
                        </div>

                        {/* Cliente Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Building2 size={16} className="text-slate-400" />
                                    Selecionar Cliente
                                </label>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsCreatingClient(!isCreatingClient);
                                        if (!isCreatingClient) setSelectedClientId('');
                                    }}
                                    className="text-xs font-black text-amber-500 hover:text-amber-600 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-all uppercase tracking-widest"
                                >
                                    {isCreatingClient ? 'Selecionar Existente' : 'Novo Cliente'}
                                </button>
                            </div>

                            {isCreatingClient ? (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="text"
                                        placeholder="Nome do Novo Cliente"
                                        value={newClientName}
                                        onChange={(e) => setNewClientName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-xs uppercase tracking-widest"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 pl-12 pr-5 py-3.5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-xs uppercase tracking-widest"
                                        />
                                    </div>
                                    <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50 bg-white/50 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                        {filteredClients.length > 0 ? (
                                            filteredClients.map(client => (
                                                <button
                                                    key={client.id}
                                                    type="button"
                                                    onClick={() => setSelectedClientId(client.id)}
                                                    className={`w-full text-left px-5 py-4 text-[10px] font-black transition-all flex items-center justify-between group uppercase tracking-[0.15em] ${selectedClientId === client.id ? 'bg-amber-50/50 text-amber-600 shadow-[inset_0_0_0_2px_rgba(245,158,11,0.2)]' : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-900'}`}
                                                >
                                                    {client.name}
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${selectedClientId === client.id ? 'bg-slate-900 text-amber-400 scale-110 shadow-lg' : 'bg-slate-100 text-slate-300 opacity-0 group-hover:opacity-100'}`}>
                                                        <ChevronRight size={16} className={selectedClientId === client.id ? 'translate-x-0' : '-translate-x-1 group-hover:translate-x-0 transition-transform'} />
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                Nenhum cliente encontrado.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Folder Selection */}
                        <div className={`space-y-3 transition-opacity duration-300 ${(selectedClientId || isCreatingClient) ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FolderPlus size={16} className="text-slate-400" />
                                    Pasta de Destino
                                </label>
                                {(selectedClientId || isCreatingClient) && (
                                    <button 
                                        type="button"
                                        onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                                        className="text-xs font-black text-amber-500 hover:text-amber-600 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-all uppercase tracking-widest"
                                    >
                                        {isCreatingFolder ? 'Selecionar Existente' : 'Nova Pasta'}
                                    </button>
                                )}
                            </div>

                            {isCreatingFolder || (isCreatingClient && folders.length === 0) ? (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="text"
                                        placeholder="Ex: Leads Quentes, Campanha VIP"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-xs uppercase tracking-widest"
                                        autoFocus={isCreatingFolder}
                                    />
                                </div>
                            ) : (
                                <div className="relative group">
                                    <select
                                        value={selectedFolderId}
                                        onChange={(e) => setSelectedFolderId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-5 py-3.5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-black text-xs uppercase tracking-widest appearance-none cursor-pointer"
                                    >
                                        <option value="">Selecione uma pasta...</option>
                                        <option value="none" className="font-bold text-slate-400 italic">-- Sem Pasta --</option>
                                        {folders.map(folder => (
                                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                                        <ChevronRight size={18} className="rotate-90" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {status === 'error' && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 animate-shake">
                                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                                <p className="text-xs font-bold text-red-800">{errorMessage}</p>
                            </div>
                        )}

                        <div className="pt-6 flex items-center gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={status === 'loading'}
                                className="flex-1 px-6 py-3.5 border border-slate-200 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleTransfer}
                                disabled={status === 'loading'}
                                className="flex-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all border border-slate-800 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.4)] active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3 uppercase tracking-[0.2em] group"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="animate-spin text-amber-400" size={18} />
                                        <span>Transferindo...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="group-hover:text-amber-400 transition-colors">Confirmar Transferência</span>
                                        <ChevronRight size={16} className="text-amber-500 group-hover:translate-x-1.5 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default TransferLeadsModal;
