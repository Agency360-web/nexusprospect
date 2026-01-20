import React, { useState, useEffect, useMemo } from 'react';
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
    Plus,
    ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ContractManager from './ContractManager';

// Interfaces
interface FinancialKPIs {
    mrr: number; // Stored MRR (Projection)
    mrr_growth_percent: number;
    forecast_30d: number;
    overdue_amount: number;
    avg_ticket: number;
    active_subscribers: number;
    churn_rate: number;
    churn_growth_percent: number;
}

interface Transaction {
    id: string; // uuid
    client_name: string;
    description: string;
    transaction_date: string;
    amount: number;
    status: 'pago' | 'pendente' | 'atrasado' | 'cancelado';
}

type DateRange = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'all';

const AdministrationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'finance' | 'contracts'>('finance');

    // Data State
    const [storedKpis, setStoredKpis] = useState<FinancialKPIs | null>(null);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

    // Filter State
    const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && activeTab === 'finance') {
            fetchFinancialData();
        }
    }, [user, activeTab]);

    // Filter Logic
    useEffect(() => {
        if (!allTransactions.length) return;

        const now = new Date();
        let start = new Date(0); // Epoch
        let end = new Date(); // Now

        switch (dateRange) {
            case 'today':
                start = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'last7':
                start = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'last30':
                start = new Date(now.setDate(now.getDate() - 30));
                break;
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'all':
                // Default start
                break;
        }

        const filtered = allTransactions.filter(t => {
            const tDate = new Date(t.transaction_date);
            return tDate >= start && tDate <= end;
        });

        setFilteredTransactions(filtered);

    }, [dateRange, allTransactions]);

    // Dynamic KPIs Calculation
    const dynamicKPIs = useMemo(() => {
        if (!filteredTransactions.length) return {
            revenue: 0,
            forecast: 0,
            overdue: 0,
            avgTicket: 0,
            count: 0
        };

        const revenue = filteredTransactions
            .filter(t => t.status === 'pago')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const forecast = filteredTransactions
            .filter(t => t.status === 'pendente')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const overdue = filteredTransactions
            .filter(t => t.status === 'atrasado')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const paidCount = filteredTransactions.filter(t => t.status === 'pago').length;
        const avgTicket = paidCount > 0 ? revenue / paidCount : 0;

        return { revenue, forecast, overdue, avgTicket, count: filteredTransactions.length };
    }, [filteredTransactions]);

    // Chart Data Generation
    const chartData = useMemo(() => {
        // Group by day for the selected period
        const grouped = new Map<string, number>();

        filteredTransactions.forEach(t => {
            if (t.status === 'pago') {
                const dateKey = new Date(t.transaction_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                grouped.set(dateKey, (grouped.get(dateKey) || 0) + t.amount);
            }
        });

        return Array.from(grouped.entries()).map(([date, value]) => ({
            month_label: date,
            revenue: value,
            target: 0 // Could be dynamic
        })).reverse(); // Re-sort if needed, expensive op here. Ideally sort by date. 
        // Actually map iteration order is insertion order usually, but safer to sort.
    }, [filteredTransactions]);


    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Stored KPIs (for MRR reference)
            const { data: kpiData } = await supabase
                .from('financial_kpis')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (kpiData) setStoredKpis(kpiData);

            // 2. Fetch ALL Transactions (Limit 5000)
            const { data: trxData } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('user_id', user?.id)
                .order('transaction_date', { ascending: false })
                .limit(5000);

            if (trxData) {
                const mappedTrx = trxData.map(t => ({ ...t, amount: t.amount || 0 })); // Ensure amount
                setAllTransactions(mappedTrx);
                setFilteredTransactions(mappedTrx); // Init
            }

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
        if (!user) return;
        try {
            setLoading(true);
            const response = await fetch('/api/sync-asaas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error || 'Unknown error');

            window.location.reload();
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
                        {loading ? 'Sincronizando...' : 'Sincronizar Agora'}
                    </button>
                    <div className="h-4 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span>Auto-Sync Ativo</span>
                    </div>
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

                        {/* Filters Toolbar */}
                        <div className="flex justify-end">
                            <div className="relative group">
                                <button className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">
                                    <Calendar size={16} className="text-slate-500" />
                                    <span>
                                        {dateRange === 'today' && 'Hoje'}
                                        {dateRange === 'last7' && 'Últimos 7 dias'}
                                        {dateRange === 'last30' && 'Últimos 30 dias'}
                                        {dateRange === 'thisMonth' && 'Este Mês'}
                                        {dateRange === 'lastMonth' && 'Mês Passado'}
                                        {dateRange === 'all' && 'Todo o Período'}
                                    </span>
                                    <ChevronDown size={14} className="text-slate-400" />
                                </button>
                                {/* Dropdown */}
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1 hidden group-hover:block z-50">
                                    <button onClick={() => setDateRange('today')} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Hoje</button>
                                    <button onClick={() => setDateRange('last7')} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Últimos 7 dias</button>
                                    <button onClick={() => setDateRange('last30')} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Últimos 30 dias</button>
                                    <button onClick={() => setDateRange('thisMonth')} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Este Mês</button>
                                    <button onClick={() => setDateRange('lastMonth')} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Mês Passado</button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button onClick={() => setDateRange('all')} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg font-bold">Todo o Período</button>
                                </div>
                            </div>
                        </div>

                        {/* Metric Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {/* MRR (Static / Projeção) - Doesn't change with filter generally unless we want historic MRR */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-900 group-hover:scale-110 transition-transform">
                                        <DollarSign size={20} />
                                    </div>
                                    <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">
                                        <TrendingUp size={12} />
                                        <span>Projeção 12m</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">MRR (Recorrente)</h3>
                                    <div className="text-2xl font-black text-slate-900">
                                        {storedKpis?.mrr ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(storedKpis.mrr) : 'R$ 0,00'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium mt-1">Baseado em contratos futuros</div>
                                </div>
                            </div>

                            {/* Revenue (Dynamic) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Receita (Periodo)</h3>
                                    <div className="text-2xl font-black text-emerald-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.revenue)}
                                    </div>
                                    <div className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-wide">RECEBIDO</div>
                                </div>
                            </div>

                            {/* Forecast (Dynamic) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-amber-50 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                                        <Clock size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">A Receber</h3>
                                    <div className="text-2xl font-black text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.forecast)}
                                    </div>
                                    <div className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wide">PENDENTE</div>
                                </div>
                            </div>

                            {/* Overdue (Dynamic) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-rose-50 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                                        <AlertTriangle size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Em Atraso</h3>
                                    <div className="text-2xl font-black text-rose-500">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.overdue)}
                                    </div>
                                    <div className="text-[10px] text-rose-400 font-bold mt-1 uppercase tracking-wide">AÇÃO NECESSÁRIA</div>
                                </div>
                            </div>

                            {/* Churn (Static) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-900 group-hover:scale-110 transition-transform">
                                        <AlertCircle size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Churn Rate</h3>
                                    <div className="text-2xl font-black text-slate-900">{storedKpis?.churn_rate ? storedKpis.churn_rate.toFixed(1) : 0}%</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Mensal</div>
                                </div>
                            </div>
                        </div>

                        {/* Main Grid: Chart & Table */}
                        <div className="grid grid-cols-1 gap-8">

                            {/* Revenue Chart */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">Fluxo de Caixa (Periodo)</h2>
                                        <p className="text-xs text-slate-500 mt-1">Receitas confirmadas por dia no período selecionado</p>
                                    </div>
                                </div>

                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                dy={10}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                tickFormatter={(value) => `k ${(value / 1000).toFixed(0)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#0f172a"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorReceita)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Transactions Table */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h2 className="text-lg font-bold text-slate-900">Transações ({filteredTransactions.length})</h2>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900 transition-all w-64" />
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">Data</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredTransactions.length > 0 ? (
                                                filteredTransactions.map((trx, i) => (
                                                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-8 py-5 text-sm text-slate-500 pl-10">
                                                            {new Date(trx.transaction_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="font-bold text-slate-900 text-sm">{trx.client_name}</div>
                                                        </td>
                                                        <td className="px-8 py-5 text-sm text-slate-500 max-w-[200px] truncate" title={trx.description}>
                                                            {trx.description}
                                                        </td>
                                                        <td className="px-8 py-5 text-sm font-black text-slate-900">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trx.amount)}
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${trx.status === 'pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                    trx.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                        trx.status === 'atrasado' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                            'bg-slate-50 text-slate-700 border-slate-100'
                                                                }`}>
                                                                {trx.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="py-20 text-center text-slate-500">
                                                        Nenhuma transação encontrada neste período.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Financial Health - Simplified or Removed? Moved to side or keep? 
                            Let's remove Financial Health for cleaner UI as user focused on filtering data. 
                            Or keep it? 
                            User said "remove Mock Data". Health was mock data. I will remove it to be safe.
                        */}

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
