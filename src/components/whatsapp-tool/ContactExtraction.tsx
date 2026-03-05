import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Download,
    Search,
    Smartphone,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Users,
    Phone,
    User,
    RefreshCw,
    FileDown,
    X,
} from 'lucide-react';

interface ExtractedContact {
    id: string;
    name: string;
    phone: string;
    pushName?: string;
    isGroup?: boolean;
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

const ContactExtraction: React.FC = () => {
    const { user } = useAuth();

    // Connection state
    const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
    const [loadingConnection, setLoadingConnection] = useState(true);

    // Extraction state
    const [contacts, setContacts] = useState<ExtractedContact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<ExtractedContact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [extracting, setExtracting] = useState(false);
    const [extracted, setExtracted] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // Filter contacts by search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredContacts(contacts);
            return;
        }
        const query = searchQuery.toLowerCase();
        setFilteredContacts(
            contacts.filter(
                (c) =>
                    c.name?.toLowerCase().includes(query) ||
                    c.phone?.toLowerCase().includes(query) ||
                    c.pushName?.toLowerCase().includes(query)
            )
        );
    }, [searchQuery, contacts]);

    // Extract contacts: trigger N8N → N8N saves to Supabase → frontend reads from table
    const handleExtract = useCallback(async () => {
        if (!selectedConnection) return;

        setExtracting(true);
        setError(null);
        setContacts([]);
        setExtracted(false);

        try {
            // 1. Clean previous extraction for this connection
            await supabase
                .from('extracted_contacts')
                .delete()
                .eq('connection_id', selectedConnection.id);

            // 2. Trigger N8N webhook to extract and save to Supabase
            const webhookUrl = 'https://nexus360.infra-conectamarketing.site/webhook-test/949591ef-bb8e-46eb-9036-b34dfe3626d2';

            const { data: { session } } = await supabase.auth.getSession();

            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: 'https://nexus-360.uazapi.com/contacts',
                    token: selectedConnection.token,
                    instance: selectedConnection.instance,
                    user_id: session?.user?.id || '',
                    connection_id: selectedConnection.id,
                }),
            }).catch(err => console.warn('Webhook fire-and-forget:', err));

            // 3. Poll Supabase table for results (N8N inserts them)
            let attempts = 0;
            const maxAttempts = 30; // 30 attempts x 2s = 60s max
            let found: ExtractedContact[] = [];

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;

                const { data: rows, error: queryErr } = await supabase
                    .from('extracted_contacts')
                    .select('*')
                    .eq('connection_id', selectedConnection.id)
                    .order('contact_name', { ascending: true });

                if (queryErr) {
                    console.error('Poll error:', queryErr);
                    continue;
                }

                if (rows && rows.length > 0) {
                    found = rows.map((r: any, index: number) => ({
                        id: r.id || `contact-${index}`,
                        name: r.contact_name || 'Sem nome',
                        phone: r.phone,
                        pushName: r.push_name || '',
                        isGroup: false,
                    }));
                    break;
                }
            }

            if (found.length > 0) {
                setContacts(found);
                setExtracted(true);
            } else {
                setError('Nenhum contato foi retornado. Verifique se o fluxo N8N está ativo e configurado corretamente.');
            }
        } catch (err: any) {
            console.error('Extraction error:', err);
            setError(err.message || 'Erro ao extrair contatos. Tente novamente.');
        } finally {
            setExtracting(false);
        }
    }, [selectedConnection]);

    // Export to CSV
    const handleExportCSV = useCallback(() => {
        const dataToExport = filteredContacts.length > 0 ? filteredContacts : contacts;
        if (dataToExport.length === 0) return;

        const csvHeader = 'Nome,Telefone,Nome no WhatsApp\n';
        const csvRows = dataToExport
            .map((c) => `"${c.name}","${c.phone}","${c.pushName || ''}"`)
            .join('\n');

        const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contatos-whatsapp-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [contacts, filteredContacts]);

    return (
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 animate-in slide-in-from-bottom-2 duration-400">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Download className="text-brand-500" size={28} />
                    Extração de Números
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                    Extraia todos os contatos salvos na agenda do seu WhatsApp conectado.
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
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedConnectionId ?? ''}
                            onChange={(e) => {
                                setSelectedConnectionId(Number(e.target.value));
                                setExtracted(false);
                                setContacts([]);
                            }}
                            className="flex-1 bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                        >
                            {connections.map((conn) => (
                                <option key={conn.id} value={conn.id}>
                                    {conn.profile_name || conn.instance} — {conn.phone_number || conn.instance}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleExtract}
                            disabled={!selectedConnection || extracting}
                            className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
                        >
                            {extracting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : extracted ? (
                                <RefreshCw size={18} />
                            ) : (
                                <Download size={18} />
                            )}
                            <span className="whitespace-nowrap">{extracting ? 'Extraindo...' : extracted ? 'Extrair Novamente' : 'Extrair Contatos'}</span>
                        </button>
                    </div>
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



            {/* Results */}
            {extracted && (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                    {/* Stats Bar */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
                                <Users size={16} className="text-slate-500" />
                                <span className="text-sm font-bold text-slate-700">
                                    {contacts.length} contatos encontrados
                                </span>
                            </div>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-xs transition-colors border border-emerald-200"
                            >
                                <FileDown size={14} />
                                Exportar CSV
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar contato..."
                                className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all w-64"
                            />
                        </div>
                    </div>

                    {/* Contacts Table */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-100 border-b border-slate-200">
                            <div className="col-span-1 text-xs font-bold text-slate-500 uppercase tracking-wider">#</div>
                            <div className="col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <User size={12} /> Nome
                            </div>
                            <div className="col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Phone size={12} /> Telefone
                            </div>
                            <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Nome no WhatsApp
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
                            {filteredContacts.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    {searchQuery ? 'Nenhum contato encontrado para a busca.' : 'Nenhum contato extraído.'}
                                </div>
                            ) : (
                                filteredContacts.map((contact, index) => (
                                    <div
                                        key={contact.id}
                                        className="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-white transition-colors"
                                    >
                                        <div className="col-span-1 text-xs text-slate-400 font-medium flex items-center">
                                            {index + 1}
                                        </div>
                                        <div className="col-span-4 text-sm font-semibold text-slate-800 truncate flex items-center">
                                            {contact.name}
                                        </div>
                                        <div className="col-span-4 text-sm text-slate-600 font-medium truncate flex items-center">
                                            {contact.phone}
                                        </div>
                                        <div className="col-span-3 text-sm text-slate-500 truncate flex items-center">
                                            {contact.pushName || '—'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Results Footer */}
                    {filteredContacts.length > 0 && searchQuery && (
                        <p className="text-xs font-semibold text-slate-500 mt-3 text-right">
                            Exibindo {filteredContacts.length} de {contacts.length} contatos
                        </p>
                    )}
                </div>
            )}

            {/* Empty state before extraction */}
            {!extracted && !extracting && (
                <div className="text-center py-12 space-y-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto">
                        <Users size={36} className="text-slate-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-700">Extraia seus contatos</h3>
                        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                            Clique em "Extrair Contatos" para buscar todos os números salvos na agenda do seu WhatsApp conectado.
                        </p>
                    </div>
                </div>
            )}

            {/* Extracting state */}
            {extracting && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-slate-400" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-slate-700">Extraindo contatos...</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Isso pode levar alguns segundos dependendo da quantidade de contatos.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactExtraction;
