import React, { useState } from 'react';
import { Target, Send, MessageCircle, MapPin, Instagram, Building2 } from 'lucide-react';
import { WhatsAppCampaignForm } from '../components/prospecting/WhatsAppCampaignForm';

const Prospecting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'messages' | 'instagram_messages' | 'maps' | 'instagram' | 'cnpj'>('messages');

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl transition-all duration-300 font-bold text-sm ${activeTab === id
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
        >
            <Icon size={18} className={activeTab === id ? 'text-brand-400' : ''} />
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );

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
                <TabButton id="messages" label="Disparo no WhatsApp" icon={Send} />
                <TabButton id="instagram_messages" label="Disparo no Instagram" icon={Send} />
                <TabButton id="maps" label="Leads no Google Maps" icon={MapPin} />
                <TabButton id="instagram" label="Leads no Instagram" icon={Instagram} />
                <TabButton id="cnpj" label="Leads por CNPJ" icon={Building2} />
            </div>

            <div className="pt-6">
                {activeTab === 'messages' && (
                    <WhatsAppCampaignForm />
                )}

                {activeTab === 'instagram_messages' && (
                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-2 duration-300">
                        <Send size={48} className="text-slate-200 mb-4" />
                        <h2 className="text-xl font-bold text-slate-700">Em Breve</h2>
                        <p className="text-slate-500 mt-2 max-w-md">
                            As ferramentas de disparo de mensagem pelo Instagram estarão disponíveis aqui em breve.
                        </p>
                    </div>
                )}

                {activeTab === 'maps' && (
                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-2 duration-300">
                        <MapPin size={48} className="text-slate-200 mb-4" />
                        <h2 className="text-xl font-bold text-slate-700">Em Breve</h2>
                        <p className="text-slate-500 mt-2 max-w-md">
                            As ferramentas de busca de leads no Google Maps estarão disponíveis aqui em breve.
                        </p>
                    </div>
                )}

                {activeTab === 'instagram' && (
                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-2 duration-300">
                        <Instagram size={48} className="text-slate-200 mb-4" />
                        <h2 className="text-xl font-bold text-slate-700">Em Breve</h2>
                        <p className="text-slate-500 mt-2 max-w-md">
                            As ferramentas de busca de leads no Instagram estarão disponíveis aqui em breve.
                        </p>
                    </div>
                )}

                {activeTab === 'cnpj' && (
                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom-2 duration-300">
                        <Building2 size={48} className="text-slate-200 mb-4" />
                        <h2 className="text-xl font-bold text-slate-700">Em Breve</h2>
                        <p className="text-slate-500 mt-2 max-w-md">
                            As ferramentas de busca rápida de leads por CNPJ estarão disponíveis aqui em breve.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Prospecting;
