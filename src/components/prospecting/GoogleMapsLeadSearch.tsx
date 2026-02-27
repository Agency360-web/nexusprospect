import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    MapPin,
    Search,
    ExternalLink,
    Download,
    Trash2,
    RefreshCw,
    Star,
    Phone,
    Globe,
    Building2,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertCircle,
    Settings,
    Save,
} from 'lucide-react';

interface ExtractedLead {
    idx: number;
    nome_empresa: string;
    telefone: string;
    endereco: string;
    website: string;
    rating: string;
    reviews: string;
    especialidades: string;
}

const GoogleMapsLeadSearch: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
    const [savedLeadsCount, setSavedLeadsCount] = useState(0);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [showWebhookConfig, setShowWebhookConfig] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Carregar webhook URL salvo
    useEffect(() => {
        const saved = localStorage.getItem('gmaps_extractor_webhook');
        if (saved) setWebhookUrl(saved);
    }, []);

    // Carregar leads extraídos do localStorage (compartilhado com extensão)
    const loadExtractedLeads = useCallback(() => {
        try {
            const raw = localStorage.getItem('gmaps_extracted_leads');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setExtractedLeads(parsed);
                }
            }
        } catch (e) {
            console.error('Erro ao carregar leads:', e);
        }
    }, []);

    useEffect(() => {
        loadExtractedLeads();
        // Listener para quando a extensão salvar novos leads
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'gmaps_extracted_leads') {
                loadExtractedLeads();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [loadExtractedLeads]);

    // Abrir Google Maps com o termo de busca
    const openGoogleMaps = () => {
        if (!searchTerm.trim()) return;
        const q = encodeURIComponent(searchTerm.trim());
        const url = `https://www.google.com/maps/search/${q}`;
        window.open(url, '_blank');
    };

    // Salvar webhook URL
    const saveWebhookUrl = () => {
        localStorage.setItem('gmaps_extractor_webhook', webhookUrl);
        // Sincronizar com chrome.storage se extensão estiver instalada
        try {
            (window as any).chrome?.storage?.local?.set({ gmaps_extractor_webhook: webhookUrl });
        } catch { }
        setShowWebhookConfig(false);
    };

    // Salvar leads extraídos na base (Supabase)
    const saveLeadsToDatabase = async () => {
        if (!user || extractedLeads.length === 0) return;
        setSaving(true);

        try {
            // Buscar ou criar uma pasta padrão "Google Maps" para o primeiro cliente
            const leadsToInsert = extractedLeads.map(lead => ({
                name: lead.nome_empresa,
                phone: lead.telefone ? lead.telefone.replace(/\D/g, '') : null,
                company: lead.nome_empresa,
                company_site: lead.website || null,
                status: 'new',
                user_id: user.id,
                notes: [
                    lead.endereco ? `Endereço: ${lead.endereco}` : '',
                    lead.rating ? `Rating: ${lead.rating}⭐` : '',
                    lead.reviews ? `Reviews: ${lead.reviews}` : '',
                    lead.especialidades ? `Especialidades: ${lead.especialidades}` : '',
                ].filter(Boolean).join(' | '),
            }));

            const { error } = await supabase
                .from('leads')
                .insert(leadsToInsert);

            if (error) throw error;

            setSavedLeadsCount(leadsToInsert.length);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 4000);
        } catch (err) {
            console.error('Erro ao salvar leads:', err);
            alert('Erro ao salvar leads. Verifique o console para mais detalhes.');
        } finally {
            setSaving(false);
        }
    };

    // Limpar leads extraídos
    const clearExtractedLeads = () => {
        if (!confirm('Tem certeza que deseja limpar todos os leads extraídos?')) return;
        setExtractedLeads([]);
        localStorage.removeItem('gmaps_extracted_leads');
        try {
            (window as any).chrome?.storage?.local?.set({ gmaps_leads: [] });
        } catch { }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
            {/* Card Principal */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <MapPin className="text-red-500" size={28} />
                        Extrator de Leads — Google Maps
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm">
                        Busque empresas no Google Maps e extraia leads automaticamente usando a extensão do navegador.
                    </p>
                </div>

                {/* Search Section */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200 p-6 mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Termo de Busca
                    </label>
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && openGoogleMaps()}
                                placeholder="ex.: advogado em BH, dentista em curitiba"
                                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={openGoogleMaps}
                            disabled={!searchTerm.trim()}
                            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
                        >
                            <ExternalLink size={16} />
                            Abrir no Maps
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        Dica: use "profissão + cidade". Ex: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">padaria em londrina</code>. Pressione <kbd className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">Enter</kbd> para abrir.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                        type="button"
                        onClick={() => setShowWebhookConfig(!showWebhookConfig)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        <Settings size={14} />
                        Configurar Webhook
                    </button>
                    <button
                        type="button"
                        onClick={loadExtractedLeads}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                        <RefreshCw size={14} />
                        Atualizar Leads
                    </button>
                    {extractedLeads.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={saveLeadsToDatabase}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                Salvar na Base ({extractedLeads.length})
                            </button>
                            <button
                                type="button"
                                onClick={clearExtractedLeads}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                            >
                                <Trash2 size={14} />
                                Limpar
                            </button>
                        </>
                    )}
                </div>

                {/* Success Banner */}
                {saveSuccess && (
                    <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-sm text-emerald-700 font-bold animate-in fade-in duration-300">
                        <CheckCircle2 size={18} />
                        {savedLeadsCount} leads salvos na base com sucesso!
                    </div>
                )}

                {/* Webhook Config */}
                {showWebhookConfig && (
                    <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            URL do Webhook
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://seu-dominio.com/webhook/receber"
                                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                            />
                            <button
                                type="button"
                                onClick={saveWebhookUrl}
                                className="px-5 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Salvar
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">
                            Este webhook será usado pela extensão para enviar os leads extraídos.
                        </p>
                    </div>
                )}

                {/* Instructions Toggle */}
                <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full flex items-center justify-between px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors mb-6"
                >
                    <span className="flex items-center gap-2">
                        <AlertCircle size={16} />
                        Como funciona? (Clique para ver as instruções)
                    </span>
                    {showInstructions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showInstructions && (
                    <div className="mb-6 bg-amber-50/50 border border-amber-100 rounded-2xl p-6 text-sm text-slate-600 space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <p className="font-bold text-slate-800">Passo a passo:</p>
                        <ol className="list-decimal list-inside space-y-2">
                            <li>Digite um <strong>termo de busca</strong> no campo acima (ex: "dentista em curitiba")</li>
                            <li>Clique em <strong>"Abrir no Maps"</strong> — abrirá o Google Maps em nova aba</li>
                            <li>A <strong>extensão do navegador</strong> detectará a página e iniciará a extração automaticamente</li>
                            <li>Aguarde a extração finalizar — a extensão percorre todos os resultados</li>
                            <li>Após extrair, a extensão mostrará opção de <strong>enviar para webhook</strong></li>
                            <li>Volte a esta página e clique em <strong>"Atualizar Leads"</strong> para ver os resultados</li>
                            <li>Clique em <strong>"Salvar na Base"</strong> para importar os leads para o sistema</li>
                        </ol>
                        <div className="mt-4 p-3 bg-white rounded-xl border border-amber-200">
                            <p className="font-bold text-slate-800 text-xs mb-1">⚠️ Importante:</p>
                            <p className="text-xs text-slate-500">
                                A extensão do navegador precisa estar instalada para a extração funcionar.
                                Caso ainda não tenha instalado, solicite ao administrador do sistema.
                            </p>
                        </div>
                    </div>
                )}

                {/* Extracted Leads Table */}
                {extractedLeads.length > 0 ? (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Building2 size={16} className="text-slate-400" />
                                Leads Extraídos ({extractedLeads.length})
                            </h3>
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-500">
                                            <th className="text-left px-4 py-3 font-bold text-[11px] uppercase tracking-wider">#</th>
                                            <th className="text-left px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Empresa</th>
                                            <th className="text-left px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Telefone</th>
                                            <th className="text-left px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Endereço</th>
                                            <th className="text-left px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Website</th>
                                            <th className="text-center px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Rating</th>
                                            <th className="text-center px-4 py-3 font-bold text-[11px] uppercase tracking-wider">Reviews</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {extractedLeads.map((lead, i) => (
                                            <tr key={i} className="hover:bg-white transition-colors">
                                                <td className="px-4 py-3 text-slate-400 font-bold text-xs">{lead.idx || i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-800 text-xs">{lead.nome_empresa}</span>
                                                    {lead.especialidades && (
                                                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{lead.especialidades}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {lead.telefone ? (
                                                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                            <Phone size={11} />
                                                            {lead.telefone}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-500 truncate block max-w-[180px]">{lead.endereco || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {lead.website ? (
                                                        <a
                                                            href={lead.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium truncate max-w-[150px]"
                                                        >
                                                            <Globe size={11} />
                                                            {new URL(lead.website).hostname.replace('www.', '')}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {lead.rating ? (
                                                        <span className="flex items-center justify-center gap-1 text-xs text-amber-600 font-bold">
                                                            <Star size={11} className="fill-amber-400 text-amber-400" />
                                                            {lead.rating}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {lead.reviews ? (
                                                        <span className="flex items-center justify-center gap-1 text-xs text-slate-500 font-medium">
                                                            <MessageSquare size={11} />
                                                            {lead.reviews}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <MapPin size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="font-bold text-slate-500">Nenhum lead extraído ainda</p>
                        <p className="text-xs mt-1">
                            Digite um termo, abra o Google Maps e a extensão extrairá os leads automaticamente.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleMapsLeadSearch;
