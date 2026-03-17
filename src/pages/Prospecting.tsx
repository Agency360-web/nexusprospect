import React from 'react';
import { Target, Send, MapPin, Instagram, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, Link, Outlet } from 'react-router-dom';

const Prospecting: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();

    // Determina qual aba está ativa com base na URL
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/maps')) return 'maps';
        if (path.includes('/instagram')) return 'instagram';
        if (path.includes('/cnpj')) return 'cnpj';
        return 'messages';
    };

    const activeTab = getActiveTab();

    const TabButton = ({ id, label, icon: Icon, to }: { id: string, label: string, icon: any, to: string }) => {
        return (
            <Link
                to={to}
                className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-all duration-300 font-bold text-xs lg:text-sm ${
                    activeTab === id
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
            >
                <Icon size={16} className={activeTab === id ? 'text-brand-400' : ''} />
                <span className="whitespace-nowrap">{label}</span>
            </Link>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header - Premium Dark Hero */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center justify-center md:justify-start gap-3">
                        <Target className="text-yellow-500" size={32} />
                        Prospecção de Leads
                    </h1>
                    <p className="text-slate-300 font-medium w-full">
                        Construa a sua máquina de prospecção multicanal: Encontre, engaje e converta em piloto automático.
                    </p>
                </div>
            </div>

            {/* Tabs Nav - Premium Pills */}
            <div className="flex p-1 bg-white border border-slate-200 rounded-2xl w-full shadow-sm overflow-x-auto hide-scrollbar">
                <TabButton id="messages" to="/prospecting/messages" label="Disparo no WhatsApp" icon={Send} />
                <TabButton id="maps" to="/prospecting/maps" label="Leads no Google Maps" icon={MapPin} />
                {/* <TabButton id="instagram" to="/prospecting/instagram" label="Leads no Instagram" icon={Instagram} /> */}
                <TabButton id="cnpj" to="/prospecting/cnpj" label="Leads por CNPJ" icon={Building2} />
            </div>

            <div className="pt-6">
                {/* Aqui os componentes das abas serão renderizados (ver App.tsx) */}
                <Outlet />
            </div>
        </div>
    );
};

export default Prospecting;
