import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, XCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
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

const IntegrationsTab: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        checkConnection();
    }, [user]);

    const checkConnection = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('user_google_tokens')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            setIsConnected(!!data);
        } catch (error) {
            console.error('Error checking Google Calendar connection:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        setConnecting(true);
        const authUrl = getGoogleAuthUrl(user?.id);
        window.location.href = authUrl;
    };

    const handleDisconnect = async () => {
        if (!user || !confirm('Tem certeza que deseja desconectar o Google Agenda? Seus eventos não serão mais sincronizados.')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_google_tokens')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;
            setIsConnected(false);
        } catch (error) {
            console.error('Error disconnecting Google Calendar:', error);
            alert('Erro ao desconectar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!isGoogleCalendarConfigured()) {
        return (
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                    <XCircle size={20} />
                    Integração não configurada
                </h3>
                <p className="text-sm">
                    As credenciais do Google Calendar API não foram configuradas no sistema.
                    Entre em contato com o administrador do sistema.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300 w-full">
            <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-900">Integrações API</h2>
                <p className="text-sm text-slate-500">Gerencie as conexões com serviços externos.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Google-style gradient accent bar */}
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
                                {loading ? (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Loader2 size={14} className="animate-spin" />
                                        Verificando status...
                                    </div>
                                ) : isConnected ? (
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
                        {loading ? (
                            <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed">
                                ...
                            </button>
                        ) : isConnected ? (
                            <button
                                onClick={handleDisconnect}
                                className="px-4 py-2 text-[#EA4335] hover:bg-red-50 rounded-xl font-bold text-sm transition-colors border border-transparent hover:border-red-100"
                            >
                                Desconectar
                            </button>
                        ) : (
                            <button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#4285F4] text-white rounded-xl font-bold text-sm hover:bg-[#3367D6] transition-all shadow-lg shadow-blue-200"
                            >
                                {connecting ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                                <span>Conectar com Google</span>
                            </button>
                        )}
                    </div>
                </div>

                {isConnected && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <RefreshCw size={12} className="text-[#34A853]" />
                            <span>Sincronização automática ativa</span>
                        </div>
                        <span>Última verificação: Agora mesmo</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntegrationsTab;
