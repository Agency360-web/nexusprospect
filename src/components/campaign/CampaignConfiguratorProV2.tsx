import React, { useState, useEffect } from 'react';
import { User, Megaphone, Settings2, Play, Pause, Square, Save, Loader2, Clock } from 'lucide-react';
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
    const [targetAudience, setTargetAudience] = useState('');
    const [campaignStatus, setCampaignStatus] = useState<'active' | 'paused' | 'ended'>('active');

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
        const getRandom = (arr: any[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)].text : '';
        const parts = [
            getRandom(messageLibrary.greeting),
            getRandom(messageLibrary.presentation),
            getRandom(messageLibrary.product),
            getRandom(messageLibrary.triggers),
            getRandom(messageLibrary.socialProof),
            getRandom(messageLibrary.cta)
        ].filter(Boolean);

        let merged = parts.join('\n\n');

        let identification = '';
        switch (identificationMode) {
            case 'name_only':
                identification = `${prospectorName || '[Nome]'}.`;
                break;
            case 'name_company':
                identification = `${prospectorName || '[Nome]'}, da ${prospectorCompany || '[Empresa]'}.`;
                break;
            case 'name_role':
                identification = `${prospectorName || '[Nome]'}, ${prospectorRole || '[Cargo]'}.`;
                break;
            case 'name_role_company':
                identification = `${prospectorName || '[Nome]'}, ${prospectorRole || '[Cargo]'} da ${prospectorCompany || '[Empresa]'}.`;
                break;
            case 'company_only':
                identification = `Da ${prospectorCompany || '[Empresa]'}.`;
                break;
            default:
                identification = `Aqui é o ${prospectorName || '[Nome]'}, da ${prospectorCompany || '[Empresa]'}.`;
        }
 
        merged = `Olá Lead, tudo bem?\n\n${identification}\n\n` +
            (merged || `Nós temos uma solução poderosa de ${productService || '[Serviço]'} para te ajudar a conquistar ${campaignPromise || '[Promessa]'}.\n\nFaz sentido falarmos rapidinho?`);

        setPreviewText(merged);
    };

    useEffect(() => {
        generatePreview();
    }, [messageLibrary, prospectorName, prospectorCompany, prospectorRole, productService, campaignPromise, identificationMode]);

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
                    formattedIdentification: previewText.split('\n\n')[1]
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
                campaign: { name: campaignName, product: productService, promise: campaignPromise, audience: targetAudience, status: campaignStatus },
                dispatch: { startTime, endTime, roundLimit, minDelay, maxDelay, activeInstancesCount },
                instances: instances.filter(i => i.active),
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
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="flex items-center gap-2 text-base font-bold text-slate-800">
                            <Megaphone className="text-slate-700" size={18} />
                            2. Configurações da Campanha
                        </h4>
                        <div className="flex bg-slate-50 border border-slate-200 rounded-md p-1 opacity-70">
                            <button type="button" onClick={() => setCampaignStatus('active')} className={`p-1.5 rounded-md transition-all ${campaignStatus === 'active' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-200'}`} title="Ativa"><Play size={14} /></button>
                            <button type="button" onClick={() => setCampaignStatus('paused')} className={`p-1.5 rounded-md transition-all ${campaignStatus === 'paused' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-200'}`} title="Pausada"><Pause size={14} /></button>
                            <button type="button" onClick={() => setCampaignStatus('ended')} className={`p-1.5 rounded-md transition-all ${campaignStatus === 'ended' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-200'}`} title="Encerrada"><Square size={14} /></button>
                        </div>
                    </div>

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

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Público-alvo / Breve Descrição</label>
                        <textarea
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            placeholder="Descreva brevemente com quem você quer falar..."
                            className="w-full h-20 bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-sm font-medium resize-none"
                        ></textarea>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Limite por Rodada *</label>
                            <input type="number" value={roundLimit} onChange={(e) => setRoundLimit(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" min={1} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Chips Ativos (Threads) *</label>
                            <input type="number" value={activeInstancesCount} onChange={(e) => setActiveInstancesCount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" min={1} />
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
                <div className="pt-4 sticky bottom-6 z-20">
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

            {/* RIGHT COLUMN: Live Preview */}
            <div className="lg:w-[320px] flex-shrink-0">
                <div className="sticky top-24 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                            <span className="text-slate-600 font-bold text-xs">{prospectorCompany ? prospectorCompany.charAt(0).toUpperCase() : 'W'}</span>
                        </div>
                        <div>
                            <h5 className="text-slate-800 font-bold text-sm leading-tight">{prospectorCompany || 'Nome da Empresa'}</h5>
                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">online</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 h-[450px] p-4 flex flex-col justify-end relative">
                        {/* Mensagem Bubble */}
                        <div className="bg-white border border-slate-200 p-3 rounded-t-lg rounded-bl-lg rounded-br-sm shadow-sm relative mb-2 max-w-[90%] self-end">
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {previewText}
                            </p>
                            <span className="text-[9px] text-slate-400 float-right mt-1 ml-4 block">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓</span>
                        </div>

                        {/* Interactive Buttons Preview */}
                        {buttons.length > 0 && (
                            <div className="flex flex-col gap-1 w-full max-w-[90%] self-end">
                                {buttons.map((btn, i) => (
                                    <div key={i} className="bg-white text-slate-700 text-xs font-bold py-2 px-3 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center gap-1.5 transition-colors">
                                        <div className="w-3 h-3 rounded-full border border-slate-300 flex items-center justify-center">
                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        </div>
                                        {btn.text || 'Botão sem texto...'}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-white border-t border-slate-200">
                        <button
                            type="button"
                            onClick={generatePreview}
                            className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold py-2 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5"
                        >
                            <Play size={14} />
                            Mudar Variação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignConfiguratorProV2;
