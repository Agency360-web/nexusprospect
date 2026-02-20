import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Save, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AgentSettings {
    id?: string;
    is_active: boolean;
    agent_name: string;
    use_custom_initial_message: boolean;
    initial_message: string;
    language: string;
    temperature: number;
    provider: string;
    model: string;
    prompt: string;
}

const AiAgents: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [settings, setSettings] = useState<AgentSettings>({
        is_active: false,
        agent_name: '',
        use_custom_initial_message: false,
        initial_message: '',
        language: 'pt-BR',
        temperature: 0.7,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        prompt: ''
    });

    // Track which providers the user has API keys for
    const [availableProviders, setAvailableProviders] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            fetchSettings();
        }
    }, [user]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            // 1. Fetch Agent Settings
            const { data, error } = await supabase
                .from('ai_agent_settings')
                .select('*')
                .eq('user_id', user!.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error; // ignore no rows error

            // 2. Fetch User API Keys to determine available providers
            const { data: keysData, error: keysError } = await supabase
                .from('user_api_keys')
                .select('provider')
                .eq('user_id', user!.id);

            if (keysError) console.error("Error fetching API keys:", keysError);

            const providers = keysData ? keysData.map(k => k.provider) : [];
            setAvailableProviders(providers);

            if (data) {
                setSettings({
                    id: data.id,
                    is_active: data.is_active || false,
                    agent_name: data.agent_name || '',
                    use_custom_initial_message: data.use_custom_initial_message || false,
                    initial_message: data.initial_message || '',
                    language: data.language || 'pt-BR',
                    temperature: data.temperature ?? 0.7,
                    provider: data.provider || 'openai',
                    model: data.model || 'gpt-3.5-turbo',
                    prompt: data.prompt || ''
                });
            }
        } catch (err: any) {
            console.error('Error fetching agent settings:', err);
            setMessage({ type: 'error', text: 'Não foi possível carregar as configurações do agente.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        try {
            setSaving(true);
            setMessage(null);

            // Fetch organization_id (assuming the user has one from profiles/memberships)
            // Just doing an upsert based on user_id might fail if organization_id is required
            // Let's check if the user has a profile with organization_id, or if we can just update existing

            let query;
            if (settings.id) {
                // Update
                query = supabase
                    .from('ai_agent_settings')
                    .update({
                        is_active: settings.is_active,
                        agent_name: settings.agent_name,
                        use_custom_initial_message: settings.use_custom_initial_message,
                        initial_message: settings.use_custom_initial_message ? settings.initial_message : '',
                        language: settings.language,
                        temperature: settings.temperature,
                        provider: settings.provider,
                        model: settings.model,
                        prompt: settings.prompt,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', settings.id);
            } else {
                // Insert (requires organization_id, we will get it from user profile)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                if (!profile?.organization_id) {
                    throw new Error('Usuário não possui uma organização associada.');
                }

                query = supabase
                    .from('ai_agent_settings')
                    .insert({
                        organization_id: profile.organization_id,
                        user_id: user.id,
                        is_active: settings.is_active,
                        agent_name: settings.agent_name,
                        use_custom_initial_message: settings.use_custom_initial_message,
                        initial_message: settings.use_custom_initial_message ? settings.initial_message : '',
                        language: settings.language,
                        temperature: settings.temperature,
                        provider: settings.provider,
                        model: settings.model,
                        prompt: settings.prompt
                    });
            }

            const { error } = await query;
            if (error) throw error;

            setMessage({ type: 'success', text: 'Configurações do agente salvas com sucesso!' });

            // clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);

            // Refetch to get ID if it was an insert
            if (!settings.id) {
                fetchSettings();
            }

        } catch (err: any) {
            console.error('Error saving agent settings:', err);
            setMessage({ type: 'error', text: `Erro ao salvar: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 size={32} className="animate-spin text-[#ffd700]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-right-2 duration-300 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 md:items-end justify-between border-b border-slate-200 pb-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                        <Bot size={28} className="text-[#ffd700]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agentes de IA</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Configure o comportamento e as mensagens do seu assistente virtual.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                    <span className={`text-sm font-bold ${settings.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {settings.is_active ? 'Agente Ativado' : 'Agente Desativado'}
                    </span>
                    <button
                        onClick={() => setSettings({ ...settings, is_active: !settings.is_active })}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${settings.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${settings.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Notification */}
            {message && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertTriangle size={20} className="text-red-500" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {/* Form */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-8">

                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Nome do Agente</label>
                        <input
                            type="text"
                            value={settings.agent_name}
                            onChange={(e) => setSettings({ ...settings, agent_name: e.target.value })}
                            placeholder="Ex: Assistente Conecta"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Idioma do Agente</label>
                        <select
                            value={settings.language}
                            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white transition-all"
                        >
                            <option value="pt-BR">Português (Brasil)</option>
                            <option value="en-US">English (US)</option>
                            <option value="es-ES">Español</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-slate-700">Mensagem Inicial Padrão</label>
                        <p className="text-xs text-slate-500 mt-1 mb-3">Define como o agente iniciará o atendimento com o cliente.</p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${!settings.use_custom_initial_message ? 'border-[#ffd700] bg-[#ffd700]/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                <input
                                    type="radio"
                                    name="initialMsgType"
                                    checked={!settings.use_custom_initial_message}
                                    onChange={() => setSettings({ ...settings, use_custom_initial_message: false })}
                                    className="w-4 h-4 text-[#ffd700] focus:ring-[#ffd700] border-slate-300"
                                />
                                <div className="ml-3">
                                    <span className="block text-sm font-bold text-slate-900">Deixar o Agente decidir</span>
                                    <span className="block text-xs text-slate-500">A IA vai gerar a mensagem inicial com base no prompt.</span>
                                </div>
                            </label>

                            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${settings.use_custom_initial_message ? 'border-[#ffd700] bg-[#ffd700]/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                <input
                                    type="radio"
                                    name="initialMsgType"
                                    checked={settings.use_custom_initial_message}
                                    onChange={() => setSettings({ ...settings, use_custom_initial_message: true })}
                                    className="w-4 h-4 text-[#ffd700] focus:ring-[#ffd700] border-slate-300"
                                />
                                <div className="ml-3">
                                    <span className="block text-sm font-bold text-slate-900">Mensagem fixa customizada</span>
                                    <span className="block text-xs text-slate-500">O mesmo texto será enviado sempre no início.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {settings.use_custom_initial_message && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <textarea
                                value={settings.initial_message}
                                onChange={(e) => setSettings({ ...settings, initial_message: e.target.value })}
                                placeholder="Olá! Sou o assistente virtual. Como posso ajudar?"
                                rows={2}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white transition-all resize-y"
                            />
                        </div>
                    )}
                </div>

                <hr className="border-slate-100" />

                {/* AI Config */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Configuração da Inteligência Artificial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Provedor & Modelo</label>
                            {availableProviders.length === 0 ? (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-orange-800">Nenhuma integração ativa</p>
                                        <p className="text-xs text-orange-700 mt-1">
                                            Você precisa configurar as chaves de API do OpenAI ou Gemini na página de <strong>Integrações</strong> antes de selecionar um modelo.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <select
                                    value={`${settings.provider}::${settings.model}`}
                                    onChange={(e) => {
                                        const [provider, model] = e.target.value.split('::');
                                        setSettings({ ...settings, provider, model });
                                    }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white transition-all"
                                >
                                    {availableProviders.includes('openai') && (
                                        <optgroup label="OpenAI">
                                            <option value="openai::gpt-3.5-turbo">GPT-3.5 Turbo (Mais rápido)</option>
                                            <option value="openai::gpt-4o">GPT-4o (Mais avançado)</option>
                                        </optgroup>
                                    )}
                                    {availableProviders.includes('gemini') && (
                                        <optgroup label="Google">
                                            <option value="gemini::gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
                                            <option value="gemini::gemini-1.5-pro">Gemini 1.5 Pro (Avançado)</option>
                                        </optgroup>
                                    )}
                                </select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">Temperatura: {settings.temperature}</label>
                                <span className="text-xs text-slate-400">{settings.temperature < 0.3 ? 'Garante precisão' : settings.temperature > 0.7 ? 'Alta criatividade' : 'Equilibrado'}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={settings.temperature}
                                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ffd700]"
                            />
                        </div>
                    </div>
                </div>

                {/* Prompt */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Prompt do Agente (Diretrizes e Regras)</label>
                    <p className="text-xs text-slate-500 mb-2">Descreva detalhadamente como o agente deve se comportar, seu tom de voz, regras de negócio e informações importantes.</p>
                    <textarea
                        value={settings.prompt}
                        onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
                        placeholder="Você é um assistente de vendas focado em conversão. Seu objetivo é..."
                        rows={10}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white transition-all resize-y font-mono text-sm leading-relaxed"
                    />
                </div>

                {/* Submit */}
                <div className="pt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center space-x-2 px-8 py-4 bg-[#ffd700] text-slate-900 rounded-2xl font-black shadow-xl shadow-[#ffd700]/30 hover:bg-[#f8ab15] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        <span>Salvar Configurações</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiAgents;
