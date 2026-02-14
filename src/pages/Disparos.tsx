import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, AlertCircle, CheckCircle, Clock, Search, RefreshCw, Zap, Trash2, Copy, Edit, MoreHorizontal, Calendar, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { DispatchCampaign } from '../types/dispatch';
import EditCampaignModal from './Disparos/EditCampaignModal';

const Disparos: React.FC = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<DispatchCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<any>(null);

    // Fetch campaigns
    const fetchCampaigns = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const { data, error } = await supabase
                .from('campanhas_disparo')
                .select('*')
                .order('criado_em', { ascending: false });

            if (error) throw error;

            if (data) {
                const mappedCampaigns: DispatchCampaign[] = data.map(c => ({
                    id: c.id,
                    userId: c.usuario_id,
                    name: c.nome_campanha,
                    status: c.status,
                    totalLeads: c.total_leads || 0,
                    sentCustom: c.enviados_personalizados || 0,
                    sentDefault: c.enviados_padrao || 0,
                    skipped: c.pulados || 0,
                    errors: c.erros || 0,
                    delayMinSeconds: c.delay_min_segundos,
                    delayMaxSeconds: c.delay_max_segundos,
                    defaultMessage: c.mensagem_padrao,
                    whatsappInstance: c.instancia_whatsapp,
                    createdAt: c.criado_em,
                    updatedAt: c.atualizado_em,
                    scheduledAt: c.agendado_para
                }));

                setCampaigns(mappedCampaigns);

                // Check if any is running to set active monitor
                const running = mappedCampaigns.find(c => c.status === 'em_andamento');
                if (running) {
                    setActiveCampaignId(running.id);
                } else {
                    setActiveCampaignId(null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
        // Polling every 3 seconds for real-time updates
        const interval = setInterval(() => {
            fetchCampaigns(true);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const startBackendCampaign = async (campaignId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

            await fetch(`${backendUrl}/api/campaigns/${campaignId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        } catch (e) {
            console.error('Backend trigger failed:', e);
        }
    };

    const handleStatusAction = async (id: string, action: 'start' | 'pause') => {
        try {
            const newStatus = action === 'start' ? 'em_andamento' : 'pausado';

            const { error } = await supabase
                .from('campanhas_disparo')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            if (action === 'start') {
                startBackendCampaign(id);
            }

            fetchCampaigns(true);
        } catch (error) {
            console.error(`Failed to ${action} campaign`, error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
        try {
            // Delete leads first (cascade usually handles this but safety first)
            await supabase.from('disparo_leads').delete().eq('campanha_id', id);
            await supabase.from('campanhas_disparo').delete().eq('id', id);
            fetchCampaigns(true);
        } catch (e) {
            console.error('Delete failed', e);
            alert('Erro ao excluir campanha.');
        }
    };

    const handleDuplicate = async (campaign: DispatchCampaign) => {
        try {
            // 1. Create new campaign
            const { data: newCampaign, error: campError } = await supabase
                .from('campanhas_disparo')
                .insert({
                    usuario_id: campaign.userId,
                    nome_campanha: `${campaign.name} (Cópia)`,
                    mensagem_padrao: campaign.defaultMessage,
                    delay_min_segundos: campaign.delayMinSeconds,
                    delay_max_segundos: campaign.delayMaxSeconds,
                    instancia_whatsapp: campaign.whatsappInstance,
                    total_leads: 0, // Will update after leads copy
                    status: 'draft'
                })
                .select()
                .single();

            if (campError) throw campError;

            // 2. Fetch original leads
            const { data: leads } = await supabase
                .from('disparo_leads')
                .select('*')
                .eq('campanha_id', campaign.id);

            if (leads && leads.length > 0) {
                // 3. Insert new leads
                const newLeads = leads.map(l => ({
                    campanha_id: newCampaign.id,
                    nome_lead: l.nome_lead,
                    telefone: l.telefone,
                    empresa: l.empresa,
                    site: l.site,
                    status: 'pendente'
                }));

                await supabase.from('disparo_leads').insert(newLeads);

                // Update total
                await supabase
                    .from('campanhas_disparo')
                    .update({ total_leads: newLeads.length })
                    .eq('id', newCampaign.id);
            }

            fetchCampaigns(true);
            alert('Campanha duplicada com sucesso!');
        } catch (e) {
            console.error('Duplicate failed', e);
            alert('Erro ao duplicar campanha.');
        }
    };

    const handleEdit = (campaign: DispatchCampaign) => {
        // Map back to DB format expected by modal
        setEditingCampaign({
            id: campaign.id,
            nome_campanha: campaign.name,
            delay_min_segundos: campaign.delayMinSeconds,
            delay_max_segundos: campaign.delayMaxSeconds
        });
        setIsEditModalOpen(true);
    };

    const getStatusBadge = (status: string, scheduledAt?: string) => {
        if (status === 'agendado' && scheduledAt) {
            const date = new Date(scheduledAt);
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-purple-600 bg-purple-50 border-purple-200">
                    <Calendar size={12} />
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            );
        }

        switch (status) {
            case 'em_andamento':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-blue-600 bg-blue-50 border-blue-200"><RefreshCw size={12} className="animate-spin" /> Em Andamento</span>;
            case 'concluido':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-green-600 bg-green-50 border-green-200"><CheckCircle size={12} /> Concluído</span>;
            case 'erro':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-red-600 bg-red-50 border-red-200"><AlertCircle size={12} /> Erro</span>;
            case 'pausado':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-amber-600 bg-amber-50 border-amber-200"><Pause size={12} /> Pausado</span>;
            case 'agendado':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-purple-600 bg-purple-50 border-purple-200"><Calendar size={12} /> Agendado</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border text-slate-600 bg-slate-50 border-slate-200">Rascunho</span>;
        }
    };

    const calculateStats = (c: DispatchCampaign) => {
        const processed = (c.sentCustom || 0) + (c.sentDefault || 0) + (c.skipped || 0) + (c.errors || 0);
        const pending = Math.max(0, (c.totalLeads || 0) - processed);
        const success = (c.sentCustom || 0) + (c.sentDefault || 0);
        const progress = c.totalLeads ? Math.round((processed / c.totalLeads) * 100) : 0;

        return { processed, pending, success, progress, errors: c.errors || 0 };
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <EditCampaignModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                campaign={editingCampaign}
                onUpdate={() => fetchCampaigns(true)}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight flex flex-col md:flex-row items-center gap-3">
                        <Zap className="text-yellow-500" size={32} />
                        Disparos Inteligentes
                    </h1>
                    <p className="text-slate-300 font-medium text-sm md:text-base">Gerencie campanhas de prospecção via WhatsApp com IA.</p>
                </div>
                <div className="relative z-10 w-full md:w-auto">
                    <button
                        onClick={() => navigate('/disparos/new')}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95 text-sm md:text-base"
                    >
                        <Plus size={20} />
                        <span>Nova Campanha</span>
                    </button>
                </div>
            </div>

            {/* Campaigns List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">Histórico de Campanhas</h2>
                    <button onClick={() => fetchCampaigns()} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <RefreshCw size={18} />
                    </button>
                </div>

                {loading && campaigns.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Carregando campanhas...</div>
                ) : campaigns.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <Zap size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma campanha encontrada</h3>
                        <p className="max-w-md mx-auto mb-6">Comece criando sua primeira campanha de disparo inteligente.</p>
                        <button
                            onClick={() => navigate('/disparos/new')}
                            className="text-slate-700 font-medium hover:underline"
                        >
                            Criar campanha agora
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Progresso</th>
                                    <th className="px-6 py-4 text-center">Enviados</th>
                                    <th className="px-6 py-4 text-center">Falhas</th>
                                    <th className="px-6 py-4 text-center">Pendentes</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {campaigns.map((campaign) => {
                                    const stats = calculateStats(campaign);
                                    return (
                                        <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{campaign.name}</div>
                                                <div className="text-xs text-slate-400">{new Date(campaign.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(campaign.status, campaign.scheduledAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                                        <span>{stats.processed} / {campaign.totalLeads}</span>
                                                        <span>{stats.progress}%</span>
                                                    </div>
                                                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${campaign.status === 'em_andamento' ? 'bg-blue-500' :
                                                                    campaign.status === 'concluido' ? 'bg-green-500' : 'bg-slate-400'
                                                                }`}
                                                            style={{ width: `${stats.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-green-600">
                                                {stats.success}
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-red-500">
                                                {stats.errors}
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-slate-400">
                                                {stats.pending}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {campaign.status === 'draft' || campaign.status === 'pausado' || campaign.status === 'agendado' ? (
                                                        <button
                                                            onClick={() => handleStatusAction(campaign.id, 'start')}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Iniciar"
                                                        >
                                                            <Play size={16} />
                                                        </button>
                                                    ) : campaign.status === 'em_andamento' ? (
                                                        <button
                                                            onClick={() => handleStatusAction(campaign.id, 'pause')}
                                                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Pausar"
                                                        >
                                                            <Pause size={16} />
                                                        </button>
                                                    ) : null}

                                                    <button
                                                        onClick={() => handleDuplicate(campaign)}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Duplicar"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(campaign)}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(campaign.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Disparos;
