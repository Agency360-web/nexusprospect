
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Zap,
  Plus,
  ListTodo,
  Calendar,
  CheckSquare,
  Square,
  Trash2,
  ArrowUpRight,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';


const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, clients(name)')
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
  };

  const handleToggleTask = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchStats();
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchStats();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Erro ao excluir tarefa.');
    }
  };

  const getPriorityTasks = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return tasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate <= today;
    });
  };

  const getAttentionTasks = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const future = new Date();
    future.setDate(future.getDate() + 3); // next 3 days
    future.setHours(23, 59, 59, 999);

    return tasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate > today && dueDate <= future;
    });
  };

  const priorityTasks = getPriorityTasks();
  const attentionTasks = getAttentionTasks();

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priorities Block */}
        <div className="bg-rose-50 rounded-3xl border border-rose-100 overflow-hidden flex flex-col h-[450px]">
          <div className="bg-slate-900 p-6 flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <AlertCircle className="text-rose-500" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Prioridades do Dia</h3>
              <p className="text-slate-400 text-xs font-medium">Tarefas urgentes para hoje</p>
            </div>
          </div>

          <div className="p-6 pt-6 space-y-3 flex-1 overflow-y-auto">
            {priorityTasks.length > 0 ? (
              priorityTasks.map(task => (
                <div key={task.id} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggleTask(task.id, task.status)} className="text-rose-300 hover:text-rose-600 transition-colors">
                      <Square size={18} />
                    </button>
                    <div>
                      <div className="font-bold text-slate-800 text-sm line-clamp-1">{task.title}</div>
                      <div className="text-[10px] uppercase font-bold text-rose-500">
                        {new Date(task.due_date).toLocaleDateString()} • {task.clients?.name}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/clients/${task.client_id}`)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-rose-400 font-medium text-center py-4">Tudo em dia por aqui! 🎉</p>
            )}
          </div>
        </div>

        {/* Attention Block */}
        <div className="bg-amber-50 rounded-3xl border border-amber-100 overflow-hidden flex flex-col h-[450px]">
          <div className="bg-slate-900 p-6 flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Calendar className="text-amber-500" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Requer Atenção</h3>
              <p className="text-slate-400 text-xs font-medium">Próximos 3 dias</p>
            </div>
          </div>

          <div className="p-6 pt-6 space-y-3 flex-1 overflow-y-auto">
            {attentionTasks.length > 0 ? (
              attentionTasks.map(task => (
                <div key={task.id} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-all">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggleTask(task.id, task.status)} className="text-amber-300 hover:text-amber-600 transition-colors">
                      <Square size={18} />
                    </button>
                    <div>
                      <div className="font-bold text-slate-800 text-sm line-clamp-1">{task.title}</div>
                      <div className="text-[10px] uppercase font-bold text-amber-500">
                        {new Date(task.due_date).toLocaleDateString()} • {task.clients?.name}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/clients/${task.client_id}`)} className="p-2 text-amber-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-amber-400 font-medium text-center py-4">Sem tarefas próximas. ☕</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Task List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[450px] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestão de Tarefas</h2>
            <p className="text-xs text-slate-400 font-medium">Todas as atividades pendentes</p>
          </div>
          <button
            onClick={() => navigate('/clients')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors sm:hidden"
          >
            Ver Todos os Clientes
          </button>
        </div>

        <div className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex justify-center"><Activity className="animate-spin text-slate-300" /></div>
          ) : tasks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="p-4 bg-slate-50 rounded-full">
                <ListTodo size={32} />
              </div>
              <p className="font-medium">Nenhuma tarefa pendente.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-4">
                  <div className="flex items-start gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className={`mt-1 flex-shrink-0 transition-all hover:scale-110 active:scale-95 ${task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      {task.status === 'completed' ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
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
                  <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-lg"
                      title="Excluir Tarefa"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`/clients/${task.client_id}`)}
                      className="sm:opacity-0 group-hover:opacity-100 p-2 text-indigo-600 sm:text-slate-400 sm:hover:text-indigo-600 transition-all text-xs font-bold uppercase flex items-center justify-end gap-1 bg-indigo-50 sm:bg-transparent rounded-lg sm:rounded-none px-4 sm:px-0 py-2 sm:py-0"
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
