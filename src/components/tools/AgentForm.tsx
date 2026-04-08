import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Bot, Save, Loader2, AlertTriangle, CheckCircle2, Send, MessageCircle, ArrowLeft } from 'lucide-react';

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
}

interface AgentFormProps {
    agent: AgentSettings;
    onBack: () => void;
    onSuccess: () => void;
    userId: string;
}

const AGENT_TYPES: { id: AgentType; label: string; description: string; icon: React.ElementType }[] = [
    { id: 'dispatch', label: 'Agente de Disparo', description: 'Para campanhas de envio automático.', icon: Send },
    { id: 'support', label: 'Agente de Atendimento', description: 'Para suporte via WhatsApp.', icon: MessageCircle },
];

const AgentForm: React.FC<AgentFormProps> = ({ agent, onBack, onSuccess, userId }) => {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [settings, setSettings] = useState<AgentSettings>({ ...agent });

    useEffect(() => {
        setSettings(agent);
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

            const payload = {
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
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('ai_agent_settings')
                .update(payload)
                .eq('id', settings.id);

            if (updateError) throw updateError;

            // Webhook notification logic
            if (settings.type === 'support') {
                try {
                    const { data: connections } = await supabase
                        .from('whatsapp_connections')
                        .select('instance, token, phone_number, profile_name, status')
                        .eq('user_id', userId);

                    const allInstances = (connections || []).map(conn => ({
                        instance: conn.instance,
                        token: conn.token,
                        phoneNumber: conn.phone_number,
                        profileName: conn.profile_name,
                        status: conn.status,
                    }));

                    await fetch('https://nexus360.infra-conectamarketing.site/webhook/editar_agent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            agentId: settings.id,
                            agentType: settings.type,
                            is_active: settings.is_active,
                            agent_name: settings.agent_name,
                            prompt: settings.prompt,
                            language: settings.language,
                            instances: allInstances,
                            api_key: settings.api_key,
                            temperature: settings.temperature,
                            max_tokens: settings.max_tokens
                        }),
                    });
                } catch (webhookErr) {
                    console.warn('Notification failed:', webhookErr);
                }
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
        <div className="space-y-6 p-6">
            {/* Form Header */}
            <div className="flex flex-col gap-6 border-b border-slate-100 pb-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900"
                            title="Fechar"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <Bot className="text-emerald-500" size={20} />
                                Configurar
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">ID: {settings.id.substring(0, 12)}...</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Main Settings */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nome do Agente</label>
                            <input
                                type="text"
                                value={settings.agent_name}
                                onChange={(e) => setSettings({ ...settings, agent_name: e.target.value })}
                                placeholder="Ex: Assistente de Vendas"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Prompt de Instruções</label>
                        <textarea
                            value={settings.prompt}
                            onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
                            placeholder="Descreva a personalidade do agente..."
                            rows={6}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none font-mono"
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span className="text-xs font-bold">{message.text}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentForm;
