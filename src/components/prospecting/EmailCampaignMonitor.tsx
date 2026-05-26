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
    StopCircle,
    Trash2,
    Ban,
    Eye,
    X,
    Play
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
    invalid: number;
    pending: number;
}

const REFRESH_INTERVAL = 30000; // 30 segundos

interface EmailCampaignMonitorProps {
    initialExpanded?: boolean;
}

const EmailCampaignMonitor: React.FC<EmailCampaignMonitorProps> = ({ initialExpanded = false }) => {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(initialExpanded);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [detailsCampaign, setDetailsCampaign] = useState<CampaignStats | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const CAMPAIGNS_PER_PAGE = 4;

    const fetchCampaigns = useCallback(async () => {
        if (!user) return;

        try {
            // Passo 1: Buscar TODAS as campanhas de email do usuário
            const { data: campaignsData } = await supabase
                .from('campaigns')
                .select('*')
                .eq('user_id', user.id)
                .eq('type', 'email_marketing')
                .order('created_at', { ascending: false });

            if (!campaignsData || campaignsData.length === 0) {
                setCampaigns([]);
                setLoading(false);
                return;
            }

            const campaignIds = campaignsData.map(c => c.id);

            // Realiza a busca paginada das mensagens das campanhas
            let messagesData: any[] = [];
            let from = 0;
            const step = 1000;
            
            while (true) {
                const { data, error: msgError } = await supabase
                    .from('campaign_messages')
                    .select('campaign_id, status')
                    .in('campaign_id', campaignIds)
                    .range(from, from + step - 1);

                if (msgError) {
                    console.error('Erro ao buscar messages:', msgError);
                    break;
                }

                if (data) {
                    messagesData = [...messagesData, ...data];
                }

                if (!data || data.length < step) {
                    break;
                }
                from += step;
            }

            const statsMap: Record<string, { total: number; sent: number; failed: number; invalid: number; pending: number }> = {};
            campaignIds.forEach(id => {
                const camp = campaignsData.find(c => c.id === id);
                const configTotal = camp?.configuration?.selectedLeadsCount || camp?.configuration?.fullSelectedLeads?.length || camp?.configuration?.totalLeads || 0;
                statsMap[id] = { total: configTotal, sent: 0, failed: 0, invalid: 0, pending: 0 };
            });

            if (messagesData) {
                messagesData.forEach((msg: any) => {
                    const s = statsMap[msg.campaign_id];
                    if (s) {
                        if (msg.status === 'sent') s.sent++;
                        else if (msg.status === 'failed') s.failed++;
                        else if (msg.status === 'invalid') s.invalid++;
                    }
                });
            }

            // Calcula os pendentes reais
            Object.values(statsMap).forEach(s => {
                const processed = s.sent + s.failed + s.invalid;
                if (processed > s.total) {
                    s.total = processed;
                }
                s.pending = Math.max(0, s.total - processed);
            });

            const result: CampaignStats[] = campaignsData.map(c => {
                const stats = statsMap[c.id];

                if ((c.status === 'completed' || c.status === 'cancelled') && stats.pending > 0) {
                    stats.failed += stats.pending;
                    stats.pending = 0;
                }

                const processed = stats.sent + stats.failed + stats.invalid;

                if (stats.total > 0 && stats.pending === 0 && processed >= stats.total && c.status === 'active') {
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
            console.error('Erro ao buscar campanhas de email:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial load
    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    // Auto-refresh
    useEffect(() => {
        intervalRef.current = setInterval(fetchCampaigns, REFRESH_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchCampaigns]);

    const handleStopCampaign = async (campaignId: string) => {
        setActionLoading(campaignId);
        try {
            await supabase
                .from('campaigns')
                .update({ status: 'cancelled' })
                .eq('id', campaignId)
                .eq('user_id', user?.id);

            await supabase
                .from('campaign_messages')
                .update({ status: 'failed', error_message: 'Campanha cancelada pelo usuário' })
                .eq('campaign_id', campaignId)
                .eq('status', 'pending');

            await fetchCampaigns();
        } catch (err) {
            console.error('Erro ao parar campanha:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        setActionLoading(campaignId);
        try {
            await supabase
                .from('campaigns')
                .delete()
                .eq('id', campaignId)
                .eq('user_id', user?.id);

            setConfirmDelete(null);
            await fetchCampaigns();
        } catch (err) {
            console.error('Erro ao excluir campanha:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleStartCampaign = async (campaign: CampaignStats) => {
        setActionLoading(campaign.id);
        try {
            // 1. Buscar a campanha e suas configurações
            const { data: dbData, error: dbError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaign.id)
                .eq('user_id', user?.id)
                .single();

            if (dbError || !dbData) {
                alert('Erro de segurança: Campanha não encontrada ou não pertence a este usuário.');
                return;
            }

            const config = dbData.configuration;

            // 2. Buscar a conexão de e-mail correspondente
            const { data: emailConn, error: connError } = await supabase
                .from('email_connections')
                .select('*')
                .eq('id', config.emailConnectionId || config.emailConnection?.id)
                .single();

            if (connError || !emailConn) {
                alert('Conexão de e-mail não encontrada. Verifique se a conta de e-mail remetente ainda existe.');
                return;
            }

            // 3. Converter anexo, se houver
            let fileBase64 = null;
            if (config.mediaUrl) {
                try {
                    const response = await fetch(config.mediaUrl);
                    const blob = await response.blob();
                    fileBase64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = (error) => reject(error);
                    });
                } catch (err) {
                    console.error('Erro ao converter anexo:', err);
                }
            }

            // 4. Preparar payload para o webhook de e-mail marketing
            const payload = {
                campaignType: 'email_marketing',
                name: campaign.name,
                subject: config.subject,
                minDelay: config.minDelay,
                maxDelay: config.maxDelay,
                messageText: config.messageText,
                selectedLeads: config.fullSelectedLeads || [],
                clientId: config.clientId,
                folderId: config.folderId || null,
                folderName: config.folderName || 'Todas as Pastas',
                userId: user?.id || '',
                campaignId: campaign.id,
                emailConnection: emailConn,
                isAutomated: config.isAutomated || false,
                scheduledAt: config.scheduledAt || null,
                file: fileBase64,
                mimetype: config.mediaType || null,
                fileName: config.mediaName || null,
            };

            // 5. Atualizar o status no banco local para active
            await supabase
                .from('campaigns')
                .update({ status: 'active' })
                .eq('id', campaign.id)
                .eq('user_id', user?.id);

            // 6. Disparar webhook do e-mail
            fetch('https://nexus360.infra-conectamarketing.site/webhook/e2188232-3c9d-4a7c-a223-f207f5117f81', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }).catch(e => console.log('Email webhook dispatched error (CORS):', e));

            await fetchCampaigns();
        } catch (error) {
            console.error('Erro ao iniciar campanha de e-mail:', error);
            alert('Houve um erro ao iniciar a campanha.');
        } finally {
            setActionLoading(null);
        }
    };

    const getProgressPercent = (c: CampaignStats) => {
        if (c.total === 0) return 0;
        return Math.round(((c.sent + c.failed) / c.total) * 100);
    };

    const getCampaignStatusInfo = (c: CampaignStats) => {
        if (c.status === 'cancelled') {
            return { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-50', dotColor: 'bg-red-500' };
        }
        if (c.status === 'inactive') {
            return { label: 'Pendente', color: 'text-purple-700', bg: 'bg-purple-50', dotColor: 'bg-purple-500' };
        }
        if (c.status === 'scheduled') {
            const dateStr = c.configuration?.scheduledAt;
            const formattedDate = dateStr ? new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            return { label: `Agendada: ${formattedDate}`, color: 'text-indigo-700', bg: 'bg-indigo-50', dotColor: 'bg-indigo-500' };
        }

        const processed = c.sent + c.failed;
        const isComplete = (processed >= c.total && c.total > 0) || c.status === 'completed';

        if (c.status === 'active' || (processed > 0 && !isComplete)) {
            if (c.pending > 0 && processed > 0) {
                return { label: 'Enviando...', color: 'text-blue-700', bg: 'bg-blue-50', dotColor: 'bg-blue-500 animate-pulse' };
            }
            if (c.pending > 0 && processed === 0) {
                return { label: 'Aguardando', color: 'text-blue-700', bg: 'bg-blue-50', dotColor: 'bg-blue-500 animate-pulse' };
            }
            return { label: 'Em andamento', color: 'text-blue-700', bg: 'bg-blue-50', dotColor: 'bg-blue-500 animate-pulse' };
        }

        if (isComplete && c.total > 0) {
            if (c.failed === 0 && c.pending === 0) {
                return { label: 'Finalizada ✓', color: 'text-emerald-700', bg: 'bg-emerald-50', dotColor: 'bg-emerald-500' };
            }
            if (c.failed > 0) {
                return { label: `Finalizada • ${c.failed} falha${c.failed !== 1 ? 's' : ''}`, color: 'text-amber-700', bg: 'bg-amber-50', dotColor: 'bg-amber-500' };
            }
        }

        if (c.total === 0) return { label: 'Sem envios', color: 'text-slate-400', bg: 'bg-slate-100', dotColor: 'bg-slate-300' };

        return { label: 'Em andamento', color: 'text-blue-700', bg: 'bg-blue-50', dotColor: 'bg-blue-500 animate-pulse' };
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const isActive = (c: CampaignStats) => {
        return c.status === 'active' && c.total > 0 && c.pending > 0;
    };

    const isFinished = (c: CampaignStats) => {
        const processed = c.sent + c.failed;
        return (processed >= c.total && c.total > 0) || c.status === 'completed' || c.status === 'cancelled';
    };

    const totalPages = Math.ceil(campaigns.length / CAMPAIGNS_PER_PAGE);
    
    useEffect(() => {
        if (campaigns.length > 0 && totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [campaigns.length, currentPage, totalPages]);

    const paginatedCampaigns = campaigns.slice((currentPage - 1) * CAMPAIGNS_PER_PAGE, currentPage * CAMPAIGNS_PER_PAGE);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 text-slate-400">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm font-medium">Carregando campanhas de e-mail...</span>
                </div>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return null;
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
                            Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Auto-refresh 30s
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); fetchCampaigns(); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Atualizar agora"
                    >
                        <RefreshCw size={14} />
                    </span>
                    {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            {/* Campaigns List */}
            {expanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {paginatedCampaigns.map((c) => {
                        const progress = getProgressPercent(c);
                        const statusInfo = getCampaignStatusInfo(c);
                        const processed = c.sent + c.failed;
                        const finished = isFinished(c);
                        const active = isActive(c);

                        return (
                            <div key={c.id} className={`px-6 py-4 transition-colors ${finished ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}>
                                {/* Row 1: Name + Status + Actions */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-800 truncate">{c.name}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            E-mail
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
                                                    <div
                                                        className="bg-amber-400 transition-all duration-500"
                                                        style={{ width: `${c.total > 0 ? (c.invalid / c.total) * 100 : 0}%` }}
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
                                            {c.invalid > 0 && (
                                                <span className="flex items-center gap-1 text-amber-500">
                                                    <AlertTriangle size={11} />
                                                    <span className="font-bold">{c.invalid}</span> inválido{c.invalid !== 1 ? 's' : ''}
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
                                        {finished && c.status !== 'cancelled' && (
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

                                        {/* Cancelled Banner */}
                                        {c.status === 'cancelled' && (
                                            <div className="mt-3 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                                                <Ban size={14} />
                                                Campanha cancelada. {c.sent} enviado{c.sent !== 1 ? 's' : ''} antes do cancelamento{c.failed > 0 ? `, ${c.failed} com falha` : ''}.
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

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                                    {/* Ver Detalhes */}
                                    <button
                                        type="button"
                                        onClick={() => setDetailsCampaign(c)}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Eye size={12} />
                                        Ver Detalhes
                                    </button>

                                    {/* Iniciar Campanha - só mostra se inativa */}
                                    {c.status === 'inactive' && (
                                        <button
                                            type="button"
                                            onClick={() => handleStartCampaign(c)}
                                            disabled={actionLoading === c.id}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === c.id ? (
                                                <RefreshCw size={12} className="animate-spin" />
                                            ) : (
                                                <Play size={12} />
                                            )}
                                            Iniciar Campanha
                                        </button>
                                    )}

                                    {/* Parar - só mostra se campanha está ativa com pendentes */}
                                    {active && (
                                        <button
                                            type="button"
                                            onClick={() => handleStopCampaign(c.id)}
                                            disabled={actionLoading === c.id}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === c.id ? (
                                                <RefreshCw size={12} className="animate-spin" />
                                            ) : (
                                                <StopCircle size={12} />
                                            )}
                                            Parar Campanha
                                        </button>
                                    )}

                                    {/* Excluir */}
                                    {confirmDelete === c.id ? (
                                        <div className="flex items-center gap-1 bg-red-50 border border-red-100 rounded-lg p-0.5 shrink-0">
                                            <span className="text-[10px] font-bold text-red-600 px-2">Tem certeza?</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCampaign(c.id)}
                                                className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded transition-colors"
                                            >
                                                Sim
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDelete(null)}
                                                className="text-[10px] font-bold text-slate-500 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                                            >
                                                Não
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(c.id)}
                                            disabled={actionLoading === c.id}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0 ml-auto"
                                        >
                                            <Trash2 size={12} />
                                            Excluir
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {expanded && totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Página {currentPage} de {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded transition-colors"
                        >
                            Anterior
                        </button>
                        <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded transition-colors"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {detailsCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Activity className="text-yellow-500" size={16} />
                                Detalhes da Campanha
                            </h3>
                            <button
                                type="button"
                                onClick={() => setDetailsCampaign(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome da Campanha</span>
                                <p className="text-sm font-bold text-slate-800">{detailsCampaign.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assunto do E-mail</span>
                                    <p className="text-xs font-semibold text-slate-700">{detailsCampaign.configuration?.subject || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Criada em</span>
                                    <p className="text-xs font-semibold text-slate-700">{formatDate(detailsCampaign.created_at)}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delay Mínimo</span>
                                    <p className="text-xs font-semibold text-slate-700">{detailsCampaign.configuration?.minDelay}s</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delay Máximo</span>
                                    <p className="text-xs font-semibold text-slate-700">{detailsCampaign.configuration?.maxDelay}s</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total de Leads</span>
                                    <p className="text-xs font-bold text-slate-800">{detailsCampaign.total}</p>
                                </div>
                            </div>
                            {detailsCampaign.configuration?.mediaName && (
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Anexo</span>
                                    <p className="text-xs font-semibold text-slate-700 truncate">{detailsCampaign.configuration.mediaName}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Conteúdo do E-mail</span>
                                <div className="mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 font-medium whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                                    {detailsCampaign.configuration?.messageText || '—'}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setDetailsCampaign(null)}
                                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors shadow-sm"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailCampaignMonitor;
