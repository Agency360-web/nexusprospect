
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  MoreHorizontal,
  Play,
  BarChart3,
  Activity,
  Globe,
  Wifi,
  WifiOff,
  Building2,
  Zap,
  Plus,
  ListTodo,
  Calendar,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{ label: string, value: string, subValue: string, icon: React.ReactNode, colorClass: string, trend?: 'up' | 'down' | 'neutral' }> = ({ label, value, subValue, icon, colorClass, trend }) => (
  <div className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100/50 hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl transition-colors duration-300 ${colorClass}`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend === 'up' ? '↑' : '↓'}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</h3>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-black text-slate-900 tracking-tight">{value}</span>
      </div>
      <p className="text-xs text-slate-400 font-medium pt-1 border-t border-dashed border-slate-100 mt-3">
        {subValue}
      </p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState({
    clients: 0,
    leads: 0,
    transmissions: 0,
    deliveryRate: 0,
    loading: true,
    numbers: [] as any[],
    globalLimit: 0,
    globalSent: 0,
    chartData: [] as any[],
    tasks: [] as any[]
  });

  useEffect(() => {
    fetchStats();
  }, [period, user]);

  const fetchStats = async () => {
    try {
      const days = period === '7d' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [clientsRes, leadsRes, transRes, numbersRes, historyRes, tasksRes] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('transmissions').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('whatsapp_numbers').select('*, clients(name)').eq('user_id', user?.id),
        // Fetch actual transmission history for chart (last X days)
        supabase.from('transmissions')
          .select('created_at, status')
          .eq('user_id', user?.id)
          .gte('created_at', startDate.toISOString()),
        // Fetch tasks (Urgency Logic: Pending first, ordered by due_date ascending)
        supabase
          .from('tasks')
          .select('*, clients(name)')
          .eq('status', 'pending') // Focus on pending tasks for urgency
          .order('due_date', { ascending: true }) // Oldest/Overdue first
          .limit(10)
      ]);

      const numbers = numbersRes.data || [];
      const globalSent = numbers.reduce((acc, curr) => acc + (curr.sent_today || 0), 0);
      const globalLimit = numbers.reduce((acc, curr) => acc + (curr.daily_limit || 0), 0);

      // Process Chart Data
      const rawHistory = historyRes.data || [];
      const chartMap = new Map<string, number>();

      // Initialize map with 0s
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        chartMap.set(key, 0);
      }

      let deliveredCount = 0;
      rawHistory.forEach(t => {
        const d = new Date(t.created_at);
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (chartMap.has(key)) {
          chartMap.set(key, (chartMap.get(key) || 0) + 1);
        }
        if (t.status !== 'failed') deliveredCount++;
      });

      const chartData = Array.from(chartMap.entries()).map(([name, envios]) => ({ name, envios }));
      const deliveryRate = rawHistory.length > 0 ? (deliveredCount / rawHistory.length) * 100 : 0;

      setStats({
        clients: clientsRes.count || 0,
        leads: leadsRes.count || 0,
        transmissions: transRes.count || 0,
        deliveryRate,
        loading: false,
        numbers,
        globalLimit,
        globalSent,
        chartData,
        tasks: tasksRes?.data || [] // Add tasks result
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
            Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário'} <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
          </h1>
          <p className="text-slate-300 font-medium text-sm md:text-base">Aqui está o pulso da sua operação hoje.</p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/transmission')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95 text-sm md:text-base"
          >
            <Zap size={18} />
            <span>Novo Disparo</span>
          </button>
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all backdrop-blur-sm text-sm md:text-base"
          >
            <Plus size={18} />
            <span>Cliente</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Clientes"
          value={stats.clients.toString()}
          subValue="Empresas ativas"
          icon={<Building2 className="text-brand-600" size={24} />}
          colorClass="bg-slate-900 group-hover:bg-slate-800"
        />
        <StatCard
          label="Leads Validados"
          value={stats.leads.toString()}
          subValue="Base total de contatos"
          icon={<Users className="text-brand-600" size={24} />}
          colorClass="bg-slate-900 group-hover:bg-slate-800"
        />
        <StatCard
          label="Disparos Totais"
          value={stats.transmissions.toLocaleString()}
          subValue="Histórico vitalício"
          icon={<CheckCircle2 className="text-[#ffd700]" size={24} />}
          colorClass="bg-slate-900 group-hover:bg-slate-800"
        />
        <StatCard
          label="Taxa de Entrega"
          value={`${stats.deliveryRate.toFixed(1)}%`}
          subValue="Média últimos 30 dias"
          icon={<Activity className="text-[#ffd700]" size={24} />}
          colorClass="bg-slate-900 group-hover:bg-slate-800"
          trend={stats.deliveryRate > 90 ? 'up' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[350px] md:min-h-[400px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Volume de Mensagens</h2>
              <p className="text-sm text-slate-400">Desempenho de envios no período</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
              <button
                onClick={() => setPeriod('7d')}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all ${period === '7d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                7D
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all ${period === '30d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                30D
              </button>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            {stats.chartData.some(d => d.envios > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    dy={10}
                    minTickGap={30}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      padding: '12px 16px'
                    }}
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="envios"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorEnvios)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col w-full h-full items-center justify-center text-slate-400 gap-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <div className="p-4 bg-white rounded-full shadow-sm">
                  <BarChart3 className="text-slate-300" size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-600">Sem dados recentes</p>
                  <p className="text-sm">Inicie um disparo para ver gráficos.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity size={20} className="text-[#ffd700]" />
              Sinais Vitais
            </h2>
            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Online</span>
            </div>
          </div>

          <div className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {stats.loading ? (
                <div className="flex justify-center py-10"><Activity className="animate-spin text-slate-300" /></div>
              ) : stats.numbers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 text-sm font-medium">Nenhuma conexão ativa.</p>
                </div>
              ) : (
                stats.numbers.map((num, i) => {
                  const isOnline = num.status === 'active' || num.status === 'connected';
                  return (
                    <div key={num.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-rose-400'}`}></div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{num.nickname}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{num.clients?.name || 'Desconhecido'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[10px] font-black uppercase ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isOnline ? 'Ativo' : 'Offline'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-auto pt-6">
              <div className="bg-slate-900 p-5 rounded-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 rounded-full blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2 group-hover:opacity-30 transition-opacity"></div>
                <div className="flex justify-between items-center mb-3 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cota Diária Global</span>
                  <span className="text-xs font-mono font-bold">{stats.globalSent} / {stats.globalLimit}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden relative z-10">
                  <div
                    className="h-full bg-brand-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                    style={{ width: `${stats.globalLimit > 0 ? (stats.globalSent / stats.globalLimit) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 relative z-10">Renova em 14h 32m</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestão de Tarefas</h2>
            <p className="text-xs text-slate-400 font-medium">Próximas atividades de todos os clientes</p>
          </div>
          <button
            onClick={() => navigate('/clients')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors sm:hidden"
          >
            Ver Todos os Clientes
          </button>
        </div>

        <div className="p-0">
          {stats.loading ? (
            <div className="py-12 flex justify-center"><Activity className="animate-spin text-slate-300" /></div>
          ) : stats.tasks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="p-4 bg-slate-50 rounded-full">
                <ListTodo size={32} />
              </div>
              <p className="font-medium">Nenhuma tarefa pendente.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.tasks.map((task) => (
                <div key={task.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-4">
                  <div className="flex items-start gap-4 w-full sm:w-auto">
                    <div className={`mt-1 flex-shrink-0 ${task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {task.status === 'completed' ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-bold text-sm ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'} truncate`}>
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                          <Building2 size={10} />
                          {task.clients?.name || 'Cliente'}
                        </span>
                        {task.due_date && (
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-rose-500' : 'text-slate-400'
                            }`}>
                            <Calendar size={10} />
                            {new Date(task.due_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                      onClick={() => navigate(`/clients/${task.client_id}`)}
                      className="sm:opacity-0 group-hover:opacity-100 p-2 text-indigo-600 sm:text-slate-400 sm:hover:text-indigo-600 transition-all text-xs font-bold uppercase flex items-center justify-center sm:justify-end gap-1 w-full sm:w-auto bg-indigo-50 sm:bg-transparent rounded-lg sm:rounded-none py-2 sm:py-0"
                    >
                      Ver Detalhes <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
