import React from 'react';
import {
    Search,
    Globe,
    Zap,
    Target,
    Users,
    TrendingUp,
    Sparkles,
    Radar,
    Mail,
    Phone,
    ArrowRight,
    Rocket,
    Brain,
    Network,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Feature Cards Config ────────────────────────────────────────────────────
const PROSPECTING_TOOLS = [
    {
        title: 'Busca Inteligente',
        description: 'Encontre leads qualificados usando IA para analisar perfis e identificar oportunidades.',
        icon: Brain,
        color: 'from-violet-500 to-purple-600',
        bgLight: 'bg-violet-50',
        textColor: 'text-violet-600',
        status: 'Em breve',
    },
    {
        title: 'Enriquecimento de Dados',
        description: 'Complete automaticamente informações dos seus leads com dados públicos e de redes sociais.',
        icon: Sparkles,
        color: 'from-amber-500 to-orange-600',
        bgLight: 'bg-amber-50',
        textColor: 'text-amber-600',
        status: 'Em breve',
    },
    {
        title: 'Lead Scoring',
        description: 'Pontue seus leads automaticamente baseado em perfil, comportamento e probabilidade de conversão.',
        icon: Target,
        color: 'from-emerald-500 to-teal-600',
        bgLight: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        status: 'Em breve',
    },
    {
        title: 'Captura Web',
        description: 'Extraia leads de sites, diretórios e páginas corporativas automaticamente.',
        icon: Globe,
        color: 'from-blue-500 to-cyan-600',
        bgLight: 'bg-blue-50',
        textColor: 'text-blue-600',
        status: 'Em breve',
    },
    {
        title: 'Automação de Contato',
        description: 'Crie sequências automatizadas de e-mail e mensagens para nutrir leads.',
        icon: Zap,
        color: 'from-rose-500 to-pink-600',
        bgLight: 'bg-rose-50',
        textColor: 'text-rose-600',
        status: 'Em breve',
    },
    {
        title: 'Mapeamento de Rede',
        description: 'Visualize conexões entre empresas e contatos para expandir seu alcance comercial.',
        icon: Network,
        color: 'from-indigo-500 to-blue-600',
        bgLight: 'bg-indigo-50',
        textColor: 'text-indigo-600',
        status: 'Em breve',
    },
];

// ─── Component ───────────────────────────────────────────────────────────────
const Prospeccao: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500 rounded-full blur-[80px] opacity-15 translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
                        Prospecção <span className="inline-block">🎯</span>
                    </h1>
                    <p className="text-slate-300 font-medium text-sm md:text-base">
                        Ferramentas inteligentes para encontrar e qualificar novos leads.
                    </p>
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row gap-3">
                    <button className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95 text-sm md:text-base">
                        <Search size={18} />
                        <span>Prospectar Leads</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Leads Prospectados', value: '0', icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
                    { label: 'Taxa de Qualificação', value: '0%', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Contatos Encontrados', value: '0', icon: Phone, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Conversões', value: '0', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
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

            {/* Coming Soon Banner */}
            <div className="relative bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[120px] opacity-10"></div>
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-violet-300 rounded-full blur-[80px] opacity-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                        <Rocket size={32} className="text-white" />
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-xl md:text-2xl font-black text-white mb-2">
                            Ferramentas de Prospecção em Desenvolvimento
                        </h2>
                        <p className="text-white/70 text-sm md:text-base max-w-xl">
                            Estamos construindo ferramentas avançadas de prospecção com inteligência artificial.
                            Em breve você poderá encontrar e qualificar leads automaticamente.
                        </p>
                    </div>
                </div>
            </div>

            {/* Prospecting Tools Grid */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4">Ferramentas Disponíveis em Breve</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PROSPECTING_TOOLS.map((tool, i) => {
                        const ToolIcon = tool.icon;
                        return (
                            <div
                                key={i}
                                className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 cursor-pointer relative overflow-hidden"
                            >
                                {/* Background gradient on hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`}></div>

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 ${tool.bgLight} rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                                            <ToolIcon size={22} className={tool.textColor} />
                                        </div>
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full tracking-wider">
                                            {tool.status}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-slate-800 text-base mb-2 group-hover:text-slate-900 transition-colors">
                                        {tool.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {tool.description}
                                    </p>

                                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
                                        <span>Saiba mais</span>
                                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Prospeccao;
