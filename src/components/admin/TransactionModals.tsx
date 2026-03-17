import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus } from 'lucide-react';
import { Transaction } from '../../types/admin';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user_id: string;
    defaultCategory: 'profissional';
    editingTransaction?: Transaction | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess, user_id, defaultCategory, editingTransaction }) => {
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState<'pessoal' | 'profissional'>(defaultCategory);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [clientName, setClientName] = useState('');
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
    const [loading, setLoading] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceCount, setRecurrenceCount] = useState(1);

    useEffect(() => {
        if (editingTransaction) {
            setType(editingTransaction.amount >= 0 ? 'income' : 'expense');
            setCategory('profissional');
            setDescription(editingTransaction.description);
            setAmount(Math.abs(editingTransaction.amount).toString().replace('.', ','));
            setClientName(editingTransaction.client_name);

            const d = new Date(editingTransaction.transaction_date);
            const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            setDate(localDate);

            setStatus(editingTransaction.status === 'pago' ? 'pago' : 'pendente');
        } else {
            setType('income');
            setCategory('profissional');
            setDescription('');
            setAmount('');
            setClientName('');
            setDate(new Date().toLocaleDateString('en-CA'));
            setStatus('pago');
        }
    }, [editingTransaction, isOpen, defaultCategory]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
            if (isNaN(numericAmount)) throw new Error("Valor inválido");

            const finalAmount = type === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

            if (editingTransaction) {
                const { error } = await supabase
                    .from('financial_transactions')
                    .update({
                        description,
                        amount: finalAmount,
                        transaction_date: new Date(date + 'T12:00:00').toISOString(),
                        status,
                        client_name: clientName,
                        category,
                        manual_override: true
                    })
                    .eq('id', editingTransaction.id);

                if (error) throw error;
            } else {
                const transactionsToInsert = [];
                const baseDate = new Date(date + 'T12:00:00');
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
            }
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
                    <h3 className="text-xl font-bold text-slate-900">
                        {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                    </h3>
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
                            Receita
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Despesa
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descrição</label>
                        <input
                            required
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                            placeholder="Ex: Consultoria, Servidor"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valor</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                            <input
                                required
                                type="text"
                                value={amount}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^\d,]/g, '');
                                    setAmount(val);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
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
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none appearance-none"
                            >
                                <option value="pago">Pago</option>
                                <option value="pendente">Pendente</option>
                            </select>
                        </div>
                    </div>

                    {!editingTransaction && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="recurrence"
                                    checked={isRecurring}
                                    onChange={e => setIsRecurring(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <label htmlFor="recurrence" className="text-sm font-medium text-slate-700">Repetir parcelas?</label>
                            </div>

                            {isRecurring && (
                                <div className="animate-in slide-in-from-top-1 duration-200">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Número de Meses</label>
                                    <input
                                        type="number"
                                        min="2"
                                        value={recurrenceCount}
                                        onChange={e => setRecurrenceCount(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cliente / Fornecedor</label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Nome opcional"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${loading ? 'bg-slate-300' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                        {loading ? 'Salvando...' : 'Salvar Transação'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TransactionModal;
