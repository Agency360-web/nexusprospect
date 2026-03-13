import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Link2,
    Unlink,
    Chrome,
    Zap,
    Timer,
} from 'lucide-react';

interface GmapsLead {
    id: string;
    name: string;
    phone: string | null;
    company: string | null;
    company_site: string | null;
    address: string | null;
    rating: string | null;
    reviews: string | null;
    specialties: string | null;
    source: string;
    search_term: string | null;
    created_at: string;
}

const POLL_INTERVAL = 15000; // 15s

const GoogleMapsLeadSearch: React.FC = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<GmapsLead[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Carregar leads do Supabase
    const fetchLeads = useCallback(async (isBackground = false) => {
        if (!user) return;
        if (!isBackground) setLoading(true); // Don't show loading spinner on background polls

        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('user_id', user.id)
                .eq('source', 'google_maps')
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;

            setLeads(data || []);

        } catch (err) {
            console.error('Erro ao carregar leads:', err);
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [user]);

    // Setup the automated polling
    useEffect(() => {
        fetchLeads(); // initial fetch

        intervalRef.current = setInterval(() => {
            fetchLeads(true);
        }, POLL_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchLeads]);

    // Deletar lead individual
    const deleteLead = async (id: string) => {
        try {
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (error) throw error;
            setLeads(prev => prev.filter(l => l.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Erro ao deletar lead:', err);
        }
    };

    // Agrupar leads por termo de busca
    const searchTerms = [...new Set(leads.map(l => l.search_term || 'Sem termo'))];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
            {/* Card Extensão */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
                            <MapPin className="text-red-500" size={24} />
                            Extrator de Leads — Google Maps
                        </h2>
                        <p className="text-slate-500 mt-1 text-xs">
                            Digite sua busca abaixo, abra o Google Maps e a extensão enviará os leads direto para cá.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <a
                            href="/extension-gmaps/"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            <Download size={14} />
                            Baixar Extensão do Navegador
                        </a>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    <span className="flex items-center gap-2">Configurar pela 1ª vez <Chrome size={14} /></span>
                    {showInstructions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showInstructions && (
                    <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 space-y-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px]">1</span>
                                    Instalação
                                </h4>
                                <ol className="list-none space-y-2 ml-1 text-slate-500 border-l-2 border-slate-100 pl-4">
                                    <li>Baixe a extensão clicando em <strong>"Baixar Extensão do Navegador"</strong>.</li>
                                    <li>Descompacte o arquivo <code className="bg-slate-100 text-[10px] px-1 py-0.5 rounded text-amber-600">.zip</code> numa pasta no seu computador.</li>
                                    <li>No navegador (Chrome ou Opera), vá em <code className="bg-slate-100 font-bold px-1.5 py-0.5 rounded text-slate-700">chrome://extensions</code>.</li>
                                    <li>Ative o <strong>Modo do Desenvolvedor</strong> (canto superior direito).</li>
                                    <li>Clique em <strong>Carregar sem compactação</strong> e selecione a pasta da extensão.</li>
                                </ol>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px]">2</span>
                                    Conexão Segura
                                </h4>
                                <ol className="list-none space-y-2 ml-1 text-slate-500 border-l-2 border-slate-100 pl-4">
                                    <li>Vá para <a href="/settings" className="font-bold text-blue-500 hover:underline">Configurações &rarr; Webhooks</a> aqui no Nexus.</li>
                                    <li>Se ainda não gerou, clique em "Gerar URL Exclusiva".</li>
                                    <li>Copie a <strong>URL Exclusiva Completa</strong> (algo como <code className="bg-slate-100 text-[9px] px-1 py-0.5 rounded text-slate-400">https://conectalab.sbs/webhook/leads?key=NEXUS-XXXXX</code>).</li>
                                    <li>Abra o popup da extensão do Google Maps no seu navegador navegando e <strong>cole o Webhook</strong> na área "Configurar Webhook".</li>
                                    <li>Pronto! Tudo que a extensão extrair cairá instantaneamente na tabela abaixo.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Building2 size={20} className="text-slate-400" />
                            Leads Extraídos
                            {leads.length > 0 && (
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                    {leads.length}
                                </span>
                            )}
                        </h3>
                        {/* Auto-update indicator */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">
                            <Timer size={10} className="text-slate-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Auto-Refresh: 15s
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchLeads(false)}
                        disabled={loading}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all
                            ${loading
                                ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-70'
                                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>

                {leads.length > 0 ? (
                    <div className="space-y-6">
                        {searchTerms.map(term => {
                            const termLeads = leads.filter(l => (l.search_term || 'Sem termo') === term);
                            return (
                                <div key={term}>
                                    <div className="flex items-center gap-2 mb-2 ml-1">
                                        <div className="p-1 bg-slate-100 rounded-md">
                                            <Search size={10} className="text-slate-500" />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                                            "{term}" <span className="text-slate-400 font-medium lowercase">({termLeads.length} contatos)</span>
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-white border-b border-slate-200 text-slate-400">
                                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Empresa / Detalhes</th>
                                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Telefone</th>
                                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Métrica (Rating)</th>
                                                        <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Website / Fonte</th>
                                                        <th className="px-4 py-3 w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {termLeads.map((lead) => (
                                                        <tr key={lead.id} className="hover:bg-white transition-colors group">
                                                            <td className="px-4 py-3.5">
                                                                <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{lead.name}</span>
                                                                {(lead.specialties || lead.address) && (
                                                                    <div className="text-[10px] text-slate-400 mt-1 flex flex-col gap-0.5">
                                                                        {lead.specialties && <span className="truncate max-w-[250px]">{lead.specialties}</span>}
                                                                        {lead.address && <span className="truncate max-w-[250px]">{lead.address}</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 align-top pt-4">
                                                                {lead.phone ? (
                                                                    <span className="flex w-fit items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-bold border border-emerald-100">
                                                                        <Phone size={10} className="fill-emerald-600" />
                                                                        {lead.phone}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-300 font-medium italic">Sem telefone</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 align-top pt-4">
                                                                {lead.rating ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="flex items-center gap-1 text-[11px] text-slate-700 font-bold">
                                                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                                                            {lead.rating}
                                                                        </span>
                                                                        {lead.reviews && (
                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{lead.reviews}</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 align-top pt-4">
                                                                {lead.company_site ? (
                                                                    <a
                                                                        href={lead.company_site}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-blue-600 font-bold max-w-[140px] truncate bg-slate-100 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors w-fit"
                                                                        title={lead.company_site}
                                                                    >
                                                                        <Globe size={10} />
                                                                        {(() => { try { return new URL(lead.company_site).hostname.replace('www.', ''); } catch { return lead.company_site; } })()}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 align-middle">
                                                                {deleteConfirm === lead.id ? (
                                                                    <div className="flex flex-col items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-100">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => deleteLead(lead.id)}
                                                                            className="text-[9px] font-black text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded w-full transition-colors"
                                                                        >
                                                                            APAGAR
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setDeleteConfirm(null)}
                                                                            className="text-[9px] font-bold text-slate-500 hover:text-slate-700"
                                                                        >
                                                                            CANCELAR
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeleteConfirm(lead.id)}
                                                                        className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                        title="Remover Lead"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                        <MapPin size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="font-bold text-slate-500 text-sm">Nenhum lead extraído ainda</p>
                        <p className="text-xs mt-1.5 max-w-sm mx-auto text-slate-400">
                            Configure seu Webhook na extensão, abra o Google Maps pelo navegador e as pesquisas extras irão aparecer aqui automaticamente.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                /* Estilos extras se precisar */
            `}</style>
        </div>
    );
};

export default GoogleMapsLeadSearch;
