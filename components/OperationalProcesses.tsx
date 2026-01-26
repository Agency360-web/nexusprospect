import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Folder,
    Plus,
    MoreVertical,
    FileText,
    CheckSquare,
    Trash2,
    Edit2,
    ChevronRight,
    Loader2,
    Layout,
    Clock,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Department {
    id: string;
    name: string;
    description: string;
}

interface OperationalProcess {
    id: string;
    department_id: string;
    title: string;
    description: string;
    checklist: { id: string; text: string; completed: boolean }[];
    priority: 'low' | 'medium' | 'high';
    estimated_duration: string;
}

const OperationalProcesses: React.FC = () => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);
    const [processes, setProcesses] = useState<OperationalProcess[]>([]);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [loadingProcs, setLoadingProcs] = useState(false);

    // Modal States
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [editingProcess, setEditingProcess] = useState<OperationalProcess | null>(null);

    // Form States
    const [deptName, setDeptName] = useState('');
    const [deptDesc, setDeptDesc] = useState('');

    const [procTitle, setProcTitle] = useState('');
    const [procDesc, setProcDesc] = useState('');
    const [procDuration, setProcDuration] = useState('');
    const [procPriority, setProcPriority] = useState<'low' | 'medium' | 'high'>('medium');
    // Checklist State for Builder
    const [checklistItems, setChecklistItems] = useState<{ id: string; text: string }[]>([]);
    const [newItemText, setNewItemText] = useState('');

    useEffect(() => {
        if (user) {
            fetchDepartments();
        }
    }, [user]);

    useEffect(() => {
        if (selectedDept) {
            fetchProcesses(selectedDept.id);
        } else {
            setProcesses([]);
        }
    }, [selectedDept]);

    const fetchDepartments = async () => {
        setLoadingDepts(true);
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setDepartments(data || []);
            if (data && data.length > 0 && !selectedDept) {
                setSelectedDept(data[0]);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoadingDepts(false);
        }
    };

    const fetchProcesses = async (deptId: string) => {
        setLoadingProcs(true);
        try {
            const { data, error } = await supabase
                .from('operational_processes')
                .select('*')
                .eq('department_id', deptId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProcesses(data || []);
        } catch (error) {
            console.error('Error fetching processes:', error);
        } finally {
            setLoadingProcs(false);
        }
    };

    const handleSaveDept = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDept) {
                const { error } = await supabase
                    .from('departments')
                    .update({ name: deptName, description: deptDesc })
                    .eq('id', editingDept.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('departments')
                    .insert([{ user_id: user?.id, name: deptName, description: deptDesc }]);
                if (error) throw error;
            }
            setIsDeptModalOpen(false);
            resetDeptForm();
            fetchDepartments();
        } catch (error) {
            console.error('Error saving department:', error);
        }
    };

    const handleDeleteDept = async (id: string) => {
        if (!confirm('Tem certeza? Todos os processos deste departamento serão excluídos.')) return;
        try {
            const { error } = await supabase.from('departments').delete().eq('id', id);
            if (error) throw error;
            if (selectedDept?.id === id) setSelectedDept(null);
            fetchDepartments();
        } catch (error) {
            console.error('Error deleting department:', error);
        }
    };

    const handleAddItem = () => {
        if (!newItemText.trim()) return;
        setChecklistItems([...checklistItems, { id: crypto.randomUUID(), text: newItemText.trim() }]);
        setNewItemText('');
    };

    const handleRemoveItem = (id: string) => {
        setChecklistItems(checklistItems.filter(item => item.id !== id));
    };

    const handleSaveProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDept) return;

        // Map checklist builder items to final structure
        const finalChecklist = checklistItems.map(item => ({
            id: item.id,
            text: item.text,
            completed: false
        }));

        const payload = {
            department_id: selectedDept.id,
            user_id: user?.id,
            title: procTitle,
            description: procDesc,
            priority: procPriority,
            estimated_duration: procDuration,
            checklist: finalChecklist
        };

        try {
            if (editingProcess) {
                const { error } = await supabase
                    .from('operational_processes')
                    .update(payload)
                    .eq('id', editingProcess.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('operational_processes')
                    .insert([payload]);
                if (error) throw error;
            }
            setIsProcessModalOpen(false);
            resetProcessForm();
            fetchProcesses(selectedDept.id);
        } catch (error) {
            console.error('Error saving process:', error);
        }
    };

    const handleDeleteProcess = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este processo?')) return;
        try {
            const { error } = await supabase.from('operational_processes').delete().eq('id', id);
            if (error) throw error;
            if (selectedDept) fetchProcesses(selectedDept.id);
        } catch (error) {
            console.error('Error deleting process:', error);
        }
    };

    const resetDeptForm = () => {
        setDeptName('');
        setDeptDesc('');
        setEditingDept(null);
    };

    const resetProcessForm = () => {
        setProcTitle('');
        setProcDesc('');
        setProcDuration('');
        setProcPriority('medium');
        setChecklistItems([]);
        setNewItemText('');
        setEditingProcess(null);
    };

    const openEditDept = (dept: Department) => {
        setEditingDept(dept);
        setDeptName(dept.name);
        setDeptDesc(dept.description);
        setIsDeptModalOpen(true);
    };

    const openEditProcess = (proc: OperationalProcess) => {
        setEditingProcess(proc);
        setProcTitle(proc.title);
        setProcDesc(proc.description || '');
        setProcDuration(proc.estimated_duration || '');
        setProcPriority(proc.priority);

        // Load existing checklist
        if (Array.isArray(proc.checklist)) {
            setChecklistItems(proc.checklist.map((item: any) => ({
                id: item.id || crypto.randomUUID(),
                text: item.text
            })));
        } else {
            setChecklistItems([]);
        }
        setIsProcessModalOpen(true);
    };


    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-280px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Left Sidebar: Departments */}
            <div className="w-full lg:w-1/3 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden max-h-[400px] lg:max-h-full">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Folder size={18} className="text-yellow-600" />
                            Departamentos
                        </h3>
                    </div>
                    <button
                        onClick={() => { resetDeptForm(); setIsDeptModalOpen(true); }}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {loadingDepts ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-300" /></div>
                    ) : departments.length === 0 ? (
                        <div className="text-center p-8 text-slate-400 text-sm">Nenhum departamento criado.</div>
                    ) : (
                        departments.map(dept => (
                            <div
                                key={dept.id}
                                onClick={() => setSelectedDept(dept)}
                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedDept?.id === dept.id
                                    ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <div className="flex-1 truncate">
                                    <div className="font-bold text-sm truncate">{dept.name}</div>
                                    {dept.description && <div className="text-xs opacity-70 truncate">{dept.description}</div>}
                                </div>

                                {selectedDept?.id === dept.id && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditDept(dept); }}
                                            className="p-1.5 hover:bg-white/50 rounded-md text-yellow-700"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteDept(dept.id); }}
                                            className="p-1.5 hover:bg-white/50 rounded-md text-rose-600"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Content: Processes */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                {selectedDept ? (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    {selectedDept.name}
                                    <span className="text-[10px] sm:text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                        {processes.length} Processos
                                    </span>
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-400 mt-1">{selectedDept.description || 'Sem descrição'}</p>
                            </div>
                            <button
                                onClick={() => { resetProcessForm(); setIsProcessModalOpen(true); }}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#ffd700] text-slate-900 rounded-xl font-bold hover:bg-[#f8ab15] transition-all shadow-lg shadow-[#ffd700]/30 active:scale-95 text-xs sm:text-sm"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Novo Processo</span>
                                <span className="sm:hidden">Novo</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                            {loadingProcs ? (
                                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-300" /></div>
                            ) : processes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                                    <Layout size={48} className="text-slate-200 mb-4" />
                                    <p className="font-medium text-center">Nenhum processo neste departamento.</p>
                                    <p className="text-sm text-center">Crie procedimentos padrão para sua equipe.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                                    {processes.map(proc => (
                                        <div key={proc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${proc.priority === 'high' ? 'bg-rose-50 text-rose-600' :
                                                        proc.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-base">{proc.title}</h4>
                                                        {proc.estimated_duration && (
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 font-medium">
                                                                <Clock size={12} />
                                                                {proc.estimated_duration}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditProcess(proc)}
                                                        className="p-2 text-slate-400 hover:text-[#ffd700] hover:bg-slate-900 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProcess(proc.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {proc.description && (
                                                <p className="text-slate-500 text-sm mb-4 leading-relaxed line-clamp-3 md:line-clamp-none">{proc.description}</p>
                                            )}

                                            {proc.checklist && (proc.checklist as any[]).length > 0 && (
                                                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <CheckSquare size={12} />
                                                        Checklist ({proc.checklist.length})
                                                    </div>
                                                    {(proc.checklist as any[]).slice(0, 3).map((item, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                            <span className="truncate">{item.text}</span>
                                                        </div>
                                                    ))}
                                                    {(proc.checklist as any[]).length > 3 && (
                                                        <div className="text-xs text-slate-400 pl-3.5">+ {(proc.checklist as any[]).length - 3} itens</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Folder size={32} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-lg text-slate-600">Selecione um Departamento</p>
                        <p className="text-sm">Gerencie os processos operacionais por área.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Department Modal */}
            {isDeptModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 m-4 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{editingDept ? 'Editar Departamento' : 'Novo Departamento'}</h3>
                        <form onSubmit={handleSaveDept} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                                <input
                                    required
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500"
                                    value={deptName}
                                    onChange={e => setDeptName(e.target.value)}
                                    placeholder="Ex: Tráfego Pago"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500"
                                    value={deptDesc}
                                    onChange={e => setDeptDesc(e.target.value)}
                                    placeholder="Breve descrição da área..."
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsDeptModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm">Cancelar</button>
                                <button type="submit" className="flex-1 py-2 bg-[#ffd700] text-slate-900 rounded-lg font-bold text-sm hover:bg-[#f8ab15] shadow-lg shadow-[#ffd700]/30">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Process Modal */}
            {isProcessModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">{editingProcess ? 'Editar Processo' : 'Novo Processo'}</h3>
                        <form onSubmit={handleSaveProcess} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título do Processo</label>
                                <input
                                    required
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500 font-bold text-slate-800"
                                    value={procTitle}
                                    onChange={e => setProcTitle(e.target.value)}
                                    placeholder="Ex: Setup de Campanha"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade Padrão</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500"
                                        value={procPriority}
                                        onChange={(e: any) => setProcPriority(e.target.value)}
                                    >
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Alta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Est. Duração</label>
                                    <input
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500"
                                        value={procDuration}
                                        onChange={e => setProcDuration(e.target.value)}
                                        placeholder="Ex: 2 horas"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição Detalhada</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500"
                                    value={procDesc}
                                    onChange={e => setProcDesc(e.target.value)}
                                    placeholder="Explique o objetivo deste processo..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Checklist de Tarefas</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-1">
                                    <div className="flex gap-2 p-2">
                                        <input
                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-yellow-500 text-sm"
                                            value={newItemText}
                                            onChange={e => setNewItemText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                                            placeholder="Adicionar nova etapa..."
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-md hover:bg-slate-300 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    <div className="max-h-48 overflow-y-auto px-2 space-y-1 mb-2 custom-scrollbar">
                                        {checklistItems.map((item, idx) => (
                                            <div key={item.id} className="flex items-center gap-2 bg-white border border-slate-100 p-2 rounded-md group animate-in slide-in-from-left-2 duration-200">
                                                <div className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center text-xs text-slate-400 font-mono">
                                                    {idx + 1}
                                                </div>
                                                <span className="flex-1 text-sm text-slate-700">{item.text}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {checklistItems.length === 0 && (
                                            <div className="text-center py-4 text-xs text-slate-400">
                                                Nenhuma etapa adicionada
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsProcessModalOpen(false)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-[#ffd700] text-slate-900 rounded-xl font-bold text-sm hover:bg-[#f8ab15] shadow-lg shadow-[#ffd700]/30 transition-all active:scale-95">Salvar Processo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default OperationalProcesses;
