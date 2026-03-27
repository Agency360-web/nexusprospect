import React, { useState, useEffect } from 'react';
import { User, Megaphone, Settings2, Play, Save, Loader2, Clock, ChevronLeft, Video, Phone, MoreVertical, CheckCheck, Building2, Folder, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import SectionInstances, { WhatsAppInstance } from './SectionInstances';
import SectionMessageLibrary, { MessageLibraryType } from './SectionMessageLibrary';
import SectionButtons, { InteractiveButton } from './SectionButtons';

const CampaignConfiguratorProV2: React.FC = () => {
    const { user } = useAuth();
    // === ESTADOS: SEÇÃO 1 ===
    const [prospectorName, setProspectorName] = useState('');
    const [prospectorCompany, setProspectorCompany] = useState('');
    const [prospectorRole, setProspectorRole] = useState('');
    const [identificationMode, setIdentificationMode] = useState('name_company');

    // === ESTADOS: SEÇÃO 2 ===
    const [campaignName, setCampaignName] = useState('');
    const [productService, setProductService] = useState('');
    const [campaignPromise, setCampaignPromise] = useState('');
    const [campaignNiche, setCampaignNiche] = useState('');

    // === ESTADOS: SEÇÃO 3 ===
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [roundLimit, setRoundLimit] = useState(10);
    const [minDelay, setMinDelay] = useState(5);
    const [maxDelay, setMaxDelay] = useState(8);
    const [activeInstancesCount, setActiveInstancesCount] = useState(1);

    // === ESTADOS: SEÇÕES COMPOSIÇÃO ===
    const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
    const [messageLibrary, setMessageLibrary] = useState<MessageLibraryType>({
        greeting: [], presentation: [], product: [], triggers: [], socialProof: [], cta: []
    });
    const [buttons, setButtons] = useState<InteractiveButton[]>([]);

    // === ESTADOS: CLIENTE / PASTA / LEADS ===
    const [clients, setClients] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [leadsPerPage, setLeadsPerPage] = useState(20);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [previewText, setPreviewText] = useState('');

    const generatePreview = () => {
        const replaceVars = (text: string): string => {
            return text
                .replace(/\{\{nome\}\}/g, prospectorName || '[Nome]')
                .replace(/\{\{empresa\}\}/g, prospectorCompany || '[Empresa]')
                .replace(/\{\{cargo\}\}/g, prospectorRole || '[Cargo]')
                .replace(/\{\{produto\}\}/g, productService || '[Produto]')
                .replace(/\{\{promessa\}\}/g, campaignPromise || '[Promessa]')
                .replace(/\{\{nicho\}\}/g, campaignNiche || '[Nicho]')
                .replace(/\{\{nichoBanco\}\}/g, campaignNiche || '[Nicho]');
        };

        const getRandom = (arr: any[]) => {
            if (arr.length === 0) return '';
            const raw = arr[Math.floor(Math.random() * arr.length)].text;
            return replaceVars(raw);
        };

        const parts = [
            getRandom(messageLibrary.greeting),
            getRandom(messageLibrary.presentation),
            getRandom(messageLibrary.product),
            getRandom(messageLibrary.triggers),
            getRandom(messageLibrary.socialProof),
            getRandom(messageLibrary.cta)
        ].filter(Boolean);

        const merged = parts.join('\n\n');

        if (merged) {
            setPreviewText(merged);
        } else {
            setPreviewText(`Adicione mensagens na "Biblioteca de Mensagens" abaixo para ver o preview aqui...`);
        }
    };

    useEffect(() => {
        generatePreview();
    }, [messageLibrary, prospectorName, prospectorCompany, prospectorRole, productService, campaignPromise, campaignNiche]);

    // === FETCH: Clientes ===
    useEffect(() => {
        const fetchClients = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .eq('user_id', user.id)
                .order('name');
            if (!error && data) setClients(data);
        };
        fetchClients();
    }, [user]);

    // === FETCH: Pastas e Leads ===
    useEffect(() => {
        const fetchFoldersAndLeads = async () => {
            if (!selectedClientId) {
                setFolders([]);
                setLeads([]);
                return;
            }
            const { data: folderData } = await supabase
                .from('lead_folders')
                .select('id, name')
                .eq('client_id', selectedClientId);
            setFolders(folderData || []);

            let query = supabase.from('leads').select('id, name, company, phone, website, address, rating, reviews, specialties').eq('client_id', selectedClientId).order('name');
            if (selectedFolderId) {
                query = query.eq('folder_id', selectedFolderId);
            }
            const { data: leadsData } = await query;
            setLeads(leadsData || []);
            setSelectedLeads([]);
            setCurrentPage(1);
        };
        fetchFoldersAndLeads();
    }, [selectedClientId, selectedFolderId]);

    // === HELPERS: Seleção de Leads ===
    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeads(prev =>
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
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

    const cleanPhone = (phone: string) => {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    };

    const handleSubmit = async () => {
        if (!prospectorName || !prospectorCompany) return alert('Preencha o Nome e Empresa do prospectador.');
        if (!campaignName) return alert('Dê um nome à campanha.');


        setIsSubmitting(true);
        try {
            // Função para substituir {{variáveis}} pelos valores reais
            const replaceVars = (text: string): string => {
                return text
                    .replace(/\{\{nome\}\}/g, prospectorName || '')
                    .replace(/\{\{empresa\}\}/g, prospectorCompany || '')
                    .replace(/\{\{cargo\}\}/g, prospectorRole || '')
                    .replace(/\{\{produto\}\}/g, productService || '')
                    .replace(/\{\{promessa\}\}/g, campaignPromise || '')
                    .replace(/\{\{nicho\}\}/g, campaignNiche || '');
            };

            const activeInstances = instances.filter(i => i.active);

            // Buscar dados completos dos leads selecionados
            const fullSelectedLeads = selectedLeads
                .map(id => leads.find(l => l.id === id))
                .filter(Boolean);

            const currentFolder = selectedFolderId ? folders.find(f => f.id === selectedFolderId) : null;
            const currentClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;

            // 1. Criar campanha no Supabase
            const { data: campaignData, error: dbError } = await supabase
                .from('campaigns')
                .insert([{
                    name: campaignName,
                    status: 'active',
                    type: 'whatsapp_pro_v2',
                    user_id: user?.id,
                    configuration: {
                        campaignType: 'pro-v2',
                        prospector: { name: prospectorName, company: prospectorCompany, role: prospectorRole },
                        product: productService,
                        promise: campaignPromise,
                        niche: campaignNiche,
                        dispatch: { startTime, endTime, roundLimit, minDelay, maxDelay },
                        selectedLeadsCount: fullSelectedLeads.length,
                        clientId: selectedClientId,
                        folderId: selectedFolderId || null,
                    }
                }])
                .select()
                .single();

            if (dbError) {
                console.error('Erro ao salvar campanha no banco:', dbError);
            }

            // 2. Inserir campaign_messages com status 'pending'
            if (campaignData?.id && fullSelectedLeads.length > 0) {
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
                        console.error('Erro ao inserir campaign_messages (batch):', msgError);
                    }
                }
                console.log(`Inseridos ${messagesToInsert.length} registros de campaign_messages como pending.`);
            }

            const payload = {
                // === METADADOS ===
                userId: user?.id || '',
                campaignId: campaignData?.id || null,
                timestamp: new Date().toISOString(),
                version: '2.0-pro',

                // === DADOS DO PROSPECTOR ===
                prospector: { 
                    name: prospectorName, 
                    company: prospectorCompany, 
                    role: prospectorRole,
                    identificationMode,
                    formattedIdentification: previewText.split('\n\n')[0]
                },
                saudacao1: prospectorName,

                // === MENSAGENS E BOTÕES ===
                ident: messageLibrary.greeting.map(i => replaceVars(i.text)),
                anuncio: messageLibrary.presentation.map(i => i.text),
                promessa: messageLibrary.product.map(i => i.text),
                nichosGenericos: messageLibrary.triggers.map(i => i.text),
                frasesNicho: messageLibrary.socialProof.map(i => i.text),
                pergunta: messageLibrary.cta.map(i => i.text),

                // Botões Interativos formatados
                buttons: buttons.filter(b => b.text.trim() !== ''),
                botao1: buttons[0]?.text || '',
                botao2: buttons[1]?.text || '',
                botao3: buttons[2]?.text || '',

                // === CAMPANHA ===
                campaign: { 
                    name: campaignName, 
                    product: productService, 
                    promise: campaignPromise,
                    niche: campaignNiche
                },
                dispatch: { 
                    startTime, 
                    endTime, 
                    roundLimit, 
                    minDelay, 
                    maxDelay, 
                    activeInstancesCount: activeInstances.length 
                },
                instances: activeInstances.map(i => ({
                    id: i.id,
                    name: i.name,
                    instanceName: i.instanceName,
                    token: i.token
                })),

                // === CLIENTE / PASTA / LEADS ===
                clientId: selectedClientId || null,
                clientName: currentClient?.name || null,
                folderId: selectedFolderId || null,
                folderName: currentFolder?.name || 'Todas as Pastas',
                selectedLeads: fullSelectedLeads,
                totalLeads: fullSelectedLeads.length,
            };

            const WEBHOOK_URL = 'https://nexus360.infra-conectamarketing.site/webhook/b997708c-4ed3-4106-a3ed-88ff9e843816';

            // Disparo assíncrono (Fire and Forget)
            fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.log('Fetch request completed or timeout as expected:', e));

            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 4000);
        } catch (error) {
            console.error(error);
            alert('Ocorreu um erro ao enviar a campanha. Verifique o console.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-6 pb-12">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">Configure sua Máquina</h3>
                    <p className="text-slate-500 text-sm">Preencha os detalhes abaixo para personalizar a sua campanha.</p>
                </div>

                {/* SEÇÃO 1: Identidade do Prospectador */}
                <section id="sec-1" className="bg-white border border-slate-200 rounded-lg p-6">
                    <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4">
                        <User className="text-slate-700" size={18} />
                        1. Identidade do Prospectador
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome do Prospectador *</label>
                            <input
                                type="text"
                                value={prospectorName}
                                onChange={(e) => setProspectorName(e.target.value)}
                                placeholder="Ex: Lucas"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome da Empresa/Marca *</label>
                            <input
                                type="text"
                                value={prospectorCompany}
                                onChange={(e) => setProspectorCompany(e.target.value)}
                                placeholder="Ex: Nexus"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Cargo/Função</label>
                            <input
                                type="text"
                                value={prospectorRole}
                                onChange={(e) => setProspectorRole(e.target.value)}
                                placeholder="Ex: Especialista"
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Como se identificar na mensagem? *</label>
                        <select
                            value={identificationMode}
                            onChange={(e) => setIdentificationMode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                        >
                            <option value="name_only">Só o nome (Ex: Lucas)</option>
                            <option value="name_company">Nome + Empresa (Ex: Lucas, da Nexus)</option>
                            <option value="name_role">Nome + Cargo (Ex: Lucas, Especialista de Vendas)</option>
                            <option value="name_role_company">Nome + Cargo + Empresa (Ex: Lucas, Especialista da Nexus)</option>
                            <option value="company_only">Só Empresa (Ex: Da Nexus)</option>
                        </select>
                    </div>
                </section>

                {/* SEÇÃO 2: Configurações da Campanha */}
                <section id="sec-2" className="bg-white border border-slate-200 rounded-lg p-6">
                        <h4 className="flex items-center gap-2 text-base font-bold text-slate-800">
                            <Megaphone className="text-slate-700" size={18} />
                            2. Configurações da Campanha
                        </h4>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome da Campanha *</label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="Ex: Oferta B2B Março"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Produto ou Serviço *</label>
                                <input
                                    type="text"
                                    value={productService}
                                    onChange={(e) => setProductService(e.target.value)}
                                    placeholder="Ex: Assessoria de Marketing"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nicho de Prospecção (Opcional)</label>
                                <input
                                    type="text"
                                    value={campaignNiche}
                                    onChange={(e) => setCampaignNiche(e.target.value)}
                                    placeholder="Ex: Clínicas Odontológicas, Pet Shops, etc."
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 italic">Dica: Use {"{{nicho}}"} nas mensagens.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Promessa de Resultado *</label>
                                <input
                                    type="text"
                                    value={campaignPromise}
                                    onChange={(e) => setCampaignPromise(e.target.value)}
                                    placeholder="Ex: R$ 10 mil a R$ 70 mil/mês"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>
                    </div>

                </section>

                {/* SEÇÃO 3: Configurações de Disparo */}
                <section id="sec-3" className="bg-white border border-slate-200 rounded-lg p-6">
                    <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4">
                        <Settings2 className="text-slate-700" size={18} />
                        3. Configurações de Disparo
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Clock size={12} /> Horário de Início</label>
                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Clock size={12} /> Horário de Término</label>
                                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Delay Min (seg) *</label>
                                <input type="number" value={minDelay} onChange={(e) => setMinDelay(Number(e.target.value))} className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" min={1} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Delay Max (seg) *</label>
                                <input type="number" value={maxDelay} onChange={(e) => setMaxDelay(Number(e.target.value))} className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" min={minDelay} />
                            </div>
                        </div>
                    </div>

                </section>

                {/* SEÇÃO: Seleção de Cliente / Pasta / Leads */}
                <section id="sec-leads" className="bg-white border border-slate-200 rounded-lg p-6">
                    <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4">
                        <Users className="text-slate-700" size={18} />
                        4. Selecionar Leads
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Building2 size={12} /> Cliente *
                            </label>
                            <select
                                value={selectedClientId}
                                onChange={(e) => {
                                    setSelectedClientId(e.target.value);
                                    setSelectedFolderId('');
                                }}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                            >
                                <option value="">Selecione um cliente...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Folder size={12} /> Pasta de Leads (Opcional)
                            </label>
                            <select
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                                disabled={!selectedClientId}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium disabled:opacity-50"
                            >
                                <option value="">Todas as Pastas</option>
                                {folders.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Toolbar de seleção de leads */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500">
                            {leads.length} lead{leads.length !== 1 ? 's' : ''} encontrado{leads.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                                {[20, 50, 100].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => { setLeadsPerPage(n); setCurrentPage(1); }}
                                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${leadsPerPage === n
                                            ? 'bg-white text-slate-800 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <span className="text-[10px] text-slate-400 pr-1">/ pág</span>
                            </div>
                            {selectedLeads.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedLeads([])}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 py-1 px-2.5 rounded-md transition-colors"
                                >
                                    Desmarcar ({selectedLeads.length})
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={toggleSelectCurrentPage}
                                className={`text-[10px] font-bold py-1 px-2.5 rounded-md transition-colors ${allCurrentPageSelected
                                    ? 'text-slate-900 bg-[#F9C300] hover:bg-[#E6B400]'
                                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                                }`}
                            >
                                {allCurrentPageSelected ? `Pág ${currentPage} ✓` : `Pág ${currentPage}`}
                            </button>
                            {[20, 50, 100].map(n => (
                                <button
                                    key={`sel-${n}`}
                                    type="button"
                                    onClick={() => selectLeadsBatch(n)}
                                    disabled={selectedLeads.length >= leads.length}
                                    className="text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 py-1 px-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    +{n}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={selectAllLeads}
                                className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 py-1 px-2.5 rounded-md transition-colors"
                            >
                                {selectedLeads.length === leads.length && leads.length > 0 ? 'Todos ✓' : 'Todos'}
                            </button>
                        </div>
                    </div>

                    {/* Lista de leads */}
                    <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden max-h-[400px] overflow-y-auto">
                        {leads.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                {selectedClientId ? 'Nenhum lead encontrado nesta pasta.' : 'Selecione um cliente para ver os leads.'}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {currentPageLeads.map((lead) => (
                                    <label key={lead.id} className="flex items-center gap-3 py-2 px-3 hover:bg-white cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.includes(lead.id)}
                                            onChange={() => toggleLeadSelection(lead.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500/50"
                                        />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-slate-800 truncate">{lead.name || 'Lead sem nome'}</p>
                                            <p className="text-[11px] font-medium text-slate-400 truncate">
                                                {lead.company && <span className="mr-2">{lead.company}</span>}
                                                {lead.phone && <span>{lead.phone}</span>}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Paginação */}
                    {leads.length > leadsPerPage && (
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                            <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 py-1 px-2.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
                            {Array.from({ length: Math.ceil(leads.length / leadsPerPage) }, (_, i) => i + 1)
                                .filter(p => {
                                    const total = Math.ceil(leads.length / leadsPerPage);
                                    if (total <= 7) return true;
                                    if (p === 1 || p === total) return true;
                                    if (Math.abs(p - currentPage) <= 1) return true;
                                    return false;
                                })
                                .map((p, idx, arr) => (
                                    <React.Fragment key={p}>
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span className="text-[10px] text-slate-300 px-1">…</span>
                                        )}
                                        <button type="button" onClick={() => setCurrentPage(p)} className={`text-[10px] font-bold w-7 h-7 rounded-md transition-all ${currentPage === p ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                                            {p}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button type="button" onClick={() => setCurrentPage(p => Math.min(Math.ceil(leads.length / leadsPerPage), p + 1))} disabled={currentPage === Math.ceil(leads.length / leadsPerPage)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 py-1 px-2.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Próximo →</button>
                        </div>
                    )}

                    <p className="text-[11px] font-semibold text-slate-500 mt-2 text-right">
                        {selectedLeads.length} de {leads.length} leads selecionados
                    </p>
                </section>

                {/* NOVAS SEÇÕES */}
                <SectionInstances instances={instances} setInstances={setInstances} />
                <SectionMessageLibrary
                    library={messageLibrary}
                    setLibrary={setMessageLibrary}
                    dynamicValues={{
                        nome: prospectorName,
                        empresa: prospectorCompany,
                        cargo: prospectorRole,
                        produto: productService,
                        promessa: campaignPromise,
                        nicho: campaignNiche,
                        nichoBanco: campaignNiche
                    }}
                />
                <SectionButtons buttons={buttons} setButtons={setButtons} />

                {/* BOTÃO DE SALVAR */}
                <div className="pt-8">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || submitSuccess}
                        className={`w-full font-bold py-3.5 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed group ${
                            submitSuccess
                                ? 'bg-emerald-600 shadow-emerald-600/20 text-white'
                                : 'bg-slate-900 hover:bg-black shadow-slate-900/20 text-white disabled:opacity-70'
                        }`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin text-[#F9C300]" size={18} />
                        ) : submitSuccess ? (
                            <CheckCheck className="text-white" size={18} />
                        ) : (
                            <Save className="text-[#F9C300] group-hover:scale-110 transition-transform" size={18} />
                        )}
                        {isSubmitting ? 'Gerando e Enviando...' : submitSuccess ? '✓ Campanha Criada com Sucesso!' : 'Salvar e Iniciar Campanha'}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider"></p>
                </div>
            </div>

            {/* RIGHT COLUMN: Live Preview (Estilo iPhone/WhatsApp) */}
            <div className="lg:w-[320px] flex-shrink-0 relative">
                <div className="sticky top-24 flex flex-col items-center">
                    <div className="w-full bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-2xl border-[8px] border-slate-800 h-[650px] flex flex-col">
                        {/* Status Bar Simulado */}
                        <div className="h-6 bg-[#f0f2f5] flex justify-between items-center px-8 pt-2">
                            <span className="text-[10px] font-bold">9:41</span>
                            <div className="flex gap-1">
                                <div className="w-3 h-3 bg-black rounded-full opacity-20"></div>
                                <div className="w-3 h-3 bg-black rounded-full opacity-20"></div>
                            </div>
                        </div>

                        {/* Header WhatsApp iOS */}
                        <div className="bg-[#f0f2f5] border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <ChevronLeft size={20} className="text-[#007aff]" />
                                <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs ring-1 ring-slate-200">
                                    {prospectorCompany ? prospectorCompany.charAt(0).toUpperCase() : 'W'}
                                </div>
                                <div className="ml-1">
                                    <h5 className="text-slate-900 font-bold text-[13px] leading-tight w-24 truncate">{prospectorCompany || 'Nexus'}</h5>
                                    <span className="text-[#25d366] text-[10px] font-medium">online</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-[#007aff]">
                                <Video size={18} />
                                <Phone size={16} />
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 bg-[#efeae2] p-3 flex flex-col justify-end relative overflow-y-auto" style={{ backgroundImage: 'radial-gradient(#d1d1d1 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }}>
                            
                            {/* Mensagem Bubble (Sent Estilo iOS) */}
                            <div className="bg-[#dcf8c6] p-2.5 rounded-2xl rounded-tr-none shadow-sm relative mb-2 max-w-[85%] self-end">
                                {/* Tail (Rabicho) do balão iOS */}
                                <div className="absolute top-0 -right-1.5 w-3 h-3 bg-[#dcf8c6]" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
                                
                                <p className="text-[12px] text-slate-800 whitespace-pre-wrap leading-[1.4]">
                                    {previewText}
                                </p>
                                
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                    <span className="text-[9px] text-slate-500">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <CheckCheck size={12} className="text-[#34b7f1]" />
                                </div>
                            </div>

                            {/* Interactive Buttons (WhatsApp Link Style) */}
                            {buttons.length > 0 && (
                                <div className="flex flex-col gap-1 w-full max-w-[85%] self-end mb-2">
                                    {buttons.map((btn, i) => (
                                        <div key={i} className="bg-white/90 backdrop-blur-sm text-[#007aff] text-[13px] font-medium py-2.5 px-4 rounded-xl shadow-sm border border-white/50 flex items-center justify-center gap-2 active:bg-slate-100 transition-colors">
                                            {btn.text || 'Botão interativo...'}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom Bar Simulado */}
                        <div className="p-3 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 text-lg">+</div>
                            <div className="flex-1 bg-white rounded-full border border-slate-200 h-8 px-3 flex items-center">
                                <span className="text-slate-300 text-xs">Mensagem</span>
                            </div>
                            <div className="w-6 h-6 text-[#007aff]">
                                <Play size={20} className="rotate-0 cursor-pointer" onClick={generatePreview} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 px-2 w-full max-w-[280px]">
                        <button
                            type="button"
                            onClick={generatePreview}
                            className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-full transition-all text-xs shadow-sm flex items-center justify-center gap-2 group"
                        >
                            <Play size={14} className="group-hover:scale-110 transition-transform" />
                            Gerar Nova Variação
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-2 italic">Dica: Clique em "Gerar" para ver outras variações da sua biblioteca</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignConfiguratorProV2;
