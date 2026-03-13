import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Webhook,
    Copy,
    CheckCircle2,
    Loader2,
    Key,
    ShieldCheck,
    AlertCircle,
} from 'lucide-react';

const generateWebhookKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'NEXUS-';
    for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const WebhookTab: React.FC = () => {
    const { user } = useAuth();
    const [webhookKey, setWebhookKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchWebhookKey();
    }, [user]);

    const fetchWebhookKey = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .rpc('get_webhook_key', { p_user_id: user!.id });

            if (error) throw error;
            setWebhookKey(data || null);
        } catch (err: any) {
            console.error('Erro ao buscar webhook key:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!user || webhookKey) return;

        try {
            setGenerating(true);
            setError(null);

            const newKey = generateWebhookKey();

            // 1. Salvar no Supabase via RPC (bypassa RLS)
            const { error: dbError } = await supabase
                .rpc('set_webhook_key', { p_user_id: user.id, p_key: newKey });

            if (dbError) throw dbError;

            setWebhookKey(newKey);
        } catch (err: any) {
            console.error('Erro ao gerar webhook key:', err);
            setError(err?.message || 'Não foi possível gerar a chave. Tente novamente.');
        } finally {
            setGenerating(false);
        }
    };

    // Construct the dynamic webhook URL based on the key
    const fullWebhookUrl = webhookKey
        ? `https://conectalab.sbs/webhook/leads?key=${webhookKey}`
        : '';

    const copyToClipboard = async () => {
        if (!fullWebhookUrl) return;
        try {
            await navigator.clipboard.writeText(fullWebhookUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback
            const input = document.createElement('input');
            input.value = fullWebhookUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                    <Webhook className="text-slate-700" size={22} />
                    Webhook
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Gerencie a sua URL de webhook exclusiva para integrar ferramentas externas (como a extensão do Google Maps).
                </p>
            </div>

            {/* Webhook Key Card */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200 p-6 md:p-8">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-slate-900 text-white rounded-xl">
                        <Key size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">URL de Webhook</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Esta URL de recebimento é pessoal e exclusiva da sua conta.
                        </p>
                    </div>
                </div>

                {fullWebhookUrl ? (
                    /* Key exists - show it */
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-mono text-[11px] md:text-sm font-bold text-slate-800 tracking-wider truncate cursor-text select-all">
                                {fullWebhookUrl}
                            </div>
                            <button
                                type="button"
                                onClick={copyToClipboard}
                                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${copied
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Copiada!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        Copiar URL
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                            <ShieldCheck size={14} />
                            <span className="font-bold">URL ativa e pronta para uso.</span>
                        </div>
                    </div>
                ) : (
                    /* No key - show generate button */
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                            <AlertCircle size={14} />
                            <span className="font-bold">Nenhum webhook gerado ainda. Clique no botão abaixo para criar.</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={generating}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Gerando acesso...
                                </>
                            ) : (
                                <>
                                    <Key size={16} />
                                    Gerar URL Exclusiva
                                </>
                            )}
                        </button>

                        {error && (
                            <p className="text-xs text-red-500 font-bold">{error}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Como utilizar?</h4>
                <ol className="text-xs text-slate-500 space-y-2 list-decimal list-inside">
                    <li>Gere sua <strong>URL exclusiva</strong> clicando no botão acima.</li>
                    <li>Copie o endereço e cole nas configurações da <strong>extensão do Extrator do Google Maps</strong> no navegador.</li>
                    <li>Sempre que você utilizar a extensão, os leads extraídos serão enviados direto para sua conta de forma segura.</li>
                    <li>Acesse-os pela aba respectiva na área de <strong>Prospecção</strong> do painel.</li>
                </ol>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[11px] text-slate-400">
                        ⚠️ <strong>Importante:</strong> Não compartilhe esta URL com terceiros. A chave no link vincula todos os registros recebidos diretamente ao seu usuário.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WebhookTab;

