import React, { useState, useEffect, useCallback } from 'react';
import { Target, Mail, Smartphone, TrendingUp, AlertCircle, CheckCircle2, Save, Loader2 } from 'lucide-react';
import { Goal, GoalsMetric } from '../types';
import { supabase } from '../services/supabase';

interface ClientGoalsProps {
    clientId: string;
}

const ClientGoals: React.FC<ClientGoalsProps> = ({ clientId }) => {
    const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
    const [activeYear, setActiveYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [goals, setGoals] = useState<Goal[]>([]);
    const [actuals, setActuals] = useState<{
        email: { weekly: number[]; total: number };
        whatsapp: { weekly: number[]; total: number };
    }>({
        email: { weekly: [0, 0, 0, 0], total: 0 },
        whatsapp: { weekly: [0, 0, 0, 0], total: 0 }
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch Goals
            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .eq('client_id', clientId)
                .eq('month', activeMonth + 1) // DB is 1-indexed for months
                .eq('year', activeYear);

            if (goalsError) {
                console.error('Error fetching goals:', goalsError);
            }

            // Map DB to Frontend
            const mappedGoals: Goal[] = (goalsData || []).map((g: any) => ({
                id: g.id,
                clientId: g.client_id,
                month: g.month - 1, // Convert back to 0-indexed for JS Date
                year: g.year,
                channel: g.channel,
                monthlyTarget: g.monthly_target,
                annualTarget: g.annual_target,
                weeklyTargets: g.weekly_targets || [0, 0, 0, 0]
            }));

            // Ensure we have goal objects for both channels even if DB is empty
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

            // 2. Fetch Actuals (Transmissions)
            const startOfMonth = new Date(activeYear, activeMonth, 1).toISOString();
            const endOfMonth = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59).toISOString();

            const { data: transmissions, error: txError } = await supabase
                .from('transmissions')
                .select('channel, created_at')
                .eq('client_id', clientId)
                .gte('created_at', startOfMonth)
                .lte('created_at', endOfMonth);

            if (txError) console.error('Error fetching actuals:', txError);

            const newActuals = {
                email: { weekly: [0, 0, 0, 0], total: 0 },
                whatsapp: { weekly: [0, 0, 0, 0], total: 0 }
            };

            (transmissions || []).forEach((t: any) => {
                const d = new Date(t.created_at);
                const day = d.getDate();
                // Simple week approx: 1-7, 8-14, 15-21, 22+
                let weekIdx = 0;
                if (day > 21) weekIdx = 3;
                else if (day > 14) weekIdx = 2;
                else if (day > 7) weekIdx = 1;

                if (t.channel === 'email') {
                    newActuals.email.total++;
                    newActuals.email.weekly[weekIdx]++;
                } else if (t.channel === 'whatsapp') {
                    newActuals.whatsapp.total++;
                    newActuals.whatsapp.weekly[weekIdx]++;
                }
            });

            setActuals(newActuals);

        } catch (err) {
            console.error('Unexpected error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, [clientId, activeMonth, activeYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMonthlyChange = (channel: 'email' | 'whatsapp', value: string) => {
        const numValue = parseInt(value) || 0;
        const weeklyValue = Math.floor(numValue / 4);

        setGoals(prev => prev.map(g => {
            if (g.channel === channel) {
                const newWeeks = [weeklyValue, weeklyValue, weeklyValue, weeklyValue];
                return { ...g, monthlyTarget: numValue, weeklyTargets: newWeeks };
            }
            return g;
        }));
    };

    const handleAnnualChange = (channel: 'email' | 'whatsapp', value: string) => {
        const numValue = parseInt(value) || 0;
        setGoals(prev => prev.map(g => {
            if (g.channel === channel) {
                return { ...g, annualTarget: numValue };
            }
            return g;
        }));
    };

    const saveGoals = async () => {
        setSaving(true);
        try {
            const payload = goals.map(g => ({
                client_id: clientId,
                month: activeMonth + 1, // DB 1-indexed
                year: activeYear,
                channel: g.channel,
                monthly_target: g.monthlyTarget,
                annual_target: g.annualTarget,
                weekly_targets: g.weeklyTargets
            }));

            const { error } = await supabase
                .from('goals')
                .upsert(payload, { onConflict: 'client_id,month,year,channel' });

            if (error) {
                console.error('Error saving goals:', error);
                alert('Erro ao salvar metas');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const calculateMetric = (target: number, actual: number): GoalsMetric => {
        const percentage = target > 0 ? Math.round((actual / target) * 100) : 0;
        const remaining = Math.max(0, 100 - percentage);
        let status: GoalsMetric['status'] = 'pending';
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 100) status = 'completed';
        else if (percentage >= 80) status = 'on_track';

        return { target, actual, percentage, remaining, status };
    };

    const renderChannelBlock = (channel: 'email' | 'whatsapp', icon: any, label: string, colorClass: string) => {
        const goal = goals.find(g => g.channel === channel) || {
            id: 'temp', clientId, month: activeMonth, year: activeYear, channel, weeklyTargets: [0, 0, 0, 0], monthlyTarget: 0, annualTarget: 0
        };
        const channelActuals = actuals[channel];

        const monthlyMetric = calculateMetric(goal.monthlyTarget, channelActuals.total);

        return (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className={`p-6 border-b border-slate-100 flex items-center justify-between ${channel === 'whatsapp' ? 'bg-emerald-50/50' : 'bg-blue-50/50'}`}>
                    <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-xl ${colorClass} bg-white shadow-sm`}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Metas de {label}</h3>
                            <p className="text-xs text-slate-500 font-medium">Acompanhamento Semanal & Mensal</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Realizado Mês</div>
                            <div className="text-xl font-black text-slate-900">{channelActuals.total.toLocaleString()}</div>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta Mês</div>
                            <div className="text-xl font-black text-slate-900">{goal.monthlyTarget.toLocaleString()}</div>
                        </div>
                        <div className="pl-4">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * Math.min(monthlyMetric.percentage, 100)) / 100} className={`${channel === 'whatsapp' ? 'text-emerald-500' : 'text-blue-500'} transition-all duration-1000`} />
                                </svg>
                                <span className="absolute text-xs font-bold text-slate-700">{monthlyMetric.percentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[0, 1, 2, 3].map((weekIdx) => {
                            const target = goal.weeklyTargets[weekIdx] || 0;
                            const actual = channelActuals.weekly[weekIdx] || 0;
                            const metric = calculateMetric(target, actual);

                            return (
                                <div key={weekIdx} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semana {weekIdx + 1}</label>
                                        {target > 0 && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${metric.percentage >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {metric.percentage}%
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative overflow-hidden">
                                        <div>
                                            <span className="text-[10px] font-semibold text-slate-400">Meta Auto</span>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={target || ''}
                                                    disabled
                                                    className="w-full bg-slate-200/50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 cursor-not-allowed"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] items-end mb-1">
                                                <span className="font-semibold text-slate-400">Realizado</span>
                                                <span className={`font-bold ${actual >= target && target > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{actual}</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${actual >= target && target > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                                    style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-end gap-6 animate-in fade-in">
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-slate-500">Meta Anual:</span>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    value={goal.annualTarget || ''}
                                    onChange={(e) => handleAnnualChange(channel, e.target.value)}
                                    className="w-36 bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-2 text-right font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                                />
                                <span className="absolute right-4 text-[10px] font-bold text-slate-400 pointer-events-none">ANO</span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">Meta Mensal:</span>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    value={goal.monthlyTarget || ''}
                                    onChange={(e) => handleMonthlyChange(channel, e.target.value)}
                                    className="w-48 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-16 py-3 text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 transition-all text-lg shadow-inner"
                                />
                                <span className="absolute right-4 text-xs font-bold text-slate-400 pointer-events-none">disparos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Metas & Performance</h2>
                    <p className="text-sm text-slate-500">Defina e acompanhe os objetivos de disparo para este cliente.</p>
                </div>

                <div className="flex items-center space-x-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors">2023</button>
                    <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-md">{new Date().getFullYear()}</button>
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <select
                        value={activeMonth}
                        onChange={(e) => setActiveMonth(parseInt(e.target.value))}
                        className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-slate-900 pr-2"
                    >
                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-8">
                {renderChannelBlock('email', <Mail size={24} className="text-blue-600" />, 'E-mail', 'text-blue-600')}
                {renderChannelBlock('whatsapp', <Smartphone size={24} className="text-emerald-600" />, 'WhatsApp', 'text-emerald-600')}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={saveGoals}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 active:scale-95 transform duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>{saving ? 'Salvando...' : 'Salvar Alterações de Metas'}</span>
                </button>
            </div>
        </div>
    );
};

export default ClientGoals;
