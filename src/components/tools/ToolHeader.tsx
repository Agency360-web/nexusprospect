import React from 'react';
import { Wrench } from 'lucide-react';

const ToolHeader: React.FC = () => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 text-center md:text-left">
                <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                    <Wrench className="text-yellow-500" size={32} />
                    Ferramentas
                </h1>
                <p className="text-slate-300 font-medium text-sm md:text-base">Acesse todas as ferramentas exclusivas e utilitários para otimizar suas operações.</p>
            </div>
        </div>
    );
};

export default ToolHeader;
