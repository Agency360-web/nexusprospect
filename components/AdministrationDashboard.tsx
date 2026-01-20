import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Calendar,
    Download,
    FileText,
    DollarSign,
    TrendingUp,
    AlertCircle,
    Users,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    Search,
    Filter,
    Activity,
    CheckCircle2,
    Clock,
    Briefcase,
    Scale,
    Building2,
    Plus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ContractManager from './ContractManager';

// Interfaces
interface FinancialKPIs {
    mrr: number;
    mrr_growth_percent: number;
    forecast_30d: number;
    overdue_amount: number;
    avg_ticket: number;
    active_subscribers: number;
    churn_rate: number;
    churn_growth_percent: number;
}

interface MonthlyMetric {
    month_label: string;
    revenue: number;
    expense: number;
    target: number;
    sort_order?: number;
}

interface Transaction {
    id: string; // uuid
    client_name: string;
    description: string;
    transaction_date: string;
    amount: number;
    status: 'pago' | 'pendente' | 'atrasado' | 'cancelado';
}

const AdministrationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'finance' | 'contracts'>('finance');
    const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
    const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && activeTab === 'finance') {
            fetchFinancialData();
        }
    }, [user, activeTab]);

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch KPIs
            const { data: kpiData } = await supabase
                .from('financial_kpis')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (kpiData) setKpis(kpiData);

            // 2. Fetch Monthly Metrics
            const { data: metricsData } = await supabase
                .from('financial_monthly_metrics')
                .select('*')
                .eq('user_id', user?.id)
                .order('sort_order', { ascending: true });

            if (metricsData) setMonthlyMetrics(metricsData.map(m => ({
                month_label: m.month_label,
                revenue: m.revenue,
                expense: m.expense,
                target: m.target,
                sort_order: m.sort_order
            })));

            // 3. Fetch Transactions
            const { data: trxData } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('user_id', user?.id)
                .order('transaction_date', { ascending: false })
                .limit(10);

            if (trxData) setTransactions(trxData);

        } catch (error) {
            console.error('Error fetching financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all shrink-0 ${activeTab === id
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                }`}
        >
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );

    const handleTestSync = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/sync-asaas');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error from server');
            }

            alert(`Sucesso! Conexão estabelecida com Vercel. ${data.payments_found || 0} pagamentos encontrados.`);
        } catch (error: any) {
            console.error('Sync error:', error);
            const errorMessage = error?.message || error?.error || JSON.stringify(error);
            alert(`Erro na conexão: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Administração</h1>
                    <p className="text-slate-500">Gestão centralizada de departamentos e recursos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTestSync}
                        disabled={loading}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 underline underline-offset-2 disabled:opacity-50"
                    >
                        {loading ? 'Testando...' : 'Testar Conexão'}
                    </button>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span>Sincronização Automática Ativa</span>
                    </div>
                    <span className="text-xs text-slate-400">
                        Atualizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* Tabs Nav */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-20 flex px-2 overflow-x-auto no-scrollbar rounded-t-3xl">
                <TabButton id="finance" label="Financeiro" icon={Activity} />
                <TabButton id="contracts" label="Gestão de Contratos" icon={FileText} />
            </div>

            <div className="pt-6">
                {/* Finance Tab (Default) */}
                {activeTab === 'finance' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Metric Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {/* MRR */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-900 group-hover:scale-110 transition-transform">
                                        <DollarSign size={20} />
                                    </div>
                                    <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">
                                        <TrendingUp size={12} />
                                        <span>+12%</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">MRR Atual</h3>
                                    <div className="text-2xl font-black text-slate-900">
                                        {kpis?.mrr ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.mrr) : 'R$ 0,00'}
                                    </div>
                                </div>
                            </div>

                            {/* Forecast */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-900 group-hover:scale-110 transition-transform">
                                        <TrendingUp size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Previsão (30D)</h3>
                                    <div className="text-2xl font-black text-slate-900">
                                        {kpis?.forecast_30d ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.forecast_30d) : 'R$ 0,00'}
                                    </div>
                                    <div className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-wide">CONFIRMADO</div>
                                </div>
                            </div>

                            {/* Overdue */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-rose-50 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                                        <AlertTriangle size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Em Atraso</h3>
                                    <div className="text-2xl font-black text-rose-500">
                                        {kpis?.overdue_amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.overdue_amount) : 'R$ 0,00'}
                                    </div>
                                    <div className="text-[10px] text-rose-400 font-bold mt-1 uppercase tracking-wide">Ação Necessária</div>
                                </div>
                            </div>

                            {/* Avg Ticket */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-900 group-hover:scale-110 transition-transform">
                                        <Users size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ticket Médio</h3>
                                    <div className="text-2xl font-black text-slate-900">
                                        {kpis?.avg_ticket ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.avg_ticket) : 'R$ 0,00'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">{kpis?.active_subscribers || 0} Assinantes Ativos</div>
                                </div>
                            </div>

                            {/* Churn */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-900 group-hover:scale-110 transition-transform">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">
                                        <ArrowDownRight size={12} />
                                        <span>-0.5%</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Churn Rate</h3>
                                    <div className="text-2xl font-black text-slate-900">{kpis?.churn_rate || 0}%</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Mensal</div>
                                </div>
                            </div>
                        </div>

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Revenue Chart */}
                            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">Projeção de Receita</h2>
                                        <p className="text-xs text-slate-500 mt-1">Comparativo de Receita Real vs Prevista (Semestral)</p>
                                    </div>
                                    <div className="flex items-center text-xs font-bold space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                                            <span className="text-slate-600">Realizado</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                            <span className="text-slate-600">Previsto</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlyMetrics} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="month_label"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                                tickFormatter={(value) => `k ${(value / 1000).toFixed(0)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                labelStyle={{ color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#0f172a"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorReceita)"
                                            />
                                            <ReferenceLine y={20000} stroke="#f43f5e" strokeDasharray="3 3" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Financial Health */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <Activity size={20} className="text-slate-400" />
                                    Saúde Financeira
                                </h2>

                                <div className="flex-1 space-y-8">

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-slate-700">Taxa de Adimplência</span>
                                            <span className="text-xl font-black text-emerald-600">98%</span>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[98%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Excelente! A saúde de pagamentos da sua base está acima da média de mercado (92%).
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-slate-700">Ponto de Equilíbrio (Break-even)</span>
                                            <span className="text-xl font-black text-slate-900">112%</span>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-900 w-[100%] rounded-full"></div>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Você já cobriu seus custos fixos operacionais este mês. Todo lucro agora é margem líquida.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-slate-700">Meta MRR (Q1)</span>
                                            <span className="text-xl font-black text-rose-500">75%</span>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-500 w-[75%] rounded-full shadow-[0_0_10px_rgba(244,63,94,0.3)]"></div>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Atenção: Você precisa de mais R$ 12.500 em novos contratos para bater a meta trimestral.
                                        </p>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-slate-900">Transações Recentes</h2>
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900 transition-all w-64" />
                                    </div>
                                    <button className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                                        <Filter size={18} />
                                    </button>
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">ID Transação</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.length > 0 ? (
                                        transactions.map((trx, i) => (
                                            <tr key={trx.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 text-sm font-mono text-slate-500 font-medium pl-10">#{trx.id.substring(0, 8)}...</td>
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-slate-900">{trx.client_name}</div>
                                                </td>
                                                <td className="px-8 py-5 text-sm text-slate-500">{new Date(trx.transaction_date).toLocaleDateString()}</td>
                                                <td className="px-8 py-5 text-sm font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trx.amount)}</td>
                                                <td className="px-8 py-5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${trx.status === 'pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                        trx.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-rose-50 text-rose-700 border-rose-100'
                                                        }`}>
                                                        {trx.status === 'pago' && <CheckCircle2 size={10} className="mr-1" />}
                                                        {trx.status === 'pendente' && <Clock size={10} className="mr-1" />}
                                                        {trx.status === 'atrasado' && <AlertTriangle size={10} className="mr-1" />}
                                                        {trx.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right pr-8">
                                                    <button className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all">
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-4 text-slate-300">
                                                    <Search size={24} />
                                                </div>
                                                <p className="text-slate-500 font-medium">Nenhuma transação encontrada.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Contracts Tab */}
                {activeTab === 'contracts' && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                        <ContractManager />
                    </div>
                )}
            </div>

        </div>
    );
};

export default AdministrationDashboard;
