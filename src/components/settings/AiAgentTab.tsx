import React, { useState, useEffect, useRef } from 'react';
import {
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Info,
    Bot,
    Cpu
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const AiAgentTab: React.FC = () => {
    const { user } = useAuth();
    const [agentName, setAgentName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
    const [model, setModel] = useState('gpt-3.5-turbo');

    // Tracking original state to detect changes
    const [originalState, setOriginalState] = useState({
        agentName: '',
        prompt: '',
        provider: 'openai',
        model: 'gpt-3.5-turbo'
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasChanges =
        prompt !== originalState.prompt ||
        agentName !== originalState.agentName ||
        provider !== originalState.provider ||
        model !== originalState.model;

    const charCount = prompt.length;

    // Models options
    const models = {
        openai: [
            { id: 'gpt-4o', name: 'GPT-4o (Mais Inteligente)' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Mais Rápido)' },
        ],
        gemini: [
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Mais Inteligente)' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Mais Rápido)' },
        ]
    };

    // Update model when provider changes if current model is invalid for new provider
    useEffect(() => {
        const validModels = models[provider].map(m => m.id);
        if (!validModels.includes(model)) {
            setModel(models[provider][0].id);
        }
    }, [provider]);

    useEffect(() => {
        if (user) {
            fetchAgentSettings();
        }
    }, [user]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.max(300, textareaRef.current.scrollHeight);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [prompt]);

    useEffect(() => {
        if (saveStatus !== 'idle') {
            const timer = setTimeout(() => setSaveStatus('idle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const fetchAgentSettings = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('ai_agent_settings')
                .select('agent_name, prompt, provider, model')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching AI agent settings:', error);
            } else if (data) {
                setAgentName(data.agent_name || '');
                setPrompt(data.prompt || '');
                setProvider((data.provider as 'openai' | 'gemini') || 'openai');
                setModel(data.model || 'gpt-3.5-turbo');

                setOriginalState({
                    agentName: data.agent_name || '',
                    prompt: data.prompt || '',
                    provider: (data.provider as 'openai' | 'gemini') || 'openai',
                    model: data.model || 'gpt-3.5-turbo'
                });
            }
        } catch (error) {
            console.error('Error fetching AI agent settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user || saving) return;
        setSaving(true);
        setSaveStatus('idle');

        try {
            const { data: existing } = await supabase
                .from('ai_agent_settings')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            const payload = {
                agent_name: agentName,
                prompt: prompt,
                provider: provider,
                model: model,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                const { error } = await supabase
                    .from('ai_agent_settings')
                    .update(payload)
                    .eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('ai_agent_settings')
                    .insert({
                        ...payload,
                        user_id: user.id,
                    });
                if (error) throw error;
            }

            setOriginalState({
                agentName,
                prompt,
                provider,
                model
            });
            setSaveStatus('success');
        } catch (error: any) {
            console.error('Error saving AI agent settings:', error);
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (hasChanges && !saving) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasChanges, saving, agentName, prompt, provider, model]);

    return (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300 w-full">
            <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-900">Agente IA</h2>
                <p className="text-sm text-slate-500 mt-1">Configure o comportamento do seu assistente inteligente.</p>
            </div>

            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="h-1 w-full bg-gradient-to-r from-[#ffd700] via-amber-400 to-yellow-300"></div>
                <div className="p-6 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-[#ffd700] to-amber-500 rounded-2xl shadow-lg shadow-[#ffd700]/30 shrink-0">
                            <Sparkles size={24} className="text-slate-900" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Prompt do Agente</h3>
                            <p className="text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">
                                Dê um nome ao seu agente e defina as instruções que guiam seu comportamento.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Agent Name */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Bot size={18} className="text-slate-400" />
                        <label className="text-sm font-bold text-slate-700">Nome do Agente</label>
                    </div>
                    <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Ex: Atendente Virtual"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#ffd700] transition-all font-bold text-slate-900 text-sm"
                        disabled={loading}
                    />
                </div>

                {/* AI Model Selection */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Cpu size={18} className="text-slate-400" />
                        <label className="text-sm font-bold text-slate-700">Modelo de IA</label>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value as 'openai' | 'gemini')}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#ffd700] transition-all font-bold text-slate-900 text-sm"
                            disabled={loading}
                        >
                            <option value="openai">OpenAI (GPT)</option>
                            <option value="gemini">Google Gemini</option>
                        </select>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="flex-[2] px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#ffd700] transition-all font-bold text-slate-900 text-sm"
                            disabled={loading}
                        >
                            {models[provider].map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Prompt Editor */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <span className="ml-2 text-xs font-mono text-slate-400">prompt.txt</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono">
                            {charCount.toLocaleString()} caracteres
                        </span>
                        {hasChanges && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider animate-in fade-in duration-200">
                                Não salvo
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 size={24} className="animate-spin text-[#ffd700]" />
                            <span className="text-sm text-slate-400">Carregando configurações...</span>
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={`Escreva aqui o prompt do seu agente...`}
                            className="w-full bg-transparent text-slate-900 text-sm leading-relaxed outline-none resize-none font-mono placeholder:text-slate-300 min-h-[300px]"
                            spellCheck={false}
                        />
                    )}
                </div>

                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Info size={14} />
                        <span>Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">Ctrl+S</kbd> para salvar rapidamente</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {saveStatus === 'success' && (
                            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-in fade-in slide-in-from-right-2 duration-200">
                                <CheckCircle2 size={16} />
                                <span>Salvo com sucesso!</span>
                            </div>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges || loading}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${hasChanges && !saving && !loading
                                ? 'bg-[#ffd700] text-slate-900 shadow-lg shadow-[#ffd700]/30 hover:bg-[#f8ab15] active:scale-95 cursor-pointer'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    <span>Salvar Prompt</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAgentTab;
