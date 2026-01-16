
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
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState({
    clients: 0,
    leads: 0,
    transmissions: 0,
    loading: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clientsRes, leadsRes, transRes] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('transmissions').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        clients: clientsRes.count || 0,
        leads: leadsRes.count || 0,
        transmissions: transRes.count || 0,
        loading: false
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
          <h1 className="text-3xl font-bold text-slate-900">Bom dia!</h1>
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
            <ResponsiveContainer width="100%" height="100%">
              {stats.transmissions > 0 ? (
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
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <p>Nenhum dado de disparo registrado ainda.</p>
                </div>
              )}
            </ResponsiveContainer>
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
            {[
              { provider: 'Gateway Central', location: 'SP-Brazil', status: 'online', latency: '42ms' },
              { provider: 'Instance Backup', location: 'RJ-Brazil', status: 'online', latency: '58ms' },
              { provider: 'Twilio Cloud', location: 'US-East', status: 'offline', latency: '-' },
              { provider: 'Meta API', location: 'Global', status: 'online', latency: '120ms' },
            ].map((infra, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${infra.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{infra.provider}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">{infra.location}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[10px] font-black uppercase ${infra.status === 'online' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {infra.status}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">{infra.latency}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-900 rounded-xl text-white">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold">Uso Global API</span>
              <span className="text-xs font-mono">1.2k req/s</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: '65%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
