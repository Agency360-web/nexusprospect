import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Loader2, CheckCircle2, Trash2, Key, Eye, EyeOff, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

const OpenAIIntegration: React.FC = () => {
    const { user } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasKey, setHasKey] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (user) fetchKey();
    }, [user]);

    const fetchKey = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('user_api_keys')
                .select('api_key')
                .eq('user_id', user.id)
                .eq('provider', 'openai')
                .maybeSingle();

            if (data) {
                setApiKey(data.api_key);
                setHasKey(true);
            }
        } catch (error) {
            console.error('Error fetching OpenAI key:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_api_keys')
                .upsert({
                    user_id: user.id,
                    provider: 'openai',
                    api_key: apiKey,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, provider' });

            if (error) throw error;
            setHasKey(true);
            setIsExpanded(false); // Collapse on success
            alert('Chave OpenAI salva com sucesso!');
        } catch (error) {
            console.error('Error saving OpenAI key:', error);
            alert('Erro ao salvar chave.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!user || !confirm('Tem certeza? Isso impedirá o funcionamento dos agentes que usam OpenAI.')) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_api_keys')
                .delete()
                .eq('user_id', user.id)
                .eq('provider', 'openai');

            if (error) throw error;
            setApiKey('');
            setHasKey(false);
            alert('Chave removida.');
        } catch (error) {
            console.error('Error deleting OpenAI key:', error);
            alert('Erro ao remover chave.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-6">
            {/* OpenAI Vivid Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#10a37f] via-[#0d8a6a] to-[#000000]" />

            <div className="p-6">
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        {/* Official OpenAI Logo */}
                        <div className="p-3 bg-white rounded-xl shrink-0 border border-slate-100 shadow-sm">
                            <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#10a37f]" fill="currentColor">
                                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0843 3.5398-2.0463.1873.3253a4.5083 4.5083 0 0 1-.9926 2.8461zm-9.6601-5.6135a4.494 4.494 0 0 1-.5063-2.905l.142.0843 3.5398 2.0439.1873-.3253a4.5225 4.5225 0 0 1-3.3628 1.1021zm3.8763-11.4938l-.1873-.3252a4.4845 4.4845 0 0 1 3.3675-1.1069 4.466 4.466 0 0 1 2.8812 1.0408l-.1419.0843-3.9195 2.2647-2.0000-1.9961zM12 8.019l3.4682-1.9897.1873.3253a4.4893 4.4893 0 0 1 .5062 2.905l-.1419-.0843-3.5398-2.0439-.4799.8876z" />
                            </svg>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">OpenAI API</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-lg">
                                Inteligência avançada com modelos GPT-4 e GPT-3.5.
                            </p>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="shrink-0">
                        {loading ? (
                            <div className="flex items-center gap-2 text-slate-400 bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold">
                                <Loader2 size={16} className="animate-spin" />
                                <span>Carregando...</span>
                            </div>
                        ) : hasKey ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-white bg-[#10a37f] px-4 py-2 rounded-xl text-sm font-bold shadow-sm shadow-emerald-200">
                                    <CheckCircle2 size={16} />
                                    <span>Conectado</span>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    {isExpanded ? <ChevronUp size={20} /> : <Settings2 size={20} />}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center justify-center gap-2 w-32 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md border border-slate-200 ${isExpanded
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-white text-emerald-600 hover:bg-slate-50'
                                    }`}
                            >
                                {isExpanded ? 'Cancelar' : 'Conectar'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Expanded Configuration Area */}
                {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col gap-4 max-w-xl">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                                    Chave de API (Secret Key)
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key size={14} className="text-slate-400" />
                                        </div>
                                        <input
                                            type={isVisible ? "text" : "password"}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="sk-..."
                                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#10a37f] focus:ring-4 focus:ring-[#10a37f]/10 transition-all font-mono text-slate-600 shadow-sm"
                                        />
                                        <button
                                            onClick={() => setIsVisible(!isVisible)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !apiKey}
                                        className="px-4 py-2.5 bg-[#10a37f] text-white rounded-xl hover:bg-[#0d8a6a] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Salvar
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    A chave nunca será compartilhada. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[#10a37f] hover:underline">Obter chave →</a>
                                </p>
                            </div>

                            {hasKey && (
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        Remover Integração
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpenAIIntegration;
