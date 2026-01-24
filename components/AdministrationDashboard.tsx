import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    ChevronDown,
    Trash2,
    ChevronLeft,
    ChevronRight,
    QrCode
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ContractManager from './ContractManager';
import WhatsAppConnectGenerator from './WhatsAppConnectGenerator';

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
    expenses?: number;
    balance?: number;
}

interface Transaction {
    id: string; // uuid
    client_name: string;
    description: string;
    transaction_date: string;
    amount: number;
    status: 'pago' | 'pendente' | 'atrasado' | 'cancelado';
    manual_override?: boolean;
    payment_method?: string;
    category?: 'pessoal' | 'profissional';
}

type DateRange = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'nextMonth' | 'all' | 'custom';

const TransactionMenu: React.FC<{ transaction: Transaction, onUpdate: () => void }> = ({ transaction, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleMarkPaid = async (method: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('financial_transactions')
                .update({
                    status: 'pago',
                    manual_override: true,
                    payment_method: method
                })
                .eq('id', transaction.id);

            if (error) throw error;
            onUpdate();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
            setIsOpen(false);
        }
    };

    const handleMoveCategory = async (newCategory: 'pessoal' | 'profissional') => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('financial_transactions')
                .update({ category: newCategory })
                .eq('id', transaction.id);

            if (error) throw error;
            onUpdate();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
            setIsOpen(false);
        }
    };

    const [menuStyle, setMenuStyle] = useState<{ top?: number, bottom?: number, left?: number, right?: number }>({});
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleMenu = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 200; // Approx height

            const newStyle: any = {
                // Align right edge of menu with right edge of button
                // right prop is distance from right edge of viewport
                right: window.innerWidth - rect.right,
            };

            // Vertical collision detection
            if (spaceBelow < menuHeight) {
                // Open upwards
                newStyle.bottom = window.innerHeight - rect.top + 4;
            } else {
                // Open downwards
                newStyle.top = rect.bottom + 4;
            }

            setMenuStyle(newStyle);
        }
        setIsOpen(!isOpen);
    };

    // Close on scroll or resize to prevent floating menu issues
    useEffect(() => {
        const handleScroll = () => { if (isOpen) setIsOpen(false); };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={toggleMenu}
                className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={loading}
            >
                <MoreHorizontal size={18} />
            </button>

            {/* Menu via Portal */}
            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)}></div>
                    <div
                        style={menuStyle}
                        className="fixed w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-[70] animate-in fade-in zoom-in-95 duration-100 origin-top-right"
                    >
                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</div>

                        {transaction.status !== 'pago' && (
                            <>
                                <button
                                    onClick={() => handleMarkPaid('dinheiro')}
                                    className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                                >
                                    <DollarSign size={14} />
                                    <span>Receber (Dinheiro)</span>
                                </button>
                                <button
                                    onClick={() => handleMarkPaid('pix')}
                                    className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2"
                                >
                                    <ArrowDownRight size={14} />
                                    <span>Receber (PIX)</span>
                                </button>
                            </>
                        )}

                        <button
                            onClick={async () => {
                                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                                    setLoading(true);
                                    try {
                                        const { error } = await supabase.from('financial_transactions').delete().eq('id', transaction.id);
                                        if (error) throw error;
                                        onUpdate();
                                    } catch (e: any) {
                                        alert('Erro ao excluir: ' + e.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            <span>Excluir</span>
                        </button>

                        <button className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
                            Ver Detalhes
                        </button>

                        <div className="h-px bg-slate-100 my-1"></div>

                        {(transaction.category || 'profissional') === 'profissional' ? (
                            <button
                                onClick={() => handleMoveCategory('pessoal')}
                                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                            >
                                <Briefcase size={14} />
                                <span>Mover para Pessoal</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleMoveCategory('profissional')}
                                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2"
                            >
                                <Building2 size={14} />
                                <span>Mover para Profissional</span>
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div >
    );
};

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user_id: string;
    defaultCategory: 'pessoal' | 'profissional';
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess, user_id, defaultCategory }) => {
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<'pessoal' | 'profissional'>(defaultCategory);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [clientName, setClientName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
    const [loading, setLoading] = useState(false);

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceCount, setRecurrenceCount] = useState(1); // 1 = 1 month (just the transaction itself actually, but let's say repetitions)
    // Actually user said "repeats for X months". 
    // If I check "Recurrence", I expect at least 2? Or just "Repeat X times"?
    // "2 mil por mes durante 3 meses" -> 3 transactions.

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
            if (isNaN(numericAmount)) throw new Error("Valor inválido");

            const finalAmount = type === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

            const transactionsToInsert = [];
            const baseDate = new Date(date);

            const count = isRecurring ? Math.max(1, recurrenceCount) : 1;

            for (let i = 0; i < count; i++) {
                const currentDate = new Date(baseDate);
                currentDate.setMonth(baseDate.getMonth() + i);

                transactionsToInsert.push({
                    user_id,
                    description: isRecurring ? `${description} (${i + 1}/${count})` : description,
                    amount: finalAmount,
                    transaction_date: currentDate.toISOString(),
                    status,

                    client_name: clientName || (type === 'expense' ? 'Despesa Operacional' : 'Cliente Avulso'),
                    manual_override: true,
                    category
                });
            }

            const { error } = await supabase.from('financial_transactions').insert(transactionsToInsert);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Nova Transação</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <Plus className="rotate-45" size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Receita (Ganho)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Despesa (Custo)
                        </button>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setCategory('profissional')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${category === 'profissional' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Profissional
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory('pessoal')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${category === 'pessoal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pessoal
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição</label>
                        <input
                            required
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 transition-colors"
                            placeholder="Ex: Consultoria, Servidor, Aluguel"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valor</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 transition-colors font-mono"
                                placeholder="0,00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data</label>
                            <input
                                required
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 transition-colors appearance-none"
                            >
                                <option value="pago">Pago / Recebido</option>
                                <option value="pendente">Pendente</option>
                            </select>
                        </div>
                    </div>

                    {/* Recurrence Options */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                id="recurrence"
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            <label htmlFor="recurrence" className="text-sm font-medium text-slate-700">Repetir parcelas?</label>
                        </div>

                        {isRecurring && (
                            <div className="animate-in slide-in-from-top-1 duration-200">
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Número de Meses</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="120"
                                    value={recurrenceCount}
                                    onChange={e => setRecurrenceCount(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 transition-colors"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Ex: 12 para 1 ano. Será gerado um lançamento por mês.</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cliente / Fornecedor (Opcional)</label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 transition-colors"
                            placeholder="Nome do cliente ou fornecedor"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transition-all active:scale-95 ${loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                        {loading ? 'Salvando...' : 'Salvar Transação'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AdministrationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'finance' | 'contracts' | 'whatsapp'>('finance');
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [dashboardScope, setDashboardScope] = useState<'pessoal' | 'profissional'>('profissional');

    // Data State
    const [storedKpis, setStoredKpis] = useState<FinancialKPIs | null>(null);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Bulk Selection State
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

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
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedTransactions(newSet);
    };

    const handleBulkDelete = async () => {
        if (!selectedTransactions.size) return;
        if (!confirm(`Tem certeza que deseja excluir ${selectedTransactions.size} transações?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .in('id', Array.from(selectedTransactions));

            if (error) throw error;

            setSelectedTransactions(new Set());
            fetchFinancialData();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(start, start + itemsPerPage);
    }, [filteredTransactions, currentPage]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    // Filter State
    const [dateRange, setDateRange] = useState<DateRange>('thisMonth');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    // Applied state for manual search trigger
    const [appliedCustomStart, setAppliedCustomStart] = useState('');
    const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const toggleFilter = () => setIsFilterOpen(!isFilterOpen);
    const selectRange = (range: DateRange) => {
        setDateRange(range);
        setIsFilterOpen(false);
    };

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
            case 'nextMonth':
                start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                break;
            case 'all':
                // Default start
                break;
            case 'custom':
                // Custom range - Use APPLIED values
                if (appliedCustomStart) start = new Date(appliedCustomStart);
                if (appliedCustomEnd) end = new Date(appliedCustomEnd);
                // Need to ensure end date includes end of day if it's just a date string
                if (appliedCustomEnd) end.setHours(23, 59, 59, 999);
                break;
        }

        const filtered = allTransactions.filter(t => {
            const tDate = new Date(t.transaction_date);
            return tDate >= start && tDate <= end;
        });

        // Apply Dashboard Scope Filter
        const scopedFiltered = filtered.filter(t => (t.category || 'profissional') === dashboardScope); // Default to professional for backwards compatibility

        setFilteredTransactions(scopedFiltered);




        setCurrentPage(1); // Reset to first page on filter change


    }, [dateRange, allTransactions, appliedCustomStart, appliedCustomEnd, dashboardScope]);

    const dynamicKPIs = useMemo(() => {
        if (!filteredTransactions.length) return {
            revenue: 0,
            expenses: 0,
            balance: 0,
            forecast: 0,
            overdue: 0,
            avgTicket: 0,
            count: 0
        };

        const revenue = filteredTransactions
            .filter(t => t.status === 'pago' && t.amount > 0)
            .reduce((acc, curr) => acc + curr.amount, 0);

        const expenses = filteredTransactions
            .filter(t => t.status === 'pago' && t.amount < 0)
            .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

        const balance = revenue - expenses;

        const forecast = filteredTransactions
            .filter(t => t.status === 'pendente')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const overdue = filteredTransactions
            .filter(t => t.status === 'atrasado')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const paidCount = filteredTransactions.filter(t => t.status === 'pago' && t.amount > 0).length;
        const avgTicket = paidCount > 0 ? revenue / paidCount : 0;

        return { revenue, expenses, balance, forecast, overdue, avgTicket, count: filteredTransactions.length };
    }, [filteredTransactions]);

    // Chart Data Generation
    const chartData = useMemo(() => {
        // Group by day for the selected period
        // We need both Revenue (positive) and Expenses (negative -> absolute for chart maybe? Or verify request.)
        // Request: "lucros (receita) utilize a linha verde... custos (despesas) utilize a linha verde" (Actually user said green for both? No "Os custos (despesas) utilize a linha verde". Wait.
        // Re-reading user request: "1. Os lucros (receita) utilize a linha verde 2. Os custos (despesas) utilize a linha verde"
        // User probably meant Red for expenses. I'll use Red for expenses as standard.

        const grouped = new Map<string, { revenue: number, expenses: number }>();

        filteredTransactions.forEach(t => {
            // Include paid and pending? Usually charts show recognized revenue/cash flow.
            // Let's stick to 'pago' for actual cash flow, or 'pago' + 'pendente' for projection? 
            // "datas futuras... para ter noção do quanto irá receber" -> This implies Project/Forecast.
            // So I should include 'pendente' as well?
            // "O quanto ele irá receber"

            // Let's include everything except 'cancelado'.
            if (t.status !== 'cancelado') {
                const dateKey = new Date(t.transaction_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const curr = grouped.get(dateKey) || { revenue: 0, expenses: 0 };

                if (t.amount > 0) {
                    curr.revenue += t.amount;
                } else {
                    curr.expenses += Math.abs(t.amount);
                }
                grouped.set(dateKey, curr);
            }
        });

        return Array.from(grouped.entries()).map(([date, values]) => ({
            month_label: date,
            revenue: values.revenue,
            expenses: values.expenses,
        })).reverse(); // Sort properly ideally but sticking to map order for now
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



    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {user && (
                <TransactionModal
                    isOpen={isTransactionModalOpen}
                    onClose={() => setIsTransactionModalOpen(false)}
                    onSuccess={() => { fetchFinancialData(); }}
                    user_id={user.id}
                    defaultCategory={dashboardScope}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Administração</h1>
                    <p className="text-slate-500">Gestão centralizada de departamentos e recursos.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Actions moved to specific tabs */}
                </div>
            </div>

            {/* Tabs Nav */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-20 flex px-2 overflow-x-auto no-scrollbar rounded-t-3xl">
                <TabButton id="finance" label="Financeiro" icon={Activity} />
                <TabButton id="contracts" label="Gestão de Contratos" icon={FileText} />
                <TabButton id="whatsapp" label="Conexão WhatsApp" icon={QrCode} />
            </div>

            <div className="pt-6">
                {/* Finance Tab (Default) */}
                {activeTab === 'finance' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">

                        {/* Filters Toolbar */}
                        <div className="flex justify-end items-center gap-3">
                            <button
                                onClick={() => setIsTransactionModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold shadow-sm shadow-slate-200"
                            >
                                <Plus size={16} />
                                Nova Transação
                            </button>

                            {/* Scope Toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setDashboardScope('profissional')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dashboardScope === 'profissional' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Profissional
                                </button>
                                <button
                                    onClick={() => setDashboardScope('pessoal')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dashboardScope === 'pessoal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Pessoal
                                </button>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={toggleFilter}
                                    className={`flex items-center space-x-2 bg-white border px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isFilterOpen ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <Calendar size={16} className={isFilterOpen ? "text-slate-900" : "text-slate-500"} />
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
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180 text-slate-900' : 'text-slate-400'}`} />
                                </button>

                                {/* Custom Date Inputs */}
                                {dateRange === 'custom' && (
                                    <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={e => setCustomStart(e.target.value)}
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-900"
                                        />
                                        <span className="text-slate-400">-</span>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={e => setCustomEnd(e.target.value)}
                                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-900"
                                        />
                                        <button
                                            onClick={() => {
                                                setAppliedCustomStart(customStart);
                                                setAppliedCustomEnd(customEnd);
                                            }}
                                            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                                            title="Pesquisar"
                                        >
                                            <Search size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Overlay to close */}
                                {isFilterOpen && (
                                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                                )}

                                {/* Dropdown */}
                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Período</div>
                                        <button onClick={() => selectRange('today')} className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 flex items-center justify-between ${dateRange === 'today' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Hoje</span>
                                            {dateRange === 'today' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>
                                        <button onClick={() => selectRange('last7')} className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 flex items-center justify-between ${dateRange === 'last7' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Últimos 7 dias</span>
                                            {dateRange === 'last7' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>
                                        <button onClick={() => selectRange('last30')} className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 flex items-center justify-between ${dateRange === 'last30' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Últimos 30 dias</span>
                                            {dateRange === 'last30' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button onClick={() => selectRange('thisMonth')} className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 flex items-center justify-between ${dateRange === 'thisMonth' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Este Mês</span>
                                            {dateRange === 'thisMonth' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>
                                        <button onClick={() => selectRange('lastMonth')} className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 flex items-center justify-between ${dateRange === 'lastMonth' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Mês Passado</span>
                                            {dateRange === 'lastMonth' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>
                                        <button onClick={() => selectRange('nextMonth')} className={`w-full text-left px-3 py-2 text-sm rounded-lg mb-1 flex items-center justify-between ${dateRange === 'nextMonth' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Próximo Mês</span>
                                            {dateRange === 'nextMonth' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button onClick={() => selectRange('all')} className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between ${dateRange === 'all' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Todo o Período</span>
                                            {dateRange === 'all' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button onClick={() => selectRange('custom')} className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between ${dateRange === 'custom' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            <span>Personalizado</span>
                                            {dateRange === 'custom' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                                        </button>

                                    </div>

                                )}
                            </div>
                        </div>

                        {/* Metric Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* MRR (Static / Projeção) - REMOVED */}
                            {/* Churn (Static) - REMOVED */}

                            {/* Revenue (Dynamic) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Receita (Bruta)</h3>
                                    <div className="text-2xl font-black text-emerald-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.revenue)}
                                    </div>
                                    <div className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-wide">ENTRADAS</div>
                                </div>
                            </div>

                            {/* Expenses (Dynamic) */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-rose-50 rounded-xl text-rose-500 group-hover:scale-110 transition-transform">
                                        <ArrowDownRight size={20} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Despesas</h3>
                                    <div className="text-2xl font-black text-rose-500">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dynamicKPIs.expenses)}
                                    </div>
                                    <div className="text-[10px] text-rose-400 font-bold mt-1 uppercase tracking-wide">SAÍDAS</div>
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
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
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
                                                tickFormatter={(value) => {
                                                    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                                                    return `R$ ${value}`;
                                                }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                name="Receitas"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorReceita)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="expenses"
                                                name="Despesas"
                                                stroke="#f43f5e"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorDespesa)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Transactions Table */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-lg font-bold text-slate-900">Transações ({filteredTransactions.length})</h2>
                                        {selectedTransactions.size > 0 && (
                                            <button
                                                onClick={handleBulkDelete}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-xs font-bold animate-in fade-in zoom-in-95"
                                            >
                                                <Trash2 size={14} />
                                                <span>Excluir ({selectedTransactions.size})</span>
                                            </button>
                                        )}
                                    </div>
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
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10 w-16">
                                                    <input
                                                        type="checkbox"
                                                        checked={paginatedTransactions.length > 0 && selectedTransactions.size >= paginatedTransactions.length}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                                    />
                                                </th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0">Data</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-8 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedTransactions.length > 0 ? (
                                                paginatedTransactions.map((trx, i) => (
                                                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-8 py-5 pl-10">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedTransactions.has(trx.id)}
                                                                onChange={() => toggleSelectTransaction(trx.id)}
                                                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                                            />
                                                        </td>
                                                        <td className="px-8 py-5 text-sm text-slate-500 pl-0">
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
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${trx.status === 'pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                trx.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                    trx.status === 'atrasado' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                        'bg-slate-50 text-slate-700 border-slate-100'
                                                                }`}>
                                                                {trx.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right pr-8">
                                                            <TransactionMenu
                                                                transaction={trx}
                                                                onUpdate={() => {
                                                                    fetchFinancialData(); // Refresh UI
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="py-20 text-center text-slate-500">
                                                        Nenhuma transação encontrada neste período.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className="text-sm font-medium text-slate-600">
                                                Página <span className="text-slate-900 font-bold">{currentPage}</span> de <span className="text-slate-900 font-bold">{totalPages}</span>
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}
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

                {activeTab === 'whatsapp' && (
                    <WhatsAppConnectGenerator />
                )}
            </div>

        </div >
    );
};

export default AdministrationDashboard;
