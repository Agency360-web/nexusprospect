import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contract } from '../types';
import { Plus, Search, FileText, MoreHorizontal, Download, Clock, CheckCircle2, Send, Trash2, Edit2, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ContractGeneratorModal from './ContractGeneratorModal';
import ContractViewerModal from './ContractViewerModal';

const ContractManager: React.FC = () => {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewContract, setViewContract] = useState<Contract | null>(null);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [activeMenuContractId, setActiveMenuContractId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchContracts();
        }
    }, [user]);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('contracts')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (data) setContracts(data);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.')) return;

        try {
            const { error } = await supabase.from('contracts').delete().eq('id', id);
            if (error) throw error;
            fetchContracts();
        } catch (error) {
            console.error('Error deleting contract:', error);
            alert('Erro ao excluir contrato');
        }
    };

    const handleEdit = (e: React.MouseEvent, contract: Contract) => {
        e.stopPropagation();
        setEditingContract(contract);
        setIsModalOpen(true);
    };

    const filteredContracts = contracts.filter(c =>
        c.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar contratos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900 transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                >
                    <Plus size={18} />
                    <span>Novo Contrato</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    </div>
                ) : contracts.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">Cliente</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Criação</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                                <th className="px-8 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredContracts.map((contract) => (
                                <tr
                                    key={contract.id}
                                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                    onClick={() => setViewContract(contract)}
                                >
                                    <td className="px-8 py-5 pl-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{contract.client_name}</div>
                                                <div className="text-xs text-slate-500 font-mono">#{contract.id.substring(0, 8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${contract.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            contract.status === 'generated' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {contract.status === 'signed' && <CheckCircle2 size={10} className="mr-1" />}
                                            {contract.status === 'generated' && <Clock size={10} className="mr-1" />}
                                            {contract.status === 'sent_to_signature' && <Send size={10} className="mr-1" />}
                                            {contract.status === 'draft' && <FileText size={10} className="mr-1" />}
                                            {contract.status === 'signed' ? 'Assinado' :
                                                contract.status === 'generated' ? 'Gerado' :
                                                    contract.status === 'sent_to_signature' ? 'Enviado' : 'Rascunho'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-sm text-slate-500">
                                        {new Date(contract.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-8 py-5 text-sm font-black text-slate-900">
                                        {contract.variables.valor_total ? contract.variables.valor_total : '-'}
                                    </td>
                                    <td className="px-8 py-5 text-right pr-8 relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuContractId(activeMenuContractId === contract.id ? null : contract.id);
                                            }}
                                            className={`transition-all ${activeMenuContractId === contract.id ? 'text-slate-900 opacity-100' : 'text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100'}`}
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>

                                        {activeMenuContractId === contract.id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuContractId(null);
                                                    }}
                                                />
                                                <div className="absolute right-8 top-10 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenuContractId(null);
                                                            setViewContract(contract);
                                                        }}
                                                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
                                                    >
                                                        <Eye size={16} />
                                                        <span>Visualizar</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            setActiveMenuContractId(null);
                                                            handleEdit(e, contract);
                                                        }}
                                                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors border-t border-slate-50"
                                                    >
                                                        <Edit2 size={16} />
                                                        <span>Editar</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            setActiveMenuContractId(null);
                                                            handleDelete(e, contract.id);
                                                        }}
                                                        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-rose-50 text-rose-500 text-sm font-medium transition-colors border-t border-slate-50"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span>Excluir</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <FileText size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Nenhum contrato encontrado</h3>
                        <p className="max-w-xs text-center text-sm mb-6">Você ainda não gerou nenhum contrato. Comece criando um novo agora.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors text-sm"
                        >
                            Criar Primeiro Contrato
                        </button>
                    </div>
                )}
            </div>

            <ContractGeneratorModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingContract(null);
                }}
                onSuccess={fetchContracts}
                contractToEdit={editingContract}
            />

            <ContractViewerModal
                isOpen={!!viewContract}
                onClose={() => setViewContract(null)}
                contract={viewContract}
                onUpdate={() => {
                    fetchContracts();
                    // Optionally keep modal open or close it
                }}
            />
        </div>
    );
};

export default ContractManager;
