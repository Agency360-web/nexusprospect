import React, { useState, useEffect } from 'react';

import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Loader2,
    Plus,
    Trash2,
    X,
    AlertTriangle,
    Mail,
    Settings,
    KeyRound
} from 'lucide-react';

interface EmailConnection {
    id: string;
    name: string;
    provider: 'smtp' | 'gmail';
    email: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    created_at: string;
}

const EmailConnectionsTab: React.FC = () => {
    const { user } = useAuth();

    const [connections, setConnections] = useState<EmailConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        provider: 'smtp' as 'smtp' | 'gmail',
        email: '',
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: ''
    });

    const fetchConnections = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('email_connections')
                .select('id, name, provider, email, smtp_host, smtp_port, smtp_user, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setConnections(data || []);
        } catch (err: any) {
            console.error('Error fetching email connections:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();
    }, [user]);

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const provider = e.target.value as 'smtp' | 'gmail';
        if (provider === 'gmail') {
            setFormData({
                ...formData,
                provider,
                smtp_host: 'smtp.gmail.com',
                smtp_port: 465
            });
        } else {
            setFormData({
                ...formData,
                provider,
                smtp_host: '',
                smtp_port: 587
            });
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (actionLoading) return;
        if (!user) return;

        setActionLoading('create');
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('email_connections')
                .insert([{
                    user_id: user.id,
                    name: formData.name,
                    provider: formData.provider,
                    email: formData.email,
                    smtp_host: formData.smtp_host,
                    smtp_port: formData.smtp_port,
                    smtp_user: formData.smtp_user,
                    smtp_pass: formData.smtp_pass
                }]);

            if (insertError) throw insertError;

            await fetchConnections();
            setIsModalOpen(false);
            setFormData({
                name: '',
                provider: 'smtp',
                email: '',
                smtp_host: '',
                smtp_port: 587,
                smtp_user: '',
                smtp_pass: ''
            });
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar a conexão.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (actionLoading) return;
        if (!confirm('Tem certeza que deseja EXCLUIR esta conexão de e-mail?')) return;
        
        setActionLoading(`delete-${id}`);
        setError(null);
        
        try {
            const { error: deleteError } = await supabase
                .from('email_connections')
                .delete()
                .eq('id', id)
                .eq('user_id', user?.id);

            if (deleteError) throw deleteError;
            
            setConnections(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            setError(err.message || 'Erro ao excluir a conexão.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
            {/* Header */}
            <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Conexões de E-mail</h2>
                    <p className="text-sm text-slate-500">
                        Gerencie as contas de e-mail utilizadas nos disparos das suas campanhas.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#ffd700] text-slate-900 rounded-xl text-xs font-bold shadow-lg shadow-[#ffd700]/30 hover:bg-[#f8ab15] transition-colors"
                >
                    <Plus size={16} />
                    <span>Nova Conexão</span>
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-800">Erro</p>
                        <p className="text-xs text-red-600 mt-0.5">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Empty State */}
            {connections.length === 0 && (
                <div className="text-center py-16 space-y-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto">
                        <Mail size={36} className="text-slate-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-700">Nenhuma conexão de e-mail</h3>
                        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                            Adicione uma conta SMTP ou Gmail para poder enviar e-mails nas suas campanhas de prospecção.
                        </p>
                    </div>
                </div>
            )}

            {/* Connection Cards */}
            <div className="space-y-4">
                {connections.map((conn) => (
                    <div key={conn.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-brand-50">
                                    <Mail size={22} className="text-brand-500" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900 truncate">
                                            {conn.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-slate-200 text-slate-600">
                                            {conn.provider === 'gmail' ? 'Gmail' : 'SMTP Custom'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-slate-500">{conn.email}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {conn.smtp_host}:{conn.smtp_port}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleDelete(conn.id)}
                                    disabled={!!actionLoading}
                                    title="Excluir Conexão"
                                    className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                                >
                                    {actionLoading === `delete-${conn.id}` ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <Settings size={20} className="text-brand-500" />
                                Nova Conexão de E-mail
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleCreate} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Conexão *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Comercial Nexus"
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Serviço *</label>
                                    <select
                                        value={formData.provider}
                                        onChange={handleProviderChange}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    >
                                        <option value="smtp">SMTP Genérico</option>
                                        <option value="gmail">Google (Gmail)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">E-mail Remetente *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="Ex: contato@empresa.com"
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    />
                                </div>

                                {formData.provider === 'gmail' && (
                                    <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl flex gap-3 text-sm text-brand-800">
                                        <KeyRound size={20} className="shrink-0 mt-0.5 text-brand-600" />
                                        <div>
                                            <p className="font-bold mb-1">Atenção para a Senha</p>
                                            <p>No Gmail, você não deve usar sua senha normal. Você precisa ir na Conta Google {'>'} Segurança {'>'} Verificação em duas etapas {'>'} <strong>Senhas de app</strong>, e gerar uma senha exclusiva de 16 caracteres para usar aqui.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Host SMTP *</label>
                                        <input
                                            type="text"
                                            required
                                            disabled={formData.provider === 'gmail'}
                                            value={formData.smtp_host}
                                            onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                                            placeholder="Ex: smtp.hostinger.com"
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Porta *</label>
                                        <input
                                            type="number"
                                            required
                                            disabled={formData.provider === 'gmail'}
                                            value={formData.smtp_port}
                                            onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Usuário SMTP *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.smtp_user}
                                            onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                                            placeholder="Ex: contato@empresa.com"
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Senha SMTP *</label>
                                        <input
                                            type="password"
                                            required
                                            value={formData.smtp_pass}
                                            onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                                            placeholder="Sua senha ou App Password"
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!!actionLoading}
                                        className="px-5 py-2.5 bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading === 'create' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        Salvar Conexão
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailConnectionsTab;
