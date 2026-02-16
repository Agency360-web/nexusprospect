import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Smartphone, Trash2, QrCode, Wifi, WifiOff, Plus } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConnectionData {
    id?: number;
    user_id?: string;
    instance: string;
    status: string;
    live_state: string;
    qrcode: string | null;
    created_at: string;
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

// ─── Connection Card Component ───────────────────────────────────────────────
interface ConnectionCardProps {
    connection: ConnectionData;
    onDelete: (instanceName: string) => void;
    onRefreshQR: (instanceName: string) => void;
    onRefreshStatus: () => void;
    actionLoading: boolean;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ connection, onDelete, onRefreshQR, onRefreshStatus, actionLoading }) => {
    const state = connection.live_state;
    const isConnected = state === 'open';
    const isConnecting = state === 'connecting';

    // Determine if we need to show QR code
    const needsQR = (state === 'close' || state === 'connecting' || state === 'pending') && connection.qrcode;

    const getQRSrc = () => {
        if (!connection.qrcode) return '';
        const src = connection.qrcode;
        if (src.startsWith('data:image')) return src;
        return `data:image/png;base64,${src}`;
    };

    const renderBadge = () => {
        if (isConnected) {
            return (
                <div className="flex items-center gap-2 text-white bg-emerald-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    <Wifi size={14} />
                    Conectado
                </div>
            );
        } else if (isConnecting) {
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

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row gap-4 p-4 transition-all hover:border-slate-300">
            {/* Left Status Area */}
            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-400">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                {connection.instance}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                Criado em: {new Date(connection.created_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                    </div>
                    <div>{renderBadge()}</div>
                </div>

                {/* QR Code Section */}
                {needsQR && !isConnected && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="text-xs font-bold text-slate-500 text-center mb-1">Escaneie para conectar</div>
                        <img
                            src={getQRSrc()}
                            alt="QR Code WhatsApp"
                            className="w-40 h-40 object-contain border border-slate-100 rounded-lg p-1"
                        />
                        <button
                            onClick={() => onRefreshQR(connection.instance)}
                            disabled={actionLoading}
                            className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                        >
                            {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            Atualizar QR Code
                        </button>
                    </div>
                )}
            </div>

            {/* Right Actions Area */}
            <div className="flex flex-row md:flex-col justify-between md:items-end gap-2 pl-0 md:pl-4 md:border-l md:border-slate-100 mt-2 md:mt-0">
                <button
                    onClick={onRefreshStatus}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Atualizar Status"
                >
                    <RefreshCw size={16} />
                </button>

                <button
                    onClick={() => onDelete(connection.instance)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg font-bold text-xs transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
                >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Desconectar
                </button>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const WhatsAppConnectionTab: React.FC = () => {
    const { user } = useAuth();

    // State
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [connections, setConnections] = useState<ConnectionData[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Polling ref
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Edge Function caller ────────────────────────────────────────────
    const callEdgeFunction = useCallback(async (action: string, method: string = 'GET', body: any = {}, silent: boolean = false): Promise<any> => {
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
                    ...(method !== 'GET' && method !== 'HEAD' ? { body: JSON.stringify(body) } : {}),
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
    }, [user]);

    // ─── Check connection status ─────────────────────────────────────────
    const checkConnections = useCallback(async (silent = false) => {
        if (!user) return;
        if (!silent) setLoading(true);

        try {
            // Using POST for get as it doesn't matter much here, but usually GET is fine.
            // Keeping GET as it logic is simple
            const result = await callEdgeFunction('status', 'GET', {}, silent);
            if (!result) return;

            if (result.ok) {
                if (result.data.connections) {
                    setConnections(result.data.connections);
                } else if (result.data.exists && result.data.instance) {
                    // Fallback for single instance format if API returns old structure
                    setConnections([result.data]);
                } else {
                    setConnections([]);
                }
            } else {
                setConnections([]);
            }
        } catch (error) {
            console.error('Check connection error:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [user, callEdgeFunction]);

    // ─── Create connection ───────────────────────────────────────────────
    const handleCreate = useCallback(async () => {
        if (actionLoading) return;
        if (connections.length >= 4) {
            setToast({ message: 'Limite máximo de 4 conexões atingido.', type: 'error' });
            return;
        }

        setActionLoading(true);

        try {
            const result = await callEdgeFunction('create', 'POST');
            if (result?.ok && result.data?.success) {
                setToast({ message: result.data.message || 'Conexão criada com sucesso!', type: 'success' });
                await checkConnections();
                startPolling(); // Ensure polling is active
            } else {
                setToast({ message: result?.data?.message || 'Erro ao criar conexão.', type: 'error' });
            }
        } finally {
            setActionLoading(false);
        }
    }, [actionLoading, connections.length, callEdgeFunction, checkConnections]);

    // ─── Delete connection ───────────────────────────────────────────────
    const handleDelete = useCallback(async (instanceName: string) => {
        if (!confirm(`Tem certeza que deseja desconectar ${instanceName}?`)) return;

        setActionLoading(true);

        try {
            const result = await callEdgeFunction('delete', 'POST', { instanceName });
            if (result?.ok && result.data?.success) {
                setToast({ message: 'Conexão removida com sucesso.', type: 'success' });
                // Optimistic update
                setConnections(prev => prev.filter(c => c.instance !== instanceName));
                await checkConnections(true);
            } else {
                setToast({ message: result?.data?.message || 'Erro ao remover conexão.', type: 'error' });
                await checkConnections(true);
            }
        } finally {
            setActionLoading(false);
        }
    }, [callEdgeFunction, checkConnections]);

    // ─── Refresh QR Code ─────────────────────────────────────────────────
    const handleRefreshQR = useCallback(async (instanceName: string) => {
        setActionLoading(true);
        try {
            // We pass instanceName in body or query. Edge Function supports both now.
            const result = await callEdgeFunction('qr', 'POST', { instanceName });

            if (result?.ok && result.data?.success) {
                setToast({ message: 'QR Code atualizado.', type: 'success' });
                // Update specific connection in state
                setConnections(prev => prev.map(c =>
                    c.instance === instanceName
                        ? { ...c, qrcode: result.data.qrcode, live_state: 'connecting' }
                        : c
                ));
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
            checkConnections(true); // Silent polling
        }, 6000);
    }, [checkConnections]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    // ─── Initial load & cleanup ──────────────────────────────────────────
    useEffect(() => {
        checkConnections();
        startPolling();
        return () => stopPolling();
    }, [user]);

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* WhatsApp-style gradient accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #25D366, #128C7E, #075E54, #25D366)' }} />

            <div className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
                    <div className="flex items-center gap-5">
                        <div className="p-2 bg-slate-50 rounded-xl shrink-0 border border-slate-100">
                            <WhatsAppIcon />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">WhatsApp</h3>
                            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                Conecte até 4 instâncias do WhatsApp para enviar mensagens.
                            </p>
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <button
                            onClick={handleCreate}
                            disabled={actionLoading || connections.length >= 4}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            <span>Nova Conexão</span>
                            {connections.length > 0 && (
                                <span className="bg-emerald-800 px-1.5 py-0.5 rounded text-[10px] ml-1">{connections.length}/4</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Connections List */}
                <div className="space-y-4">
                    {loading && connections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                            <Loader2 size={24} className="animate-spin text-emerald-500" />
                            <p className="text-sm">Carregando conexões...</p>
                        </div>
                    ) : connections.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                            <div className="p-3 bg-white rounded-full inline-block mb-3 shadow-sm text-slate-400">
                                <Smartphone size={24} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">Nenhuma conexão ativa</h4>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                                Clique no botão acima para conectar seu primeiro WhatsApp.
                            </p>
                        </div>
                    ) : (
                        connections.map((conn) => (
                            <ConnectionCard
                                key={conn.instance}
                                connection={conn}
                                onDelete={handleDelete}
                                onRefreshQR={handleRefreshQR}
                                onRefreshStatus={() => checkConnections(false)}
                                actionLoading={actionLoading}
                            />
                        ))
                    )}
                </div>

                {/* Footer Info */}
                {connections.some(c => c.live_state === 'open') && (
                    <div className="mt-6 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-700">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span className="font-bold">Sistema operando normalmente</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <RefreshCw size={12} className="text-emerald-500" />
                            <span>Polling ativo</span>
                        </div>
                    </div>
                )}
            </div>

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
