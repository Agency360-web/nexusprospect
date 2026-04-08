import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Bot, Save, Loader2, AlertTriangle, CheckCircle2, Send, MessageCircle, ArrowLeft, Brain, Sliders, MessageSquare, Database, Tag, Info } from 'lucide-react';

type AgentType = 'dispatch' | 'support';

interface AgentSettings {
    id: string;
    is_active: boolean;
    agent_name: string;
    type: AgentType;
    use_custom_initial_message: boolean;
    initial_message: string;
    language: string;
    temperature: number;
    provider: string;
    model: string;
    prompt: string;
    api_key: string;
    max_tokens: number;
    diversity_level: number;
    frequency_penalty: number;
    presence_penalty: number;
    sign_messages: boolean;
    read_messages: boolean;
    // New fields
    max_message_length: number;
    typing_delay_seconds: number;
    context_time_window_hours: number;
    context_max_messages: number;
    context_min_messages: number;
    // WhatsApp Instance fields
    whatsapp_instance_id: string;
    whatsapp_instance_name: string;
    whatsapp_number?: string;
}

interface AgentFormProps {
    agent: AgentSettings;
    onBack: () => void;
    onSuccess: () => void;
    userId: string;
}

const HelpTooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="group relative inline-block ml-1.5">
        <Info size={12} className="text-slate-400 cursor-help transition-colors group-hover:text-yellow-500" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900/95 backdrop-blur-sm text-white text-[10px] leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30 shadow-xl border border-white/10 translate-y-2 group-hover:translate-y-0">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95" />
        </div>
    </div>
);

const Slider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (val: number) => void;
    helpText?: string;
}> = ({ label, value, min, max, onChange, helpText }) => (
    <div className="space-y-3">
        <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</label>
            <span className="text-xs font-bold text-slate-900 bg-yellow-400 px-2 py-0.5 rounded-md min-w-[32px] text-center">{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-yellow-500 transition-all hover:bg-slate-200"
        />
        {helpText && <p className="text-[10px] text-slate-400 leading-relaxed">{helpText}</p>}
    </div>
);

const Switch: React.FC<{
    label: string;
    checked: boolean;
    onChange: (val: boolean) => void;
    helpText?: string;
}> = ({ label, checked, onChange, helpText }) => (
    <div className="flex items-start justify-between gap-4 py-2 hover:bg-slate-50/50 rounded-lg transition-colors">
        <div className="space-y-0.5">
            <label className="text-[11px] font-bold text-slate-700 block">{label}</label>
            {helpText && <p className="text-[10px] text-slate-500 leading-tight">{helpText}</p>}
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner ${
                checked ? 'bg-yellow-500' : 'bg-slate-300'
            }`}
        >
            <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    checked ? 'translate-x-[22px]' : 'translate-x-[4px]'
                }`}
            />
        </button>
    </div>
);

const AgentForm: React.FC<AgentFormProps> = ({ agent, onBack, onSuccess, userId }) => {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [settings, setSettings] = useState<AgentSettings>({ 
        ...agent,
        max_message_length: agent.max_message_length || 500,
        typing_delay_seconds: agent.typing_delay_seconds || 3,
        context_time_window_hours: agent.context_time_window_hours || 24,
        context_max_messages: agent.context_max_messages || 50,
        context_min_messages: agent.context_min_messages || 3,
    });

    useEffect(() => {
        setSettings({
            ...agent,
            max_message_length: agent.max_message_length || 500,
            typing_delay_seconds: agent.typing_delay_seconds || 3,
            context_time_window_hours: agent.context_time_window_hours || 24,
            context_max_messages: agent.context_max_messages || 50,
            context_min_messages: agent.context_min_messages || 3,
        });
        setMessage(null);
    }, [agent]);

    const handleSave = async () => {
        if (!settings.agent_name || !settings.prompt) {
            setMessage({ type: 'error', text: 'Nome e prompt são obrigatórios.' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            // Fetch Instance Details for the webhook
            let instanceData = null;
            try {
                const { data: connData, error: connError } = await supabase
                    .from('whatsapp_connections')
                    .select('*')
                    .eq('id', settings.whatsapp_instance_id)
                    .single();
                
                if (!connError) {
                    instanceData = connData;
                }
            } catch (err) {
                console.warn('Could not fetch instance data for webhook', err);
            }

            const supabasePayload = {
                user_id: userId,
                agent_name: settings.agent_name,
                type: settings.type,
                is_active: settings.is_active,
                use_custom_initial_message: settings.use_custom_initial_message,
                initial_message: settings.use_custom_initial_message ? settings.initial_message : '',
                language: settings.language,
                temperature: settings.temperature,
                provider: settings.provider,
                model: settings.model,
                prompt: settings.prompt,
                api_key: settings.api_key,
                max_tokens: settings.max_tokens,
                diversity_level: settings.diversity_level,
                frequency_penalty: settings.frequency_penalty,
                presence_penalty: settings.presence_penalty,
                sign_messages: settings.sign_messages,
                read_messages: settings.read_messages,
                max_message_length: settings.max_message_length,
                typing_delay_seconds: settings.typing_delay_seconds,
                context_time_window_hours: settings.context_time_window_hours,
                context_max_messages: settings.context_max_messages,
                context_min_messages: settings.context_min_messages,
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('ai_agent_settings')
                .update(supabasePayload)
                .eq('id', settings.id);

            if (updateError) throw updateError;

            // Webhook notification logic with requested structure - Now for all types
            try {
                console.log('Enviando para webhook:', settings.id);
                const webhookBody = {
                    id: settings.id,
                    delete: false,
                    // WhatsApp Instance Details
                    whatsappInstanceId: settings.whatsapp_instance_id,
                    whatsappInstanceName: settings.whatsapp_instance_name,
                    whatsappNumber: settings.whatsapp_number,
                    instanceToken: instanceData?.token,
                    instanceId: instanceData?.instance_id,
                    instanceName: instanceData?.instance || settings.whatsapp_instance_name,
                    agent: {
                        name: settings.agent_name,
                        basePrompt: settings.prompt,
                        temperature: settings.temperature,
                        maxTokens: settings.max_tokens,
                        diversityLevel: settings.diversity_level,
                        frequencyPenalty: settings.frequency_penalty,
                        presencePenalty: settings.presence_penalty,
                        signMessages: settings.sign_messages,
                        readMessages: settings.read_messages,
                        maxMessageLength: settings.max_message_length,
                        typingDelay_seconds: settings.typing_delay_seconds,
                        contextTimeWindow_hours: settings.context_time_window_hours,
                        contextMaxMessages: settings.context_max_messages,
                        contextMinMessages: settings.context_min_messages,
                        provider: settings.provider || 'openai',
                        apikey: settings.api_key || 'sk-proj-preset',
                        model: settings.model || 'gpt-4o-mini'
                    }
                };

                const webhookResponse = await fetch('https://nexus360.infra-conectamarketing.site/webhook/editar_agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(webhookBody),
                });

                if (!webhookResponse.ok) {
                    console.error('Webhook returned error:', webhookResponse.status);
                } else {
                    console.log('Webhook disparado com sucesso');
                }
            } catch (webhookErr) {
                console.warn('Notification failed:', webhookErr);
            }

            setMessage({ type: 'success', text: 'Configurações salvas!' });
            setTimeout(() => {
                onSuccess();
                onBack();
            }, 1000);

        } catch (err: any) {
            console.error('Error saving agent:', err);
            setMessage({ type: 'error', text: `Erro ao salvar: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 p-6 pb-20">
            {/* Header Fixo */}
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <Bot className="text-yellow-500" size={20} />
                                Configurações do Agente de IA
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 border ${
                            saving 
                            ? 'bg-yellow-500 text-slate-900 border-yellow-500 shadow-lg shadow-yellow-500/20' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-yellow-500 hover:text-slate-900 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20'
                        }`}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Alterações
                    </button>
                </div>
                
                {message && (
                    <div className={`p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span className="text-xs font-bold">{message.text}</span>
                    </div>
                )}
            </div>

            {/* Conteúdo do Formulário */}
            <div className="space-y-8">
                {/* Seção 1: Identidade */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Tag size={16} />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seção 1: Identidade Básica</h3>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome do Agente</label>
                            <input
                                type="text"
                                value={settings.agent_name}
                                onChange={(e) => setSettings({ ...settings, agent_name: e.target.value })}
                                placeholder="Ex: Assistente de Vendas"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </section>

                {/* Seção 2: Personalidade */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Brain size={16} />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seção 2: Personalidade e Regras (Cérebro)</h3>
                    </div>
                    <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Instruções Base (Prompt)</label>
                                <HelpTooltip text="Defina como o agente deve se comportar, sua personalidade e regras de atendimento. Este é o cérebro da IA." />
                            </div>
                            <textarea
                                value={settings.prompt}
                                onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
                                placeholder="Descreva a personalidade do agente..."
                                rows={8}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm resize-y min-h-[150px]"
                            />
                        </div>
                    </div>
                </section>

                {/* Seção 3: Ajuste Fino */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Sliders size={16} />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seção 3: Ajuste Fino da IA</h3>
                    </div>
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Slider 
                            label="Criatividade e Precisão"
                            value={settings.temperature}
                            min={0}
                            max={100}
                            onChange={(val) => setSettings({ ...settings, temperature: val })}
                            helpText="Baixos (0-30) precisos. Altos (70-100) criativos."
                        />
                        <Slider 
                            label="Nível de Diversidade"
                            value={settings.diversity_level}
                            min={0}
                            max={100}
                            onChange={(val) => setSettings({ ...settings, diversity_level: val })}
                            helpText="Variedade de palavras usadas nas respostas."
                        />
                        <Slider 
                            label="Penalidade de Repetição"
                            value={settings.frequency_penalty}
                            min={0}
                            max={100}
                            onChange={(val) => setSettings({ ...settings, frequency_penalty: val })}
                            helpText="Reduz a repetição de palavras e frases."
                        />
                        <Slider 
                            label="Foco no Tópico"
                            value={settings.presence_penalty}
                            min={0}
                            max={100}
                            onChange={(val) => setSettings({ ...settings, presence_penalty: val })}
                            helpText="Baixos mantêm foco. Altos incentivam mudanças."
                        />
                    </div>
                </section>

                {/* Seção 4: Chat e Comportamento */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <MessageSquare size={16} />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seção 4: Configurações de Chat e Comportamento</h3>
                    </div>
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <div className="flex items-center">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Máximo de Tokens</label>
                                    <HelpTooltip text="Limite máximo de processamento por resposta. Valores maiores permitem respostas mais longas." />
                                </div>
                                <input
                                    type="number"
                                    value={settings.max_tokens}
                                    onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm"
                                />
                                <p className="text-[9px] text-slate-400 font-medium italic">Recomendado: 1000-4000</p>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tamanho da Mensagem</label>
                                    <HelpTooltip text="Número máximo de caracteres do usuário que o agente irá considerar para responder." />
                                </div>
                                <input
                                    type="number"
                                    value={settings.max_message_length}
                                    onChange={(e) => setSettings({ ...settings, max_message_length: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm"
                                />
                                <p className="text-[9px] text-slate-400 font-medium italic">Limite processado do usuário</p>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Atraso de Digitação</label>
                                    <HelpTooltip text="Tempo de espera simulado antes de enviar a resposta, para parecer humano." />
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={settings.typing_delay_seconds}
                                        onChange={(e) => setSettings({ ...settings, typing_delay_seconds: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm pr-16"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">segundos</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 border-t border-slate-100 pt-4">
                            <Switch 
                                label="Assinar Mensagens"
                                checked={settings.sign_messages}
                                onChange={(val) => setSettings({ ...settings, sign_messages: val })}
                                helpText="Adiciona o nome do agente ao final de cada mensagem."
                            />
                            <Switch 
                                label="Marcar como Lida"
                                checked={settings.read_messages}
                                onChange={(val) => setSettings({ ...settings, read_messages: val })}
                                helpText="Marca a mensagem do cliente como lida ao responder."
                            />
                        </div>
                    </div>
                </section>

                {/* Seção 5: Memória */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Database size={16} />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seção 5: Memória e Contexto (Avançado)</h3>
                    </div>
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <div className="flex items-center">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Janela de Contexto</label>
                                <HelpTooltip text="Tempo máximo (em horas) que a IA lembrará do que foi dito anteriormente nesta conversa." />
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={settings.context_time_window_hours}
                                    onChange={(e) => setSettings({ ...settings, context_time_window_hours: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">horas</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Máximo de Mensagens</label>
                                <HelpTooltip text="Número limite de mensagens passadas que compõem a memória (contexto) enviada ao agente." />
                            </div>
                            <input
                                type="number"
                                value={settings.context_max_messages}
                                onChange={(e) => setSettings({ ...settings, context_max_messages: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mínimo de Mensagens</label>
                                <HelpTooltip text="Garante que ao menos x mensagens recentes sejam sempre mantidas no contexto, independente do tempo." />
                            </div>
                            <input
                                type="number"
                                value={settings.context_min_messages}
                                onChange={(e) => setSettings({ ...settings, context_min_messages: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AgentForm;
