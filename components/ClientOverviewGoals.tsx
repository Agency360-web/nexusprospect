import React, { useState, useEffect, useCallback } from 'react';
import { Target, Mail, Smartphone } from 'lucide-react';
import { Goal, GoalsMetric } from '../types';
import { supabase } from '../lib/supabase';

interface ClientOverviewGoalsProps {
    clientId: string;
}

const ClientOverviewGoals: React.FC<ClientOverviewGoalsProps> = ({ clientId }) => {
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [actuals, setActuals] = useState<{
        email: number;
        whatsapp: number;
    }>({
        email: 0,
        whatsapp: 0
    });

    const activeMonth = new Date().getMonth();
    const activeYear = new Date().getFullYear();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch Goals for current month
            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .eq('client_id', clientId)
                .eq('month', activeMonth + 1)
                .eq('year', activeYear);

            if (goalsError) console.error('Error fetching goals:', goalsError);

            // Map DB to Frontend
            const mappedGoals: Goal[] = (goalsData || []).map((g: any) => ({
                id: g.id,
                clientId: g.client_id,
                month: g.month - 1,
                year: g.year,
                channel: g.channel,
                monthlyTarget: g.monthly_target,
                annualTarget: g.annual_target,
                weeklyTargets: g.weekly_targets || [0, 0, 0, 0]
            }));

            // Ensure we have goal objects
            const channels: ('email' | 'whatsapp')[] = ['email', 'whatsapp'];
            const completeGoals = channels.map(ch => {
                const existing = mappedGoals.find(mg => mg.channel === ch);
                return existing || {
                    id: `temp_${ch}`,
                    clientId,
                    month: activeMonth,
                    year: activeYear,
                    channel: ch,
                    monthlyTarget: 0,
                    annualTarget: 0,
                    weeklyTargets: [0, 0, 0, 0]
                };
            });

            setGoals(completeGoals);

            // 2. Fetch Actuals (Transmissions) for current month
            const startOfMonth = new Date(activeYear, activeMonth, 1).toISOString();
            const endOfMonth = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59).toISOString();

            const { data: transmissions, error: txError } = await supabase
                .from('transmissions')
                .select('channel', { count: 'exact' })
                .eq('client_id', clientId)
                .gte('created_at', startOfMonth)
                .lte('created_at', endOfMonth);

            // Note: Since we need counts per channel, we should probably group or filter. 
            // For efficiency with small data, fetching all records is OK, but strictly we should use .select with count or separate queries.
            // Let's do simple fetching for now as reuse.

            const { data: allTransmissions } = await supabase
                .from('transmissions')
                .select('channel')
                .eq('client_id', clientId)
                .gte('created_at', startOfMonth)
                .lte('created_at', endOfMonth);

            const newActuals = { email: 0, whatsapp: 0 };
            (allTransmissions || []).forEach((t: any) => {
                if (t.channel === 'email') newActuals.email++;
                if (t.channel === 'whatsapp') newActuals.whatsapp++;
            });

            setActuals(newActuals);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [clientId, activeMonth, activeYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const calculatePercentage = (target: number, actual: number) => {
        if (!target || target === 0) return 0;
        return Math.min(Math.round((actual / target) * 100), 100);
    };

    const renderCard = (channel: 'email' | 'whatsapp', icon: any, label: string, colorClass: string, ringColor: string) => {
        const goal = goals.find(g => g.channel === channel);
        const target = goal?.monthlyTarget || 0;
        const actual = actuals[channel];
        const percentage = calculatePercentage(target, actual);

        return (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-4 z-10">
                    <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
                        {icon}
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                        <div className="flex items-baseline space-x-1">
                            <span className="text-xl font-black text-slate-900">{actual.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 font-medium">/ {target.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="relative w-14 h-14 z-10">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                        <circle
                            cx="28" cy="28" r="24"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={150.8}
                            strokeDashoffset={150.8 - (150.8 * percentage) / 100}
                            className={`${ringColor} transition-all duration-1000`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        {percentage}%
                    </div>
                </div>

                {/* Decorative BG */}
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${colorClass} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
            </div>
        );
    };

    if (loading) return <div className="animate-pulse h-24 bg-slate-100 rounded-2xl"></div>;

    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <Target size={18} className="text-slate-400" />
                    <span>Metas de Disparo (Mês Atual)</span>
                </h3>
                <div className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                    Atualizado em tempo real
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderCard('whatsapp', <Smartphone size={20} className="text-emerald-600" />, 'WhatsApp', 'bg-emerald-50 text-emerald-600', 'text-emerald-500')}
                {renderCard('email', <Mail size={20} className="text-blue-600" />, 'E-mail', 'bg-blue-50 text-blue-600', 'text-blue-500')}
            </div>
        </div>
    );
};

export default ClientOverviewGoals;
