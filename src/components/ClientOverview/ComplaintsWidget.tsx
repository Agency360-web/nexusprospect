import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Complaint } from '../../types';
import { supabase } from '../../services/supabase';
import Modal from '../ui/Modal';

interface ComplaintsWidgetProps {
    clientId: string;
}

const ComplaintsWidget: React.FC<ComplaintsWidgetProps> = ({ clientId }) => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newComplaint, setNewComplaint] = useState({
        title: '',
        severity: 'medium' as 'low' | 'medium' | 'high',
        description: ''
    });

    const fetchComplaints = async () => {
        try {
            const { data, error } = await supabase
                .from('client_complaints')
                .select('*')
                .eq('client_id', clientId)
                .order('status', { ascending: true }) // pending first
                .order('date', { ascending: false });

            if (error) throw error;
            setComplaints(data || []);
        } catch (error) {
            console.error('Error fetching complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, [clientId]);

    const handleCreateComplaint = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('client_complaints')
                .insert({
                    client_id: clientId,
                    title: newComplaint.title,
                    severity: newComplaint.severity,
                    description: newComplaint.description,
                    status: 'pending'
                });

            if (error) throw error;

            setIsModalOpen(false);
            setNewComplaint({ title: '', severity: 'medium', description: '' });
            fetchComplaints();
        } catch (error) {
            console.error('Error creating complaint:', error);
            alert('Erro ao registrar reclamação');
        }
    };

    const handleResolve = async (id: string) => {
        try {
            const { error } = await supabase
                .from('client_complaints')
                .update({ status: 'resolved' })
                .eq('id', id);

            if (error) throw error;
            fetchComplaints();
        } catch (error) {
            console.error('Error resolving complaint:', error);
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover?')) return;
        try {
            const { error } = await supabase
                .from('client_complaints')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchComplaints();
        } catch (error) {
            console.error('Error deleting complaint:', error);
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'medium': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <AlertTriangle size={18} className="text-slate-400" />
                    <span>Pontos de Atenção / Melhorias</span>
                </h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px] pr-1">
                {loading ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
                ) : complaints.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Nenhum ponto de atenção registrado</div>
                ) : (
                    complaints.map(complaint => (
                        <div key={complaint.id} className={`p-4 rounded-xl border relative group ${complaint.status === 'resolved' ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityColor(complaint.severity)}`}>
                                        {complaint.severity === 'high' ? 'Crítico' : complaint.severity === 'medium' ? 'Médio' : 'Baixo'}
                                    </span>
                                    <span className={`font-bold ${complaint.status === 'resolved' ? 'line-through text-slate-500' : 'text-slate-900'}`}>{complaint.title}</span>
                                </div>
                                <div className="flex space-x-1">
                                    {complaint.status !== 'resolved' && (
                                        <button onClick={() => handleResolve(complaint.id)} className="p-1 hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 rounded" title="Resolver">
                                            <CheckCircle2 size={14} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(complaint.id)} className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            {complaint.description && <p className="text-xs text-slate-500 mt-1">{complaint.description}</p>}
                            <div className="mt-2 text-[10px] text-slate-400">
                                Registrado em {new Date(complaint.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Ponto de Atenção">
                <form onSubmit={handleCreateComplaint} className="space-y-4">
                    <input
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        placeholder="Título do problema/melhoria"
                        value={newComplaint.title}
                        onChange={e => setNewComplaint({ ...newComplaint, title: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Severidade</label>
                        <div className="flex gap-4">
                            {(['low', 'medium', 'high'] as const).map(sev => (
                                <label key={sev} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="severity"
                                        value={sev}
                                        checked={newComplaint.severity === sev}
                                        onChange={() => setNewComplaint({ ...newComplaint, severity: sev })}
                                        className="text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-sm capitalized">{sev === 'high' ? 'Alta' : sev === 'medium' ? 'Média' : 'Baixa'}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <textarea
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                        placeholder="Descrição detalhada..."
                        rows={4}
                        value={newComplaint.description}
                        onChange={e => setNewComplaint({ ...newComplaint, description: e.target.value })}
                    />
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">
                            Registrar
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ComplaintsWidget;
