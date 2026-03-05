import React, { useState } from 'react';
import { Smartphone, Download, UserPlus, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ContactExtraction from '../components/whatsapp-tool/ContactExtraction';
import ContactAdder from '../components/whatsapp-tool/ContactAdder';

const WhatsAppTool: React.FC = () => {
    const { user } = useAuth();
    const isGlobalAdmin = user?.email === 'marketing@conectaperformance.com.br';

    const [activeTab, setActiveTab] = useState<'extraction' | 'add_contacts'>('extraction');

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab; label: string; icon: any }) => {
        const isLocked = !isGlobalAdmin;

        return (
            <button
                type="button"
                onClick={() => {
                    if (isLocked) return;
                    setActiveTab(id);
                }}
                className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-all duration-300 font-bold text-xs lg:text-sm ${isLocked
                    ? 'cursor-not-allowed text-slate-400 bg-slate-50 opacity-90'
                    : activeTab === id
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
            >
                <Icon size={16} className={activeTab === id && !isLocked ? 'text-brand-400' : ''} />
                <span className="whitespace-nowrap">{label}</span>
                {isLocked && (
                    <div className="flex items-center gap-1 ml-0.5 bg-slate-200/50 p-1.5 rounded-md text-red-400">
                        <Lock size={12} strokeWidth={2.5} />
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header - Premium Dark Hero */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center justify-center md:justify-start gap-3">
                        <Smartphone className="text-yellow-500" size={32} />
                        WhatsApp Tool
                    </h1>
                    <p className="text-slate-300 font-medium w-full">
                        Ferramentas avançadas para gerenciar seus contatos no WhatsApp: extraia e adicione contatos em massa.
                    </p>
                </div>
            </div>

            {/* Tabs Nav - Premium Pills */}
            <div className="flex p-1 bg-white border border-slate-200 rounded-2xl w-full shadow-sm overflow-x-auto hide-scrollbar">
                <TabButton id="extraction" label="Extração de Números" icon={Download} />
                <TabButton id="add_contacts" label="Adicionar Contatos" icon={UserPlus} />
            </div>

            <div className="pt-6">
                {isGlobalAdmin && activeTab === 'extraction' && <ContactExtraction />}
                {isGlobalAdmin && activeTab === 'add_contacts' && <ContactAdder />}
                {!isGlobalAdmin && (
                    <div className="text-center py-16 text-slate-400">
                        <Lock size={48} className="mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-600 mb-1">Acesso Restrito</h3>
                        <p className="text-sm">Esta funcionalidade ainda não está disponível para o seu perfil.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppTool;
