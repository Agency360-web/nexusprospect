import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Building2,
    Circle,
    MoreVertical,
    Edit2,
    Trash2
} from 'lucide-react';
import { Client } from '../../types';

interface ClientWithStats extends Client {
    onlineNumbers: number;
    totalNumbers: number;
}

interface ClientListProps {
    clients: ClientWithStats[];
    loading: boolean;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    onEdit: (e: React.MouseEvent, client: ClientWithStats) => void;
    onDelete: (e: React.MouseEvent, clientId: string) => void;
    activeMenuClientId: string | null;
    setActiveMenuClientId: (id: string | null) => void;
}

const ClientList: React.FC<ClientListProps> = ({
    clients,
    loading,
    searchTerm,
    setSearchTerm,
    onEdit,
    onDelete,
    activeMenuClientId,
    setActiveMenuClientId
}) => {
    const navigate = useNavigate();

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
                    <div className="w-12 h-12 border-4 border-brand-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-slate-400 font-medium animate-pulse">Carregando clientes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative group w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-[#ffd700] transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Buscar cliente"
                    className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#ffd700] focus:ring-4 focus:ring-[#ffd700]/20 transition-all shadow-sm group-hover:shadow-md"
                />
                <div className="hidden md:flex absolute inset-y-0 right-0 pr-4 items-center pointer-events-none">
                    <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-400 border border-slate-200">CTRL K</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-4">Cliente</div>
                    <div className="col-span-3">Contato</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Criado em</div>
                    <div className="col-span-1 text-right">Ações</div>
                </div>

                <div className="divide-y divide-slate-100">
                    {filteredClients.map(client => (
                        <div
                            key={client.id}
                            onClick={() => navigate(`/clients/${client.id}`)}
                            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                            <div className="col-span-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <Building2 size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate" title={client.name}>{client.name}</h3>
                                    <p className="text-xs text-slate-500 truncate" title={client.email || 'Sem e-mail'}>{client.email || '—'}</p>
                                </div>
                            </div>

                            <div className="col-span-3 flex items-center">
                                <span className="text-sm text-slate-600 truncate">{client.phone || client.contactPerson || '—'}</span>
                            </div>

                            <div className="col-span-2 flex items-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${client.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <Circle size={6} className={`mr-1.5 fill-current ${client.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                    {client.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>

                            <div className="col-span-2 flex items-center">
                                <span className="text-sm text-slate-500">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>

                            <div className="col-span-1 flex items-center justify-end" onClick={e => e.stopPropagation()}>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenuClientId(activeMenuClientId === client.id ? null : client.id)}
                                        className={`p-2 rounded-lg transition-all ${activeMenuClientId === client.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {activeMenuClientId === client.id && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuClientId(null)} />
                                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={(e) => { setActiveMenuClientId(null); onEdit(e, client); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                    <span>Editar</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { setActiveMenuClientId(null); onDelete(e, client.id || ''); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-rose-50 text-rose-500 text-sm font-medium transition-colors border-t border-slate-50"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Excluir</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredClients.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Building2 size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">Nenhum cliente encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientList;
