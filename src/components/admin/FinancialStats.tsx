import React from 'react';
import { TrendingUp, ArrowDownRight, DollarSign, Clock } from 'lucide-react';

interface FinancialStatsProps {
    dynamicKPIs: {
        revenue: number;
        expenses: number;
        balance: number;
        forecast: number;
    };
}

const FinancialStats: React.FC<FinancialStatsProps> = ({ dynamicKPIs }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue (Dynamic) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Receita</span>
                </div>
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Entradas (Pago)</h3>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.revenue)}
                    </div>
                </div>
                <div className="h-1 w-full bg-emerald-100 mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full"></div>
                </div>
            </div>

            {/* Expenses (Dynamic) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
                        <ArrowDownRight size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Despesas</span>
                </div>
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saídas (Pago)</h3>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.expenses)}
                    </div>
                </div>
                <div className="h-1 w-full bg-rose-100 mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-3/4"></div>
                </div>
            </div>

            {/* Balance (Dynamic) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                        <DollarSign size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Saldo</span>
                </div>
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Caixa Líquido</h3>
                    <div className={`text-2xl font-black tracking-tight ${dynamicKPIs.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.balance)}
                    </div>
                </div>
                <div className="h-1 w-full bg-blue-100 mt-4 rounded-full overflow-hidden">
                    <div className={`h-full bg-blue-500 w-1/2`}></div>
                </div>
            </div>

            {/* Forecast (Dynamic) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                        <Clock size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Futuro</span>
                </div>
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">A Receber</h3>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.forecast)}
                    </div>
                </div>
                <div className="h-1 w-full bg-amber-100 mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-1/3"></div>
                </div>
            </div>
        </div>
    );
};

export default FinancialStats;
