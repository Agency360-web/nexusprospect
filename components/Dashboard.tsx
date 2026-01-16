
import React, { useEffect, useState } from 'react';
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
  Building2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

// Empty initial data
const initialData: any[] = [];

const StatCard: React.FC<{ label: string, value: string, subValue: string, icon: React.ReactNode, color: string }> = ({ label, value, subValue, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <button onClick={() => alert('Opções do card')} className="text-slate-400 hover:text-slate-600">
        <MoreHorizontal size={20} />
      </button>
    </div>
    <div className="space-y-1">
      <h3 className="text-slate-500 text-sm font-medium">{label}</h3>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className="text-xs text-emerald-600 font-medium">{subValue}</span>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState({
    clients: 0,
    leads: 0,
    transmissions: 0,
    loading: true,
    numbers: [] as any[], // Accommodate fetched numbers
    globalLimit: 0,
    globalSent: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clientsRes, leadsRes, transRes, numbersRes] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('transmissions').select('*', { count: 'exact', head: true }),
        supabase.from('whatsapp_numbers').select('*, clients(name)')
      ]);

      const numbers = numbersRes.data || [];
      const globalSent = numbers.reduce((acc, curr) => acc + (curr.sent_today || 0), 0);
      const globalLimit = numbers.reduce((acc, curr) => acc + (curr.daily_limit || 0), 0);

      setStats({
        clients: clientsRes.count || 0,
        leads: leadsRes.count || 0,
        transmissions: transRes.count || 0,
        loading: false,
        numbers,
        globalLimit,
        globalSent
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Bom dia{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''} <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
          </h1>
          <p className="text-slate-500">Aqui está o resumo dos seus disparos nas últimas 24 horas.</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Sistema Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Clientes"
          value={stats.clients.toString()}
          subValue="Ativos"
          icon={<Building2 className="text-blue-600" size={24} />}
          color="bg-blue-50"
        />
        <StatCard
          label="Leads Cadastrados"
          value={stats.leads.toString()}
          subValue="Total"
          icon={<Users className="text-emerald-600" size={24} />}
          color="bg-emerald-50"
        />
        <StatCard
          label="Disparos Feitos"
          value={stats.transmissions.toString()}
          subValue="Histórico"
          icon={<CheckCircle2 className="text-amber-600" size={24} />}
          color="bg-amber-50"
        />
        <StatCard
          label="Taxa de Entrega"
          value="-"
          subValue="Aguardando dados"
          icon={<BarChart3 className="text-purple-600" size={24} />}
          color="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">Volume de Mensagens</h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-lg px-3 py-1 outline-none"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-[300px]">
            <div className="h-[300px]">
              {stats.transmissions > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={initialData}>
                    <defs>
                      <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="envios" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorEnvios)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex w-full h-full items-center justify-center text-slate-400">
                  <p>Nenhum dado de disparo registrado ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-slate-400" />
              Status Conexões
            </h2>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase text-slate-500">Real-time</span>
          </div>

          <div className="space-y-4 flex-1">
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {stats.loading ? (
                <div className="flex justify-center py-10"><Activity className="animate-spin text-slate-300" /></div>
              ) : stats.numbers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm">Nenhuma conexão ativa.</p>
                </div>
              ) : (
                stats.numbers.map((num, i) => {
                  const isOnline = num.status === 'active' || num.status === 'connected';
                  return (
                    <div key={num.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-400'}`}></div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{num.nickname}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-medium">{num.clients?.name || 'Desconhecido'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[10px] font-black uppercase ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">{num.phone}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 p-4 bg-slate-900 rounded-xl text-white">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold">Uso Limite Diário (Global)</span>
                <span className="text-xs font-mono">{stats.globalSent} / {stats.globalLimit}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${stats.globalLimit > 0 ? (stats.globalSent / stats.globalLimit) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
