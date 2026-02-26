import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Send,
    AlertCircle,
    PartyPopper,
    AlertTriangle,
} from 'lucide-react';

interface CampaignStats {
    id: string;
    name: string;
    status: string;
    created_at: string;
    configuration: any;
    total: number;
    sent: number;
    failed: number;
    pending: number;
}

const REFRESH_INTERVAL = 15000; // 15 segundos

const CampaignMonitor: React.FC = () => {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevCampaignsRef = useRef<CampaignStats[]>([]);

    const fetchCampaigns = useCallback(async () => {
        if (!user) return;

        try {
            // Buscar campanhas do usuário
            const { data: campaignsData, error: campError } = await supabase
                .from('campaigns')
                .select('id, name, status, created_at, configuration')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (campError || !campaignsData || campaignsData.length === 0) {
                setCampaigns([]);
                setLoading(false);
                return;
            }

            // Buscar stats de mensagens para cada campanha
            const campaignIds = campaignsData.map(c => c.id);

            const { data: messagesData, error: msgError } = await supabase
                .from('campaign_messages')
                .select('campaign_id, status')
                .in('campaign_id', campaignIds);

            if (msgError) {
                console.error('Erro ao buscar messages:', msgError);
            }

            // Agregar contagens
            const statsMap: Record<string, { total: number; sent: number; failed: number; pending: number }> = {};
            campaignIds.forEach(id => {
                statsMap[id] = { total: 0, sent: 0, failed: 0, pending: 0 };
            });

            if (messagesData) {
                messagesData.forEach((msg: any) => {
                    const s = statsMap[msg.campaign_id];
                    if (s) {
                        s.total++;
                        if (msg.status === 'sent') s.sent++;
                        else if (msg.status === 'failed') s.failed++;
                        else s.pending++;
                    }
                });
            }

            const result: CampaignStats[] = campaignsData.map(c => {
                const stats = statsMap[c.id];

                // Se a campanha foi marcada como 'completed' pelo n8n,
                // qualquer pendente restante é considerado como falha
                if (c.status === 'completed' && stats.pending > 0) {
                    stats.failed += stats.pending;
                    stats.pending = 0;
                }

                // Heurística: se a campanha tem mais de 30min e todos os leads foram processados 
                // OU se não houve mudança nos pendentes por muito tempo, marcar como finalizada
                const ageMinutes = (Date.now() - new Date(c.created_at).getTime()) / 60000;
                const processed = stats.sent + stats.failed;

                // Se campanha tem msgs e todos foram processados (sem pendentes), 
                // marcar campanha como completed se ainda não estiver
                if (stats.total > 0 && stats.pending === 0 && processed >= stats.total && c.status === 'active') {
                    // Atualizar status no banco em background
                    supabase
                        .from('campaigns')
                        .update({ status: 'completed' })
                        .eq('id', c.id)
                        .then(() => { });
                    c.status = 'completed';
                }

                return {
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    created_at: c.created_at,
                    configuration: c.configuration,
                    ...stats,
                };
            });

            setCampaigns(result);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Erro ao buscar campanhas:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial load
    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    // Auto-refresh a cada 15 segundos
    useEffect(() => {
        intervalRef.current = setInterval(fetchCampaigns, REFRESH_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchCampaigns]);

    const getProgressPercent = (c: CampaignStats) => {
        if (c.total === 0) return 0;
        return Math.round(((c.sent + c.failed) / c.total) * 100);
    };

    const getCampaignStatusInfo = (c: CampaignStats) => {
        if (c.total === 0) return { label: 'Sem envios', color: 'text-slate-400', bg: 'bg-slate-100', dotColor: 'bg-slate-300', icon: AlertCircle };

        const processed = c.sent + c.failed;
        const isComplete = processed >= c.total || c.status === 'completed';

        if (isComplete && c.failed === 0 && c.pending === 0) {
            return { label: 'Finalizada ✓', color: 'text-emerald-700', bg: 'bg-emerald-50', dotColor: 'bg-emerald-500', icon: CheckCircle2 };
        }
        if (isComplete && c.failed > 0) {
            return { label: `Finalizada • ${c.failed} falha${c.failed !== 1 ? 's' : ''}`, color: 'text-amber-700', bg: 'bg-amber-50', dotColor: 'bg-amber-500', icon: AlertTriangle };
        }
        if (c.pending > 0 && processed > 0) {
            return { label: 'Enviando...', color: 'text-blue-700', bg: 'bg-blue-50', dotColor: 'bg-blue-500 animate-pulse', icon: Send };
        }
        if (c.pending > 0 && processed === 0) {
            return { label: 'Aguardando', color: 'text-blue-700', bg: 'bg-blue-50', dotColor: 'bg-blue-500 animate-pulse', icon: Clock };
        }
        return { label: 'Em andamento', color: 'text-blue-700', bg: 'bg-blue-50', dotColor: 'bg-blue-500 animate-pulse', icon: Send };
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const getCampaignTypeLabel = (config: any) => {
        const t = config?.campaignType;
        if (t === 'simple') return 'Simples';
        if (t === 'ai') return 'IA';
        if (t === 'multi-ai') return 'Multi-IA';
        return '—';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 text-slate-400">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm font-medium">Carregando campanhas...</span>
                </div>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return null; // Não mostrar nada se não tem campanhas
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                        <Activity size={16} className="text-yellow-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-800">Monitoramento de Campanhas</h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                            Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Auto-refresh 15s
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fetchCampaigns(); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Atualizar agora"
                    >
                        <RefreshCw size={14} />
                    </button>
                    {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            {/* Campaigns List */}
            {expanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {campaigns.map((c) => {
                        const progress = getProgressPercent(c);
                        const statusInfo = getCampaignStatusInfo(c);
                        const processed = c.sent + c.failed;
                        const isFinished = processed >= c.total && c.total > 0;

                        return (
                            <div key={c.id} className={`px-6 py-4 transition-colors ${isFinished ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}>
                                {/* Row 1: Name + Status */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-800 truncate">{c.name}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {getCampaignTypeLabel(c.configuration)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.color}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                                            {statusInfo.label}
                                        </div>
                                        <span className="text-[10px] text-slate-300">{formatDate(c.created_at)}</span>
                                    </div>
                                </div>

                                {/* Row 2: Progress Bar */}
                                {c.total > 0 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full flex">
                                                    <div
                                                        className="bg-emerald-500 transition-all duration-500"
                                                        style={{ width: `${c.total > 0 ? (c.sent / c.total) * 100 : 0}%` }}
                                                    />
                                                    <div
                                                        className="bg-red-400 transition-all duration-500"
                                                        style={{ width: `${c.total > 0 ? (c.failed / c.total) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 tabular-nums w-10 text-right">
                                                {progress}%
                                            </span>
                                        </div>

                                        {/* Row 3: Stats */}
                                        <div className="flex items-center gap-4 text-[11px] font-medium">
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <Send size={11} />
                                                <span className="font-bold text-slate-700">{processed}</span>/{c.total} enviados
                                            </span>
                                            <span className="flex items-center gap-1 text-emerald-600">
                                                <CheckCircle2 size={11} />
                                                <span className="font-bold">{c.sent}</span> sucesso
                                            </span>
                                            {c.failed > 0 && (
                                                <span className="flex items-center gap-1 text-red-500">
                                                    <XCircle size={11} />
                                                    <span className="font-bold">{c.failed}</span> falha{c.failed !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {c.pending > 0 && (
                                                <span className="flex items-center gap-1 text-slate-400">
                                                    <Clock size={11} />
                                                    <span className="font-bold">{c.pending}</span> pendente{c.pending !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Finished Banner */}
                                        {isFinished && (
                                            <div className={`mt-3 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 ${c.failed === 0
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}>
                                                {c.failed === 0 ? (
                                                    <>
                                                        <PartyPopper size={14} />
                                                        Campanha finalizada com sucesso! Todos os {c.sent} leads foram enviados.
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertTriangle size={14} />
                                                        Campanha finalizada. {c.sent} enviado{c.sent !== 1 ? 's' : ''} com sucesso, {c.failed} com falha.
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {c.total === 0 && (
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <AlertCircle size={11} />
                                        Nenhum envio registrado para esta campanha.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CampaignMonitor;
