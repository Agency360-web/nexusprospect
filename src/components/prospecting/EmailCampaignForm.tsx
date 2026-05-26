import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Mail, Image as ImageIcon, Users, Clock, AlignLeft, AlertCircle, CheckCircle2, Building2, Folder, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EmailCampaignMonitor from './EmailCampaignMonitor';

const EmailCampaignForm: React.FC = () => {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [minDelay, setMinDelay] = useState(15);
    const [maxDelay, setMaxDelay] = useState(30);
    const [messageText, setMessageText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [leadsPerPage, setLeadsPerPage] = useState(20);
    const [success, setSuccess] = useState(false);

    const { user } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [emailConnections, setEmailConnections] = useState<any[]>([]);
    const [selectedEmailConnectionId, setSelectedEmailConnectionId] = useState<string>('');
    const [isAutomated, setIsAutomated] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            if (!user) return;
            try {
                const [clientsRes, emailsRes] = await Promise.all([
                    supabase.from('clients').select('id, name').eq('user_id', user.id).order('name'),
                    supabase.from('email_connections').select('id, name, email').eq('user_id', user.id).order('name')
                ]);
                if (!clientsRes.error && clientsRes.data) setClients(clientsRes.data);
                if (!emailsRes.error && emailsRes.data) setEmailConnections(emailsRes.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchClients();
    }, [user]);

    useEffect(() => {
        const fetchFoldersAndLeads = async () => {
            if (!selectedClientId) {
                setFolders([]);
                setLeads([]);
                return;
            }
            try {
                const { data: folderData } = await supabase
                    .from('lead_folders')
                    .select('id, name')
                    .eq('client_id', selectedClientId);
                setFolders(folderData || []);

                let query = supabase
                    .from('leads')
                    .select('id, name, email, company, phone, website, address, rating, reviews, specialties')
                    .eq('client_id', selectedClientId)
                    .not('email', 'is', null) // Apenas leads COM email
                    .order('name');
                    
                if (selectedFolderId) {
                    query = query.eq('folder_id', selectedFolderId);
                }
                const { data: leadsData } = await query;
                
                // Extra verificação: garantir que a string não está vazia
                const validLeads = (leadsData || []).filter(l => l.email && l.email.trim() !== '');
                
                setLeads(validLeads);
                setSelectedLeads([]);
                setCurrentPage(1);
            } catch (err) {
                console.error(err);
            }
        };
        fetchFoldersAndLeads();
    }, [selectedClientId, selectedFolderId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEmailConnectionId) {
            alert('Por favor, selecione um E-mail Remetente para fazer o disparo.');
            return;
        }
        if (!name.trim()) {
            alert('Por favor, insira o nome da campanha.');
            return;
        }
        if (!subject.trim()) {
            alert('Por favor, insira o assunto do e-mail.');
            return;
        }
        if (selectedLeads.length === 0) {
            alert('Por favor, selecione ao menos um lead.');
            return;
        }

        if (isAutomated) {
            if (!scheduledAt) {
                alert('Por favor, defina a data e hora para o agendamento.');
                return;
            }
            const selectedDate = new Date(scheduledAt);
            const now = new Date();
            const maxDate = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);
            
            if (selectedDate <= now) {
                alert('A data de agendamento deve ser no futuro.');
                return;
            }
            if (selectedDate > maxDate) {
                alert('O agendamento pode ser feito no máximo para 32 dias à frente.');
                return;
            }
        }

        setLoading(true);
        setSuccess(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            const fullSelectedLeads = selectedLeads
                .map(id => leads.find(l => l.id === id))
                .filter(Boolean);

            const folderName = folders.find(f => f.id === selectedFolderId)?.name || 'Todas as Pastas';
            const selectedClient = clients.find(c => c.id === selectedClientId);
            const emailConn = emailConnections.find(ec => ec.id === selectedEmailConnectionId);

            const { data: campaignData, error: dbError } = await supabase
                .from('campaigns')
                .insert([{
                    name,
                    status: isAutomated ? 'scheduled' : 'inactive',
                    type: 'email_marketing',
                    user_id: userId,
                    configuration: {
                        subject,
                        minDelay,
                        maxDelay,
                        messageText: messageText || '',
                        selectedLeadsCount: selectedLeads.length,
                        clientId: selectedClientId,
                        clientName: selectedClient?.name,
                        folderId: selectedFolderId || null,
                        isAutomated,
                        scheduledAt: isAutomated ? new Date(scheduledAt).toISOString() : null,
                        folderName,
                        emailConnectionId: selectedEmailConnectionId,
                        senderEmail: emailConn?.email,
                        senderName: emailConn?.name,
                        fullSelectedLeads
                    }
                }])
                .select()
                .single();

            if (dbError) {
                console.error('Erro ao salvar campanha no banco local:', dbError);
            }

            if (file && campaignData?.id) {
                const uploadMediaToStorage = async () => {
                    try {
                        const fileExt = file.name.split('.').pop();
                        const storagePath = `${userId}/${campaignData.id}/${Date.now()}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from('campaign-media')
                            .upload(storagePath, file);

                        if (uploadError) {
                            console.warn('Erro ao fazer upload da mídia:', uploadError);
                            return;
                        }

                        const { data: { publicUrl } } = supabase.storage
                            .from('campaign-media')
                            .getPublicUrl(storagePath);

                        await supabase
                            .from('campaigns')
                            .update({
                                configuration: {
                                    ...campaignData.configuration,
                                    mediaUrl: publicUrl,
                                    mediaType: file.type,
                                    mediaName: file.name,
                                }
                            })
                            .eq('id', campaignData.id);
                    } catch (err) {
                        console.warn('Falha no upload de mídia:', err);
                    }
                };
                uploadMediaToStorage();
            }

            if (campaignData?.id) {
                const messagesToInsert = fullSelectedLeads.map((lead: any) => ({
                    campaign_id: campaignData.id,
                    lead_id: lead.id,
                    lead_name: lead.name || null,
                    lead_phone: lead.phone || null,
                    status: 'pending',
                }));

                const batchSize = 100;
                for (let i = 0; i < messagesToInsert.length; i += batchSize) {
                    const batch = messagesToInsert.slice(i, i + batchSize);
                    const { error: msgError } = await supabase
                        .from('campaign_messages')
                        .insert(batch);
                    if (msgError) {
                        console.error('Erro ao inserir campaign_messages:', msgError);
                    }
                }
            }

            // Obter detalhes da conexão de e-mail selecionada para enviar no webhook (já obtido acima)

            // Converter arquivo para base64, se existir, para o webhook
            let fileBase64 = null;
            if (file) {
                fileBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                });
            }

            // Disparar Webhook
            const payload = {
                campaignType: 'email_marketing',
                name,
                subject,
                minDelay,
                maxDelay,
                messageText,
                selectedLeads: fullSelectedLeads,
                clientId: selectedClientId,
                folderId: selectedFolderId,
                folderName,
                userId,
                campaignId: campaignData?.id,
                emailConnection: emailConn,
                isAutomated,
                scheduledAt: isAutomated ? new Date(scheduledAt).toISOString() : null,
                file: fileBase64,
                mimetype: file?.type || null,
                fileName: file?.name || null,
            };

            setSuccess(true);

            setTimeout(() => {
                setSuccess(false);
                setName('');
                setSubject('');
                setMessageText('');
                setSelectedLeads([]);
                setFile(null);
                setSelectedClientId('');
                setSelectedFolderId('');
                setSelectedEmailConnectionId('');
            }, 3000);

        } catch (error: any) {
            console.error('Erro ao criar campanha:', error);
            alert(`Houve um erro ao processar a campanha: ${error.message || 'Tente novamente.'}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeads(prev =>
            prev.includes(leadId)
                ? prev.filter(id => id !== leadId)
                : [...prev, leadId]
        );
    };

    const selectAllLeads = () => {
        if (selectedLeads.length === leads.length && leads.length > 0) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map(l => l.id));
        }
    };

    const selectLeadsBatch = (count: number) => {
        const unselectedLeads = leads.filter(l => !selectedLeads.includes(l.id));
        const toSelect = unselectedLeads.slice(0, count).map(l => l.id);
        setSelectedLeads(prev => [...prev, ...toSelect]);
    };

    const currentPageLeads = leads.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage);
    const currentPageLeadIds = currentPageLeads.map(l => l.id);
    const allCurrentPageSelected = currentPageLeads.length > 0 && currentPageLeadIds.every(id => selectedLeads.includes(id));

    const toggleSelectCurrentPage = () => {
        if (allCurrentPageSelected) {
            setSelectedLeads(prev => prev.filter(id => !currentPageLeadIds.includes(id)));
        } else {
            const toAdd = currentPageLeadIds.filter(id => !selectedLeads.includes(id));
            setSelectedLeads(prev => [...prev, ...toAdd]);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 animate-in slide-in-from-bottom-2 duration-400">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Mail className="text-brand-500" size={28} />
                    Configuração da Campanha de E-mail
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                    Crie uma nova campanha de disparo por e-mail, ajuste os detalhes e selecione seus leads. (Apenas leads com e-mail serão exibidos).
                </p>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                
                {/* 1. E-mail Remetente */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">1. E-mail Remetente *</label>
                    <select
                        required
                        value={selectedEmailConnectionId}
                        onChange={(e) => setSelectedEmailConnectionId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium"
                    >
                        <option value="">Selecione uma conta de e-mail...</option>
                        {emailConnections.map(ec => (
                            <option key={ec.id} value={ec.id}>{ec.name} ({ec.email})</option>
                        ))}
                    </select>
                    {emailConnections.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                            <AlertCircle size={12} />
                            Nenhuma conexão de e-mail configurada. Vá em Configurações &gt; Conexões de E-mail para adicionar.
                        </p>
                    )}
                </div>

                {/* 2. Nome da Campanha */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">2. Nome da Campanha (Interno) *</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Oferta Black Friday 2026"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium"
                    />
                </div>

                {/* 3. Assunto do E-mail */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">3. Assunto do E-mail *</label>
                    <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ex: Uma oportunidade imperdível para a sua empresa!"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium"
                    />
                </div>

                {/* 4. Delay Mínimo e Máximo */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        4. Intervalo de Disparo Base (Delay Mínimo e Máximo)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Mínimo (Segundos)</span>
                            <input
                                type="number"
                                required
                                min="1"
                                value={minDelay}
                                onChange={(e) => setMinDelay(Number(e.target.value))}
                                className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Máximo (Segundos)</span>
                            <input
                                type="number"
                                required
                                min={minDelay}
                                value={maxDelay}
                                onChange={(e) => setMaxDelay(Number(e.target.value))}
                                className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                        <AlertCircle size={12} />
                        Define o tempo aleatório de espera entre o envio para leads diferentes.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 5. Upload de Anexo (Opcional) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">5. Anexo (Opcional)</label>
                        <label className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors h-48 ${file ? 'border-brand-400 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}>
                            {file ? (
                                <div className="text-center">
                                    <CheckCircle2 className="text-brand-500 mb-2 mx-auto" size={32} />
                                    <span className="text-sm font-bold text-slate-800 block truncate max-w-[200px]">{file.name}</span>
                                    <span className="text-xs text-brand-600 mt-1 block">Clique para trocar</span>
                                </div>
                            ) : (
                                <div className="text-center text-slate-500">
                                    <ImageIcon className="mb-3 mx-auto" size={32} />
                                    <span className="text-sm font-bold block mb-1">Upload de PDF, Imagem, etc</span>
                                    <span className="text-xs text-slate-400">Formatos suportados (PDF, PNG, JPG)</span>
                                </div>
                            )}
                            <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>

                    {/* 6. Corpo do E-mail */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <AlignLeft size={16} className="text-slate-400" />
                            6. Corpo do E-mail *
                        </label>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            required
                            placeholder="Olá {nome}, tudo bem? Temos uma oportunidade incrível para a {empresa}..."
                            className="w-full h-48 bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium resize-none"
                        ></textarea>
                    </div>
                </div>

                {/* 7. Agendamento */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={isAutomated}
                            onChange={(e) => setIsAutomated(e.target.checked)}
                        />
                        <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${isAutomated ? 'bg-brand-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute transition-transform ${isAutomated ? 'translate-x-7' : 'translate-x-1'}`} />
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Calendar size={16} className={isAutomated ? 'text-brand-500' : 'text-slate-400'} />
                                7. Agendar Disparo
                            </span>
                            <span className="text-xs text-slate-500">Agende para enviar automaticamente no futuro</span>
                        </div>
                    </label>

                    {isAutomated && (
                        <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Data e Hora do Início *</label>
                            <input
                                type="datetime-local"
                                required={isAutomated}
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                max={new Date(new Date().getTime() + 32 * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                className="w-full md:w-1/2 bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium"
                            />
                            <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                                <AlertCircle size={12} />
                                Certifique-se de configurar a data/hora local.
                            </p>
                        </div>
                    )}
                </div>

                {/* 8. Selecionar Cliente e Pasta */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Building2 size={16} className="text-slate-400" />
                                8. Cliente
                            </label>
                            <select
                                value={selectedClientId}
                                onChange={(e) => {
                                    setSelectedClientId(e.target.value);
                                    setSelectedFolderId('');
                                }}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium"
                            >
                                <option value="">Selecione um cliente...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Folder size={16} className="text-slate-400" />
                                9. Pasta de Leads (Opcional)
                            </label>
                            <select
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                                disabled={!selectedClientId}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium disabled:opacity-50"
                            >
                                <option value="">Todas as Pastas</option>
                                {folders.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-4 mt-6">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Users size={18} className="text-slate-400" />
                            10. Selecionar Leads com E-mail ({leads.length})
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                                {[20, 50, 100].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => { setLeadsPerPage(n); setCurrentPage(1); }}
                                        className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all ${leadsPerPage === n
                                            ? 'bg-white text-slate-800 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <span className="text-[10px] text-slate-400 pr-1.5">/ pág</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {selectedLeads.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLeads([])}
                                        className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 py-1.5 px-3 rounded-lg transition-colors"
                                    >
                                        Desmarcar ({selectedLeads.length})
                                    </button>
                                )}
                                <div className="relative group/page">
                                    <button
                                        type="button"
                                        onClick={toggleSelectCurrentPage}
                                        className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-colors ${allCurrentPageSelected
                                            ? 'text-slate-900 bg-[#F9C300] hover:bg-[#E6B400]'
                                            : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                                            }`}
                                    >
                                        {allCurrentPageSelected ? `Página ${currentPage} ✓` : `Página ${currentPage}`}
                                    </button>
                                </div>
                                {[20, 50, 100].map(n => (
                                    <button
                                        key={`sel-${n}`}
                                        type="button"
                                        onClick={() => selectLeadsBatch(n)}
                                        disabled={selectedLeads.length >= leads.length}
                                        className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 py-1.5 px-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        +{n}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={selectAllLeads}
                                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg transition-colors"
                                >
                                    {selectedLeads.length === leads.length && leads.length > 0 ? 'Todos ✓' : 'Todos'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden max-h-[520px] overflow-y-auto">
                        {leads.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Nenhum lead com e-mail encontrado para o cliente/pasta selecionados.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {leads
                                    .slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage)
                                    .map((lead) => (
                                        <label key={lead.id} className="flex items-center gap-3 py-2 px-3 hover:bg-white cursor-pointer transition-colors">
                                            <div className="flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.includes(lead.id)}
                                                    onChange={() => toggleLeadSelection(lead.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/50"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-slate-800 truncate">{lead.name || 'Lead sem nome'}</p>
                                                <p className="text-[11px] font-medium text-slate-400 truncate">
                                                    {lead.email && <span className="mr-2 text-brand-600">{lead.email}</span>}
                                                    {lead.company && <span className="mr-2">{lead.company}</span>}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end">
                <button
                    type="submit"
                    disabled={loading || selectedLeads.length === 0}
                    className="bg-brand-500 text-white font-black text-sm px-8 py-4 rounded-xl hover:bg-brand-600 transition-colors shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                        <>Processando...</>
                    ) : (
                        <>
                            {isAutomated ? 'Agendar Disparo por E-mail' : 'Iniciar Disparo por E-mail'}
                            <Mail size={18} />
                        </>
                    )}
                </button>
            </div>

            {success && (
                <div className="mt-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-green-500" />
                    <div>
                        <h4 className="font-bold text-sm">Sucesso!</h4>
                        <p className="text-xs mt-1">
                            {isAutomated ? 'A campanha de e-mail foi agendada com sucesso.' : 'Sua campanha de e-mail foi criada e salva com sucesso.'}
                        </p>
                    </div>
                </div>
            )}
        </form>

        <EmailCampaignMonitor initialExpanded={true} />
    </div>
    );
};

export default EmailCampaignForm;
