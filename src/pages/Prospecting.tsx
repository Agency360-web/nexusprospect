import React from 'react';
import { Target } from 'lucide-react';

const Prospecting: React.FC = () => {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-2 duration-300 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10 mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight flex flex-col md:flex-row items-center justify-center md:justify-start gap-3">
                        <Target className="text-yellow-500" size={32} />
                        Prospecção
                    </h1>
                    <p className="text-slate-300 font-medium text-sm md:text-base">
                        Página de prospecção em desenvolvimento.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                <Target size={48} className="text-slate-200 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Em Breve</h2>
                <p className="text-slate-500 mt-2 max-w-md">
                    As ferramentas de prospecção estarão disponíveis aqui em breve.
                </p>
            </div>
        </div>
    );
};

export default Prospecting;
