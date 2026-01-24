import React, { useState } from 'react';
import { Copy, ExternalLink, QrCode, AlertCircle, CheckCircle2 } from 'lucide-react';

const WhatsAppConnectGenerator: React.FC = () => {
    const [instanceUrl, setInstanceUrl] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    const generateLink = () => {
        if (!instanceUrl || !token) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        // Clean URL to remove trailing slash
        const cleanUrl = instanceUrl.replace(/\/$/, '');

        // Construct the internal route link with params
        // Assuming the app runs on root or has a known base. Using window.location.origin.
        const baseUrl = window.location.origin + window.location.pathname; // This usually includes / or /app/
        // Actually, we want the base base url.
        // If we are at http://localhost:5173/#/admin, we want http://localhost:5173/#/connect-whatsapp

        const rootUrl = window.location.href.split('#')[0];
        const link = `${rootUrl}#/connect-whatsapp?instanceUrl=${encodeURIComponent(cleanUrl)}&token=${encodeURIComponent(token)}`;

        setGeneratedLink(link);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        alert('Link copiado com sucesso!');
    };

    const openLink = () => {
        window.open(generatedLink, '_blank');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-slate-900 text-[#ffd700] rounded-xl">
                        <QrCode size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Gerador de Conexão WhatsApp</h2>
                        <p className="text-slate-500">Gere um link seguro para conectar sua instância do WhatsApp via QR Code.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                URL da Instância
                            </label>
                            <input
                                type="url"
                                value={instanceUrl}
                                onChange={(e) => setInstanceUrl(e.target.value)}
                                placeholder="https://api.uazapi.com/instance/..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffd700]/20 focus:border-[#ffd700] transition-all font-mono text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                A URL base da sua API (ex: https://conectalabsbs.uazapi.com)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Token de Acesso
                            </label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Seu token de autenticação"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffd700]/20 focus:border-[#ffd700] transition-all font-mono text-sm"
                            />
                        </div>

                        <button
                            onClick={generateLink}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
                        >
                            Gerar Link de Conexão
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col justify-center">
                        {!generatedLink ? (
                            <div className="text-center text-slate-400">
                                <QrCode size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Preencha os dados e gere o link para visualizar.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-slate-900 text-[#ffd700] rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Link Gerado!</h3>
                                    <p className="text-slate-500 text-sm">Este link contém as credenciais para conexão.</p>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-slate-200 break-all font-mono text-xs text-slate-600">
                                    {generatedLink}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={copyToClipboard}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        <Copy size={18} />
                                        Copiar
                                    </button>
                                    <button
                                        onClick={openLink}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#ffd700] text-slate-900 font-semibold rounded-xl hover:bg-[#f8ab15] transition-colors shadow-sm shadow-[#ffd700]/50"
                                    >
                                        <ExternalLink size={18} />
                                        Abrir
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConnectGenerator;
