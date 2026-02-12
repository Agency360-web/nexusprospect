import React, { useState, useMemo } from 'react';
import {
    TrendingUp,
    Users,
    DollarSign,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Phone,
    Mail,
    Calendar,
    ArrowRight,
    Target,
    Briefcase,
    ChevronDown,
    Clock,
    Star,
    MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Lead {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    value: number;
    stage: 'new' | 'contact' | 'proposal' | 'closed';
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    lastContact?: string;
    notes?: string;
}

// ─── Pipeline Stages Config ──────────────────────────────────────────────────
const PIPELINE_STAGES = [
    {
        id: 'new',
        label: 'Novo Lead',
        color: 'from-blue-500 to-blue-600',
        bgLight: 'bg-blue-50',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-200',
        dotColor: 'bg-blue-500',
        icon: Star,
    },
    {
        id: 'contact',
        label: 'Em Contato',
        color: 'from-amber-500 to-amber-600',
        bgLight: 'bg-amber-50',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-200',
        dotColor: 'bg-amber-500',
        icon: MessageSquare,
    },
    {
        id: 'proposal',
        label: 'Proposta Enviada',
        color: 'from-purple-500 to-purple-600',
        bgLight: 'bg-purple-50',
        textColor: 'text-purple-600',
        borderColor: 'border-purple-200',
        dotColor: 'bg-purple-500',
        icon: Briefcase,
    },
    {
        id: 'closed',
        label: 'Fechado',
        color: 'from-emerald-500 to-emerald-600',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
        dotColor: 'bg-emerald-500',
        icon: Target,
    },
];

// ─── Component ───────────────────────────────────────────────────────────────
const Comercial: React.FC = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [leads] = useState<Lead[]>([]);

    // Stats
    const stats = useMemo(() => {
        const totalLeads = leads.length;
        const totalValue = leads.reduce((sum, l) => sum + l.value, 0);
        const closedDeals = leads.filter(l => l.stage === 'closed').length;
        const conversionRate = totalLeads > 0 ? Math.round((closedDeals / totalLeads) * 100) : 0;
        return { totalLeads, totalValue, closedDeals, conversionRate };
    }, [leads]);

    // Filter leads by stage
    const getLeadsByStage = (stageId: string) => {
        return leads.filter(l => {
            const matchesStage = l.stage === stageId;
            const matchesSearch = searchQuery === '' ||
                l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.company.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStage && matchesSearch;
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-[80px] opacity-15 translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
                        Comercial <span className="inline-block">💼</span>
                    </h1>
                    <p className="text-slate-300 font-medium text-sm md:text-base">
                        Gerencie seu pipeline de leads e acompanhe suas oportunidades.
                    </p>
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row gap-3">
                    <button className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95 text-sm md:text-base">
                        <Plus size={18} />
                        <span>Novo Lead</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total de Leads', value: stats.totalLeads, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Valor do Pipeline', value: formatCurrency(stats.totalValue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Negócios Fechados', value: stats.closedDeals, icon: Target, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Taxa de Conversão', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 ${stat.bg} rounded-xl`}>
                                <stat.icon size={18} className={stat.color} />
                            </div>
                        </div>
                        <p className="text-xl md:text-2xl font-black text-slate-900">{stat.value}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar leads por nome ou empresa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                    <Filter size={16} />
                    Filtrar
                </button>
            </div>

            {/* Kanban Pipeline Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PIPELINE_STAGES.map((stage) => {
                    const stageLeads = getLeadsByStage(stage.id);
                    const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
                    const StageIcon = stage.icon;

                    return (
                        <div key={stage.id} className="flex flex-col">
                            {/* Column Header */}
                            <div className={`flex items-center justify-between p-3 rounded-2xl ${stage.bgLight} border ${stage.borderColor} mb-3`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${stage.dotColor}`}></div>
                                    <span className={`text-sm font-bold ${stage.textColor}`}>{stage.label}</span>
                                    <span className={`text-xs font-bold ${stage.textColor} opacity-60`}>({stageLeads.length})</span>
                                </div>
                                <button className={`p-1 rounded-lg hover:bg-white/50 transition-colors ${stage.textColor}`}>
                                    <Plus size={14} />
                                </button>
                            </div>

                            {/* Cards Area */}
                            <div className="flex-1 space-y-3 min-h-[200px] p-2 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                {stageLeads.length > 0 ? (
                                    stageLeads.map((lead) => (
                                        <div
                                            key={lead.id}
                                            className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-bold text-slate-800 text-sm">{lead.name}</h4>
                                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-lg transition-all">
                                                    <MoreVertical size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-3">{lead.company}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                                    {formatCurrency(lead.value)}
                                                </span>
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Clock size={12} />
                                                    <span className="text-[10px] font-medium">
                                                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                        <div className={`w-12 h-12 ${stage.bgLight} rounded-2xl flex items-center justify-center mb-3`}>
                                            <StageIcon size={20} className={`${stage.textColor} opacity-50`} />
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">Nenhum lead nesta etapa</p>
                                        <p className="text-[10px] text-slate-300 mt-1">Arraste leads para cá ou clique + para adicionar</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Comercial;
