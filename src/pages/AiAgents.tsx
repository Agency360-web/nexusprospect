import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Plus, Search, Loader2, MessageCircle, Send, ExternalLink, Trash2, Circle, ArrowLeft, Smartphone } from 'lucide-react';
import AgentForm from '../components/tools/AgentForm';

type AgentType = 'dispatch' | 'support';
type ViewMode = 'list' | 'edit';

interface Agent {
    id: string;
    agent_name: string;
    type: AgentType;
    is_active: boolean;
    status: string;
    prompt: string;
    prompt_support?: string;
    language: string;
    temperature: number;
    provider: string;
    model: string;
    use_custom_initial_message: boolean;
    initial_message: string;
    api_key: string;
    max_tokens: number;
    diversity_level: number;
    frequency_penalty: number;
    presence_penalty: number;
    sign_messages: boolean;
    read_messages: boolean;
    max_message_length: number;
    typing_delay_seconds: number;
    context_time_window_hours: number;
    context_max_messages: number;
    context_min_messages: number;
    whatsapp_instance_id: string;
    whatsapp_instance_name: string;
    whatsapp_number?: string;
    isSyncing?: boolean;
}

const AiAgents: React.FC = () => {
    const { user, profile, maxAgents } = useAuth();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [whatsappInstances, setWhatsappInstances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    // New Creation State
    const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
    const [newAgentName, setNewAgentName] = useState<string>('');

    const [view, setView] = useState<ViewMode>('list');
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            fetchAgents();
            fetchInstances();
        }
    }, [user]);

    const fetchAgents = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('ai_agent_settings')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAgents(data || []);
        } catch (err) {
            console.error('Error fetching agents:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInstances = async () => {
        try {
            const { data, error } = await supabase
                .from('whatsapp_connections')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setWhatsappInstances(data || []);
        } catch (err) {
            console.error('Error fetching instances:', err);
        }
    };

    const handleCreateAgent = async () => {
        if (!user || !selectedInstanceId || !newAgentName.trim()) return;
        
        if (agents.length >= maxAgents) {
            alert(`Limite do plano atingido (${maxAgents} agentes)`);
            return;
        }

        const instance = whatsappInstances.find(i => String(i.id) === String(selectedInstanceId));
        if (!instance) return;

        try {
            setIsCreating(true);
            
            // Generate a random text-based ID to avoid UUID conflicts with n8n
            const randomId = 'ag_' + Math.random().toString(36).substring(2, 10);
            
            const newAgentData = {
                id: randomId,
                user_id: user.id,
                organization_id: profile?.organization_id || null,
                agent_name: newAgentName.trim(),
                whatsapp_instance_id: String(instance.id),
                whatsapp_instance_name: instance.instance || instance.profile_name,
                whatsapp_number: instance.phone_number,
                type: 'support',
                is_active: false,
                language: 'pt-BR',
                temperature: 25,
                provider: 'openai',
                model: 'gpt-4o-mini',
                prompt: "Você é um agente de suporte técnico. Forneça respostas curtas, claras e objetivas.",
                prompt_support: "Você é um agente de suporte técnico. Forneça respostas curtas, claras e objetivas.",
                api_key: "sk-proj-SuaChaveDaOpenAIAqui...",
                max_tokens: 800,
                diversity_level: 40,
                frequency_penalty: 30,
                presence_penalty: 15,
                sign_messages: true,
                read_messages: true,
                max_message_length: 500,
                typing_delay_seconds: 3,
                context_time_window_hours: 24,
                context_max_messages: 50,
                context_min_messages: 3,
                use_custom_initial_message: false,
                initial_message: '',
            };

            const { data, error } = await supabase
                .from('ai_agent_settings')
                .insert(newAgentData)
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw new Error(error.message || 'Erro ao inserir no banco de dados');
            }

            setAgents(prev => [{ ...data, isSyncing: true }, ...prev]);

            // Webhook call matching the user request
            let finalAgent = { ...data, isSyncing: false };
            try {
                const response = await fetch('https://nexus360.infra-conectamarketing.site/webhook/agente_criar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: data.agent_name,
                        provider: data.provider,
                        apikey: data.api_key,
                        model: data.model,
                        basePrompt: data.prompt,
                        temperature: data.temperature,
                        maxTokens: data.max_tokens,
                        diversityLevel: data.diversity_level,
                        frequencyPenalty: data.frequency_penalty,
                        presencePenalty: data.presence_penalty,
                        signMessages: data.sign_messages,
                        readMessages: data.read_messages,
                        whatsappInstanceId: data.whatsapp_instance_id,
                        whatsappInstanceName: data.whatsapp_instance_name,
                        whatsappNumber: data.whatsapp_number,
                        instanceName: instance.instance || data.whatsapp_instance_name,
                        instanceToken: instance.token,
                        instanceId: instance.instance_id,
                        instanceNumber: instance.phone_number
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    if (Array.isArray(result) && result.length > 0) {
                        const webhookAgent = result[0];
                        
                        // Simplificamos: Não deletamos/reinserimos mais para não conflitar com o n8n.
                        // Apenas atualizamos o estado local e os metadados se necessário.
                        finalAgent = { ...data, ...webhookAgent, id: data.id, isSyncing: false };
                        
                        // Atualização opcional de metadados no Supabase (exceto ID)
                        await supabase
                            .from('ai_agent_settings')
                            .update({
                                agent_name: finalAgent.agent_name,
                                prompt: finalAgent.prompt,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', data.id);
                    }
                }
            } catch (webhookErr) {
                console.warn('Webhook notification failed but agent was created:', webhookErr);
            }

            // Update local state with the final version from webhook (Official ID)
            setAgents(prev => {
                const filtered = prev.filter(a => a.id !== data.id);
                return [{ ...finalAgent, isSyncing: false }, ...filtered];
            });

            setNewAgentName('');
            setSelectedInstanceId('');
        } catch (err: any) {
            console.error('Full creation error:', err);
            alert(`Erro ao criar novo agente: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        try {
            // Optimistic update
            setAgents(prev => prev.map(a => a.id === id ? { ...a, is_active: newStatus } : a));

            const { error, data } = await supabase
                .from('ai_agent_settings')
                .update({ is_active: newStatus })
                .eq('id', id)
                .eq('user_id', user!.id)
                .select();

            if (error) {
                throw error;
            }
            
            console.log("Status atualizado no Supabase:", data);

            // Send to n8n webhook instantly
            const agentData = agents.find(a => a.id === id);
            
            fetch('https://nexus360.infra-conectamarketing.site/webhook/agente_status', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id, 
                    is_active: newStatus,
                    whatsappNumber: agentData?.whatsapp_number,
                    instanceName: agentData?.whatsapp_instance_name,
                    agentName: agentData?.agent_name
                })
            }).then(r => console.log('Ping status webhook:', r.status))
              .catch(e => console.error('Ping status erro:', e));

        } catch (err) {
            console.error('Error toggling status:', err);
            // Rollback on error
            setAgents(prev => prev.map(a => a.id === id ? { ...a, is_active: currentStatus } : a));
            alert('Erro ao alterar status do agente: verifique permissões ou conexão.');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este agente?')) return;
        try {
            setDeletingId(id);
            const { error } = await supabase
                .from('ai_agent_settings')
                .delete()
                .eq('id', id);
            if (error) throw error;
            setAgents(agents.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting agent:', err);
            alert('Erro ao excluir agente');
        } finally {
            setDeletingId(null);
        }
    };

    const reachedLimit = agents.length >= maxAgents;

    if (loading && agents.length === 0) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
            </div>
        );
    }


    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                        <Bot className="text-yellow-500" size={32} />
                        Agentes de IA
                    </h1>
                    <p className="text-slate-300 font-medium text-sm md:text-base">
                        Crie e gerencie seus agentes inteligentes para automação de conversas.
                    </p>
                </div>
            </header>

            {/* NEW Toolbar — Inline Creation Flow */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row items-center gap-4">
                    {/* WhatsApp Instance Select */}
                    <div className="flex-1 w-full relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Bot className="h-5 w-5 text-slate-400 group-focus-within:text-yellow-500 transition-colors" />
                        </div>
                        <select
                            value={selectedInstanceId}
                            onChange={(e) => setSelectedInstanceId(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="">WhatsApp do Agente</option>
                            {whatsappInstances.map(inst => {
                                const isUsed = agents.some(a => String(a.whatsapp_instance_id) === String(inst.id));
                                return (
                                    <option key={inst.id} value={inst.id} disabled={isUsed}>
                                        {inst.profile_name || inst.instance} {isUsed ? '— (Já possui agente)' : `(${inst.phone_number || 'Sem número'})`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Agent Name Input */}
                    <div className="flex-1 w-full relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Circle className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Nome do Agente"
                            value={newAgentName}
                            onChange={(e) => setNewAgentName(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 outline-none transition-all"
                        />
                    </div>

                    {/* Create Button */}
                    {(() => {
                        const isInstanceUsed = selectedInstanceId && agents.some(a => String(a.whatsapp_instance_id) === String(selectedInstanceId));
                        const canCreate = !reachedLimit && !isCreating && selectedInstanceId && newAgentName.trim() && !isInstanceUsed;
                        
                        return (
                            <button
                                onClick={handleCreateAgent}
                                disabled={!canCreate}
                                className={`flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 whitespace-nowrap w-full lg:w-auto h-[46px] ${
                                    !canCreate
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                                }`}
                            >
                                {isCreating ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : isInstanceUsed ? (
                                    'Instância já em uso'
                                ) : (
                                    <Plus size={18} />
                                )}
                                {!isCreating && !isInstanceUsed && 'Criar novo Agente'}
                                {!isCreating && isInstanceUsed && ''}
                            </button>
                        );
                    })()}
                </div>
            </div>

            {/* Agents List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[0.8fr_1.5fr_1.2fr_0.6fr_140px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                    <div>Agente ID</div>
                    <div>Nome do Agente</div>
                    <div>WhatsApp do Agente</div>
                    <div className="text-center">Status</div>
                    <div className="w-[140px] text-right">Ações</div>
                </div>

                <div className="divide-y divide-slate-100">
                    {agents.map(agent => (
                        <div
                            key={agent.id}
                            className="grid grid-cols-[0.8fr_1.5fr_1.2fr_0.6fr_140px] items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group"
                        >
                            {/* ID */}
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    {agent.isSyncing ? (
                                        <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-50 rounded-md animate-pulse">
                                            <Loader2 size={10} className="animate-spin text-emerald-500" />
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Gerando ID...</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-mono text-slate-400 tracking-tight">{agent.id}</span>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-700 truncate block">{agent.agent_name || 'Agente sem nome'}</span>
                            </div>

                            {/* Linked WhatsApp */}
                            <div className="min-w-0">
                                <span className="text-[11px] font-medium text-slate-500 block">
                                    {agent.whatsapp_number || agent.whatsapp_instance_name || 'Não vinculado'}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="flex justify-center">
                                <button
                                    onClick={() => handleToggleStatus(agent.id, agent.is_active)}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner ${
                                        agent.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                                            agent.is_active ? 'translate-x-[22px]' : 'translate-x-[4px]'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 w-[140px]">
                                <button
                                    onClick={() => {
                                        setSelectedAgent(agent);
                                        setView('edit');
                                    }}
                                    className="px-4 py-2 bg-transparent text-slate-500 hover:bg-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 active:scale-95"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, agent.id)}
                                    disabled={deletingId === agent.id}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Excluir agente"
                                >
                                    {deletingId === agent.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {(agents.length === 0 && !loading) && (
                    <div className="text-center py-20 text-slate-400">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bot size={32} className="text-slate-200" />
                        </div>
                        <p className="font-bold text-sm text-slate-600">Nenhum agente encontrado</p>
                        <p className="text-xs mt-1">Selecione uma instância e dê um nome para começar.</p>
                    </div>
                )}
            </div>

            {/* Drawer Sidebar for Editing - Slides from Left to Right */}
            <div 
                className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
                    view === 'edit' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                {/* Backdrop Overlay */}
                <div 
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                    onClick={() => setView('list')}
                />
                
                {/* Sidebar Panel Content */}
                <div 
                    className={`absolute top-0 right-0 h-full w-full sm:min-w-[450px] lg:w-[40%] bg-white shadow-2xl transition-transform duration-500 ease-out border-l border-slate-200 overflow-y-auto ${
                        view === 'edit' ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {selectedAgent && (
                        <AgentForm 
                            agent={selectedAgent as any}
                            userId={user!.id}
                            onBack={() => setView('list')}
                            onSuccess={fetchAgents}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiAgents;
