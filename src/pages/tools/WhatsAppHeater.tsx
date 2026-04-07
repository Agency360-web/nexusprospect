import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, ArrowRightLeft, Smartphone, AlertCircle, ArrowLeft, Flame, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface HeatingConfig {
    id: string;
    user_id: string;
    instance_1_id: string;
    instance_1_name: string;
    instance_1_number: string | null;
    instance_1_token: string | null;
    instance_1_instance_id: string | null;
    instance_2_id: string;
    instance_2_name: string;
    instance_2_number: string | null;
    instance_2_token: string | null;
    instance_2_instance_id: string | null;
    is_active: boolean;
    created_at: string;
}

const getInstanceDisplayName = (instance: any): string => {
    return instance.profile_name || instance.instance || instance.instance_name || instance.name || `Instância ${String(instance.id || '').slice(0, 8)}`;
};

const WhatsAppHeater: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data State
    const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);
    const [heatings, setHeatings] = useState<HeatingConfig[]>([]);

    // Selection State
    const [selectedInstance1Id, setSelectedInstance1Id] = useState<string>('');
    const [selectedInstance2Id, setSelectedInstance2Id] = useState<string>('');

    // Action State
    const [isSaving, setIsSaving] = useState(false);
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch Instances
    const fetchInstances = async () => {
        try {
            const { data, error } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setWhatsappInstances(data || []);
        } catch (err) {
            console.error('Error fetching instances:', err);
        }
    };

    // Fetch saved heatings
    const fetchHeatings = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('whatsapp_heatings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setHeatings(data || []);
        } catch (err) {
            console.error('Error fetching heatings:', err);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchInstances();
            fetchHeatings();
        }
    }, [user, fetchHeatings]);

    // Save a new heating config
    const handleSaveHeating = async () => {
        if (!selectedInstance1Id || !selectedInstance2Id || !user) return;

        const instance1 = whatsappInstances.find(i => String(i.id) === String(selectedInstance1Id));
        const instance2 = whatsappInstances.find(i => String(i.id) === String(selectedInstance2Id));

        if (!instance1 || !instance2) return;

        setIsSaving(true);
        setErrorMessage(null);

        try {
            const { error } = await supabase
                .from('whatsapp_heatings')
                .insert({
                    user_id: user.id,
                    instance_1_id: String(instance1.id),
                    instance_1_name: instance1.instance || getInstanceDisplayName(instance1),
                    instance_1_number: instance1.phone_number || null,
                    instance_1_token: instance1.token || null,
                    instance_1_instance_id: instance1.instance_id || null,
                    instance_2_id: String(instance2.id),
                    instance_2_name: instance2.instance || getInstanceDisplayName(instance2),
                    instance_2_number: instance2.phone_number || null,
                    instance_2_token: instance2.token || null,
                    instance_2_instance_id: instance2.instance_id || null,
                    is_active: false,
                });

            if (error) throw error;

            // Reset selectors and refresh
            setSelectedInstance1Id('');
            setSelectedInstance2Id('');
            await fetchHeatings();
        } catch (err) {
            console.error('Error saving heating:', err);
            setErrorMessage('Erro ao salvar a configuração de aquecimento.');
        } finally {
            setIsSaving(false);
        }
    };

    // Toggle heating on/off
    const handleToggle = async (heating: HeatingConfig) => {
        const newState = !heating.is_active;

        setTogglingIds(prev => new Set(prev).add(heating.id));

        try {
            const { error } = await supabase
                .from('whatsapp_heatings')
                .update({ is_active: newState })
                .eq('id', heating.id);

            if (error) throw error;

            // Update local state
            setHeatings(prev =>
                prev.map(h => h.id === heating.id ? { ...h, is_active: newState } : h)
            );
        } catch (err) {
            console.error('Error toggling heating:', err);
        } finally {
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.delete(heating.id);
                return next;
            });
        }
    };

    // Delete a heating config
    const handleDelete = async (heatingId: string) => {
        if (!window.confirm('Tem certeza que deseja remover este aquecimento?')) return;

        try {
            const { error } = await supabase
                .from('whatsapp_heatings')
                .delete()
                .eq('id', heatingId);

            if (error) throw error;
            setHeatings(prev => prev.filter(h => h.id !== heatingId));
        } catch (err) {
            console.error('Error deleting heating:', err);
        }
    };

    // Disabled state
    const isSaveDisabled = !selectedInstance1Id || !selectedInstance2Id || isSaving || String(selectedInstance1Id) === String(selectedInstance2Id);

    return (
        <div className="flex flex-col gap-6 lg:gap-8 pb-20 animate-in fade-in duration-300">
            {/* Header - Dark Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <button
                        onClick={() => navigate('/tools')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-slate-300 hover:text-white"
                        title="Voltar para Ferramentas"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                            <Flame className="text-brand-500" size={32} />
                            Aquecedor de WhatsApp
                        </h1>
                        <p className="text-slate-300 font-medium text-sm md:text-base">Selecione duas instâncias para realizarem interações automáticas entre si.</p>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-xl text-sm font-medium border border-rose-100 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {errorMessage}
                </div>
            )}

            {/* Unified Toolbar */}
            <div className="transition-all duration-500">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">

                    {/* Selectors */}
                    <div className="flex flex-col md:flex-row gap-3 flex-1 w-full items-center">
                        {/* Instance 1 Select */}
                        <div className="relative flex-1 group w-full">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                <Smartphone size={16} />
                            </div>
                            <select
                                value={selectedInstance1Id}
                                onChange={(e) => setSelectedInstance1Id(e.target.value)}
                                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                            >
                                <option value="" disabled>1. WhatsApp 1</option>
                                {whatsappInstances.map(instance => (
                                    <option key={instance.id} value={instance.id} disabled={String(instance.id) === String(selectedInstance2Id)}>
                                        {getInstanceDisplayName(instance)} {instance.status !== 'connected' ? '(Desconectada)' : ''}
                                    </option>
                                ))}
                            </select>
                            <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10 w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Exchange Icon */}
                        <div className="hidden md:flex items-center justify-center flex-shrink-0">
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-full">
                                <ArrowRightLeft size={14} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Instance 2 Select */}
                        <div className="relative flex-1 group w-full">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors pointer-events-none z-10">
                                <Smartphone size={16} />
                            </div>
                            <select
                                value={selectedInstance2Id}
                                onChange={(e) => setSelectedInstance2Id(e.target.value)}
                                className="w-full appearance-none bg-slate-50 hover:bg-white border border-slate-200 py-2.5 pl-9 pr-8 font-medium text-sm text-slate-700 rounded-xl cursor-pointer focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all relative z-0"
                            >
                                <option value="" disabled>2. WhatsApp 2</option>
                                {whatsappInstances.map(instance => (
                                    <option key={instance.id} value={instance.id} disabled={String(instance.id) === String(selectedInstance1Id)}>
                                        {getInstanceDisplayName(instance)} {instance.status !== 'connected' ? '(Desconectada)' : ''}
                                    </option>
                                ))}
                            </select>
                            <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:translate-y-0.5 z-10 w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleSaveHeating}
                            disabled={isSaveDisabled}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Salvar Aquecimento
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Heatings List Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Table Header */}
                <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp 1</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp 2</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Ligar / Desligar</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center"></span>
                </div>

                {/* Table Body */}
                {heatings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <Flame size={40} strokeWidth={1.5} className="text-slate-300" />
                        <p className="font-bold text-sm text-slate-500">Nenhum aquecimento configurado.</p>
                        <p className="text-xs text-slate-400">Selecione dois WhatsApps acima e clique em "Salvar Aquecimento".</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {heatings.map((heating) => (
                            <div
                                key={heating.id}
                                className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                            >
                                {/* WhatsApp 1 */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <Smartphone size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 truncate">{heating.instance_1_name}</span>
                                </div>

                                {/* WhatsApp 2 */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <Smartphone size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 truncate">{heating.instance_2_name}</span>
                                </div>

                                {/* Toggle Switch */}
                                <div className="flex items-center justify-center">
                                    <button
                                        onClick={() => handleToggle(heating)}
                                        disabled={togglingIds.has(heating.id)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                                            heating.is_active
                                                ? 'bg-emerald-500 focus:ring-emerald-300'
                                                : 'bg-slate-300 focus:ring-slate-300'
                                        }`}
                                        title={heating.is_active ? 'Desligar aquecimento' : 'Ligar aquecimento'}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                                                heating.is_active ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Delete Button */}
                                <div className="flex items-center justify-center">
                                    <button
                                        onClick={() => handleDelete(heating.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                        title="Remover aquecimento"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppHeater;
