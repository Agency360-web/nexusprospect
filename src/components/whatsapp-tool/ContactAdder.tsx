import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    UserPlus,
    Upload,
    Smartphone,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Users,
    FileUp,
    X,
    AlignLeft,
    Trash2,
} from 'lucide-react';

interface ContactToAdd {
    name: string;
    phone: string;
}

interface WhatsAppConnection {
    id: number;
    instance: string;
    token: string | null;
    status: string;
    phone_number: string | null;
    profile_name: string | null;
    profile_pic_url: string | null;
}

const ContactAdder: React.FC = () => {
    const { user } = useAuth();

    // Connection state
    const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
    const [loadingConnection, setLoadingConnection] = useState(true);

    // Input mode
    const [inputMode, setInputMode] = useState<'csv' | 'text'>('text');

    // Contacts state
    const [textInput, setTextInput] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [contacts, setContacts] = useState<ContactToAdd[]>([]);
    const [previewReady, setPreviewReady] = useState(false);

    // Processing state
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultMessage, setResultMessage] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedConnection = connections.find((c) => c.id === selectedConnectionId) || null;

    // Fetch connected instances
    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const { data, error: fnError } = await supabase.functions.invoke('whatsapp-uazapi', {
                    body: { action: 'list' },
                });
                if (!fnError && data?.connections) {
                    const active = data.connections.filter((c: any) => c.status === 'connected');
                    setConnections(active);
                    if (active.length > 0) {
                        setSelectedConnectionId(active[0].id);
                    }
                }
            } catch (err) {
                console.error('Error fetching connections:', err);
            } finally {
                setLoadingConnection(false);
            }
        };
        fetchConnections();
    }, []);

    // Parse text input into contacts
    const parseTextInput = useCallback(() => {
        if (!textInput.trim()) {
            setContacts([]);
            setPreviewReady(false);
            return;
        }

        const lines = textInput
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        const parsed: ContactToAdd[] = lines.map((line) => {
            // Try to detect "name,phone" or "name;phone" or just "phone"
            const separators = [',', ';', '\t'];
            for (const sep of separators) {
                if (line.includes(sep)) {
                    const parts = line.split(sep).map((p) => p.trim());
                    if (parts.length >= 2) {
                        // Check if first part looks like a phone number
                        const firstIsPhone = /^[\d+\s()-]+$/.test(parts[0]);
                        if (firstIsPhone) {
                            return { phone: parts[0], name: parts[1] || '' };
                        }
                        return { name: parts[0], phone: parts[1] };
                    }
                }
            }
            // Just a phone number
            return { name: '', phone: line };
        });

        setContacts(parsed);
        setPreviewReady(true);
    }, [textInput]);

    // Parse CSV file
    const handleCSVUpload = useCallback(async (file: File) => {
        setCsvFile(file);
        setError(null);

        try {
            const text = await file.text();
            const lines = text
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.length > 0);

            // Skip header if it looks like one
            const startIndex = lines.length > 0 && /nome|name|telefone|phone/i.test(lines[0]) ? 1 : 0;

            const parsed: ContactToAdd[] = [];
            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i];
                const separators = [',', ';', '\t'];
                let foundSep = false;
                for (const sep of separators) {
                    if (line.includes(sep)) {
                        const parts = line.split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ''));
                        if (parts.length >= 2) {
                            const firstIsPhone = /^[\d+\s()-]+$/.test(parts[0]);
                            if (firstIsPhone) {
                                parsed.push({ phone: parts[0], name: parts[1] || '' });
                            } else {
                                parsed.push({ name: parts[0], phone: parts[1] });
                            }
                            foundSep = true;
                            break;
                        }
                    }
                }
                if (!foundSep) {
                    parsed.push({ name: '', phone: line });
                }
            }

            setContacts(parsed);
            setPreviewReady(true);
        } catch (err: any) {
            setError('Erro ao ler o arquivo CSV. Verifique o formato.');
            console.error('CSV parse error:', err);
        }
    }, []);

    // Remove a single contact from preview
    const removeContact = (index: number) => {
        setContacts((prev) => prev.filter((_, i) => i !== index));
    };

    // Send contacts to N8N webhook
    const handleSubmit = useCallback(async () => {
        if (!selectedConnection || contacts.length === 0) return;

        setProcessing(true);
        setProgress(0);
        setError(null);
        setSuccess(false);
        setResultMessage('');

        try {
            const webhookUrl = 'https://nexus360.infra-conectamarketing.site/webhook/whatsapp-add-contacts';

            const { data: { session } } = await supabase.auth.getSession();

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + Math.random() * 15;
                });
            }, 500);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instance: selectedConnection.instance,
                    instanceToken: selectedConnection.token,
                    userId: session?.user?.id || '',
                    phoneNumber: selectedConnection.phone_number,
                    profileName: selectedConnection.profile_name,
                    contacts: contacts.map((c) => ({
                        name: c.name,
                        phone: c.phone,
                    })),
                    totalContacts: contacts.length,
                }),
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!response.ok) {
                throw new Error(`Erro ao adicionar contatos: ${response.statusText}`);
            }

            const result = await response.json();
            setSuccess(true);
            setResultMessage(
                result.message || `${contacts.length} contatos enviados para adição com sucesso!`
            );

            // Reset after success
            setTimeout(() => {
                setSuccess(false);
                setProgress(0);
            }, 5000);
        } catch (err: any) {
            console.error('Add contacts error:', err);
            setError(err.message || 'Erro ao adicionar contatos. Tente novamente.');
            setProgress(0);
        } finally {
            setProcessing(false);
        }
    }, [selectedConnection, contacts]);

    return (
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 animate-in slide-in-from-bottom-2 duration-400">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <UserPlus className="text-brand-500" size={28} />
                    Adicionar Contatos
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                    Adicione contatos em massa à agenda do seu WhatsApp conectado.
                </p>
            </div>

            {/* Connection Selection */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Smartphone size={16} className="text-slate-400" />
                    {connections.length > 1 ? 'Selecione a Instância' : 'Instância Conectada'}
                </label>

                {loadingConnection ? (
                    <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm">Carregando instâncias...</span>
                    </div>
                ) : connections.length > 0 ? (
                    <select
                        value={selectedConnectionId ?? ''}
                        onChange={(e) => setSelectedConnectionId(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 text-slate-800 px-4 py-3.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                    >
                        {connections.map((conn) => (
                            <option key={conn.id} value={conn.id}>
                                {conn.profile_name || conn.instance} — {conn.phone_number || conn.instance}
                            </option>
                        ))}
                    </select>
                ) : (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-800">Nenhuma instância conectada</p>
                            <p className="text-xs text-red-600 mt-0.5">
                                Vá em Configurações → Conexões para conectar seu WhatsApp.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
                    <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-800">Erro</p>
                        <p className="text-xs text-red-600 mt-0.5">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Success Alert */}
            {success && (
                <div className="flex items-start space-x-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-6 animate-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-800">Sucesso!</p>
                        <p className="text-xs text-emerald-600 mt-0.5">{resultMessage}</p>
                    </div>
                </div>
            )}

            {/* Input Mode Selector */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-3">
                    Formato de Entrada
                </label>
                <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                        type="button"
                        onClick={() => { setInputMode('text'); setPreviewReady(false); setContacts([]); setCsvFile(null); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${inputMode === 'text'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <AlignLeft size={16} />
                        Digitar Números
                    </button>
                    <button
                        type="button"
                        onClick={() => { setInputMode('csv'); setPreviewReady(false); setContacts([]); setTextInput(''); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${inputMode === 'csv'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileUp size={16} />
                        Upload CSV
                    </button>
                </div>
            </div>

            {/* Text Input Mode */}
            {inputMode === 'text' && (
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Lista de Contatos
                        </label>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={`Digite um contato por linha. Formatos aceitos:\n\n5511999999999\nJoão,5511999999999\nMaria;5521888888888\n5531777777777,Pedro`}
                            className="w-full h-56 bg-slate-50 border border-slate-200 text-slate-800 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Separe nome e telefone por vírgula, ponto-e-vírgula ou tab. Um contato por linha.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={parseTextInput}
                        disabled={!textInput.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Users size={16} />
                        Processar Lista
                    </button>
                </div>
            )}

            {/* CSV Upload Mode */}
            {inputMode === 'csv' && (
                <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Arquivo CSV
                    </label>
                    <label className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors h-48 ${csvFile ? 'border-brand-400 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
                        }`}>
                        {csvFile ? (
                            <div className="text-center">
                                <CheckCircle2 className="text-brand-500 mb-2 mx-auto" size={32} />
                                <span className="text-sm font-bold text-slate-800 block truncate max-w-[200px]">
                                    {csvFile.name}
                                </span>
                                <span className="text-xs text-brand-600 mt-1 block">Clique para trocar</span>
                            </div>
                        ) : (
                            <div className="text-center text-slate-500">
                                <Upload className="mb-3 mx-auto" size={32} />
                                <span className="text-sm font-bold block mb-1">Upload de Arquivo CSV</span>
                                <span className="text-xs text-slate-400">
                                    Formato: nome,telefone (uma linha por contato)
                                </span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".csv,.txt"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleCSVUpload(f);
                            }}
                        />
                    </label>
                </div>
            )}

            {/* Preview */}
            {previewReady && contacts.length > 0 && (
                <div className="mb-8 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Users size={16} className="text-slate-400" />
                            Preview — {contacts.length} contatos
                        </h3>
                        <button
                            type="button"
                            onClick={() => { setContacts([]); setPreviewReady(false); setTextInput(''); setCsvFile(null); }}
                            className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 py-1.5 px-3 rounded-lg transition-colors"
                        >
                            Limpar Tudo
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-100 border-b border-slate-200">
                            <div className="col-span-1 text-xs font-bold text-slate-500 uppercase tracking-wider">#</div>
                            <div className="col-span-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</div>
                            <div className="col-span-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</div>
                            <div className="col-span-1 text-xs font-bold text-slate-500 uppercase tracking-wider"></div>
                        </div>

                        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                            {contacts.map((contact, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-12 gap-4 px-5 py-2.5 hover:bg-white transition-colors"
                                >
                                    <div className="col-span-1 text-xs text-slate-400 font-medium flex items-center">
                                        {index + 1}
                                    </div>
                                    <div className="col-span-5 text-sm font-semibold text-slate-800 truncate flex items-center">
                                        {contact.name || <span className="text-slate-300 italic">Sem nome</span>}
                                    </div>
                                    <div className="col-span-5 text-sm text-slate-600 font-medium truncate flex items-center font-mono">
                                        {contact.phone}
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeContact(index)}
                                            className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {processing && (
                <div className="mb-8 animate-in slide-in-from-bottom-1 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-700">Adicionando contatos...</span>
                        <span className="text-sm font-bold text-brand-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-brand-500 to-brand-400 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={!selectedConnection || contacts.length === 0 || processing}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl transition-all duration-300 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
                >
                    {processing ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : success ? (
                        <CheckCircle2 size={20} className="text-green-400" />
                    ) : (
                        <UserPlus size={20} />
                    )}
                    <span>
                        {processing
                            ? 'Processando...'
                            : success
                                ? 'Contatos Enviados!'
                                : `Adicionar ${contacts.length > 0 ? contacts.length + ' ' : ''}Contatos`}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default ContactAdder;
