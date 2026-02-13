import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Loader2, CheckCircle2, Trash2, Key, Eye, EyeOff, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

const GeminiIntegration: React.FC = () => {
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
                .eq('provider', 'gemini')
                .maybeSingle();

            if (data) {
                setApiKey(data.api_key);
                setHasKey(true);
            }
        } catch (error) {
            console.error('Error fetching Gemini key:', error);
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
                    provider: 'gemini',
                    api_key: apiKey,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, provider' });

            if (error) throw error;
            setHasKey(true);
            setIsExpanded(false);
            alert('Chave Google Gemini salva com sucesso!');
        } catch (error) {
            console.error('Error saving Gemini key:', error);
            alert('Erro ao salvar chave.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!user || !confirm('Tem certeza? Isso impedirá o funcionamento dos agentes que usam Gemini.')) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_api_keys')
                .delete()
                .eq('user_id', user.id)
                .eq('provider', 'gemini');

            if (error) throw error;
            setApiKey('');
            setHasKey(false);
            alert('Chave removida.');
        } catch (error) {
            console.error('Error deleting Gemini key:', error);
            alert('Erro ao remover chave.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-6">
            {/* Gemini Vivid Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4E88FC] via-[#9B6EF3] to-[#FF6954]" />

            <div className="p-6">
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        {/* Official Google Gemini Logo */}
                        <div className="p-3 bg-white rounded-xl shrink-0 border border-slate-100 shadow-sm">
                            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.5 12.8571V11.1429C19.1417 11.1429 16.4023 8.35626 16.4023 4.90909H14.7171C14.7171 8.35626 11.9777 11.1429 8.61932 11.1429V12.8571C11.9777 12.8571 14.7171 15.6437 14.7171 19.0909H16.4023C16.4023 15.6437 19.1417 12.8571 22.5 12.8571Z" fill="url(#paint0_linear)" />
                                <path d="M12.7816 7.42396V6.15286C10.2917 6.15286 8.26087 4.0869 8.26087 1.53125H7.01168C7.01168 4.0869 4.98089 6.15286 2.49097 6.15286V7.42396C4.98089 7.42396 7.01168 9.48992 7.01168 12.0456H8.26087C8.26087 9.48992 10.2917 7.42396 12.7816 7.42396Z" fill="url(#paint1_linear)" />
                                <defs>
                                    <linearGradient id="paint0_linear" x1="8.61932" y1="12" x2="22.5" y2="12" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#4E87F6" />
                                        <stop offset="1" stopColor="#FF6854" />
                                    </linearGradient>
                                    <linearGradient id="paint1_linear" x1="2.49097" y1="6.78841" x2="12.7816" y2="6.78841" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#4E87F6" />
                                        <stop offset="1" stopColor="#FF6854" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Google Gemini</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-lg">
                                Conecte a IA multimodal do Google.
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
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold">
                                    <CheckCircle2 size={16} />
                                    <span>Conectado</span>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
                                    Chave de API (Gemini API Key)
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
                                            placeholder="AIza..."
                                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-mono text-slate-600 shadow-sm"
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
                                        className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Salvar
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Obtenha sua chave no <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">Google AI Studio →</a>
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

export default GeminiIntegration;
