import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Smile,
  MessageSquare,
  Clock
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Client, Tag, WhatsAppNumber, MediaType, Lead, WebhookConfig } from '../types';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';

const CampaignWizard: React.FC = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
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
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load campaign for edit
  useEffect(() => {
    if (campaignId) {
      loadCampaignForEdit(campaignId);
    }
  }, [campaignId]);

  const loadCampaignForEdit = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setIsEditMode(true);
        setSelectedClientId(data.client_id);
        setCampaignName(data.name);
        setMessage(data.message);

        // Load payload specific data if exists
        if (data.transmission_payload) {
          const payload = data.transmission_payload;
          setSelectedTagIds(payload.audience?.tag_ids || []);

          // Find number ID by phone
          // This requires fetching numbers first, but we have an effect for client details.
          // We'll set the phone to a temp state or handle it after numbers fetch.
        }

        if (data.scheduled_at) {
          setIsScheduled(true);
          // Convert to datetime-local format: YYYY-MM-DDTHH:MM
          const d = new Date(data.scheduled_at);
          setScheduledDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }

        // Handle interactive data
        if (data.transmission_payload?.interactive) {
          setIsInteractiveActive(true);
          setInteractiveData(data.transmission_payload.interactive);
        }
      }
    } catch (err) {
      console.error('Error loading campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [currentNumbers, setCurrentNumbers] = useState<WhatsAppNumber[]>([]);
  const [clientWebhooks, setClientWebhooks] = useState<WebhookConfig[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);

  // Interactive Message State
  const [activeModal, setActiveModal] = useState<'none' | 'interactive'>('none');
  const [interactiveData, setInteractiveData] = useState({
    type: 'button' as 'button' | 'list' | 'poll' | 'carousel',
    text: '',
    choices: [''],
    footerText: '',
    listButton: '',
    selectableCount: 1
  });
  const [isInteractiveActive, setIsInteractiveActive] = useState(false);

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

        // If in edit mode, restore the selected number from payload if possible
        if (campaignId) {
          // This is a bit tricky, but we can assume phone number was stored
          // For now, if we don't have it, we let user select.
        }
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

      // 2. Create or Update Campaign Record in DB
      let activeCampaignId = campaignId;

      if (!isEditMode) {
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .insert({
            client_id: selectedClientId,
            name: campaignName,
            message: message,
            status: isScheduled ? 'scheduled' : 'sending',
            metadata: {
              target_tags: selectedTagIds,
              number_id: selectedNumberId,
              media_type: mediaType
            }
          })
          .select()
          .single();

        if (campaignError) throw campaignError;
        activeCampaignId = campaignData.id;
      } else {
        await supabase
          .from('campaigns')
          .update({
            name: campaignName,
            message: message,
            status: isScheduled ? 'scheduled' : 'sending',
            client_id: selectedClientId
          })
          .eq('id', activeCampaignId);
      }

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
        campaign_id: activeCampaignId,
        display_name: campaignName,
        message: message,
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

      // 3.4 Merge Interactive Data if active
      if (isInteractiveActive) {
        (payload as any).interactive = {
          type: interactiveData.type,
          text: interactiveData.text || message,
          choices: interactiveData.choices.filter(c => c.trim()),
          footerText: interactiveData.footerText,
          listButton: interactiveData.listButton,
          selectableCount: interactiveData.selectableCount
        };
      }

      // 4. Handle Schedule or Immediate Send
      if (isScheduled && scheduledDate) {
        // Save as scheduled
        await supabase
          .from('campaigns')
          .update({
            status: 'scheduled',
            scheduled_at: new Date(scheduledDate).toISOString(),
            transmission_payload: payload
          })
          .eq('id', campaignId);

        setIsSending(false);
        setIsSuccess(true);
        return;
      }

      // 5. Fire Webhook (Immediate Send Now)
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

  const handleSendInteractive = async () => {
    if (!interactiveData.text && !message) {
      alert('O texto da mensagem é obrigatório.');
      return;
    }

    if (interactiveData.choices.filter(c => c.trim()).length === 0) {
      alert('Adicione pelo menos uma opção.');
      return;
    }

    setIsInteractiveActive(true);
    setActiveModal('none');
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

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${isScheduled ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Clock size={18} />
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-900 tracking-tight">Agendamento</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isScheduled ? 'Disparo Agendado' : 'Disparo Imediato'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsScheduled(!isScheduled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isScheduled ? 'bg-amber-500' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isScheduled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {isScheduled && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none"
                      />
                      <p className="mt-2 text-[10px] font-medium text-slate-400 italic">O sistema processará o disparo automaticamente no horário selecionado.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setActiveModal('interactive')}
                    disabled={isSending || !selectedNumberId || selectedTagIds.length === 0}
                    className={`flex-1 group relative flex items-center gap-3 p-4 rounded-3xl transition-all duration-500 border-2 overflow-hidden disabled:opacity-40 ${isInteractiveActive
                      ? 'bg-[#ffd700] border-[#f8ab15] text-slate-900 shadow-xl shadow-[#ffd700]/30 scale-[1.02]'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-[#ffd700]/30 hover:bg-[#ffd700]/5 hover:shadow-xl hover:shadow-[#ffd700]/5'
                      }`}
                  >
                    {/* Decorative Background Element */}
                    <div className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full blur-2xl transition-opacity duration-700 ${isInteractiveActive ? 'bg-white/20' : 'bg-[#ffd700]/10 group-hover:bg-[#ffd700]/20'}`}></div>

                    <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 ${isInteractiveActive
                      ? 'bg-slate-900 text-[#ffd700] shadow-lg shadow-black/20'
                      : 'bg-[#ffd700]/10 text-[#ffd700] group-hover:scale-110 group-hover:bg-[#ffd700]/20'
                      }`}>
                      {isInteractiveActive ? (
                        <CheckCircle2 size={20} className="text-[#ffd700] animate-in zoom-in duration-500" />
                      ) : (
                        <Zap size={20} className="transition-transform group-hover:rotate-12" />
                      )}
                    </div>

                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1.5 transition-colors ${isInteractiveActive ? 'text-slate-700' : 'text-slate-400 group-hover:text-yellow-600'}`}>
                        {isInteractiveActive ? 'Configurado' : 'Interativo'}
                      </span>
                      <span className={`text-sm font-extrabold leading-none truncate ${isInteractiveActive ? 'text-slate-900' : 'text-slate-800'}`}>
                        Botão
                      </span>
                    </div>

                    {isInteractiveActive && (
                      <div className="absolute top-3 right-3 flex space-x-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse"></div>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isSending || !campaignName || !selectedNumberId || selectedTagIds.length === 0 || (isScheduled && !scheduledDate)}
                    className={`flex-[2] py-4 rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${isScheduled
                      ? 'bg-amber-500 text-white shadow-amber-200 hover:shadow-amber-300 hover:scale-[1.02]'
                      : 'bg-emerald-500 text-white shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.02]'
                      }`}
                  >
                    {isSending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        {isScheduled ? <Clock size={18} /> : <Send size={18} />}
                        <span>{isScheduled ? 'Agendar Transmissão' : 'Disparar Campanha'}</span>
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

      <Modal
        isOpen={activeModal === 'interactive'}
        onClose={() => setActiveModal('none')}
        title="Enviar Mensagem Interativa"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Interação</label>
            <select
              value={interactiveData.type}
              onChange={(e) => setInteractiveData({ ...interactiveData, type: e.target.value as any })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            >
              <option value="button">Botões de Resposta</option>
              <option value="list">Lista de Opções</option>
              <option value="poll">Enquete (Votação)</option>
              <option value="carousel">Carrossel de Cards</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Texto Principal</label>
            <textarea
              value={interactiveData.text}
              onChange={(e) => setInteractiveData({ ...interactiveData, text: e.target.value })}
              placeholder="Digite o corpo da mensagem..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
            />
          </div>

          {interactiveData.type === 'list' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Texto do Botão da Lista</label>
              <input
                type="text"
                value={interactiveData.listButton}
                onChange={(e) => setInteractiveData({ ...interactiveData, listButton: e.target.value })}
                placeholder="Ex: Ver opções"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          )}

          {(interactiveData.type === 'button' || interactiveData.type === 'list') && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Texto de Rodapé (Opcional)</label>
              <input
                type="text"
                value={interactiveData.footerText}
                onChange={(e) => setInteractiveData({ ...interactiveData, footerText: e.target.value })}
                placeholder="Ex: Selecione uma opção abaixo"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          )}

          {interactiveData.type === 'poll' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Opções Selecionáveis</label>
              <input
                type="number"
                min="1"
                value={interactiveData.selectableCount}
                onChange={(e) => setInteractiveData({ ...interactiveData, selectableCount: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Opções / Escolhas ({interactiveData.choices.length})
            </label>
            {interactiveData.choices.map((choice, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={choice}
                  onChange={(e) => {
                    const newChoices = [...interactiveData.choices];
                    newChoices[index] = e.target.value;
                    setInteractiveData({ ...interactiveData, choices: newChoices });
                  }}
                  placeholder={`Opção ${index + 1}`}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
                <button
                  onClick={() => {
                    const newChoices = interactiveData.choices.filter((_, i) => i !== index);
                    setInteractiveData({ ...interactiveData, choices: newChoices });
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-sm"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setInteractiveData({ ...interactiveData, choices: [...interactiveData.choices, ''] })}
              className="w-full py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 hover:border-slate-200 text-xs font-bold"
            >
              + Adicionar Opção
            </button>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => {
                setIsInteractiveActive(false);
                setActiveModal('none');
              }}
              className="flex-1 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-bold text-sm"
            >
              Remover / Limpar
            </button>
            <button
              onClick={handleSendInteractive}
              className="flex-[2] py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              <span>Confirmar e Salvar</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CampaignWizard;
