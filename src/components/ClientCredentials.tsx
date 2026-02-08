import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    Key,
    Plus,
    Eye,
    EyeOff,
    Copy,
    Trash2,
    Edit2,
    Search,
    Lock,
    Globe,
    User,
    MoreVertical,
    Check,
    X,
    ExternalLink,
    Loader2,
    FolderOpen
} from 'lucide-react';
import Modal from './ui/Modal';

interface Credential {
    id: string;
    client_id: string;
    name: string;
    username?: string;
    password?: string;
    url?: string;
    notes?: string;
    category?: string;
    created_at: string;
    updated_at: string;
}

interface ClientCredentialsProps {
    clientId: string;
}

const CATEGORIES = [
    'Redes Sociais',
    'Anúncios',
    'Analytics',
    'CRM',
    'E-mail Marketing',
    'Hospedagem',
    'Domínio',
    'Banco de Dados',
    'API',
    'Outros'
];

const ClientCredentials: React.FC<ClientCredentialsProps> = ({ clientId }) => {
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeModal, setActiveModal] = useState<'none' | 'create' | 'edit'>('none');
    const [modalLoading, setModalLoading] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [editingCredential, setEditingCredential] = useState<Credential | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: '',
        url: '',
        notes: '',
        category: ''
    });

    const fetchCredentials = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('credentials')
                .select('*')
                .eq('client_id', clientId)
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            setCredentials(data || []);
        } catch (err) {
            console.error('Error fetching credentials:', err);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    const filteredCredentials = useMemo(() => {
        if (!searchTerm) return credentials;
        const term = searchTerm.toLowerCase();
        return credentials.filter(c =>
            c.name.toLowerCase().includes(term) ||
            c.username?.toLowerCase().includes(term) ||
            c.category?.toLowerCase().includes(term) ||
            c.url?.toLowerCase().includes(term)
        );
    }, [credentials, searchTerm]);

    const groupedCredentials = useMemo(() => {
        const groups: Record<string, Credential[]> = {};
        filteredCredentials.forEach(cred => {
            const cat = cred.category || 'Outros';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(cred);
        });
        return groups;
    }, [filteredCredentials]);

    const handleOpenCreate = () => {
        setFormData({ name: '', username: '', password: '', url: '', notes: '', category: '' });
        setEditingCredential(null);
        setActiveModal('create');
    };

    const handleOpenEdit = (credential: Credential) => {
        setFormData({
            name: credential.name,
            username: credential.username || '',
            password: credential.password || '',
            url: credential.url || '',
            notes: credential.notes || '',
            category: credential.category || ''
        });
        setEditingCredential(credential);
        setActiveModal('edit');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        setModalLoading(true);

        try {
            if (activeModal === 'create') {
                const { error } = await supabase.from('credentials').insert({
                    client_id: clientId,
                    name: formData.name,
                    username: formData.username || null,
                    password: formData.password || null,
                    url: formData.url || null,
                    notes: formData.notes || null,
                    category: formData.category || null
                });
                if (error) throw error;
            } else if (activeModal === 'edit' && editingCredential) {
                const { error } = await supabase.from('credentials').update({
                    name: formData.name,
                    username: formData.username || null,
                    password: formData.password || null,
                    url: formData.url || null,
                    notes: formData.notes || null,
                    category: formData.category || null
                }).eq('id', editingCredential.id);
                if (error) throw error;
            }

            setActiveModal('none');
            fetchCredentials();
        } catch (err) {
            console.error('Error saving credential:', err);
            alert('Erro ao salvar credencial');
        } finally {
            setModalLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este acesso?')) return;
        try {
            const { error } = await supabase.from('credentials').delete().eq('id', id);
            if (error) throw error;
            fetchCredentials();
        } catch (err) {
            console.error('Error deleting credential:', err);
            alert('Erro ao excluir credencial');
        }
    };

    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswords(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-2xl">
                            <Key className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Cofre de Acessos</h2>
                            <p className="text-sm text-slate-500">{credentials.length} acessos salvos</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar acessos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-900/10"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Novo Acesso</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Credentials List */}
            {filteredCredentials.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum acesso salvo</h3>
                    <p className="text-slate-500 text-sm mb-6">Adicione senhas e acessos deste cliente</p>
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all text-sm font-bold"
                    >
                        <Plus size={18} />
                        Adicionar Primeiro Acesso
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedCredentials).map(([category, creds]) => (
                        <div key={category} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                <FolderOpen size={16} className="text-slate-400" />
                                <span className="font-bold text-slate-700">{category}</span>
                                <span className="text-xs text-slate-400 ml-2">({creds.length})</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {creds.map(cred => (
                                    <div key={cred.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-bold text-slate-900">{cred.name}</h4>
                                                    {cred.url && (
                                                        <a
                                                            href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-amber-500 hover:text-amber-600"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* Username */}
                                                    {cred.username && (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <User size={14} className="text-slate-400 flex-shrink-0" />
                                                            <span className="text-slate-600 truncate">{cred.username}</span>
                                                            <button
                                                                onClick={() => copyToClipboard(cred.username!, `user-${cred.id}`)}
                                                                className="p-1 hover:bg-slate-200 rounded transition-colors ml-auto"
                                                            >
                                                                {copiedId === `user-${cred.id}` ? (
                                                                    <Check size={14} className="text-emerald-500" />
                                                                ) : (
                                                                    <Copy size={14} className="text-slate-400" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Password */}
                                                    {cred.password && (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Lock size={14} className="text-slate-400 flex-shrink-0" />
                                                            <span className="text-slate-600 font-mono truncate">
                                                                {visiblePasswords.has(cred.id) ? cred.password : '••••••••'}
                                                            </span>
                                                            <button
                                                                onClick={() => togglePasswordVisibility(cred.id)}
                                                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                                                            >
                                                                {visiblePasswords.has(cred.id) ? (
                                                                    <EyeOff size={14} className="text-slate-400" />
                                                                ) : (
                                                                    <Eye size={14} className="text-slate-400" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => copyToClipboard(cred.password!, `pass-${cred.id}`)}
                                                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                                                            >
                                                                {copiedId === `pass-${cred.id}` ? (
                                                                    <Check size={14} className="text-emerald-500" />
                                                                ) : (
                                                                    <Copy size={14} className="text-slate-400" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* URL */}
                                                {cred.url && (
                                                    <div className="flex items-center gap-2 text-sm mt-2">
                                                        <Globe size={14} className="text-slate-400 flex-shrink-0" />
                                                        <span className="text-slate-500 truncate">{cred.url}</span>
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {cred.notes && (
                                                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{cred.notes}</p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleOpenEdit(cred)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cred.id)}
                                                    className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-slate-400 hover:text-rose-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Create/Edit */}
            <Modal
                isOpen={activeModal !== 'none'}
                onClose={() => setActiveModal('none')}
                title={activeModal === 'create' ? 'Novo Acesso' : 'Editar Acesso'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Serviço *</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Instagram, Google Ads..."
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        >
                            <option value="">Selecione...</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuário / Email</label>
                        <input
                            type="text"
                            placeholder="usuario@email.com"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                        <input
                            type="text"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL do Serviço</label>
                        <input
                            type="text"
                            placeholder="https://..."
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                        <textarea
                            placeholder="Informações adicionais..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setActiveModal('none')}
                            className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={modalLoading}
                            className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {modalLoading && <Loader2 size={16} className="animate-spin" />}
                            {activeModal === 'create' ? 'Criar Acesso' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ClientCredentials;
