import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    MoreHorizontal, 
    DollarSign, 
    ArrowDownRight, 
    Trash2, 
    Edit2, 
    Search, 
    CheckCircle2,
    ChevronLeft,
    ChevronRight 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Transaction } from '../../types/admin';

interface TransactionMenuProps {
    transaction: Transaction;
    onUpdate: () => void;
    onEdit: (trx: Transaction) => void;
}

const TransactionMenu: React.FC<TransactionMenuProps> = ({ transaction, onUpdate, onEdit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [menuStyle, setMenuStyle] = useState<{ top?: number, bottom?: number, left?: number, right?: number }>({});
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleMenu = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 200;

            const newStyle: any = {
                right: window.innerWidth - rect.right,
            };

            if (spaceBelow < menuHeight) {
                newStyle.bottom = window.innerHeight - rect.top + 4;
            } else {
                newStyle.top = rect.bottom + 4;
            }

            setMenuStyle(newStyle);
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleScroll = () => { if (isOpen) setIsOpen(false); };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

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

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onEdit(transaction);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                        >
                            <Edit2 size={14} />
                            <span>Editar</span>
                        </button>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

interface TransactionTableProps {
    transactions: Transaction[];
    selectedTransactions: Set<string>;
    toggleSelectAll: () => void;
    toggleSelectTransaction: (id: string) => void;
    handleBulkDelete: () => void;
    fetchFinancialData: () => void;
    onEdit: (t: Transaction) => void;
    currentPage: number;
    totalPages: number;
    setCurrentPage: (page: number) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ 
    transactions, 
    selectedTransactions, 
    toggleSelectAll, 
    toggleSelectTransaction, 
    handleBulkDelete,
    fetchFinancialData,
    onEdit,
    currentPage,
    totalPages,
    setCurrentPage
}) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Transações Recentes</h2>
                        <p className="text-xs text-slate-500 mt-1">Histórico completo de movimentações</p>
                    </div>
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
                    <div className="relative group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar transações..."
                            className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10 w-16">
                                <input
                                    type="checkbox"
                                    checked={transactions.length > 0 && selectedTransactions.size >= transactions.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                />
                            </th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0">Data</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente / Descrição</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoria</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {transactions.length > 0 ? (
                            transactions.map((trx) => (
                                <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-8 py-5 pl-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedTransactions.has(trx.id)}
                                            onChange={() => toggleSelectTransaction(trx.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                        />
                                    </td>
                                    <td className="px-8 py-5 text-sm text-slate-500 pl-0 font-medium">
                                        {(() => {
                                            const d = new Date(trx.transaction_date);
                                            return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString();
                                        })()}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-900 text-sm">{trx.client_name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{trx.description}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-slate-100 text-slate-600 border-slate-200">
                                            Profissional
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-black text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trx.amount)}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                                            trx.status === 'pago' ? 'bg-emerald-100 text-emerald-700' :
                                            trx.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                                            trx.status === 'atrasado' ? 'bg-rose-100 text-rose-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {trx.status === 'pago' && <CheckCircle2 size={12} className="mr-1" />}
                                            {trx.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right pr-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TransactionMenu
                                            transaction={trx}
                                            onUpdate={fetchFinancialData}
                                            onEdit={onEdit}
                                        />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-full">
                                            <Search size={32} />
                                        </div>
                                        <p>Nenhuma transação encontrada neste período.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Página <span className="text-slate-900">{currentPage}</span> de <span className="text-slate-900">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionTable;
