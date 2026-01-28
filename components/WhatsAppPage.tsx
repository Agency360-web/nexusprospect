import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import {
    Search,
    MoreVertical,
    Smartphone,
    Send,
    Mic,
    Paperclip,
    Image as ImageIcon,
    FileText,
    Smile,
    MessageSquare,
    Loader2,
    Check,
    CheckCheck,
    ChevronDown,
    ArrowLeft,
    StickyNote,
    Zap,
    History,
    X,
    Upload
} from 'lucide-react';

interface Chat {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    avatar?: string;
}

interface Message {
    id: string;
    text?: string;
    type: 'text' | 'image' | 'audio' | 'document';
    time: string;
    fromMe: boolean;
    mediaUrl?: string;
    status: 'sent' | 'delivered' | 'read';
}

const WhatsAppPage: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [notes, setNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (!selectedClient) return;

        setNotes(selectedClient.whatsapp_notes || '');
        setChats([]);
        setSelectedChat(null);

        // 1. Initial Fetch of chats from DB and check status
        fetchChatsFromDB(selectedClient.id);
        checkInstanceStatus();

        // 2. Subscribe to Realtime Chats
        const chatSubscription = supabase
            .channel(`public:whatsapp_chats:client_id=eq.${selectedClient.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'whatsapp_chats',
                filter: `client_id=eq.${selectedClient.id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newChat = payload.new as any;
                    setChats(prev => [formatChat(newChat), ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    const updatedChat = payload.new as any;
                    setChats(prev => prev.map(c => c.id === updatedChat.id ? formatChat(updatedChat) : c));
                } else if (payload.eventType === 'DELETE') {
                    setChats(prev => prev.filter(c => c.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(chatSubscription);
        };
    }, [selectedClient]);

    useEffect(() => {
        if (!selectedChat || !selectedClient) {
            setMessages([]);
            return;
        }

        // 1. Initial Fetch of messages from DB
        fetchMessagesFromDB(selectedChat.id);

        // 2. Subscribe to Realtime Messages
        const msgSubscription = supabase
            .channel(`public:whatsapp_messages:chat_id=eq.${selectedChat.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages',
                filter: `chat_id=eq.${selectedChat.id}`
            }, (payload) => {
                const newMsg = payload.new as any;
                setMessages(prev => [...prev, formatMessage(newMsg)]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(msgSubscription);
        };
    }, [selectedChat, selectedClient]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatChat = (chat: any): Chat => ({
        id: chat.id,
        name: chat.name,
        lastMessage: chat.last_message || '',
        time: chat.updated_at ? new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: chat.unread_count || 0,
        avatar: chat.avatar_url
    });

    const formatMessage = (msg: any): Message => ({
        id: msg.id,
        text: msg.text,
        type: msg.type as any,
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fromMe: msg.from_me,
        mediaUrl: msg.media_url,
        status: msg.status as any
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchChatsFromDB = async (clientId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('whatsapp_chats')
            .select('*')
            .eq('client_id', clientId)
            .order('updated_at', { ascending: false });

        if (data) {
            setChats(data.map(formatChat));
        }
        setLoading(false);
    };

    const fetchMessagesFromDB = async (chatId: string) => {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('timestamp', { ascending: true });

        if (data) {
            setMessages(data.map(formatMessage));
        }
    };

    const fetchClients = async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .not('whatsapp_instance_url', 'is', null);

        if (data) {
            setClients(data);
        }
    };

    const checkInstanceStatus = async () => {
        if (!selectedClient?.whatsapp_instance_url || !selectedClient?.whatsapp_token) return;

        try {
            setInstanceStatus('loading');
            const cleanUrl = selectedClient.whatsapp_instance_url.replace(/\/$/, '');
            const response = await fetch(`${cleanUrl}/instance/status`, {
                headers: {
                    'Accept': 'application/json',
                    'token': selectedClient.whatsapp_token,
                    'apikey': selectedClient.whatsapp_token // Try both for robustness
                }
            });
            const data = await response.json();

            // Check for various ways the API returns connection state
            const isConnected = data.status === 'connected' || data.state === 'CONNECTED' || data.instance?.status === 'connected';
            setInstanceStatus(isConnected ? 'connected' : 'disconnected');
        } catch (error) {
            console.error('Status Error:', error);
            setInstanceStatus('disconnected');
        }
    };


    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && !fileToUpload) || !selectedChat || !selectedClient) return;

        const text = newMessage;
        const file = fileToUpload;
        setNewMessage('');
        setFileToUpload(null);

        try {
            const cleanUrl = selectedClient.whatsapp_instance_url.replace(/\/$/, '');
            let response;

            if (file) {
                // Media sending logic
                setUploading(true);
                const formData = new FormData();
                formData.append('number', selectedChat.id);
                formData.append('media', file);

                let mediaEndpoint = '/message/send-image';
                if (file.type.startsWith('video/')) mediaEndpoint = '/message/send-video';
                else if (file.type.startsWith('audio/')) mediaEndpoint = '/message/send-audio';
                else if (!file.type.startsWith('image/')) mediaEndpoint = '/message/send-document';

                response = await fetch(`${cleanUrl}${mediaEndpoint}`, {
                    method: 'POST',
                    headers: {
                        'token': selectedClient.whatsapp_token,
                        'apikey': selectedClient.whatsapp_token
                    },
                    body: formData
                });
                setUploading(false);
            } else {
                response = await fetch(`${cleanUrl}/message/send-text`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'token': selectedClient.whatsapp_token,
                        'apikey': selectedClient.whatsapp_token
                    },
                    body: JSON.stringify({
                        number: selectedChat.id,
                        text: text
                    })
                });
            }

            // Manually insert into DB for instant feedback
            if (response?.ok) {
                const { error: insertError } = await supabase.from('whatsapp_messages').insert({
                    id: `local_${Date.now()}`,
                    chat_id: selectedChat.id,
                    client_id: selectedClient.id,
                    text: text,
                    type: file ? (file.type.startsWith('image/') ? 'image' : 'document') : 'text',
                    from_me: true,
                    timestamp: new Date().toISOString()
                });
                if (insertError) console.error('Insert Error:', insertError);
            }
        } catch (error) {
            console.error('Error sending:', error);
        }
    };
    const handleSaveNotes = async () => {
        if (!selectedClient) return;
        setIsSavingNotes(true);
        try {
            const { error } = await supabase
                .from('clients')
                .update({ whatsapp_notes: notes })
                .eq('id', selectedClient.id);

            if (error) throw error;

            // Update local state
            setClients(prev => prev.map(c =>
                c.id === selectedClient.id ? { ...c, whatsapp_notes: notes } : c
            ));
            setSelectedClient({ ...selectedClient, whatsapp_notes: notes });
        } catch (error) {
            console.error('Error saving notes:', error);
        } finally {
            setIsSavingNotes(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-[1600px] mx-auto pb-10">
            {/* Dark Hero Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-[100px] opacity-10 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                        <Smartphone className="text-emerald-500" size={32} />
                        WhatsApp
                    </h1>
                    <p className="text-slate-300 font-medium max-w-2xl">Acompanhe os disparos, negociacões e suporte ao cliente em um único lugar.</p>
                </div>
            </div>

            <div className="h-[calc(100vh-200px)] bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                {/* Compact Control Header (Inside tool) */}
                <div className="bg-[#1e293b] p-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-2xl text-emerald-400 border border-white/10 shadow-inner">
                            <Zap size={24} fill="currentColor" className="opacity-80" />
                        </div>
                        <div>
                            <h3 className="text-white text-lg font-black tracking-tight">WhatsApp Web</h3>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${instanceStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${instanceStatus === 'connected' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {instanceStatus === 'connected' ? 'Conectado' : 'Desconectado'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <button className="flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 text-white min-w-[240px] shadow-lg">
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-black shadow-inner">
                                {selectedClient?.name.charAt(0)}
                            </div>
                            <span className="flex-1 text-left text-sm font-bold truncate">{selectedClient?.name || 'Selecione um Cliente'}</span>
                            <ChevronDown size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                        </button>

                        <div className="absolute right-0 top-full mt-2 w-full bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 overflow-hidden ring-1 ring-black/50">
                            <div className="p-2 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/20">Escolher Cliente</div>
                            {clients.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedClient(c)}
                                    className={`w-full px-5 py-4 text-left text-xs font-bold hover:bg-white/5 transition-colors flex items-center gap-3 ${selectedClient?.id === c.id ? 'text-emerald-400 bg-white/5' : 'text-slate-300'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${selectedClient?.id === c.id ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                                    {c.name}
                                </button>
                            ))}
                            {clients.length === 0 && <div className="p-6 text-slate-500 text-[10px] text-center italic uppercase font-bold">Nenhum cliente configurado</div>}
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    {/* Chat List Siderbar */}
                    <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
                        <div className="p-4 bg-white border-b border-slate-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Procurar ou começar uma nova conversa"
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={`p-4 flex items-center gap-3 cursor-pointer transition-all border-b border-slate-50 group hover:bg-emerald-50/30 ${selectedChat?.id === chat.id ? 'bg-emerald-50 border-r-4 border-r-emerald-500' : ''}`}
                                >
                                    <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-slate-500 shadow-sm overflow-hidden border-2 border-transparent group-hover:border-emerald-200 transition-all">
                                        {chat.avatar ? <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" /> : chat.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-emerald-700 transition-colors">{chat.name}</h4>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{chat.time}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-500 truncate font-medium">{chat.lastMessage}</p>
                                            {chat.unread > 0 && (
                                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-emerald-500/20 animate-pulse">
                                                    {chat.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col bg-[#e5ddd5] relative">
                        {/* Chat Background Layer */}
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/630/wallpaper-whatsapp-background.jpg")' }}></div>

                        {selectedChat ? (
                            <>
                                {/* Chat Header */}
                                <div className="bg-slate-50/90 backdrop-blur-md px-4 py-3 border-b border-slate-200 flex items-center justify-between z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600 shadow-sm overflow-hidden">
                                            {selectedChat.avatar ? <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover" /> : selectedChat.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">{selectedChat.name}</h3>
                                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Online</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><Search size={18} /></button>
                                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><MoreVertical size={18} /></button>
                                    </div>
                                </div>

                                {/* Messages Container */}
                                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 z-10 scrollbar-thin scrollbar-thumb-slate-300">
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] px-3 py-2 rounded-xl shadow-sm relative animate-in ${msg.fromMe ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                                {msg.type === 'image' && msg.mediaUrl && (
                                                    <div className="mb-2 rounded-lg overflow-hidden border border-black/5">
                                                        <img src={msg.mediaUrl} alt="Visualização" className="max-w-full h-auto" />
                                                    </div>
                                                )}
                                                {msg.type === 'document' && msg.mediaUrl && (
                                                    <div className="mb-2 p-3 bg-black/5 rounded-lg flex items-center gap-3 border border-black/5">
                                                        <FileText className="text-emerald-600" size={24} />
                                                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-700 hover:underline truncate max-w-[150px]">
                                                            Documento Recebido
                                                        </a>
                                                    </div>
                                                )}
                                                {msg.text && <p className="text-sm text-slate-800 break-words whitespace-pre-wrap">{msg.text}</p>}
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <span className="text-[9px] text-slate-400">{msg.time}</span>
                                                    {msg.fromMe && (
                                                        <span className="text-emerald-500">
                                                            {msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Media Preview Area */}
                                {fileToUpload && (
                                    <div className="bg-white/90 backdrop-blur-md px-6 py-4 border-t border-slate-200 z-20 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200">
                                                    {fileToUpload.type.startsWith('image/') ? (
                                                        <img src={URL.createObjectURL(fileToUpload)} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FileText size={32} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{fileToUpload.name}</h4>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{(fileToUpload.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setFileToUpload(null)}
                                                className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-all"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Chat Input */}
                                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 z-10">
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) setFileToUpload(e.target.files[0]);
                                        }}
                                    />
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-5xl mx-auto">
                                        <div className="flex gap-1">
                                            <button type="button" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><Smile size={22} /></button>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors rotate-45"
                                            >
                                                <Paperclip size={22} />
                                            </button>
                                        </div>
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                                placeholder={fileToUpload ? "Adicione uma legenda..." : "Digite uma mensagem"}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="flex gap-1">
                                            {(newMessage.trim() || fileToUpload) ? (
                                                <button
                                                    type="submit"
                                                    disabled={uploading}
                                                    className="p-3 bg-emerald-500 text-white rounded-full shadow-lg hover:shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                                </button>
                                            ) : (
                                                <button type="button" className="p-3 bg-emerald-500 text-white rounded-full shadow-lg hover:shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95">
                                                    <Mic size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 backdrop-blur-sm">
                                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                    <MessageSquare size={40} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Nexus WhatsApp Web</h3>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-8 font-medium">Selecione uma conversa ao lado para começar a enviar mensagens em tempo real.</p>
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex items-center gap-3 max-w-sm">
                                    <Smartphone size={20} />
                                    <span className="text-xs font-bold text-left italic">Mantenha seu celular conectado à internet para garantir a sincronização.</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes Panel (Right Side) */}
                    <div className="w-80 border-l border-slate-200 bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3 text-slate-900 mb-1">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                    <StickyNote size={18} />
                                </div>
                                <h3 className="font-black text-sm uppercase tracking-tight">Anotações Internas</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-11">Negociações & Suporte</p>
                        </div>

                        <div className="flex-1 p-4 overflow-hidden flex flex-col">
                            <textarea
                                className="flex-1 w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all resize-none placeholder:text-slate-400 placeholder:italic leading-relaxed"
                                placeholder="Escreva aqui detalhes sobre este cliente, negociacões em aberto, acordos ou suporte..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <button
                                onClick={handleSaveNotes}
                                disabled={isSavingNotes || !selectedClient}
                                className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                            >
                                {isSavingNotes ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Check size={14} />
                                )}
                                {isSavingNotes ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <div className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-black">
                                    <History size={14} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase">Resumo</h4>
                                    <p className="text-[9px] text-slate-400 font-medium truncate">Vinculado ao cliente {selectedClient?.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppPage;
