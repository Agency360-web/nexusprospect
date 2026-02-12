import React, { useState, useEffect } from 'react';
import { ListTodo, Plus, Check, Clock, Trash2, Loader2, CheckCircle2, X } from 'lucide-react';
import { Task } from '../../types';
import { supabase } from '../../services/supabase';
import Modal from '../ui/Modal';

interface TasksWidgetProps {
    clientId: string;
}

const TasksWidget: React.FC<TasksWidgetProps> = ({ clientId }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [taskFilter, setTaskFilter] = useState<'pending' | 'completed'>('pending');
    const [activeModal, setActiveModal] = useState<'none' | 'create' | 'detail'>('none');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Form State
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        startDate: '',
        dueDate: '',
        status: 'pending',
        checklist: [] as { text: string; completed: boolean }[]
    });
    const [newChecklistItem, setNewChecklistItem] = useState('');

    const fetchTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [clientId]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            const { error } = await supabase.from('tasks').insert({
                client_id: clientId,
                title: newTask.title,
                description: newTask.description,
                status: newTask.status,
                start_date: newTask.startDate || null,
                due_date: newTask.dueDate || null,
                checklist: newTask.checklist
            });

            if (error) throw error;
            setActiveModal('none');
            setNewTask({ title: '', description: '', startDate: '', dueDate: '', status: 'pending', checklist: [] });
            fetchTasks();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Erro ao criar tarefa');
        } finally {
            setModalLoading(false);
        }
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;
        setModalLoading(true);

        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    title: selectedTask.title,
                    description: selectedTask.description,
                    status: selectedTask.status,
                    start_date: selectedTask.startDate,
                    due_date: selectedTask.dueDate,
                    checklist: selectedTask.checklist
                })
                .eq('id', selectedTask.id);

            if (error) throw error;
            setActiveModal('none');
            fetchTasks();
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Erro ao atualizar tarefa');
        } finally {
            setModalLoading(false);
        }
    };

    const handleCompleteTask = async () => {
        if (!selectedTask) return;
        const newStatus = selectedTask.status === 'completed' ? 'pending' : 'completed';
        const updatedTask = { ...selectedTask, status: newStatus as 'pending' | 'completed' };
        setSelectedTask(updatedTask);

        // Ideally we should call update here or rely on the form submit, 
        // but let's just update local state and let the user click save or auto-save? 
        // The previous implementation had a separate button. Let's keep it simple.
    }

    const handleAddChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        if (activeModal === 'create') {
            setNewTask({ ...newTask, checklist: [...newTask.checklist, { text: newChecklistItem, completed: false }] });
        } else if (selectedTask) {
            setSelectedTask({ ...selectedTask, checklist: [...(selectedTask.checklist || []), { text: newChecklistItem, completed: false }] });
        }
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (index: number, isDetail: boolean) => {
        if (isDetail && selectedTask) {
            const newChecklist = [...(selectedTask.checklist || [])];
            newChecklist[index].completed = !newChecklist[index].completed;
            setSelectedTask({ ...selectedTask, checklist: newChecklist });
        } else if (!isDetail) {
            const newChecklist = [...newTask.checklist];
            newChecklist[index].completed = !newChecklist[index].completed;
            setNewTask({ ...newTask, checklist: newChecklist });
        }
    };

    const getTaskStatusColor = (task: Task) => {
        if (task.status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (task.dueDate && new Date(task.dueDate) < new Date()) return 'bg-rose-100 text-rose-700 border-rose-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().slice(0, 16);
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <ListTodo size={18} className="text-slate-400" />
                    <span>Gestão de Tarefas</span>
                </h3>
                <button onClick={() => setActiveModal('create')} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex space-x-4 border-b border-slate-100 mb-4">
                <button onClick={() => setTaskFilter('pending')} className={`pb-2 text-sm font-bold ${taskFilter === 'pending' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}>Pendentes</button>
                <button onClick={() => setTaskFilter('completed')} className={`pb-2 text-sm font-bold ${taskFilter === 'completed' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}>Concluídas</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[500px] pr-1">
                {tasks.filter(t => t.status === taskFilter).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Nenhuma tarefa {taskFilter === 'pending' ? 'pendente' : 'concluída'}</div>
                ) : (
                    tasks.filter(t => t.status === taskFilter).map(task => {
                        const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date();

                        return (
                            <div
                                key={task.id}
                                onClick={() => { setSelectedTask(task); setActiveModal('detail'); }}
                                className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${isOverdue
                                    ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
                                    : 'bg-white border-slate-100 hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                        {task.status === 'completed' && <Check size={12} />}
                                    </div>
                                    <div>
                                        <div className={`font-bold ${task.status === 'completed' ? 'line-through text-slate-400' : isOverdue ? 'text-rose-900' : 'text-slate-900'}`}>{task.title}</div>
                                        <div className={`flex items-center space-x-2 text-xs mt-1 ${isOverdue ? 'text-rose-600/80' : 'text-slate-500'}`}>
                                            {task.dueDate && (
                                                <span className="flex items-center"><Clock size={10} className="mr-1" /> {new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getTaskStatusColor(task)}`}>
                                    {task.status === 'completed' ? 'Concluída' : isOverdue ? 'Atrasada' : 'Em dia'}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={activeModal === 'create'} onClose={() => setActiveModal('none')} title="Nova Tarefa">
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <input
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        placeholder="Título da Tarefa"
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        required
                    />
                    <textarea
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-24"
                        placeholder="Descrição detalhada..."
                        value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Data de Início</label>
                            <input
                                type="datetime-local"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                value={newTask.startDate}
                                onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Data de Vencimento</label>
                            <input
                                type="datetime-local"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                value={newTask.dueDate}
                                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Checklist</label>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                placeholder="Adicionar item..."
                                value={newChecklistItem}
                                onChange={e => setNewChecklistItem(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                            />
                            <button
                                type="button"
                                onClick={handleAddChecklistItem}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                            {newTask.checklist.map((item, idx) => (
                                <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <button
                                        type="button"
                                        onClick={() => toggleChecklistItem(idx, false)}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 hover:border-emerald-400'}`}
                                    >
                                        {item.completed && <Check size={12} strokeWidth={3} />}
                                    </button>
                                    <span className={`text-sm flex-1 font-medium ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                                    <button type="button" onClick={() => setNewTask({ ...newTask, checklist: newTask.checklist.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500 p-1">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">
                            {modalLoading ? <Loader2 className="animate-spin" /> : 'Criar Tarefa'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={activeModal === 'detail'} onClose={() => setActiveModal('none')} title="Detalhes da Tarefa">
                {selectedTask && (
                    <form onSubmit={handleUpdateTask} className="space-y-4">
                        <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-lg"
                            value={selectedTask.title}
                            onChange={e => setSelectedTask({ ...selectedTask, title: e.target.value })}
                        />
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-24"
                            value={selectedTask.description || ''}
                            onChange={e => setSelectedTask({ ...selectedTask, description: e.target.value })}
                            placeholder="Sem descrição"
                        />

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Status</label>
                            <select
                                className={`w-full px-4 py-3 border rounded-xl outline-none text-sm appearance-none font-bold ${selectedTask.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                                value={selectedTask.status}
                                onChange={e => setSelectedTask({ ...selectedTask, status: e.target.value as 'pending' | 'completed' })}
                            >
                                <option value="pending">Pendente</option>
                                <option value="completed">Concluída</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Início</label>
                                <input
                                    type="datetime-local"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                    value={formatDateForInput(selectedTask.startDate)}
                                    onChange={e => setSelectedTask({ ...selectedTask, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Vencimento</label>
                                <input
                                    type="datetime-local"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                    value={formatDateForInput(selectedTask.dueDate)}
                                    onChange={e => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Checklist</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                                    placeholder="Novo item..."
                                    value={newChecklistItem}
                                    onChange={e => setNewChecklistItem(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                                />
                                <button type="button" onClick={handleAddChecklistItem} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600">
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                                {(selectedTask.checklist || []).map((item: any, idx: number) => (
                                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggleChecklistItem(idx, true)}
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 hover:border-emerald-400'}`}
                                        >
                                            {item.completed && <Check size={12} strokeWidth={3} />}
                                        </button>
                                        <span className={`text-sm flex-1 font-medium ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                                        <button type="button" onClick={() => setSelectedTask({ ...selectedTask, checklist: selectedTask.checklist.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500 p-1">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleCompleteTask}
                                className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition-colors ${selectedTask.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                            >
                                <CheckCircle2 size={18} />
                                <span>{selectedTask.status === 'completed' ? 'Tarefa Concluída' : 'Marcar como Concluída'}</span>
                            </button>
                            <button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">
                                {modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
                            </button>

                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default TasksWidget;
