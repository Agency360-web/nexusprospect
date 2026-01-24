import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  Building2,
  Tag as TagIcon,
  ChevronLeft,
  Image as ImageIcon,
  Film,
  Mic,
  FileText,
  Play,
  Volume2,
  ArrowRight,
  Zap,
  Smartphone,
  Type as TypeIcon,
  Link as LinkIcon,
  ChevronDown,
  UploadCloud,
  X,
  Loader2,
  Bold,
  Italic,
  Strikethrough,
  Smile
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Client, Tag, WhatsAppNumber, MediaType, Lead, WebhookConfig } from '../types';
import { supabase } from '../lib/supabase';

const CampaignWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('Olá {{nome}}, temos uma novidade para a {{empresa}}!');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('none');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [currentNumbers, setCurrentNumbers] = useState<WhatsAppNumber[]>([]);
  const [clientWebhooks, setClientWebhooks] = useState<WebhookConfig[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);

  const hasOutboundWebhook = clientWebhooks.some(w => w.type === 'outbound' && w.active);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientDetails(selectedClientId);
    } else {
      setCurrentTags([]);
      setCurrentNumbers([]);
      setClientWebhooks([]);
      setRecipientCount(0);
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedClientId && selectedTagIds) {
      countRecipients();
    }
  }, [selectedTagIds, selectedClientId]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('clients').select('*');
      if (data) {
        setClients(data.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          createdAt: c.created_at,
          email: c.email
        })));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId: string) => {
    try {
      // Fetch Tags
      const { data: tagsData } = await supabase.from('tags').select('*').eq('client_id', clientId);
      if (tagsData) {
        setCurrentTags(tagsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          clientId: t.client_id,
          color: t.color || 'bg-slate-100 text-slate-600'
        })));
      }

      // Fetch Numbers
      const { data: numbersData } = await supabase.from('whatsapp_numbers').select('*').eq('client_id', clientId).eq('status', 'active');
      if (numbersData) {
        setCurrentNumbers(numbersData.map((n: any) => ({
          id: n.id,
          clientId: n.client_id,
          nickname: n.nickname,
          phone: n.phone,
          status: n.status,
          dailyLimit: n.daily_limit,
          sentToday: n.sent_today
        })));
      }

      // Fetch Webhooks
      const { data: webhooksData } = await supabase.from('webhook_configs').select('*').eq('client_id', clientId);
      if (webhooksData) {
        setClientWebhooks(webhooksData.map((w: any) => ({
          id: w.id,
          clientId: w.client_id,
          name: w.name,
          url: w.url,
          type: w.type,
          method: w.method,
          active: w.active,
          headers: w.headers || {}
        })));
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  const countRecipients = async () => {
    if (selectedTagIds.length === 0) {
      setRecipientCount(0);
      return;
    }

    // In a real scenario with many leads, this should be a count query.
    // Since we store tags as specific array column or we might need join if using leads_tags table.
    // The current schema has tags text[] in leads table.
    // Supabase .contains() can be used for array columns.

    // We want leads that have ANY of selected tags? Or ALL? Usually ANY for broadcast unless specified.
    // Let's assume ANY for now.

    // Constructing query for array overlap is tricky in simple JS client sometimes.
    // text[] && text[] (overlap).

    // Assume tag_ids are UUIDs now (fixed in previous step).

    // Actually, let's fetch leads for client and filter in memory if list is small, 
    // or use contains if selecting one tag. If multiple, it's harder.
    // Let's rely on overlap filter.

    // Actually, let's fetch leads for client and filter in memory if list is small, 
    // or use contains if selecting one tag. If multiple, it's harder.
    // Let's rely on overlap filter.

    try {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', selectedClientId)
        .overlaps('tags', selectedTagIds); // Requires tags to be text[] in Postgres

      if (!error) {
        setRecipientCount(count || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleSend = async () => {
    setIsSending(true);

    try {
      // 1. Get the Outbound Webhook
      const webhook = clientWebhooks.find(w => w.type === 'outbound' && w.active);
      if (!webhook) {
        alert('Erro Crítico: Nenhum webhook de disparo (outbound) configurado para este cliente.');
        setIsSending(false);
        return;
      }

      // 2. Create Campaign Record in DB
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          client_id: selectedClientId,
          name: campaignName,
          message: message,
          status: 'sending',
          metadata: {
            target_tags: selectedTagIds,
            number_id: selectedNumberId,
            media_type: mediaType
          }
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      const campaignId = campaignData.id;

      // 2.5 Upload Media if exists
      let finalMediaUrl = mediaUrl;
      if (mediaFile) {
        try {
          const fileExt = mediaFile.name.split('.').pop();
          const fileName = `${selectedClientId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('campaign-media')
            .upload(fileName, mediaFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('campaign-media')
            .getPublicUrl(fileName);

          finalMediaUrl = publicUrl;
        } catch (uploadErr) {
          console.error('Upload failed:', uploadErr);
          throw new Error('Falha ao fazer upload da mídia. Verifique se o arquivo é válido.');
        }
      }

      // 3. Construct Funnel Payload
      const funnel = [];
      let position = 1;

      // 3.1 Media First (Priority)
      if (mediaType !== 'none' && finalMediaUrl) {
        funnel.push({
          type: mediaType,
          content: finalMediaUrl,
          position: position++
        });
      }

      // 3.2 Text Second
      if (message) {
        funnel.push({
          type: 'text',
          content: message,
          position: position++
        });
      }

      const payload = {
        event: 'campaign.dispatch',
        timestamp: new Date().toISOString(),
        client_id: selectedClientId,
        campaign_id: campaignId,
        display_name: campaignName,
        channel: 'whatsapp',
        sender_number: currentNumbers.find(n => n.id === selectedNumberId)?.phone,

        // Funnel Structure
        funnel: funnel,

        audience: {
          tag_ids: selectedTagIds,
          // CRITICAL for N8N: Send names so it can filter the Google Sheet
          tag_names: selectedTagIds.map(id => currentTags.find(t => t.id === id)?.name || id),
          total_contacts: recipientCount
        },
        metadata: {
          requested_by: (await supabase.auth.getUser()).data.user?.id
        }
      };

      // 4. Fire Webhook
      try {
        const response = await fetch(webhook.url, {
          method: webhook.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhook.headers || {})
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Webhook Error: ${response.status} ${response.statusText}`);
        }

        // 5. Update Campaign Status to 'completed' (or 'queued' depending on logic)
        await supabase
          .from('campaigns')
          .update({ status: 'completed' })
          .eq('id', campaignId);

        // Optional: Keep creating 'transmissions' record if that's still relevant for legacy or detailed logs,
        // but the main requirement is the webhook.
        // We'll skip detailed transmissions rows for now or leave existing logic if needed, 
        // but user asked for "None campaign can exist without webhook", implying the webhook is the engine.

      } catch (webhookErr) {
        console.error('Webhook execution failed:', webhookErr);
        await supabase
          .from('campaigns')
          .update({ status: 'failed', metadata: { error: String(webhookErr) } })
          .eq('id', campaignId);

        throw new Error('Falha ao comunicar com webhook do cliente.');
      }

      setIsSending(false);
      setIsSuccess(true);

    } catch (error: any) {
      console.error('Error sending campaign:', error);
      setIsSending(false);

      let errorMessage = 'Erro desconhecido';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error object
        errorMessage = error.message || error.error_description || JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      alert(`Falha no disparo: ${errorMessage}`);
    }
  };

  const toggleTag = (tid: string) => {
    setSelectedTagIds(prev => prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]);
  };

  const insertVariable = (variable: string) => {
    insertAtCursor(` {{${variable}}} `);
  };

  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage(prev => prev + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;

    const before = text.substring(0, start);
    const after = text.substring(end);

    const newText = `${before}${textToInsert}${after}`;
    setMessage(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const insertFormat = (symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;

    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}${symbol}${selected}${symbol}${after}`;
    setMessage(newText);

    setTimeout(() => {
      textarea.focus();
      // If text was selected, keep selection inside symbols. If not, place cursor inside.
      if (selected) {
        textarea.setSelectionRange(start + symbol.length, end + symbol.length);
      } else {
        textarea.setSelectionRange(start + symbol.length, start + symbol.length);
      }
    }, 0);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    insertAtCursor(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const previewMessage = message
    .replace(/{{nome}}/g, 'João Silva')
    .replace(/{{empresa}}/g, 'Tech Solutions');

  const MediaSelector = () => (
    <div className="grid grid-cols-5 gap-2">
      {[
        { id: 'none', icon: TypeIcon, label: 'Texto' },
        { id: 'image', icon: ImageIcon, label: 'Imagem' },
        { id: 'video', icon: Film, label: 'Vídeo' },
        { id: 'audio', icon: Mic, label: 'Áudio' },
        { id: 'pdf', icon: FileText, label: 'PDF' }
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => { setMediaType(item.id as MediaType); if (item.id === 'none') clearMedia(); }}
          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all ${mediaType === item.id
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
            }`}
        >
          <item.icon size={16} />
          <span className="text-[7px] font-black uppercase mt-1 tracking-wider">{item.label}</span>
        </button>
      ))}
    </div>
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);

      // Create local preview URL
      const objectUrl = URL.createObjectURL(file);
      setMediaUrl(objectUrl);
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaUrl('');
    setMediaType('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-500 max-w-2xl mx-auto text-center">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-inner border border-emerald-100 ring-8 ring-emerald-50/50">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Campanha Enviada com Sucesso!</h2>
        <p className="text-slate-500 mb-8 max-w-md">Sua campanha foi processada e está sendo disparada para os contatos selecionados através do webhook configurado.</p>
        <div className="flex space-x-4">
          <button onClick={() => { setIsSuccess(false); setStep(1); setSelectedClientId(''); }} className="px-6 py-3 border-2 border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all">Nova Campanha</button>
          <button onClick={() => window.location.href = '/reports'} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">Ver Relatórios</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 max-w-7xl mx-auto pb-10">

      {/* Dark Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 rounded-3xl overflow-hidden relative shadow-2xl shadow-slate-900/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
            <Zap className="text-yellow-500" size={32} />
            Nova Transmissão
          </h1>
          <p className="text-slate-300 font-medium w-full">Crie campanhas personalizadas, segmente sua audiência e dispare mensagens via WhatsApp em poucos cliques.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          {/* Progress Indicator Compact */}
          <div className="flex items-center space-x-4 mb-8 px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>1</div>
            <div className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-slate-900' : 'bg-slate-100'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 2 ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>2</div>
          </div>

          {step === 1 ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100"><Building2 size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Contexto do Cliente</h2>
                  <p className="text-sm text-slate-500 font-medium">Selecione o tenant para esta campanha.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedClientId(c.id); setSelectedTagIds([]); setSelectedNumberId(''); }}
                      className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${selectedClientId === c.id ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-1 ring-indigo-600/20' : 'border-slate-100 hover:border-indigo-200 bg-white hover:shadow-lg hover:-translate-y-0.5'}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all ${selectedClientId === c.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm'}`}>
                          {c.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <span className={`block text-sm font-black transition-colors ${selectedClientId === c.id ? 'text-indigo-900' : 'text-slate-700 group-hover:text-slate-900'}`}>{c.name}</span>
                          <span className={`text-xs font-medium transition-colors ${selectedClientId === c.id ? 'text-indigo-600' : 'text-slate-400'}`}>{c.email}</span>
                        </div>
                      </div>
                      {selectedClientId === c.id && <div className="text-white bg-indigo-600 p-1.5 rounded-full shadow-md animate-in zoom-in"><CheckCircle2 size={16} /></div>}
                    </button>
                  ))}
                </div>
              </div>

              {selectedClientId && (
                <div className="pt-4 animate-in fade-in slide-in-from-top-4 space-y-4">
                  {!hasOutboundWebhook ? (
                    <div className="p-4 bg-amber-50 text-amber-900 rounded-2xl text-sm border border-amber-200 flex items-start space-x-3 shadow-sm">
                      <Zap size={20} className="shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <span className="font-bold block text-amber-900 text-base mb-1">Webhook Obrigatório ausente</span>
                        <p className="opacity-90 leading-relaxed">Este cliente não possui um webhook de disparo (outbound) configurado.
                          Para segurança, configure um endpoint para processar os envios.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-sm font-medium border border-emerald-100 flex items-center space-x-3 shadow-sm">
                      <div className="p-1 bg-emerald-100 rounded-full text-emerald-600"><CheckCircle2 size={16} /></div>
                      <span>Webhook de disparo conectado e pronto para envio.</span>
                    </div>
                  )}

                  <button
                    onClick={() => setStep(2)}
                    disabled={!hasOutboundWebhook}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-base shadow-xl shadow-slate-900/20 hover:shadow-slate-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                  >
                    <span>Continuar Configuração</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <button onClick={() => setStep(1)} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200"><ChevronLeft size={20} /></button>
                <div className="w-12 h-12 bg-fuchsia-50 text-fuchsia-600 rounded-2xl flex items-center justify-center shadow-sm border border-fuchsia-100"><Zap size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Detalhes & Disparo</h2>
                  <p className="text-sm text-slate-500 font-medium">Configure a mensagem e o público alvo.</p>
                </div>
              </div>

              {/* Configuration Fields */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Nome da Campanha</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Lançamento Verão 2024"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-300 placeholder:font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Público Alvo (Tags)</label>
                    <div className="flex flex-wrap gap-2 min-h-[48px] bg-slate-50 border border-slate-200 rounded-2xl p-2 cursor-pointer hover:border-slate-300 transition-colors">
                      {currentTags.length > 0 ? currentTags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedTagIds.includes(tag.id) ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                        >
                          {tag.name}
                        </button>
                      )) : <span className="text-xs text-slate-300 p-2 font-medium">Nenhuma tag disponível</span>}
                    </div>
                    {selectedTagIds.length > 0 && (
                      <div className="mt-2 text-xs font-medium text-slate-500 animate-in fade-in flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        <span className="font-bold text-slate-900">{recipientCount}</span> contatos estimados
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Número de Envio</label>
                    <div className="relative">
                      <select
                        value={selectedNumberId}
                        onChange={(e) => setSelectedNumberId(e.target.value)}
                        className="w-full appearance-none px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer"
                      >
                        <option value="">Selecione um número...</option>
                        {currentNumbers.map(num => (
                          <option key={num.id} value={num.id}>{num.nickname} ({num.phone})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Conteúdo da Mensagem</label>

                    {/* Toolbar */}
                    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
                      <button onClick={() => insertFormat('*')} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors" title="Negrito"><Bold size={14} /></button>
                      <button onClick={() => insertFormat('_')} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors" title="Itálico"><Italic size={14} /></button>
                      <button onClick={() => insertFormat('~')} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors" title="Tachado"><Strikethrough size={14} /></button>
                      <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
                      <div className="relative">
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors" title="Emoji"><Smile size={14} /></button>
                        {showEmojiPicker && (
                          <div className="absolute right-0 top-8 z-50 shadow-2xl rounded-2xl">
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                            <div className="relative z-50">
                              <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 transition-all">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full bg-transparent p-3 text-sm text-slate-700 font-medium focus:outline-none resize-none placeholder:text-slate-300"
                      placeholder="Digite sua mensagem aqui..."
                    ></textarea>
                    <div className="flex items-center justify-between px-2 pb-2 pt-2 border-t border-slate-200/50">
                      <div className="flex space-x-1">
                        <button onClick={() => insertVariable('nome')} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">{`{{nome}}`}</button>
                        <button onClick={() => insertVariable('empresa')} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">{`{{empresa}}`}</button>
                      </div>
                      <span className="text-[10px] font-bold text-slate-300">{message.length} chars</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Anexo de Mídia</label>
                    {mediaType !== 'none' && (
                      <button onClick={clearMedia} className="text-[10px] text-[#ffd700] font-bold hover:underline bg-slate-900 px-2 py-0.5 rounded">Remover Mídia</button>
                    )}
                  </div>
                  <MediaSelector />

                  {/* File Upload Area */}
                  {mediaType !== 'none' && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept={
                          mediaType === 'image' ? 'image/*' :
                            mediaType === 'video' ? 'video/*' :
                              mediaType === 'audio' ? 'audio/*' :
                                mediaType === 'pdf' ? '.pdf' : '*/*'
                        }
                        onChange={handleFileSelect}
                      />

                      {!mediaFile ? (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-slate-200 transition-colors">
                            <UploadCloud size={20} />
                          </div>
                          <span className="text-xs font-bold">Clique para selecionar {mediaType === 'pdf' ? 'o arquivo PDF' : `o ${mediaType}`}</span>
                        </button>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-500">
                              {mediaType === 'image' ? (
                                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <FileText size={20} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{mediaFile.name}</p>
                              <p className="text-[10px] text-slate-400">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-blue-600 hover:underline px-2">Trocar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSend}
                    disabled={isSending || !campaignName || !selectedNumberId || selectedTagIds.length === 0}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isSending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Disparar Campanha</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Column */}
        <div className="hidden lg:block space-y-4">
          <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl shadow-slate-200 border-4 border-slate-100 max-w-sm mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-8 bg-slate-800/50 z-10 flex items-center justify-center space-x-2">
              <div className="w-12 h-4 bg-black rounded-full"></div>
            </div>

            <div className="bg-[#e5ddd5] rounded-[2rem] h-[600px] overflow-hidden relative flex flex-col">
              {/* Header */}
              <div className="bg-[#008069] p-4 pt-12 text-white flex items-center space-x-3 shadow-md z-10">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">L</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : 'Nome do Cliente'}</h3>
                  <p className="text-[10px] text-white/80">online</p>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-90">
                <div className="flex justify-center mb-4">
                  <span className="bg-white/90 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm">Hoje</span>
                </div>

                <div className="flex justify-end">
                  <div className="bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] relative group">
                    {mediaType !== 'none' && (
                      <div className="mb-2 bg-slate-200 h-32 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden">
                        {mediaType === 'image' && mediaUrl ? (
                          <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            {mediaType === 'image' && <ImageIcon size={24} />}
                            {mediaType === 'video' && <Play size={24} />}
                            {mediaType === 'audio' && <Volume2 size={24} />}
                            {mediaType === 'pdf' && <FileText size={24} />}
                          </>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {previewMessage.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g).map((part, index) => {
                        if (part.startsWith('*') && part.endsWith('*')) {
                          return <strong key={index}>{part.slice(1, -1)}</strong>;
                        }
                        if (part.startsWith('_') && part.endsWith('_')) {
                          return <em key={index}>{part.slice(1, -1)}</em>;
                        }
                        if (part.startsWith('~') && part.endsWith('~')) {
                          return <s key={index}>{part.slice(1, -1)}</s>;
                        }
                        return part;
                      })}
                    </p>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <span className="text-[9px] text-slate-500">10:42</span>
                      <CheckCircle2 size={10} className="text-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Visualização em Tempo Real</h3>
            <p className="text-xs text-slate-400 max-w-[200px] mx-auto">O preview simula como a mensagem aparecerá no WhatsApp do cliente.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignWizard;
