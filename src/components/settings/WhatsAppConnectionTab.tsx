import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Smartphone, Trash2, QrCode, Wifi, WifiOff } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConnectionData {
    exists: boolean;
    instance?: string;
    status?: string;
    live_state?: string;
    qrcode?: string | null;
    created_at?: string;
}

// ─── WhatsApp Logo SVG ───────────────────────────────────────────────────────
const WhatsAppIcon = () => (
    <svg viewBox="0 0 32 32" className="w-8 h-8">
        <circle cx="16" cy="16" r="16" fill="#25D366" />
        <path
            d="M23.3 8.7C21.4 6.8 18.8 5.7 16 5.7c-5.5 0-10 4.5-10 10 0 1.8.5 3.5 1.3 5L6 26.3l5.8-1.5c1.4.8 3.1 1.2 4.8 1.2h0c5.5 0 10-4.5 10-10 0-2.7-1-5.2-2.9-7.1l-.4-.2zM16 24c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C8 18.7 7.5 17.4 7.5 16c0-4.7 3.8-8.5 8.5-8.5 2.3 0 4.4.9 6 2.5 1.6 1.6 2.5 3.7 2.5 6 0 4.7-3.8 8.5-8.5 8.5v-.5z"
            fill="white"
        />
        <path
            d="M21.2 18.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"
            fill="white"
        />
    </svg>
);

// ─── Toast Component ─────────────────────────────────────────────────────────
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3500);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-xl text-white font-bold text-sm shadow-2xl ${bgColor} animate-in slide-in-from-bottom-2 duration-300`}>
            {message}
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const WhatsAppConnectionTab: React.FC = () => {
    const { user } = useAuth();

    // State
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [connection, setConnection] = useState<ConnectionData | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Polling ref
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Edge Function caller ────────────────────────────────────────────
    const callEdgeFunction = useCallback(async (action: string, method: string = 'GET', silent: boolean = false): Promise<any> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                if (!silent) setToast({ message: 'Sessão expirada. Faça login novamente.', type: 'error' });
                return null;
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const res = await fetch(
                `${supabaseUrl}/functions/v1/whatsapp-connection?action=${action}`,
                {
                    method,
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': anonKey,
                        'Content-Type': 'application/json',
                    },
                    ...(method !== 'GET' && method !== 'HEAD' ? { body: JSON.stringify({}) } : {}),
                }
            );

            // Handle non-JSON responses gracefully
            const text = await res.text();
            let result: any;
            try {
                result = JSON.parse(text);
            } catch {
                console.error('Non-JSON response from Edge Function:', text);
                result = { error: text };
            }

            if (!res.ok && !silent) {
                console.warn(`WhatsApp Edge Function [${action}] returned ${res.status}:`, result);
            }

            return { ok: res.ok, status: res.status, data: result };
        } catch (error) {
            console.error('Edge function error:', error);
            if (!silent) setToast({ message: 'Erro de conexão com o servidor.', type: 'error' });
            return null;
        }
    }, []);

    // ─── Check connection status ─────────────────────────────────────────
    const checkConnection = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);

        try {
            const result = await callEdgeFunction('status', 'GET', silent);
            if (!result) return;

            if (result.ok) {
                setConnection(result.data);
            } else {
                setConnection({ exists: false });
            }
        } catch (error) {
            console.error('Check connection error:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [user, callEdgeFunction]);

    // ─── Create connection ───────────────────────────────────────────────
    const handleCreate = useCallback(async () => {
        if (actionLoading) return; // Prevent double-click
        setActionLoading(true);

        try {
            const result = await callEdgeFunction('create', 'POST');
            if (result?.ok && result.data?.success) {
                setToast({ message: result.data.message || 'Conexão criada com sucesso!', type: 'success' });
                await checkConnection();
                startPolling();
            } else {
                setToast({ message: result?.data?.message || 'Erro ao criar conexão.', type: 'error' });
            }
        } finally {
            setActionLoading(false);
        }
    }, [actionLoading, callEdgeFunction, checkConnection]);

    // ─── Delete connection ───────────────────────────────────────────────
    const handleDelete = useCallback(async () => {
        if (!confirm('Tem certeza que deseja desconectar? Isso irá remover a instância do WhatsApp.')) return;

        stopPolling();
        setActionLoading(true);

        try {
            const result = await callEdgeFunction('delete', 'POST'); // Using POST because DELETE might have CORS issues
            if (result?.ok && result.data?.success) {
                setToast({ message: 'Conexão removida com sucesso.', type: 'success' });
                setConnection({ exists: false });
            } else {
                setToast({ message: result?.data?.message || 'Erro ao remover conexão.', type: 'error' });
                startPolling();
            }
        } finally {
            setActionLoading(false);
        }
    }, [callEdgeFunction]);

    // ─── Refresh QR Code ─────────────────────────────────────────────────
    const handleRefreshQR = useCallback(async () => {
        setActionLoading(true);
        try {
            const result = await callEdgeFunction('qr');
            if (result?.ok && result.data?.success) {
                // Update connection with new QR code
                setConnection(prev => prev ? { ...prev, qrcode: result.data.qrcode, live_state: 'connecting' } : prev);
                setToast({ message: 'QR Code atualizado.', type: 'success' });
            } else {
                setToast({ message: result?.data?.message || 'Erro ao atualizar QR Code.', type: 'error' });
            }
        } finally {
            setActionLoading(false);
        }
    }, [callEdgeFunction]);

    // ─── Polling ─────────────────────────────────────────────────────────
    const startPolling = useCallback(() => {
        stopPolling();
        pollingRef.current = setInterval(() => {
            checkConnection(true); // Silent polling
        }, 6000);
    }, [checkConnection]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    // ─── Initial load & cleanup ──────────────────────────────────────────
    useEffect(() => {
        checkConnection();
        startPolling();
        return () => stopPolling();
    }, [user]);

    // ─── Badge rendering ─────────────────────────────────────────────────
    const renderBadge = () => {
        if (!connection?.exists) return null;

        const state = connection.live_state;

        if (state === 'open') {
            return (
                <div className="flex items-center gap-2 text-white bg-emerald-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    <Wifi size={14} />
                    Conectado
                </div>
            );
        } else if (state === 'connecting') {
            return (
                <div className="flex items-center gap-2 text-white bg-amber-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    <Loader2 size={14} className="animate-spin" />
                    Conectando...
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-2 text-white bg-red-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    <WifiOff size={14} />
                    Desconectado
                </div>
            );
        }
    };

    // ─── QR Code section ─────────────────────────────────────────────────
    const needsQR = connection?.exists && (connection.live_state === 'close' || connection.live_state === 'connecting') && connection.qrcode;

    const getQRSrc = () => {
        if (!connection?.qrcode) return '';
        const src = connection.qrcode;
        if (src.startsWith('data:image')) return src;
        return `data:image/png;base64,${src}`;
    };

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* WhatsApp-style gradient accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #25D366, #128C7E, #075E54, #25D366)' }} />

            <div className="p-6">
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-2 bg-slate-50 rounded-xl shrink-0 border border-slate-100">
                            <WhatsAppIcon />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">WhatsApp</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                Conecte seu WhatsApp para enviar e receber mensagens automaticamente com a Nexus.
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                {loading ? (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Loader2 size={14} className="animate-spin" />
                                        Verificando status...
                                    </div>
                                ) : connection?.exists ? (
                                    renderBadge()
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full" />
                                        Sem conexão
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
                        ) : !connection?.exists ? (

                            <button
                                onClick={handleCreate}
                                disabled={actionLoading}
                                className="flex items-center justify-center gap-2 w-32 px-5 py-2.5 bg-white text-emerald-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                                <span>{actionLoading ? 'Conectando...' : 'Conectar'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={16} className="animate-spin inline mr-1" /> : <Trash2 size={14} className="inline mr-1" />}
                                Desconectar
                            </button>
                        )}
                    </div>
                </div>

                {/* Instance Info */}
                {connection?.exists && !loading && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                                <span>
                                    <strong className="text-slate-700">Instância:</strong>{' '}
                                    <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{connection.instance}</code>
                                </span>
                                {connection.created_at && (
                                    <span>
                                        <strong className="text-slate-700">Criado em:</strong>{' '}
                                        {new Date(connection.created_at).toLocaleString('pt-BR')}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    checkConnection();
                                    setToast({ message: 'Verificando status...', type: 'info' });
                                }}
                                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors"
                                title="Atualizar Status"
                            >
                                <RefreshCw size={12} />
                                Atualizar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* QR Code Section */}
            {needsQR && (
                <div className="px-6 py-6 bg-slate-50 border-t border-slate-100">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <QrCode size={18} className="text-emerald-600" />
                            Escaneie o QR Code com seu WhatsApp
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <img
                                src={getQRSrc()}
                                alt="QR Code WhatsApp"
                                className="w-56 h-56 object-contain"
                            />
                        </div>
                        <button
                            onClick={handleRefreshQR}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Atualizar QR Code
                        </button>
                        <p className="text-[11px] text-slate-400 text-center max-w-sm">
                            Abra o WhatsApp no seu celular → Menu → Dispositivos Conectados → Conectar Dispositivo
                        </p>
                    </div>
                </div>
            )}

            {/* Connected footer */}
            {connection?.exists && connection.live_state === 'open' && (
                <div className="px-6 py-4 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-700">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span className="font-bold">WhatsApp conectado e pronto para enviar mensagens</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefreshCw size={12} className="text-emerald-500" />
                        <span>Polling automático ativo (6s)</span>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default WhatsAppConnectionTab;
