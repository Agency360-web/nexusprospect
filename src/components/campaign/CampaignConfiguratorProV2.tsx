import React, { useState, useEffect } from 'react';
import { User, Megaphone, Settings2, Play, Save, Loader2, Clock, ChevronLeft, Video, Phone, MoreVertical, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewText, setPreviewText] = useState('');

    const generatePreview = () => {
        const replaceVars = (text: string): string => {
            return text
                .replace(/\{\{nome\}\}/g, prospectorName || '[Nome]')
                .replace(/\{\{empresa\}\}/g, prospectorCompany || '[Empresa]')
                .replace(/\{\{cargo\}\}/g, prospectorRole || '[Cargo]')
                .replace(/\{\{produto\}\}/g, productService || '[Produto]')
                .replace(/\{\{promessa\}\}/g, campaignPromise || '[Promessa]')
                .replace(/\{\{nichoBanco\}\}/g, '[Nicho do Lead]');
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
    }, [messageLibrary, prospectorName, prospectorCompany, prospectorRole, productService, campaignPromise]);

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
                    .replace(/\{\{promessa\}\}/g, campaignPromise || '');
            };

            const activeInstances = instances.filter(i => i.active);

            const payload = {
                // === METADADOS ===
                userId: user?.id || '',
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
                saudacao1: prospectorName, // Para compatibilidade com o N8N

                // === ARRAYS DE MENSAGENS (formato que o N8N espera) ===
                ident: messageLibrary.greeting.map(i => replaceVars(i.text)),
                anuncio: messageLibrary.presentation.map(i => i.text),
                promessa: messageLibrary.product.map(i => i.text),
                nichosGenericos: messageLibrary.triggers.map(i => i.text),
                frasesNicho: messageLibrary.socialProof.map(i => i.text), // {{nichoBanco}} será substituído pelo N8N com dados do lead
                pergunta: messageLibrary.cta.map(i => i.text),

                // === CAMPANHA ===
                campaign: { name: campaignName, product: productService, promise: campaignPromise },
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
                buttons: buttons,
                leads: {
                    fileName: '',
                    mapping: { name: '', phone: '' },
                    totalLeads: 0,
                    data: []
                }
            };

            const WEBHOOK_URL = 'https://nexus360.infra-conectamarketing.site/webhook/b997708c-4ed3-4106-a3ed-88ff9e843816';

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Falha ao enviar para o webhook');

            alert('Campanha enviada com sucesso para o N8N!');
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
                                placeholder="Ex: Conecta"
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
                            <option value="name_company">Nome + Empresa (Ex: Lucas, da Conecta)</option>
                            <option value="name_role">Nome + Cargo (Ex: Lucas, Especialista de Vendas)</option>
                            <option value="name_role_company">Nome + Cargo + Empresa (Ex: Lucas, Especialista da Conecta)</option>
                            <option value="company_only">Só Empresa (Ex: Da Conecta)</option>
                        </select>
                    </div>
                </section>

                {/* SEÇÃO 2: Configurações da Campanha */}
                <section id="sec-2" className="bg-white border border-slate-200 rounded-lg p-6">
                        <h4 className="flex items-center gap-2 text-base font-bold text-slate-800">
                            <Megaphone className="text-slate-700" size={18} />
                            2. Configurações da Campanha
                        </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Promessa de Resultado *</label>
                        <input
                            type="text"
                            value={campaignPromise}
                            onChange={(e) => setCampaignPromise(e.target.value)}
                            placeholder="Ex: R$ 10 mil a R$ 70 mil/mês"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium"
                        />
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
                    }}
                />
                <SectionButtons buttons={buttons} setButtons={setButtons} />

                {/* BOTÃO DE SALVAR */}
                <div className="pt-8">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {isSubmitting ? 'Gerando e Enviando...' : 'Salvar e Iniciar Campanha'}
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
