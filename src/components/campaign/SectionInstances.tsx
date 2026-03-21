import React, { useEffect, useState } from 'react';
import { Smartphone, RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

export type WhatsAppInstance = {
    id: string;
    name: string;
    instanceName: string; // The actual uazapi instance ID/name
    token: string;
    phone_number: string | null;
    status: string;
    active: boolean;
};

interface Props {
    instances: WhatsAppInstance[];
    setInstances: React.Dispatch<React.SetStateAction<WhatsAppInstance[]>>;
}

const SectionInstances: React.FC<Props> = ({ instances, setInstances }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConnections = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            if (data) {
                // Map the DB connections to our local state
                // Keep the active state if it was already selected previously
                setInstances(prevInstances => {
                    return data.map(conn => {
                        const existing = prevInstances.find(i => i.id === conn.id.toString());
                        return {
                            id: conn.id.toString(),
                            name: conn.profile_name || conn.instance,
                            instanceName: conn.instance,
                            token: conn.token || '',
                            phone_number: conn.phone_number,
                            status: conn.status,
                            active: existing ? existing.active : conn.status === 'connected', // By default, select if connected
                        };
                    });
                });
            }
        } catch (err: any) {
            console.error('Error fetching whatsapp connections:', err);
            setError('Não foi possível carregar as instâncias. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    const toggleActive = (id: string) => {
        setInstances(instances.map(inst => 
            inst.id === id ? { ...inst, active: !inst.active } : inst
        ));
    };

    const activeCount = instances.filter(i => i.active).length;

    return (
        <section id="sec-4" className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="flex items-center gap-2 text-base font-bold text-slate-800">
                        <Smartphone className="text-slate-700" size={18} />
                        4. Instâncias WhatsApp (Chips)
                    </h4>
                    <p className="text-slate-500 text-sm mt-1">Selecione as conexões que farão os disparos desta campanha.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        type="button" 
                        onClick={fetchConnections}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Recarregar Instâncias"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {activeCount} Selecionado{activeCount !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="animate-spin text-slate-300 mb-2" size={24} />
                    <p className="text-sm text-slate-500 font-medium">Buscando instâncias...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm font-medium text-center border border-red-100">
                    {error}
                </div>
            ) : instances.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-md border border-dashed border-slate-200">
                    <Smartphone size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 font-medium mb-1">Nenhuma instância encontrada.</p>
                    <p className="text-xs text-slate-400">Acesse Conexões do WhatsApp nas configurações e conecte um aparelho.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {instances.map((instance) => {
                        const isConnected = instance.status === 'connected';
                        return (
                            <div 
                                key={instance.id} 
                                onClick={() => toggleActive(instance.id)}
                                className={`border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center cursor-pointer transition-all ${instance.active ? 'bg-yellow-50/50 border-yellow-400 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'} ${!isConnected && 'opacity-60 cursor-not-allowed'}`}
                            >
                                <div className="flex-1 flex items-center gap-4 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <Smartphone size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h5 className="font-bold text-slate-800 text-sm truncate">{instance.name}</h5>
                                            <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                                                {isConnected ? 'Conectado' : 'Desconectado'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {instance.phone_number && (
                                                <span className="text-xs text-slate-500">{instance.phone_number}</span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100">{instance.instanceName}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center w-full md:w-auto justify-end md:pl-4 md:border-l border-slate-200">
                                    <div className="relative inline-flex items-center">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={instance.active}
                                            disabled={!isConnected}
                                            readOnly
                                        />
                                        <div className={`block w-10 h-6 rounded-full transition-colors ${instance.active ? 'bg-[#F9C300]' : 'bg-slate-300'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${instance.active ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className="ml-3 font-bold text-[11px] text-slate-500 uppercase tracking-wide w-16 text-right">
                                        {instance.active ? 'Usar' : 'Não Usar'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default SectionInstances;
