import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Calendar,
    Building2,
    Plus,
    ChevronDown,
    Search
} from 'lucide-react';
import { Transaction, FinancialKPIs, DateRange } from '../types/admin';

// Components
import FinancialStats from '../components/admin/FinancialStats';
import FinancialChart from '../components/admin/FinancialChart';
import TransactionTable from '../components/admin/TransactionTable';
import TransactionModal from '../components/admin/TransactionModals';

const AdministrationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab] = useState<'finance'>('finance');
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Data State
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Bulk Selection State
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

    // Filter State
    const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [appliedCustomStart, setAppliedCustomStart] = useState('');
    const [appliedCustomEnd, setAppliedCustomEnd] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        if (user && activeTab === 'finance') {
            fetchFinancialData();
        }
    }, [user, activeTab]);

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            const { data: trxData } = await supabase
                .from('financial_transactions')
                .select('*')
                .eq('user_id', user?.id)
                .order('transaction_date', { ascending: false })
                .limit(500);

            if (trxData) {
                const mappedTrx = trxData.map(t => ({ ...t, amount: t.amount || 0 }));
                setAllTransactions(mappedTrx);
                setFilteredTransactions(mappedTrx);
            }
        } catch (error) {
            console.error('Error fetching financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    useEffect(() => {
        if (!allTransactions.length) return;

        const now = new Date();
        let start = new Date(0);
        let end = new Date();

        const getStartOfDay = (d: Date) => {
            const newDate = new Date(d);
            newDate.setHours(0, 0, 0, 0);
            return newDate;
        };

        const getEndOfDay = (d: Date) => {
            const newDate = new Date(d);
            newDate.setHours(23, 59, 59, 999);
            return newDate;
        };

        switch (dateRange) {
            case 'today':
                start = getStartOfDay(now);
                end = getEndOfDay(now);
                break;
            case 'last7':
                start = getStartOfDay(now);
                start.setDate(now.getDate() - 7);
                end = getEndOfDay(now);
                break;
            case 'last30':
                start = getStartOfDay(now);
                start.setDate(now.getDate() - 30);
                end = getEndOfDay(now);
                break;
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = getEndOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = getEndOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
                break;
            case 'nextMonth':
                start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                end = getEndOfDay(new Date(now.getFullYear(), now.getMonth() + 2, 0));
                break;
            case 'all':
                start = new Date(0);
                end = new Date(8640000000000000);
                break;
            case 'custom':
                if (appliedCustomStart) start = getStartOfDay(new Date(appliedCustomStart));
                if (appliedCustomEnd) end = getEndOfDay(new Date(appliedCustomEnd));
                break;
        }

        const filtered = allTransactions.filter(t => {
            const tDate = new Date(t.transaction_date);
            return tDate.getTime() >= start.getTime() && tDate.getTime() <= end.getTime();
        });

        const scopedFiltered = filtered.filter(t => (t.category || 'profissional') === 'profissional');

        setFilteredTransactions(scopedFiltered);
        setCurrentPage(1);
    }, [dateRange, allTransactions, appliedCustomStart, appliedCustomEnd]);

    const dynamicKPIs = useMemo(() => {
        if (!filteredTransactions.length) return { revenue: 0, expenses: 0, balance: 0, forecast: 0 };

        const revenue = filteredTransactions
            .filter(t => t.status === 'pago' && t.amount > 0)
            .reduce((acc, curr) => acc + curr.amount, 0);

        const expenses = filteredTransactions
            .filter(t => t.status === 'pago' && t.amount < 0)
            .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

        const forecast = filteredTransactions
            .filter(t => t.status === 'pendente')
            .reduce((acc, curr) => acc + curr.amount, 0);

        return { revenue, expenses, balance: revenue - expenses, forecast };
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        const now = new Date();
        let start = new Date(0);
        let end = new Date();

        switch (dateRange) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'last7':
                start = new Date();
                start.setDate(now.getDate() - 7);
                break;
            case 'last30':
                start = new Date();
                start.setDate(now.getDate() - 30);
                break;
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'nextMonth':
                start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                break;
            case 'custom':
                if (appliedCustomStart) start = new Date(appliedCustomStart);
                if (appliedCustomEnd) end = new Date(appliedCustomEnd);
                break;
        }

        const grouped = new Map<string, { revenue: number, expenses: number }>();
        if (dateRange !== 'all') {
            const current = new Date(start);
            let count = 0;
            while (current <= end && count < 366) {
                const dateKey = current.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                grouped.set(dateKey, { revenue: 0, expenses: 0 });
                current.setDate(current.getDate() + 1);
                count++;
            }
        }

        filteredTransactions.forEach(t => {
            if (t.status !== 'cancelado') {
                const dateKey = new Date(t.transaction_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const curr = grouped.get(dateKey) || { revenue: 0, expenses: 0 };
                if (t.amount > 0) curr.revenue += t.amount;
                else curr.expenses += Math.abs(t.amount);
                grouped.set(dateKey, curr);
            }
        });

        const result = Array.from(grouped.entries()).map(([date, values]) => ({
            month_label: date,
            revenue: values.revenue,
            expenses: values.expenses,
        }));

        return dateRange === 'all' ? result.reverse() : result;
    }, [filteredTransactions, dateRange, appliedCustomStart, appliedCustomEnd]);

    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(start, start + itemsPerPage);
    }, [filteredTransactions, currentPage]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    const toggleSelectAll = () => {
        if (selectedTransactions.size === paginatedTransactions.length && paginatedTransactions.length > 0) {
            setSelectedTransactions(new Set());
        } else {
            const newSet = new Set(selectedTransactions);
            paginatedTransactions.forEach(t => newSet.add(t.id));
            setSelectedTransactions(newSet);
        }
    };

    const toggleSelectTransaction = (id: string) => {
        const newSet = new Set(selectedTransactions);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedTransactions(newSet);
    };

    const handleBulkDelete = async () => {
        if (!selectedTransactions.size || !confirm(`Tem certeza que deseja excluir ${selectedTransactions.size} transações?`)) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('financial_transactions').delete().in('id', Array.from(selectedTransactions));
            if (error) throw error;
            setSelectedTransactions(new Set());
            fetchFinancialData();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectRange = (range: DateRange) => {
        setDateRange(range);
        setIsFilterOpen(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {user && (
                <TransactionModal
                    isOpen={isTransactionModalOpen}
                    onClose={() => {
                        setIsTransactionModalOpen(false);
                        setEditingTransaction(null);
                    }}
                    onSuccess={fetchFinancialData}
                    user_id={user.id}
                    defaultCategory="profissional"
                    editingTransaction={editingTransaction}
                />
            )}

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                        <Building2 className="text-yellow-500" size={32} />
                        Administração
                    </h1>
                    <p className="text-slate-300 font-medium">Gestão centralizada de departamentos, contratos e recursos.</p>
                </div>
            </header>

            <div className="pt-6 space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-end items-center gap-3">
                    <button
                        onClick={() => setIsTransactionModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold shadow-sm"
                    >
                        <Plus size={16} />
                        Nova Transação
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isFilterOpen ? 'border-slate-900 bg-slate-50' : 'border-slate-200 text-slate-700'}`}
                        >
                            <Calendar size={16} />
                            <span>
                                {dateRange === 'today' && 'Hoje'}
                                {dateRange === 'last7' && 'Últimos 7 dias'}
                                {dateRange === 'last30' && 'Últimos 30 dias'}
                                {dateRange === 'thisMonth' && 'Este Mês'}
                                {dateRange === 'lastMonth' && 'Mês Passado'}
                                {dateRange === 'nextMonth' && 'Próximo Mês'}
                                {dateRange === 'all' && 'Todo o Período'}
                                {dateRange === 'custom' && 'Personalizado'}
                            </span>
                            <ChevronDown size={14} />
                        </button>

                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 mt-2">
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                                <button onClick={() => { setAppliedCustomStart(customStart); setAppliedCustomEnd(customEnd); }} className="p-2 bg-slate-900 text-white rounded-lg"><Search size={14} /></button>
                            </div>
                        )}

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded-xl shadow-xl p-1 z-50">
                                    {(['today', 'last7', 'last30', 'thisMonth', 'lastMonth', 'nextMonth', 'all', 'custom'] as DateRange[]).map(range => (
                                        <button key={range} onClick={() => selectRange(range)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-lg capitalize">
                                            {range.replace('last', 'Últimos ').replace('thisMonth', 'Este Mês').replace('today', 'Hoje').replace('all', 'Todo o Período')}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <FinancialStats dynamicKPIs={dynamicKPIs} />
                <FinancialChart data={chartData} />
                <TransactionTable 
                    transactions={paginatedTransactions}
                    selectedTransactions={selectedTransactions}
                    toggleSelectAll={toggleSelectAll}
                    toggleSelectTransaction={toggleSelectTransaction}
                    handleBulkDelete={handleBulkDelete}
                    fetchFinancialData={fetchFinancialData}
                    onEdit={(t) => { setEditingTransaction(t); setIsTransactionModalOpen(true); }}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default AdministrationDashboard;
