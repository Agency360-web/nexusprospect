import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Bot, Save, Loader2, AlertTriangle, CheckCircle2, Sliders, MessageSquare, Tag, Info, Brain, ArrowLeft } from 'lucide-react';

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
    prompt_support?: string;
    api_key: string;
    max_tokens: number;
    diversity_level: number;
    frequency_penalty: number;
    presence_penalty: number;
    sign_messages: boolean;
    read_messages: boolean;
    max_message_length: number;
    typing_delay_seconds: number;
    context_time_window_hours: number;
    context_max_messages: number;
    context_min_messages: number;
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
        prompt_support: agent.prompt_support || agent.prompt,
    });

    useEffect(() => {
        setSettings({
            ...agent,
            max_message_length: agent.max_message_length || 500,
            typing_delay_seconds: agent.typing_delay_seconds || 3,
            context_time_window_hours: agent.context_time_window_hours || 24,
            context_max_messages: agent.context_max_messages || 50,
            context_min_messages: agent.context_min_messages || 3,
            prompt_support: agent.prompt_support || agent.prompt,
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
                prompt_support: settings.prompt,
                api_key: settings.api_key,
                max_tokens: settings.max_tokens,
                diversity_level: settings.diversity_level,
                frequency_penalty: settings.frequency_penalty,
                presence_penalty: settings.presence_penalty,
                max_message_length: settings.max_message_length,
                typing_delay_seconds: settings.typing_delay_seconds,
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('ai_agent_settings')
                .update(supabasePayload)
                .eq('id', settings.id);

            if (updateError) throw updateError;

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
            <div className="flex flex-col gap-6 border-b border-slate-100 pb-6">
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
                                Configurações do Agente
                            </h2>
                        </div>
                    </div>
                </div>

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
                    </div>
                </section>

                {/* Botão de Salvar no Final */}
                <div className="flex flex-col gap-3 pt-6 border-t border-slate-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 border shadow-lg ${
                            saving 
                            ? 'bg-yellow-500 text-slate-900 border-yellow-500 shadow-yellow-500/20' 
                            : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:shadow-slate-900/20'
                        }`}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Todas as Alterações
                    </button>
                    
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-rose-500" />}
                            <span className="text-xs font-bold">{message.text}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentForm;
