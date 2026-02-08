
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  Building2,
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
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, clients!inner(name, user_id)')
        .eq('status', 'pending')
        .eq('clients.user_id', user.id)
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
            onClick={() => navigate('/clients')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/50 hover:scale-105 active:scale-95 text-sm md:text-base"
          >
            <Plus size={18} />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priorities Block */}
        <div className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm border border-rose-100 transition-all hover:shadow-md hover:border-rose-200 h-[220px] flex flex-col">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-50"></div>

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">Prioridades</h3>
                <p className="text-xs font-medium text-slate-400">Tarefas urgentes</p>
              </div>
            </div>
            <div className="px-2.5 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold">
              {priorityTasks.length} pendentes
            </div>
          </div>

          <div className="relative z-10 space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {priorityTasks.length > 0 ? (
              priorityTasks.map(task => (
                <div key={task.id} className="group/item bg-slate-50 hover:bg-white p-3 rounded-xl border border-transparent hover:border-rose-100 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id, task.status); }}
                      className="mt-0.5 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Square size={16} />
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/clients/${task.client_id}`)}>
                      <h4 className="font-bold text-slate-700 text-xs mb-0.5 truncate group-hover/item:text-rose-600 transition-colors">{task.title}</h4>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        <span className="text-slate-400 font-medium truncate">• {task.clients?.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/clients/${task.client_id}`); }}
                      className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                  <span className="text-xl">🎉</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Tudo em dia!</p>
              </div>
            )}
          </div>
        </div>

        {/* Attention Block */}
        <div className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm border border-amber-100 transition-all hover:shadow-md hover:border-amber-200 h-[220px] flex flex-col">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl opacity-50"></div>

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">Atenção</h3>
                <p className="text-xs font-medium text-slate-400">Próximos 3 dias</p>
              </div>
            </div>
            <div className="px-2.5 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold">
              {attentionTasks.length} futuros
            </div>
          </div>

          <div className="relative z-10 space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {attentionTasks.length > 0 ? (
              attentionTasks.map(task => (
                <div key={task.id} className="group/item bg-slate-50 hover:bg-white p-3 rounded-xl border border-transparent hover:border-amber-100 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id, task.status); }}
                      className="mt-0.5 text-slate-300 hover:text-amber-500 transition-colors"
                    >
                      <Square size={16} />
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/clients/${task.client_id}`)}>
                      <h4 className="font-bold text-slate-700 text-xs mb-0.5 truncate group-hover/item:text-amber-600 transition-colors">{task.title}</h4>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-semibold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                        <span className="text-slate-400 font-medium truncate">• {task.clients?.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/clients/${task.client_id}`); }}
                      className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                    >
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                  <span className="text-xl">☕</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Sem tarefas próximas</p>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default Dashboard;
