import React from 'react';
import { Building2, Plus } from 'lucide-react';

interface ClientHeaderProps {
    onNewClient: () => void;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ onNewClient }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight flex flex-col md:flex-row items-center gap-3">
                    <Building2 className="text-yellow-500" size={32} />
                    Gestão de Clientes
                </h1>
                <p className="text-slate-300 font-medium text-sm md:text-base">Administre seus tenants, configure ambientes isolados e monitore o status de cada operação.</p>
            </div>
            <div className="relative z-10 w-full md:w-auto">
                <button
                    onClick={onNewClient}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95 text-sm md:text-base"
                >
                    <Plus size={20} />
                    <span>Novo Cliente</span>
                </button>
            </div>
        </div>
    );
};

export default ClientHeader;
