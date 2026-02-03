import React, { useState, useCallback, useRef } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Send,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Loader2,
    Trash2,
    Eye,
    BarChart3,
    Users,
    MessageSquare,
    Percent,
    Image as ImageIcon,
    FileText,
    Video,
    Music,
    X,
    Paperclip
} from 'lucide-react';

interface Contact {
    nome: string;
    telefone: string;
    empresa: string;
    status?: string;
}

interface DispatchResult {
    total: number;
    enviados: number;
    falhas: number;
    percentual_sucesso: number;
    percentual_falha: number;
    detalhes?: Array<{
        telefone: string;
        status: 'enviado' | 'falha';
        erro?: string;
    }>;
}

interface MediaFile {
    file: File;
    name: string;
    type: string;
    preview?: string;
    base64?: string;
}

const MessageDispatcher: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [mensagem, setMensagem] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DispatchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    const parseCSV = (text: string): Contact[] => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nomeIdx = headers.findIndex(h => h.includes('nome'));
        const telIdx = headers.findIndex(h => h.includes('telefone') || h.includes('tel'));
        const empIdx = headers.findIndex(h => h.includes('empresa'));
        const statusIdx = headers.findIndex(h => h.includes('status'));

        return lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            return {
                nome: values[nomeIdx] || '',
                telefone: values[telIdx] || '',
                empresa: values[empIdx] || '',
                status: values[statusIdx] || 'Aguardando'
            };
        }).filter(c => c.telefone);
    };

    const handleFile = useCallback((file: File) => {
        if (!file.name.endsWith('.csv')) {
            setError('Por favor, envie um arquivo CSV válido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const parsed = parseCSV(text);
            if (parsed.length === 0) {
                setError('Nenhum contato válido encontrado no arquivo.');
                return;
            }
            setContacts(parsed);
            setError(null);
            setResult(null);
        };
        reader.readAsText(file);
    }, []);

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleMediaFile = async (file: File) => {
        const validTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/mpeg', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!validTypes.some(type => file.type.includes(type) || validTypes.includes(file.type))) {
            setError('Formato de arquivo não suportado. Use imagens, vídeos, áudios ou PDF.');
            return;
        }

        if (file.size > 16 * 1024 * 1024) { // 16MB limit
            setError('O arquivo deve ter no máximo 16MB.');
            return;
        }

        try {
            const base64 = await convertToBase64(file);
            let preview = undefined;

            if (file.type.startsWith('image/')) {
                preview = URL.createObjectURL(file);
            }

            setSelectedMedia({
                file,
                name: file.name,
                type: file.type,
                preview,
                base64
            });
            setError(null);
        } catch (err) {
            setError('Erro ao processar arquivo de mídia.');
            console.error(err);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDispatch = async () => {
        if (!webhookUrl) {
            setError('Por favor, informe a URL do webhook.');
            return;
        }
        if (contacts.length === 0) {
            setError('Por favor, carregue um arquivo CSV com contatos.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contacts: contacts.map(c => ({
                        nome: c.nome,
                        telefone: c.telefone,
                        empresa: c.empresa
                    })),
                    mensagem: mensagem,
                    midia: selectedMedia ? {
                        nome: selectedMedia.name,
                        tipo: selectedMedia.type,
                        data: selectedMedia.base64
                    } : null
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            // Parse result from n8n
            setResult({
                total: data.total || contacts.length,
                enviados: data.enviados || 0,
                falhas: data.falhas || 0,
                percentual_sucesso: data.percentual_sucesso || 0,
                percentual_falha: data.percentual_falha || 0,
                detalhes: data.detalhes || []
            });
        } catch (err: any) {
            setError(`Erro ao enviar: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const clearAll = () => {
        setContacts([]);
        setSelectedMedia(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (mediaInputRef.current) mediaInputRef.current.value = '';
    };

    const getMediaIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon size={20} className="text-purple-500" />;
        if (type.startsWith('video/')) return <Video size={20} className="text-blue-500" />;
        if (type.startsWith('audio/')) return <Music size={20} className="text-amber-500" />;
        return <FileText size={20} className="text-slate-500" />;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                        <MessageSquare size={32} />
                        Disparador de Mensagens
                    </h1>
                    <p className="text-emerald-100 font-medium text-sm md:text-base">
                        Envie mensagens em massa via WhatsApp com integração n8n
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Webhook URL */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            URL do Webhook (n8n)
                        </label>
                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://seu-n8n.com/webhook/conecta"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-sm"
                        />
                    </div>

                    {/* CSV Upload */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Upload de Contatos (CSV)
                            </label>
                            {contacts.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                                >
                                    <Trash2 size={14} />
                                    Limpar
                                </button>
                            )}
                        </div>

                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                                ? 'border-emerald-500 bg-emerald-50'
                                : contacts.length > 0
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                className="hidden"
                            />

                            {contacts.length > 0 ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileSpreadsheet size={40} className="text-emerald-500" />
                                    <p className="font-bold text-emerald-700">{contacts.length} contatos carregados</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                                    >
                                        <Eye size={14} />
                                        Visualizar dados
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload size={40} className="text-slate-400" />
                                    <p className="font-bold text-slate-600">Arraste o arquivo CSV aqui</p>
                                    <p className="text-xs text-slate-400">ou clique para selecionar</p>
                                </div>
                            )}
                        </div>

                        <p className="text-[10px] text-slate-400 mt-3">
                            Formato: Nome do Cliente, Telefone do Cliente, Empresa do Cliente, Status
                        </p>
                    </div>

                    {/* Media Upload (Above Message) */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Mídia (Opcional)
                            </label>
                            {selectedMedia && (
                                <button
                                    onClick={() => setSelectedMedia(null)}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                                >
                                    <Trash2 size={14} />
                                    Remover
                                </button>
                            )}
                        </div>

                        {!selectedMedia ? (
                            <div
                                onClick={() => mediaInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-all"
                            >
                                <input
                                    ref={mediaInputRef}
                                    type="file"
                                    accept="image/*,video/*,audio/*,application/pdf"
                                    onChange={(e) => e.target.files?.[0] && handleMediaFile(e.target.files[0])}
                                    className="hidden"
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <div className="bg-slate-100 p-3 rounded-full">
                                        <Paperclip size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">
                                        Clique para adicionar foto, vídeo, áudio ou PDF
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Máx. 16MB
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                                {selectedMedia.type.startsWith('image/') && selectedMedia.preview ? (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                                        <img src={selectedMedia.preview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                        {getMediaIcon(selectedMedia.type)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                        {selectedMedia.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {(selectedMedia.file.size / 1024 / 1024).toFixed(2)} MB • {selectedMedia.type}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message Template */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Mensagem Base (opcional)
                        </label>
                        <textarea
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            placeholder="Olá {nome}, tudo bem? Estou entrando em contato sobre..."
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-2">
                            Use {'{nome}'}, {'{empresa}'} para personalização automática
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
                            <AlertCircle className="text-rose-500 flex-shrink-0" size={20} />
                            <p className="text-sm font-medium text-rose-700">{error}</p>
                        </div>
                    )}

                    {/* Send Button */}
                    <button
                        onClick={handleDispatch}
                        disabled={isLoading || contacts.length === 0}
                        className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isLoading || contacts.length === 0
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send size={20} />
                                Iniciar Disparo ({contacts.length} contatos)
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column - Results Dashboard */}
                <div className="space-y-6">
                    {result ? (
                        <>
                            {/* Stats Cards */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-emerald-600" />
                                    Resultados do Disparo
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                                        <Users size={20} className="mx-auto text-slate-500 mb-1" />
                                        <p className="text-2xl font-black text-slate-900">{result.total}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                                        <CheckCircle2 size={20} className="mx-auto text-emerald-500 mb-1" />
                                        <p className="text-2xl font-black text-emerald-600">{result.enviados}</p>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Enviados</p>
                                    </div>
                                    <div className="bg-rose-50 rounded-xl p-4 text-center">
                                        <XCircle size={20} className="mx-auto text-rose-500 mb-1" />
                                        <p className="text-2xl font-black text-rose-600">{result.falhas}</p>
                                        <p className="text-[10px] font-bold text-rose-500 uppercase">Falhas</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                                        <Percent size={20} className="mx-auto text-blue-500 mb-1" />
                                        <p className="text-2xl font-black text-blue-600">{result.percentual_sucesso.toFixed(1)}%</p>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase">Sucesso</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                        <span>Taxa de Sucesso</span>
                                        <span>{result.percentual_sucesso.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000"
                                            style={{ width: `${result.percentual_sucesso}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Details List */}
                            {result.detalhes && result.detalhes.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h3 className="font-bold text-slate-900 mb-4">Detalhes</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {result.detalhes.map((d, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between p-3 rounded-lg ${d.status === 'enviado' ? 'bg-emerald-50' : 'bg-rose-50'
                                                    }`}
                                            >
                                                <span className="font-mono text-sm">{d.telefone}</span>
                                                {d.status === 'enviado' ? (
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                ) : (
                                                    <XCircle size={16} className="text-rose-500" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center">
                            <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="font-bold text-slate-500 mb-1">Aguardando Disparo</h3>
                            <p className="text-xs text-slate-400">
                                Os resultados aparecerão aqui após o envio
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] m-4 flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Preview dos Contatos</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <XCircle size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 overflow-auto flex-1">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-2 px-3 font-bold text-slate-500">Nome</th>
                                        <th className="text-left py-2 px-3 font-bold text-slate-500">Telefone</th>
                                        <th className="text-left py-2 px-3 font-bold text-slate-500">Empresa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.slice(0, 50).map((c, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="py-2 px-3">{c.nome}</td>
                                            <td className="py-2 px-3 font-mono">{c.telefone}</td>
                                            <td className="py-2 px-3">{c.empresa}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {contacts.length > 50 && (
                                <p className="text-xs text-slate-400 mt-4 text-center">
                                    Mostrando 50 de {contacts.length} contatos
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageDispatcher;
