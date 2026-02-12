import React, { useState } from 'react';
import { ArrowLeft, Save, Upload, Zap, Building2, User, Phone, MessageSquare, Clock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NewCampaign: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [leadsText, setLeadsText] = useState(''); // Simple text area for CSV for now
    const [defaultMessage, setDefaultMessage] = useState('Olá {nome}, tudo bem? Vi sua empresa {empresa} e gostaria de bater um papo.');
    const [delayMin, setDelayMin] = useState(150);
    const [delayMax, setDelayMax] = useState(320);
    const [instances, setInstances] = useState<any[]>([]);
    const [selectedInstance, setSelectedInstance] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        // Fetch instances
        fetch('http://localhost:3001/api/whatsapp/instances')
            .then(res => res.json())
            .then(data => {
                setInstances(data);
                if (data.length > 0) {
                    setSelectedInstance(data[0].instance);
                }
            })
            .catch(err => console.error('Failed to fetch instances:', err));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!selectedInstance) {
            alert('Selecione uma instância de WhatsApp conectada.');
            setLoading(false);
            return;
        }

        // Parse leads from text area (CSV format: name,phone,company,website)
        const leads = leadsText.trim().split('\n').map(line => {
            const [name, phone, company, site] = line.split(',');
            return {
                name: name?.trim(),
                phone: phone?.trim(),
                company: company?.trim(),
                site: site?.trim()
            };
        }).filter(l => l.phone); // Basic validation

        if (leads.length === 0) {
            alert('Adicione pelo menos um lead válido (Nome, Telefone, Empresa, Site).');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    leads,
                    defaultMessage,
                    delayMin,
                    delayMax,
                    instanceName: selectedInstance,
                    userId: user?.id // Real user ID
                })
            });

            if (response.ok) {
                navigate('/disparos');
            } else {
                const err = await response.json();
                alert('Erro ao criar campanha: ' + err.error);
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão ao criar campanha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-6 md:p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/disparos')}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black mb-1 tracking-tight flex items-center gap-3">
                            Nova Campanha
                        </h1>
                        <p className="text-slate-300 font-medium text-sm md:text-base">Configure os disparos automáticos para seus leads.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Coluna Esquerda: Definição (Nome + Leads) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">

                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Definição da Campanha</h3>
                                <p className="text-slate-500 text-sm">Identificação e lista de contatos.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nome da Campanha</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Prospecção Imobiliárias SP - Fev/26"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lista de Leads (CSV)</label>
                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                        Nome, Telefone, Empresa, Site
                                    </span>
                                </div>
                                <textarea
                                    required
                                    value={leadsText}
                                    onChange={(e) => setLeadsText(e.target.value)}
                                    placeholder={`João Silva, 5511999999999, Imobiliária X, www.imobiliariax.com.br\nMaria Souza, 5511888888888, Construtora Y, www.construtoray.com.br`}
                                    className="w-full h-80 px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-mono text-xs md:text-sm leading-relaxed text-slate-600 placeholder:text-slate-400 resize-none"
                                />
                                <div className="flex items-start gap-2 text-xs text-slate-400">
                                    <Upload size={14} className="mt-0.5" />
                                    <p>Cole os dados dos leads separados por vírgula. Um lead por linha. Certifique-se de incluir o <strong>site</strong> para a personalização via IA.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Configuração (Mensagem + Delays) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 h-full">

                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Configuração</h3>
                                <p className="text-slate-500 text-sm">Mensagem e comportamento.</p>
                            </div>
                        </div>

                        {/* WhatsApp Instance Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Phone size={14} />
                                Conexão WhatsApp
                            </label>
                            <select
                                value={selectedInstance}
                                onChange={(e) => setSelectedInstance(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-sm text-slate-700 font-medium"
                            >
                                <option value="" disabled>Selecione uma conexão...</option>
                                {instances.map(inst => (
                                    <option key={inst.id} value={inst.instance}>
                                        {inst.instance} ({inst.status})
                                    </option>
                                ))}
                            </select>
                            {instances.length === 0 && (
                                <p className="text-xs text-red-500">Nenhuma conexão encontrada. Vá em Configurações &gt; Integração.</p>
                            )}
                        </div>

                        {/* Mensagem Section */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare size={14} />
                                Mensagem
                            </label>

                            <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 text-violet-700 font-bold text-xs">
                                    <Zap size={14} />
                                    <span className="uppercase">Gerado por IA</span>
                                </div>
                                <p className="text-xs text-violet-600/80 leading-relaxed">
                                    A mensagem principal será gerada automaticamente analisando o site do lead.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium text-slate-500">Mensagem de Fallback (Padrão)</span>
                                <textarea
                                    required
                                    value={defaultMessage}
                                    onChange={(e) => setDefaultMessage(e.target.value)}
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-sm text-slate-600 resize-none"
                                />
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 cursor-help" title="Fábio">{'{nome}'}</span>
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 cursor-help" title="Conecta Marketing">{'{empresa}'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6 space-y-4">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={14} />
                                Intervalo entre Envios
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase">Mínimo (s)</span>
                                    <input
                                        type="number"
                                        value={delayMin}
                                        onChange={(e) => setDelayMin(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-bold text-slate-700 text-center"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase">Máximo (s)</span>
                                    <input
                                        type="number"
                                        value={delayMax}
                                        onChange={(e) => setDelayMax(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-bold text-slate-700 text-center"
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight">
                                Um delay aleatório será aplicado para simular comportamento humano.
                            </p>
                        </div>

                    </div>
                </div>

                {/* Fixed Bottom Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-10 md:pl-72 flex justify-end items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/disparos')}
                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`
                            px-8 py-3 bg-brand-600 text-slate-900 font-bold rounded-xl flex items-center gap-2 shadow-xl shadow-brand-900/20 
                            hover:bg-brand-500 transition-all hover:-translate-y-0.5 active:translate-y-0
                            ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Zap size={20} />
                        )}
                        <span>{loading ? 'Criando Campanha...' : 'Iniciar Disparos'}</span>
                    </button>
                </div>

            </form>
        </div>
    );
};

export default NewCampaign;
