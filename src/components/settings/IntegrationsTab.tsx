import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, XCircle, ExternalLink, Loader2, RefreshCw, Key, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { getGoogleAuthUrl, isGoogleCalendarConfigured } from '../../services/googleCalendar';


// Google Calendar SVG Icon (official multicolor)
const GoogleCalendarIcon = () => (
    <svg viewBox="0 0 200 200" className="w-8 h-8">
        <path fill="#4285F4" d="M152.637 47.363H47.363v105.274h105.274z" />
        <path fill="#34A853" d="M152.637 152.637H47.363L47.363 47.363z" opacity=".3" />
        <path fill="#EA4335" d="M152.637 47.363l-35.091 35.091 35.091 35.091z" />
        <path fill="#FBBC05" d="M47.363 152.637l35.091-35.091-35.091-35.091z" />
        <path fill="#4285F4" d="M117.546 117.546l35.091 35.091V47.363z" />
        <path fill="#34A853" d="M82.454 82.454L47.363 47.363v105.274z" />
        <rect fill="#fff" x="60" y="85" width="80" height="8" rx="2" />
        <rect fill="#fff" x="60" y="105" width="60" height="8" rx="2" />
        <rect fill="#fff" x="60" y="125" width="40" height="8" rx="2" />
    </svg>
);

// OpenAI SVG Icon
const OpenAIIcon = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-black" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5967 8.3829v-2.3324a.0804.0804 0 0 1 .0332-.0615L17.46 3.1971a4.5 4.5 0 0 1 6.1455 1.6464 4.4755 4.4755 0 0 1 .5346 3.0137l-.1419-.0852-4.783-2.7582a.7712.7712 0 0 0-.7806 0l-5.8428 3.3685zm2.0107-3.0231l-.142.0852-4.7735 2.7582a.7948.7948 0 0 0-.3927.6813v6.7369l-2.0153-1.1686a.071.071 0 0 1-.038-.052V8.1501a4.504 4.504 0 0 1 4.4945-4.4944 4.4755 4.4755 0 0 1 2.8669 1.0408zM8.9058 2.5022a4.485 4.485 0 0 1 2.5655-1.9728v5.6772a.7664.7664 0 0 0-.3879.6765L5.269 10.2374 3.2489 9.0689a.0757.0757 0 0 1-.071 0l4.8303-2.7865a4.504 4.504 0 0 1 2.3655-1.9728zM12 15.3364l-2.8958-1.672L12 12.0001l2.8958 1.6643z" />
    </svg>
);

// Gemini/Google Sparles Icon
const GeminiIcon = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#EA4335] text-white p-1" fill="currentColor">
        <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z" />
    </svg>
);


interface ApiKey {
    id: string;
    provider: 'openai' | 'gemini';
    api_key: string;
}

const IntegrationsTab: React.FC = () => {
    const { user } = useAuth();

    // Calendar State
    const [calendarLoading, setCalendarLoading] = useState(true);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);
    const [connectingCalendar, setConnectingCalendar] = useState(false);

    // API Keys State
    const [apiKeysLoading, setApiKeysLoading] = useState(true);
    const [keys, setKeys] = useState<Record<string, string>>({}); // provider -> key (obfuscated)
    const [inputValues, setInputValues] = useState<Record<string, string>>({ openai: '', gemini: '' });
    const [savingProvider, setSavingProvider] = useState<string | null>(null);
    const [showKey, setShowKey] = useState<Record<string, boolean>>({ openai: false, gemini: false });

    useEffect(() => {
        if (user) {
            checkCalendarConnection();
            fetchApiKeys();
        }
    }, [user]);

    // --- Google Calendar Logic ---
    const checkCalendarConnection = async () => {
        setCalendarLoading(true);
        try {
            const { data } = await supabase
                .from('user_google_tokens')
                .select('id')
                .eq('user_id', user!.id)
                .maybeSingle();

            setIsCalendarConnected(!!data);
        } catch (error) {
            console.error('Error checking Google Calendar connection:', error);
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleConnectCalendar = () => {
        setConnectingCalendar(true);
        const authUrl = getGoogleAuthUrl(user?.id);
        window.location.href = authUrl;
    };

    const handleDisconnectCalendar = async () => {
        if (!user || !confirm('Tem certeza que deseja desconectar o Google Agenda? Seus eventos não serão mais sincronizados.')) return;

        setCalendarLoading(true);
        try {
            const { error } = await supabase
                .from('user_google_tokens')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;
            setIsCalendarConnected(false);
        } catch (error) {
            console.error('Error disconnecting Google Calendar:', error);
            alert('Erro ao desconectar. Tente novamente.');
        } finally {
            setCalendarLoading(false);
        }
    };


    // --- API Keys Logic ---
    const fetchApiKeys = async () => {
        setApiKeysLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_api_keys')
                .select('provider, api_key')
                .eq('user_id', user!.id);

            if (error) throw error;

            if (data) {
                const fetchedKeys: Record<string, string> = {};
                data.forEach(item => {
                    // Show a dummy obfuscated value instead of the real one for security display
                    // The actual value is still there but we only want to show the last 4 chars
                    const length = item.api_key.length;
                    const suffix = length > 4 ? item.api_key.slice(-4) : '****';
                    fetchedKeys[item.provider] = `sk-...${suffix}`;
                });
                setKeys(fetchedKeys);
            }
        } catch (error) {
            console.error('Error fetching API keys:', error);
        } finally {
            setApiKeysLoading(false);
        }
    };

    const handleSaveKey = async (provider: 'openai' | 'gemini') => {
        const val = inputValues[provider];
        if (!val || val.trim() === '') return;

        setSavingProvider(provider);
        try {
            // Check if exists
            const { data: existing } = await supabase
                .from('user_api_keys')
                .select('id')
                .eq('user_id', user!.id)
                .eq('provider', provider)
                .maybeSingle();

            if (existing) {
                // Update
                const { error } = await supabase
                    .from('user_api_keys')
                    .update({ api_key: val.trim(), updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('user_api_keys')
                    .insert({ user_id: user!.id, provider, api_key: val.trim() });
                if (error) throw error;
            }

            // Clear input and refetch
            setInputValues(prev => ({ ...prev, [provider]: '' }));
            await fetchApiKeys();

        } catch (error) {
            console.error(`Error saving ${provider} key:`, error);
            alert(`Erro ao salvar a chave. Tente novamente.`);
        } finally {
            setSavingProvider(null);
        }
    };

    const handleDeleteKey = async (provider: 'openai' | 'gemini') => {
        if (!confirm(`Tem certeza que deseja remover as credenciais do ${provider}? Seus Agentes de IA que usam esta integração irão parar de funcionar.`)) return;

        setSavingProvider(provider);
        try {
            const { error } = await supabase
                .from('user_api_keys')
                .delete()
                .eq('user_id', user!.id)
                .eq('provider', provider);

            if (error) throw error;

            // Remove from local state
            setKeys(prev => {
                const next = { ...prev };
                delete next[provider];
                return next;
            });
        } catch (error) {
            console.error(`Error deleting ${provider} key:`, error);
            alert(`Erro ao remover a chave. Tente novamente.`);
        } finally {
            setSavingProvider(null);
        }
    };

    const renderApiKeyCard = (
        provider: 'openai' | 'gemini',
        title: string,
        description: string,
        icon: React.ReactNode,
        badgeColor: string
    ) => {
        const hasKey = !!keys[provider];
        const isSaving = savingProvider === provider;

        return (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className={`h-1 w-full flex ${badgeColor}`}></div>
                <div className="p-6 md:flex items-start justify-between gap-6 space-y-4 md:space-y-0">
                    <div className="flex items-center gap-5">
                        <div className="p-2 bg-slate-50 rounded-xl shrink-0 border border-slate-100 flex items-center justify-center">
                            {icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-slate-900 text-base">{title}</h3>
                                {hasKey && (
                                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-100">
                                        <CheckCircle2 size={12} />
                                        Ativa
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                {description}
                            </p>

                            {hasKey && (
                                <div className="mt-4 flex items-center gap-2">
                                    <Key size={14} className="text-slate-400" />
                                    <span className="text-sm font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        {keys[provider]}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteKey(provider)}
                                        disabled={isSaving}
                                        className="text-xs text-red-500 hover:text-red-600 font-bold ml-2 underline decoration-red-200 hover:decoration-red-500 disabled:opacity-50"
                                    >
                                        Remover
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {!hasKey && (
                        <div className="flex-shrink-0 w-full md:w-80 flex flex-col gap-2">
                            <div className="relative">
                                <input
                                    type={showKey[provider] ? "text" : "password"}
                                    value={inputValues[provider]}
                                    onChange={(e) => setInputValues(prev => ({ ...prev, [provider]: e.target.value }))}
                                    placeholder={`Cole sua API Key da ${title}...`}
                                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white transition-all font-mono"
                                />
                                <button
                                    onClick={() => setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }))}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                >
                                    {showKey[provider] ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <button
                                onClick={() => handleSaveKey(provider)}
                                disabled={isSaving || !inputValues[provider]}
                                className="flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                <span>Salvar Credencial</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300 w-full">
            <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-900">Integrações API</h2>
                <p className="text-sm text-slate-500">Conecte sua conta a plataformas externas para potencializar seus Agentes e rotinas.</p>
            </div>

            <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 mt-8 mb-2">Modelos de Inteligência Artificial</h3>
                <p className="text-sm text-slate-500 mb-4">Gerencie as chaves de API usadas pelos Agentes de IA nos atendimentos.</p>

                {apiKeysLoading ? (
                    <div className="flex items-center justify-center p-10 bg-white rounded-2xl border border-slate-200">
                        <Loader2 size={24} className="animate-spin text-[#ffd700]" />
                    </div>
                ) : (
                    <>
                        {renderApiKeyCard(
                            'openai',
                            'OpenAI',
                            'Integração oficial para usar os modelos GPT-3.5 e GPT-4.',
                            <OpenAIIcon />,
                            'bg-slate-900'
                        )}

                        {renderApiKeyCard(
                            'gemini',
                            'Google Gemini',
                            'Integração oficial para usar os modelos de linguagem avançados do Google.',
                            <GeminiIcon />,
                            'bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]'
                        )}
                    </>
                )}
            </div>

            <div className="space-y-4 mt-12 pt-8 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 mb-2">Produtividade e Agenda</h3>

                {/* Google Calendar Base Structure maintained but stylized similarly */}
                {!isGoogleCalendarConfigured() ? (
                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800">
                        <h3 className="font-bold flex items-center gap-2 mb-2">
                            <XCircle size={20} />
                            Google Agenda não configurado
                        </h3>
                        <p className="text-sm">
                            As credenciais do Google Calendar API não foram configuradas no sistema principal.
                            Entre em contato com o administrador do sistema.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="h-1 w-full flex">
                            <div className="flex-1 bg-[#4285F4]"></div>
                            <div className="flex-1 bg-[#EA4335]"></div>
                            <div className="flex-1 bg-[#FBBC05]"></div>
                            <div className="flex-1 bg-[#34A853]"></div>
                        </div>

                        <div className="p-6 flex items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="p-2 bg-slate-50 rounded-xl shrink-0 border border-slate-100">
                                    <GoogleCalendarIcon />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">Google Agenda</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                        Sincronize seus eventos do Google Calendar diretamente no dashboard.
                                    </p>

                                    <div className="mt-2 flex items-center gap-2">
                                        {calendarLoading ? (
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <Loader2 size={14} className="animate-spin" />
                                                Verificando status...
                                            </div>
                                        ) : isCalendarConnected ? (
                                            <div className="flex items-center gap-2 text-white bg-[#34A853] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                                <CheckCircle2 size={14} />
                                                Conectado
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full" />
                                                Desconectado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0">
                                {calendarLoading ? (
                                    <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed">
                                        ...
                                    </button>
                                ) : isCalendarConnected ? (
                                    <button
                                        onClick={handleDisconnectCalendar}
                                        className="px-4 py-2 text-[#EA4335] hover:bg-red-50 rounded-xl font-bold text-sm transition-colors border border-transparent hover:border-red-100"
                                    >
                                        Desconectar
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleConnectCalendar}
                                        disabled={connectingCalendar}
                                        className="flex items-center justify-center gap-2 w-32 px-5 py-2.5 bg-white text-emerald-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                                    >
                                        {connectingCalendar ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                                        <span>Conectar</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {isCalendarConnected && (
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <RefreshCw size={12} className="text-[#34A853]" />
                                    <span>Sincronização automática ativa</span>
                                </div>
                                <span>Última verificação: Agora mesmo</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntegrationsTab;
