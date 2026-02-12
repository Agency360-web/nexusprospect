import React, { useState } from 'react';
import { Calendar, DollarSign, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Client } from '../../types';
import { supabase } from '../../services/supabase';

interface ContractCardProps {
    client: Client;
    onUpdate: () => void;
}

const ContractCard: React.FC<ContractCardProps> = ({ client, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        startDate: client.contract_start_date ? new Date(client.contract_start_date).toISOString().split('T')[0] : '',
        value: client.contract_value?.toString() || '',
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    contract_start_date: form.startDate,
                    contract_value: parseFloat(form.value)
                })
                .eq('id', client.id);

            if (error) throw error;
            onUpdate();
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating contract:', error);
            alert('Erro ao atualizar contrato');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <FileText size={18} className="text-slate-400" />
                    <span>Informações do Contrato</span>
                </h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                    {isEditing ? 'Cancelar' : 'Editar'}
                </button>
            </div>

            {isEditing ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Início</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                            value={form.startDate}
                            onChange={e => setForm({ ...form, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Mensal</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                            value={form.value}
                            onChange={e => setForm({ ...form, value: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Início do Contrato</div>
                                <div className="text-sm font-bold text-slate-900">
                                    {client.contract_start_date ? formatDate(client.contract_start_date) : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white rounded-xl border border-emerald-100 text-emerald-600">
                                <DollarSign size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-emerald-600 uppercase">Valor Mensal</div>
                                <div className="text-sm font-bold text-emerald-900">
                                    {client.contract_value ? formatCurrency(client.contract_value) : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                            {client.status === 'active' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {client.status === 'active' ? 'Contrato Ativo' : client.status === 'overdue' ? 'Em Atraso' : 'Inativo'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractCard;
