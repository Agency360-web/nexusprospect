import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, AlertCircle, CheckCircle, Clock, Search, RefreshCw, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DispatchCampaign } from '../types/dispatch';

const Disparos: React.FC = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<DispatchCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

    // Fetch campaigns
    const fetchCampaigns = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch('http://localhost:3001/api/campaigns');
            if (response.ok) {
                const data = await response.json();
                setCampaigns(data);

                // Check if any is running to set active monitor
                const running = data.find((c: DispatchCampaign) => c.status === 'em_andamento');
                if (running) {
                    setActiveCampaignId(running.id);
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
        const interval = setInterval(() => fetchCampaigns(true), 10000); // Poll every 10s silently
        return () => clearInterval(interval);
    }, []);

    const handleStatusAction = async (id: string, action: 'start' | 'pause') => {
        try {
            await fetch(`http://localhost:3001/api/campaigns/${id}/${action}`, { method: 'POST' });
            await fetch(`http://localhost:3001/api/campaigns/${id}/${action}`, { method: 'POST' });
            fetchCampaigns(true); // Refresh silently after action
        } catch (error) {
            console.error(`Failed to ${action} campaign`, error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'em_andamento': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'concluido': return 'text-green-600 bg-green-50 border-green-200';
            case 'erro': return 'text-red-600 bg-red-50 border-red-200';
            case 'pausado': return 'text-amber-600 bg-amber-50 border-amber-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getProgress = (c: DispatchCampaign) => {
        if (!c.totalLeads) return 0;
        const processed = (c.sentCustom || 0) + (c.sentDefault || 0) + (c.skipped || 0) + (c.errors || 0);
        return Math.round((processed / c.totalLeads) * 100);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
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

            {/* Metrics Cards could go here */}

            {/* Active Campaign Monitor (Simplified) */}
            {activeCampaignId && (
                <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-slate-900">Campanha em Andamento</h3>
                        <span className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                            <RefreshCw size={14} className="animate-spin" />
                            Processando
                        </span>
                    </div>
                    {/* Only showing general active state for now. Detailed monitor can be in detail view or expanded here */}
                    <p className="text-slate-600 mb-2">
                        O sistema está processando leads em segundo plano. Status atualizado automaticamente.
                    </p>
                </div>
            )}

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
                                    <th className="px-6 py-4">Envios (IA / Padrão)</th>
                                    <th className="px-6 py-4">Criado em</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{campaign.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)} capitalize`}>
                                                {campaign.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${getProgress(campaign)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-500">{getProgress(campaign)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <span className="text-green-600 font-medium">{campaign.sentCustom}</span> / <span className="text-slate-500">{campaign.sentDefault}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(campaign.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {campaign.status === 'draft' || campaign.status === 'pausado' ? (
                                                <button
                                                    onClick={() => handleStatusAction(campaign.id, 'start')}
                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                    title="Iniciar"
                                                >
                                                    <Play size={18} />
                                                </button>
                                            ) : campaign.status === 'em_andamento' ? (
                                                <button
                                                    onClick={() => handleStatusAction(campaign.id, 'pause')}
                                                    className="text-amber-600 hover:text-amber-800 p-1"
                                                    title="Pausar"
                                                >
                                                    <Pause size={18} />
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Disparos;
