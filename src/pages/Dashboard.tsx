import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Plus,
  Coffee,
  CheckSquare,
  Clock
} from 'lucide-react';
import GoogleCalendarWidget from '../components/GoogleCalendarWidget';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [priorities, setPriorities] = useState<any[]>([]); // Overdue or Today
  const [upcoming, setUpcoming] = useState<any[]>([]); // Next 3 days

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch User's Clients (to filter tasks)
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id')
          .eq('status', 'active')
          .eq('user_id', user.id);

        if (clientsError) throw clientsError;
        const clientIds = clientsData?.map(c => c.id) || [];

        if (clientIds.length > 0) {
          // 2. Fetch Tasks
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('id, title, status, due_date, client_id, priority, client:clients(name)')
            .in('client_id', clientIds)
            .neq('status', 'completed')
            .order('due_date', { ascending: true });

          if (tasksError) throw tasksError;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const threeDaysFromNow = new Date();
          threeDaysFromNow.setDate(today.getDate() + 3);

          const priorityList: any[] = [];
          const upcomingList: any[] = [];

          tasksData?.forEach(task => {
            const dueDate = task.due_date ? new Date(task.due_date) : null;

            if (!dueDate) {
              // No date = Priority if high priority, or backlog? Let's put in priority if high
              if (task.priority === 'high') priorityList.push(task);
            } else {
              dueDate.setHours(0, 0, 0, 0);
              if (dueDate <= today) {
                priorityList.push(task);
              } else if (dueDate <= threeDaysFromNow) {
                upcomingList.push(task);
              }
            }
          });

          setPriorities(priorityList);
          setUpcoming(upcomingList);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* 1. Dark Header Block */}
      <div className="bg-slate-900 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Olá, {user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-slate-400 font-medium">
            Aqui está o pulso da sua operação hoje.
          </p>
        </div>
        <button
          onClick={() => navigate('/clients')}
          className="bg-[#FFD700] hover:bg-[#F4C430] text-slate-900 font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-[#FFD700]/20 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* 2. Task Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Priorities Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Prioridades</h3>
                <p className="text-slate-500 text-sm">Tarefas urgentes</p>
              </div>
            </div>
            <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold">
              {priorities.length} pendentes
            </span>
          </div>

          <div className="flex-1 space-y-3">
            {priorities.length > 0 ? (
              priorities.map(task => (
                <div key={task.id} onClick={() => navigate(`/clients/${task.client_id}`)} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                  <div className="mt-1 text-slate-300 group-hover:text-slate-400">
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 group-hover:text-slate-900">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Atrasado'}
                      </span>
                      <span className="text-xs text-slate-400">• {task.client?.name}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Coffee size={32} className="opacity-20" />
                <p>Tudo limpo por aqui</p>
              </div>
            )}
          </div>
        </div>

        {/* Attention Card (Upcoming) */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Atenção</h3>
                <p className="text-slate-500 text-sm">Próximos 3 dias</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-bold">
              {upcoming.length} futuros
            </span>
          </div>

          <div className="flex-1 space-y-3">
            {upcoming.length > 0 ? (
              upcoming.map(task => (
                <div key={task.id} onClick={() => navigate(`/clients/${task.client_id}`)} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                  <div className="mt-1 text-slate-300 group-hover:text-slate-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 group-hover:text-slate-900">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                        {task.due_date && new Date(task.due_date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-slate-400">• {task.client?.name}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <Coffee size={32} className="opacity-20" />
                <p>Sem tarefas próximas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Google Calendar Widget */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <GoogleCalendarWidget />
      </div>

    </div>
  );
};

export default Dashboard;
