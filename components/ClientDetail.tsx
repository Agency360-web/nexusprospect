
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Webhook as WebhookIcon,
  Smartphone,
  History,
  Settings,
  Plus,
  Play,
  Activity,
  Zap,
  CheckCircle2,
  Copy,
  Trash2,
  Edit2,
  ListPlus,
  Globe,
  MoreVertical,
  Check,
  Users,
  Tag as TagIcon,
  Search,
  Filter,
  FileUp,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Lock,
  Wifi,
  WifiOff,
  Target,
  Mail,
  AtSign,

  ListTodo,
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { WebhookConfig, WhatsAppNumber, Lead, Tag, Client, EmailSender, Task } from '../types';
import ClientGoals from './ClientGoals';
import ClientOverviewGoals from './ClientOverviewGoals';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';

const ClientDetail: React.FC = () => {
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'numbers' | 'webhooks' | 'leads' | 'campaigns' | 'goals'>('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [emailSenders, setEmailSenders] = useState<EmailSender[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);

  // Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'lead' | 'webhook' | 'number' | 'email' | 'success' | 'client-config' | 'task-create' | 'task-detail' | 'backup'>('none');
  const [modalLoading, setModalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Webhook Editing State
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);

  const [webhookMode, setWebhookMode] = useState<'create' | 'edit'>('create');

  // Client Config State
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    observations: '',
    cnpj: '',
    corporateName: '',
    address: '',
    status: 'active' as Client['status']
  });

  // Task State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilter, setTaskFilter] = useState<'pending' | 'completed'>('pending');
  const [newTask, setNewTask] = useState({
    title: '', description: '', startDate: '', dueDate: '', status: 'pending',
    checklist: [] as { text: string, completed: boolean }[]
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Number Editing State
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(null);
  const [numberMode, setNumberMode] = useState<'create' | 'edit'>('create');

  // Backup / Sync State
  const [backupConfig, setBackupConfig] = useState({ url: '', auto_sync: false });

  // Pagination State for Leads
  const [leadPage, setLeadPage] = useState(1);
  const leadsPerPage = 50;

  const handleDownloadCSV = () => {
    if (leads.length === 0) return;

    // CSV Headers
    const headers = ['ID', 'Nome', 'Telefone', 'Email', 'Empresa', 'Status', 'Tags', 'Data Criação'];

    // CSV Rows
    const rows = leads.map(lead => [
      lead.id,
      lead.name,
      lead.phone,
      lead.email || '',
      lead.customFields?.empresa || '',
      lead.status,
      (lead.tags || []).map(t => {
        const tag = tags.find(tag => tag.id === t);
        return tag ? tag.name : t;
      }).join('; '),
      new Date(lead.createdAt || new Date().toISOString()).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${client?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveBackupConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      if (!clientId) return;

      const newConfig = {
        url: backupConfig.url,
        auto_sync: backupConfig.auto_sync,
        last_sync: client?.google_sheets_config?.last_sync || null
      };

      const { error } = await supabase
        .from('clients')
        .update({ google_sheets_config: newConfig })
        .eq('id', clientId);

      if (error) throw error;

      // Update local state
      if (client) {
        setClient({ ...client, google_sheets_config: newConfig });
      }

      setSuccessMessage('Configuração salva com sucesso!');
      setActiveModal('success');
      setTimeout(() => setActiveModal('none'), 2000);
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Erro ao salvar configuração.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSyncToSheets = async (leadsToSync?: Lead[]) => {
    if (!client?.google_sheets_config?.url) {
      // If called automatically, maybe don't alert? But better safe to have config checked before calling.
      if (!leadsToSync) alert('Configure a URL do Webhook primeiro.');
      return;
    }

    setModalLoading(true);
    try {
      // 1. Prepare data
      const targetLeads = leadsToSync || leads;
      const payload = {
        client_id: client.id,
        client_name: client.name,
        // Send simplified leads structure matching the columns requested: 
        // 1. Name, 2. Phone, 3. Company, 4. Tags
        leads: targetLeads.map(lead => {
          const tagsStr = (lead.tags || []).map(t => {
            const tag = tags.find(tag => tag.id === t);
            return tag ? tag.name : t;
          }).join(', ');

          return {
            name: lead.name,
            phone: lead.phone,
            company: lead.customFields?.['empresa'] || '',
            tags: tagsStr,
            Status: 'Aguardando'
          };
        })
      };

      // 2. Send to Webhook (Google Sheets)
      // Using no-cors mode since Google Scripts often have CORS issues, 
      // but ideally we want to know if it succeeded. 
      // Note: extensive data might fail with GET, POST is better.
      // fetch with no-cors implies we can't read response.
      await fetch(client.google_sheets_config.url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      // 3. Update last_sync in DB
      const newConfig = {
        ...client.google_sheets_config,
        last_sync: new Date().toISOString()
      };

      await supabase
        .from('clients')
        .update({ google_sheets_config: newConfig })
        .eq('id', clientId);

      if (client) {
        setClient({ ...client, google_sheets_config: newConfig });
      }

      setSuccessMessage('Sincronização enviada com sucesso!');
      setActiveModal('success');
      setTimeout(() => setActiveModal('none'), 2000);

    } catch (error) {
      console.error('Sync error:', error);
      if (!leadsToSync) alert('Erro ao sincronizar. Verifique o console.');
    } finally {
      if (!leadsToSync) setModalLoading(false); // Don't block UI if auto-sync
    }
  };

  useEffect(() => {
    if (activeModal === 'backup' && client?.google_sheets_config) {
      setBackupConfig({
        url: client.google_sheets_config.url || '',
        auto_sync: client.google_sheets_config.auto_sync || false
      });
    }
  }, [activeModal, client]);


  // Bulk Actions State
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Form State
  const [newLead, setNewLead] = useState({ name: '', phone: '', email: '', company: '', tags: '' });
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', type: 'outbound' as const, method: 'POST' as const });
  const [newNumber, setNewNumber] = useState({ nickname: '', phone: '' });
  const [newEmail, setNewEmail] = useState({ email: '', provider: 'smtp', fromName: '' });
  const [leadType, setLeadType] = useState<'whatsapp' | 'email'>('whatsapp');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Stats State
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeTags: 0,
    optInRate: '0%',
    bounces: 0
  });

  // Helper to ensure tags exist in the DB and return their IDs
  const ensureTagsExist = async (tagNames: string[]): Promise<string[]> => {
    if (!tagNames || tagNames.length === 0) return [];
    if (!clientId) return [];

    const uniqueNames = [...new Set(tagNames.map(t => t.trim()).filter(t => t))];
    if (uniqueNames.length === 0) return [];

    // 1. Find existing tags
    const { data: existingTags } = await supabase
      .from('tags')
      .select('id, name')
      .eq('client_id', clientId)
      .in('name', uniqueNames);

    const existingNames = existingTags?.map(t => t.name) || [];
    const missingNames = uniqueNames.filter(name => !existingNames.includes(name));

    const finalTagIds: string[] = existingTags?.map(t => t.id) || [];

    // 2. Create missing tags
    if (missingNames.length > 0) {
      const newTagsPayload = missingNames.map(name => ({
        client_id: clientId,
        name: name,
        color: `bg-${['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'indigo'][Math.floor(Math.random() * 7)]}-100 text-slate-700` // Random color
      }));

      const { data: createdTags, error } = await supabase
        .from('tags')
        .insert(newTagsPayload)
        .select('id');

      if (!error && createdTags) {
        createdTags.forEach(t => finalTagIds.push(t.id));
      } else {
        console.error('Error creating tags:', error);
      }
    }

    return finalTagIds;
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    setModalLoading(true);
    try {
      // Process tags first
      const rawTags = newLead.tags ? newLead.tags.split(',').map(t => t.trim()).filter(t => t) : [];
      const tagIds = await ensureTagsExist(rawTags);

      const payload: any = {
        client_id: clientId,
        name: newLead.name,
        status: 'valid',
        tags: tagIds, // Save UUIDs
        custom_fields: { empresa: newLead.company }
      };

      if (leadType === 'whatsapp') {
        payload.phone = newLead.phone;
      } else {
        payload.email = newLead.email;
        payload.phone = null;
      }

      const { data: insertedLead, error } = await supabase.from('leads').insert(payload).select().single();

      if (error) throw error;
      setActiveModal('none');
      setNewLead({ name: '', phone: '', email: '', company: '', tags: '' });

      // Auto Sync Check
      if (client?.google_sheets_config?.auto_sync && client.google_sheets_config.url && insertedLead) {
        // We do this in background
        const updatedLeads = [...leads, insertedLead as Lead];
        handleSyncToSheets(updatedLeads);
      }

      fetchData();
    } catch (err) { console.error(err); alert('Erro ao criar lead'); }
    finally { setModalLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        if (rows.length < 2) return;

        const headers = rows[0].split(';').length > 1 ? rows[0].split(';') : rows[0].split(',');
        const isEmail = headers.some(h => h.toLowerCase().includes('e-mail') || h.toLowerCase().includes('email'));
        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('nome'));
        const contactIdx = headers.findIndex(h => h.toLowerCase().includes(isEmail ? 'e-mail' : 'telefone') || h.toLowerCase().includes(isEmail ? 'email' : 'phone'));
        const tagsIdx = headers.findIndex(h => h.toLowerCase().includes('etiquetas') || h.toLowerCase().includes('tags'));

        if (nameIdx === -1 || contactIdx === -1) {
          alert('Formato inválido. Colunas obrigatórias: Nome, Telefone/E-mail');
          return;
        }

        // Pre-process all unique tags from the file
        const allTags = new Set<string>();
        rows.slice(1).forEach(row => {
          const cols = row.split(';').length > 1 ? row.split(';') : row.split(',');
          const tagsRaw = tagsIdx !== -1 ? cols[tagsIdx]?.trim() : '';
          if (tagsRaw) {
            tagsRaw.split('|').forEach(t => allTags.add(t.trim()));
          }
        });

        // Ensure all tags exist in bulk
        await ensureTagsExist(Array.from(allTags));
        // Re-fetch tags to get latest IDs map (or we could return map from ensureTagsExist, but fetching is safer for sync)
        const { data: latestTags } = await supabase.from('tags').select('id, name').eq('client_id', clientId);

        const leadsToInsert = rows.slice(1).map(row => {
          const cols = row.split(';').length > 1 ? row.split(';') : row.split(',');
          const name = cols[nameIdx]?.trim();
          const contact = cols[contactIdx]?.trim();
          const tagsRaw = tagsIdx !== -1 ? cols[tagsIdx]?.trim() : '';

          if (!name || !contact) return null;

          const rowTags = tagsRaw ? tagsRaw.split('|').map(t => t.trim()).filter(t => t) : [];
          const rowTagIds = rowTags.map(tagName => {
            const found = latestTags?.find(lt => lt.name === tagName);
            return found ? found.id : null;
          }).filter(id => id !== null);

          return {
            client_id: clientId,
            name,
            [isEmail ? 'email' : 'phone']: contact,
            tags: rowTagIds,
            status: 'valid'
          };
        }).filter(l => l !== null);

        if (leadsToInsert.length > 0) {
          // Process in batches of 1000
          const batchSize = 1000;
          let importedCount = 0;
          for (let i = 0; i < leadsToInsert.length; i += batchSize) {
            const batch = leadsToInsert.slice(i, i + batchSize);
            const { error } = await supabase.from('leads').insert(batch);
            if (error) throw error;
            importedCount += batch.length;
          }

          setSuccessMessage(`${importedCount} leads importados com sucesso!`);
          setActiveModal('success');
          fetchData();
        }

      } catch (err) {
        console.error(err);
        alert('Erro ao processar arquivo');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };


  const handleOpenWebhookModal = (mode: 'create' | 'edit', webhook?: WebhookConfig) => {
    setWebhookMode(mode);
    if (mode === 'edit' && webhook) {
      setEditingWebhook(webhook);
      setNewWebhook({
        name: webhook.name,
        url: webhook.url,
        type: webhook.type as any,
        method: (webhook.method || 'POST') as any // Cast to avoid literal type mismatch
      });
    } else {
      setEditingWebhook(null);
      setNewWebhook({ name: '', url: '', type: 'outbound', method: 'POST' });
    }
    setActiveModal('webhook');
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      if (webhookMode === 'create') {
        const { error } = await supabase.from('webhook_configs').insert({
          client_id: clientId,
          name: newWebhook.name,
          url: newWebhook.url,
          type: 'outbound', // Defaulting to outbound as per user request
          method: newWebhook.method,
          active: true
        });
        if (error) throw error;
      } else if (webhookMode === 'edit' && editingWebhook) {
        const { error } = await supabase.from('webhook_configs').update({
          name: newWebhook.name,
          url: newWebhook.url,
          method: newWebhook.method
        }).eq('id', editingWebhook.id);
        if (error) throw error;
      }

      setActiveModal('none');
      setNewWebhook({ name: '', url: '', type: 'outbound', method: 'POST' });
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao salvar webhook'); }
    finally { setModalLoading(false); }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('webhook_configs').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao excluir webhook'); }
    finally { setLoading(false); }
  };

  const handleDuplicateWebhook = async (webhook: WebhookConfig) => {
    if (!clientId) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('webhook_configs').insert({
        client_id: clientId,
        name: `${webhook.name} (Cópia)`,
        url: webhook.url,
        type: webhook.type,
        method: webhook.method,
        active: webhook.active,
        headers: webhook.headers
      });
      if (error) throw error;
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao duplicar webhook'); }
    finally { setLoading(false); }
  };

  const handleOpenClientConfig = () => {
    if (!client) return;
    setClientForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      observations: client.observations || '',
      cnpj: client.cnpj || '',
      corporateName: client.corporateName || '',
      address: client.address || '',
      status: client.status || 'active'
    });
    setActiveModal('client-config');
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('clients').update({
        name: clientForm.name,
        email: clientForm.email,
        phone: clientForm.phone,
        observations: clientForm.observations,
        cnpj: clientForm.cnpj,
        corporate_name: clientForm.corporateName,
        address: clientForm.address,
        status: clientForm.status
      }).eq('id', clientId);

      if (error) throw error;
      setActiveModal('none');
      fetchData(); // Refresh all data
    } catch (err) { console.error(err); alert('Erro ao atualizar cliente'); }
    finally { setModalLoading(false); }
  };

  const handleOpenNumberModal = (mode: 'create' | 'edit', number?: WhatsAppNumber) => {
    setNumberMode(mode);
    if (mode === 'edit' && number) {
      setEditingNumber(number);
      setNewNumber({ nickname: number.nickname, phone: number.phone });
    } else {
      setEditingNumber(null);
      setNewNumber({ nickname: '', phone: '' });
    }
    setActiveModal('number');
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        client_id: clientId,
        title: newTask.title,
        description: newTask.description,
        start_date: newTask.startDate ? new Date(newTask.startDate).toISOString() : null,
        due_date: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        status: newTask.status,
        checklist: newTask.checklist
      });
      if (error) throw error;

      setActiveModal('none');
      setNewTask({ title: '', description: '', startDate: '', dueDate: '', status: 'pending', checklist: [] });
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao criar tarefa: ${err.message || 'Erro desconhecido'}`);
    }

    finally { setModalLoading(false); }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('tasks').update({
        title: selectedTask.title,
        description: selectedTask.description,
        start_date: selectedTask.startDate ? new Date(selectedTask.startDate).toISOString() : null,
        due_date: selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString() : null,
        status: selectedTask.status,
        checklist: selectedTask.checklist
      }).eq('id', selectedTask.id);
      if (error) throw error;

      setActiveModal('none');
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao atualizar tarefa: ${err.message || 'Erro desconhecido'}`);
    }

    finally { setModalLoading(false); }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Excluir esta tarefa?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      if (selectedTask?.id === id) { setActiveModal('none'); setSelectedTask(null); }
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao excluir tarefa'); }
  };

  const handleBulkDeleteTasks = async () => {
    if (!confirm(`Excluir ${selectedTasks.length} tarefas?`)) return;
    try {
      const { error } = await supabase.from('tasks').delete().in('id', selectedTasks);
      if (error) throw error;
      setSelectedTasks([]);
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao excluir tarefas'); }
  };

  const toggleTaskSelection = (id: string) => {
    if (selectedTasks.includes(id)) setSelectedTasks(prev => prev.filter(tid => tid !== id));
    else setSelectedTasks(prev => [...prev, id]);
  };

  const getTaskStatusColor = (task: Task) => {
    if (task.status === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (task.dueDate && new Date(task.dueDate) < new Date()) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100'; // "Em dia" -> Light Green
  };

  const handleOpenTaskModal = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
      setActiveModal('task-detail');
    } else {
      setSelectedTask(null); // Critical fix: Clear selectedTask so checklist adds to newTask
      setNewTask({ title: '', description: '', startDate: '', dueDate: '', status: 'pending', checklist: [] });
      setActiveModal('task-create');
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    if (selectedTask) {
      setSelectedTask({ ...selectedTask, checklist: [...selectedTask.checklist, { text: newChecklistItem, completed: false }] });
    } else {
      setNewTask({ ...newTask, checklist: [...newTask.checklist, { text: newChecklistItem, completed: false }] });
    }
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (index: number, isEditMode: boolean) => {
    if (isEditMode && selectedTask) {
      const newChecklist = [...selectedTask.checklist];
      newChecklist[index].completed = !newChecklist[index].completed;
      setSelectedTask({ ...selectedTask, checklist: newChecklist });
    } else if (!isEditMode) {
      const newChecklist = [...newTask.checklist];
      newChecklist[index].completed = !newChecklist[index].completed;
      setNewTask({ ...newTask, checklist: newChecklist });
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    const newStatus = selectedTask.status === 'completed' ? 'pending' : 'completed';
    // Optimistic update for UI in modal
    setSelectedTask({ ...selectedTask, status: newStatus });
    // Actual DB update will happen on Save, or we can do it immediately? 
    // User requested "mark as completed" inside modal. It implies an action.
    // Let's just update state and let "Salvar" persist everything to be safe/consistent.
  };



  const handleSaveNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      if (numberMode === 'create') {
        const { error } = await supabase.from('whatsapp_numbers').insert({
          client_id: clientId,
          nickname: newNumber.nickname,
          phone: newNumber.phone,
          status: 'active',
          daily_limit: 1000,
          sent_today: 0
        });
        if (error) throw error;
      } else if (numberMode === 'edit' && editingNumber) {
        const { error } = await supabase.from('whatsapp_numbers').update({
          nickname: newNumber.nickname,
          phone: newNumber.phone
        }).eq('id', editingNumber.id);
        if (error) throw error;
      }
      setActiveModal('none');
      setNewNumber({ nickname: '', phone: '' });
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao salvar número'); }
    finally { setModalLoading(false); }
  };

  const handleDeleteNumber = async (id: string) => {
    if (!confirm('Twem certeza que deseja excluir este número?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('whatsapp_numbers').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao excluir número'); }
    finally { setLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedLeads.length} leads? Esta ação não pode ser desfeita.`)) return;

    try {
      setLoading(true);

      // We still use batching to avoid hitting request size limits on the RPC call
      const batchSize = 1000;
      for (let i = 0; i < selectedLeads.length; i += batchSize) {
        const batch = selectedLeads.slice(i, i + batchSize);

        // Use the RPC for more robust deletion
        const { error } = await supabase.rpc('delete_leads_in_bulk', {
          lead_ids: batch
        });

        if (error) {
          console.error('RPC Error:', error);
          throw new Error(error.message || 'Erro inesperado na função de banco de dados');
        }
      }

      // Optimistic update
      setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)));
      const countDeleted = selectedLeads.length;
      setSelectedLeads([]);

      // Update stats
      setStats(prev => ({
        ...prev,
        totalLeads: prev.totalLeads - countDeleted
      }));

      setSuccessMessage(`${countDeleted} leads excluídos com sucesso!`);
      setActiveModal('success');

    } catch (error: any) {
      console.error('Error deleting leads:', error);
      alert(`Erro crítico ao excluir leads: ${error.message || 'Erro no servidor'}. Verifique o console ou contate o suporte.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(prev => prev.filter(lid => lid !== id));
    } else {
      setSelectedLeads(prev => [...prev, id]);
    }
  };

  const handleCreateEmailSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('email_senders').insert({
        client_id: clientId,
        email: newEmail.email,
        provider: newEmail.provider,
        from_name: newEmail.fromName,
        status: 'active',
        daily_limit: 500
      });
      if (error) throw error;
      setActiveModal('none');
      setNewEmail({ email: '', provider: 'smtp', fromName: '' });
      setSuccessMessage('E-mail vinculado com sucesso!');
      setActiveModal('success');
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao vincular e-mail'); }
    finally { setModalLoading(false); }
  };

  useEffect(() => {
    if (clientId) fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Client Info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) console.error('Error fetching client:', clientError);

      if (clientData) {
        setClient({
          id: clientData.id,
          name: clientData.name,
          status: clientData.status,
          createdAt: clientData.created_at,
          email: clientData.email,
          phone: clientData.phone,
          observations: clientData.observations,
          cnpj: clientData.cnpj,
          corporateName: clientData.corporate_name,
          address: clientData.address
        });
      }

      // 1.5 Fetch Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true });

      if (tasksData) {
        setTasks(tasksData.map((t: any) => ({
          id: t.id,
          clientId: t.client_id,
          title: t.title,
          description: t.description,
          startDate: t.start_date,
          dueDate: t.due_date,
          status: t.status,
          checklist: t.checklist || [],
          createdAt: t.created_at
        })));
      }


      // 2. Fetch Leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('client_id', clientId);

      if (leadsData) {
        setLeads(leadsData.map((l: any) => ({
          id: l.id,
          clientId: l.client_id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          tags: l.tags || [],
          customFields: l.custom_fields || {},
          status: l.status
        })));
      }

      // 3. Fetch Tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .eq('client_id', clientId);

      if (tagsData) {
        setTags(tagsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          clientId: t.client_id,
          color: t.color || 'bg-slate-100 text-slate-600'
        })));
      }

      // 4. Fetch Numbers
      const { data: numbersData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('client_id', clientId);

      if (numbersData) {
        setNumbers(numbersData.map((n: any) => ({
          id: n.id,
          clientId: n.client_id,
          nickname: n.nickname,
          phone: n.phone,
          status: n.status,
          dailyLimit: n.daily_limit,
          sentToday: n.sent_today
        })));
      }

      // 4.5 Fetch Email Senders
      const { data: emailsData } = await supabase
        .from('email_senders')
        .select('*')
        .eq('client_id', clientId);

      if (emailsData) {
        setEmailSenders(emailsData.map((e: any) => ({
          id: e.id,
          clientId: e.client_id,
          email: e.email,
          provider: e.provider,
          fromName: e.from_name,
          status: e.status,
          dailyLimit: e.daily_limit,
          sentToday: e.sent_today
        })));
      }

      // 5. Fetch Webhooks
      const { data: webhooksData } = await supabase
        .from('webhook_configs')
        .select('*')
        .eq('client_id', clientId);

      if (webhooksData) {
        setWebhooks(webhooksData.map((w: any) => ({
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

      // Update stats based on fetched data
      setStats({
        totalLeads: leadsData?.length || 0,
        activeTags: tagsData?.length || 0,
        optInRate: leadsData?.length ? '100%' : '-', // Placeholder logic
        bounces: 0 // Placeholder as we don't track bounces yet
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all shrink-0 ${activeTab === id
        ? 'border-slate-900 text-slate-900 font-bold'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
        }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;
  }

  if (!client) {
    return <div>Cliente não encontrado</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <Link to="/clients" className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 shadow-sm shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono uppercase tracking-widest shrink-0">ID: {clientId?.substring(0, 8)}...</span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 truncate">Gestão de ambiente isolado e audiência</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleOpenClientConfig}
            className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Settings size={16} />
            <span>Configurar</span>
          </button>
          <Link to="/new-campaign" className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-bold shadow-lg shadow-slate-900/10">
            <Plus size={18} />
            <span className="truncate">Nova Campanha</span>
          </Link>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-16 lg:top-0 z-20 flex px-2 overflow-x-auto no-scrollbar rounded-t-3xl">
        <TabButton id="overview" label="Geral" icon={Activity} />
        <TabButton id="numbers" label="Canais" icon={Smartphone} />
        <TabButton id="webhooks" label="Webhooks" icon={WebhookIcon} />
        <TabButton id="leads" label="Leads" icon={Users} />
        <TabButton id="campaigns" label="Campanhas" icon={History} />
        <TabButton id="goals" label="Metas" icon={Target} />
      </div>

      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center space-x-2">
                  <Users size={18} className="text-slate-400" />
                  <span>Resumo da Audiência</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Leads</div>
                    <div className="text-2xl font-black text-slate-900">{stats.totalLeads}</div>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 text-center">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Opt-in</div>
                    <div className="text-2xl font-black text-emerald-700">{stats.optInRate}</div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tags Ativas</div>
                    <div className="text-2xl font-black text-slate-900">{stats.activeTags}</div>
                  </div>
                  <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 text-center">
                    <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-1">Bounces</div>
                    <div className="text-2xl font-black text-rose-700">{stats.bounces}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <ListTodo size={18} className="text-slate-400" />
                    <span>Gestão de Tarefas</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    {selectedTasks.length > 0 && (
                      <button onClick={handleBulkDeleteTasks} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir selecionadas">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button onClick={() => handleOpenTaskModal()} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex space-x-4 border-b border-slate-100 mb-4">
                  <button onClick={() => setTaskFilter('pending')} className={`pb-2 text-sm font-bold ${taskFilter === 'pending' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}>Pendentes</button>
                  <button onClick={() => setTaskFilter('completed')} className={`pb-2 text-sm font-bold ${taskFilter === 'completed' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}>Concluídas</button>
                </div>

                <div className="space-y-3">
                  {tasks.filter(t => t.status === taskFilter).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Nenhuma tarefa {taskFilter === 'pending' ? 'pendente' : 'concluída'}</div>
                  ) : (
                    tasks.filter(t => t.status === taskFilter).map(task => {
                      const isOverdue = task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date();

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleOpenTaskModal(task)}
                          className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${isOverdue
                            ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
                            : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div onClick={(e) => { e.stopPropagation(); toggleTaskSelection(task.id); }} className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${selectedTasks.includes(task.id) ? 'bg-slate-900 border-slate-900 text-white' : isOverdue ? 'border-rose-300 hover:border-rose-400' : 'border-slate-300 hover:border-slate-400'}`}>
                              {selectedTasks.includes(task.id) && <Check size={12} />}
                            </div>
                            <div>
                              <div className={`font-bold ${task.status === 'completed' ? 'line-through text-slate-400' : isOverdue ? 'text-rose-900' : 'text-slate-900'}`}>{task.title}</div>
                              <div className={`flex items-center space-x-2 text-xs mt-1 ${isOverdue ? 'text-rose-600/80' : 'text-slate-500'}`}>
                                {task.dueDate && (
                                  <span className="flex items-center"><Clock size={10} className="mr-1" /> {new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getTaskStatusColor(task)}`}>
                            {task.status === 'completed' ? 'Concluída' : isOverdue ? 'Atrasada' : 'Em dia'}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <ClientOverviewGoals clientId={clientId!} />

              {/* Removed Actions for Growth Section */}
            </div>

            <div className="space-y-6">
              {/* Removed Endpoint Token Section */}

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-slate-400" />
                  Status da Instância
                </h4>
                <div className="space-y-4">
                  {numbers.filter(n => n.status === 'active' || n.status === 'connected').length > 0 ? (
                    numbers.filter(n => n.status === 'active' || n.status === 'connected').map(num => (
                      <div key={num.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">{num.nickname}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                          Online
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <WifiOff size={24} className="text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400">Nenhum canal ativo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'numbers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Canais de Disparo Ativos</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveModal('email')}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  <Plus size={14} />
                  <span>Vincular Novo E-mail</span>
                </button>
                <button
                  onClick={() => handleOpenNumberModal('create')}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  <Plus size={14} />
                  <span>Vincular Novo Número</span>
                </button>
              </div>
            </div>

            {/* WhatsApp Numbers Grid */}
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">WhatsApp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {numbers.map((num, i) => {
                // Determine status based on num.status
                const isOnline = num.status === 'active' || num.status === 'connected';
                return (
                  <div key={num.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-4">
                        <div className={`p-4 rounded-2xl relative ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                          <Smartphone size={24} />
                          {isOnline && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{num.nickname}</h4>
                          <p className="text-xs font-mono text-slate-500">{num.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">Sincronizado há 2m</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Uso do Limite Diário</span>
                        <span className="text-xs font-bold text-slate-900">{num.sentToday} / {num.dailyLimit}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${num.sentToday > num.dailyLimit * 0.9 ? 'bg-amber-500' : 'bg-slate-900'}`}
                          style={{ width: `${(num.sentToday / num.dailyLimit) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-between items-center">
                      <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-bold">SP</div>
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-bold text-slate-400">+</div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenNumberModal('edit', num)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteNumber(num.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-slate-900">Integrações de Entrada/Saída</h3>
                <button
                  onClick={() => handleOpenWebhookModal('create')}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  <Plus size={14} />
                  <span>Configurar Webhook</span>
                </button>
              </div>

              <div className="space-y-4">
                {webhooks.map(wh => (
                  <div key={wh.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${wh.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                        <WebhookIcon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{wh.name}</span>
                          <span className="text-[8px] bg-slate-200 px-1 py-0.5 rounded font-bold uppercase text-slate-500">{wh.type}</span>
                        </div>
                        <code className="text-[10px] text-slate-400 font-mono mt-1 block truncate max-w-xs">{wh.url}</code>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenWebhookModal('edit', wh)}
                        className="p-2 text-slate-400 hover:text-slate-900"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDuplicateWebhook(wh)}
                        className="p-2 text-slate-400 hover:text-slate-900"
                        title="Duplicar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="p-2 text-slate-400 hover:text-rose-500"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filtrar por nome, telefone ou tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-medium"
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveModal('backup')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  <span>Backup / Dados</span>
                </button>
                <button
                  onClick={() => setActiveModal('lead-type-selection' as any)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10"
                >
                  <Plus size={14} />
                  <span>Add Lead</span>
                </button>
                <div onClick={() => fileInputRef.current?.click()}>
                  <button className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <FileUp size={20} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative">

              {/* Bulk Actions Bar */}
              {selectedLeads.length > 0 && (
                <div className="absolute top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 z-10 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold">{selectedLeads.length} selecionados</span>
                    <button onClick={() => setSelectedLeads([])} className="text-xs text-slate-400 hover:text-white underline">Cancelar</button>
                  </div>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center space-x-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Excluir Selecionados</span>
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-5 w-12">
                        <input
                          type="checkbox"
                          checked={leads.length > 0 && selectedLeads.length === leads.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </th>
                      <th className="px-2 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Lead / Identificação</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">WhatsApp</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Segmentação</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Status</th>
                      <th className="px-8 py-5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {leads
                      .filter(lead =>
                        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (lead.phone || '').includes(searchTerm) ||
                        (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (lead.tags || []).some(tid => {
                          const tag = tags.find(t => t.id === tid);
                          return tag?.name.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                      )
                      .slice((leadPage - 1) * leadsPerPage, leadPage * leadsPerPage)
                      .map(lead => (
                        <tr key={lead.id} className={`hover:bg-slate-50/50 transition-colors ${selectedLeads.includes(lead.id) ? 'bg-slate-50' : ''}`}>
                          <td className="px-8 py-5">
                            <input
                              type="checkbox"
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => toggleSelectLead(lead.id)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                          </td>
                          <td className="px-2 py-5">
                            <div className="font-bold text-slate-900">{lead.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-tight">{lead.customFields?.empresa}</div>
                          </td>
                          <td className="px-8 py-5 font-mono text-slate-500 font-medium">
                            {lead.phone || lead.email}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-wrap gap-1.5">
                              {(lead.tags || []).map(tid => {
                                const tag = tags.find(t => t.id === tid);
                                return tag ? (
                                  <span key={tid} className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${tag.color}`}>
                                    {tag.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${lead.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                              <CheckCircle2 size={10} className="mr-1" />
                              {lead.status === 'valid' ? 'Validado' : 'Erro'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button className="text-slate-300 hover:text-slate-900 transition-colors">
                              <MoreVertical size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <span>{leads.length} Contatos listados</span>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400">Página {leadPage} de {Math.ceil(leads.length / leadsPerPage)}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setLeadPage(p => Math.max(1, p - 1))}
                      disabled={leadPage === 1}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setLeadPage(p => Math.min(Math.ceil(leads.length / leadsPerPage), p + 1))}
                      disabled={leadPage >= Math.ceil(leads.length / leadsPerPage)}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                <History size={48} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900">Histórico de Disparos</h4>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">Visualize relatórios detalhados de entrega, abertura e erros de campanhas passadas deste cliente.</p>
              </div>
              <Link to="/new-campaign" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-slate-900/10">
                Iniciar Primeiro Disparo
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <ClientGoals clientId={clientId!} />
        )}
      </div>

      {/* Modals */}

      <Modal isOpen={activeModal === 'lead-type-selection' as any} onClose={() => setActiveModal('none')} title="Tipo de Contato">
        <div className="grid grid-cols-2 gap-4 pb-4">
          <button
            onClick={() => { setLeadType('whatsapp'); setActiveModal('lead'); }}
            className="flex flex-col items-center justify-center p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-100 transition-all group"
          >
            <div className="p-3 bg-emerald-200 rounded-full mb-3 text-emerald-800 group-hover:scale-110 transition-transform"><Smartphone size={24} /></div>
            <span className="font-bold text-emerald-900">WhatsApp Lead</span>
            <span className="text-xs text-emerald-600/70 text-center mt-1">Contato via número</span>
          </button>
          <button
            onClick={() => { setLeadType('email'); setActiveModal('lead'); }}
            className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl hover:border-blue-500 hover:bg-blue-100 transition-all group"
          >
            <div className="p-3 bg-blue-200 rounded-full mb-3 text-blue-800 group-hover:scale-110 transition-transform"><Mail size={24} /></div>
            <span className="font-bold text-blue-900">E-mail Lead</span>
            <span className="text-xs text-blue-600/70 text-center mt-1">Contato via e-mail</span>
          </button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'lead'} onClose={() => setActiveModal('none')} title={`Novo Lead (${leadType === 'whatsapp' ? 'WhatsApp' : 'E-mail'})`}>
        <form onSubmit={handleCreateLead} className="space-y-4">
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nome Completo" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} required />
          {leadType === 'whatsapp' ? (
            <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Telefone (Ex: 5511999999999)" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} required />
          ) : (
            <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="E-mail (ex: nome@empresa.com)" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} required type="email" />
          )}
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Empresa (Opcional)" value={newLead.company} onChange={e => setNewLead({ ...newLead, company: e.target.value })} />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Etiquetas (separadas por vírgula)" value={newLead.tags} onChange={e => setNewLead({ ...newLead, tags: e.target.value })} />
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'webhook'} onClose={() => setActiveModal('none')} title={webhookMode === 'create' ? "Configurar Webhook" : "Editar Webhook"}>
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nome do Webhook" value={newWebhook.name} onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })} required />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="URL de Destino" value={newWebhook.url} onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })} required />
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Método de Envio</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none font-mono text-sm"
                value={newWebhook.method}
                onChange={e => setNewWebhook({ ...newWebhook, method: e.target.value as any })}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>
            {/* Hidden Input for Type - Defaulting to Outbound */}
            <input type="hidden" value="outbound" />
          </div>
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'number'} onClose={() => setActiveModal('none')} title={numberMode === 'create' ? "Vincular WhatsApp" : "Editar Número"}>
        <form onSubmit={handleSaveNumber} className="space-y-4">
          <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl mb-4">Para conectar, você precisará escanear o QR Code após o cadastro.</div>
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Apelido do Número" value={newNumber.nickname} onChange={e => setNewNumber({ ...newNumber, nickname: e.target.value })} required />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Número (Ex: 5511999999999)" value={newNumber.phone} onChange={e => setNewNumber({ ...newNumber, phone: e.target.value })} required />
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Vincular'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'client-config'} onClose={() => setActiveModal('none')} title="Configurações do Cliente">
        <form onSubmit={handleUpdateClient} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Informações Básicas</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="Nome do Cliente" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required />
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Razão Social" value={clientForm.corporateName} onChange={e => setClientForm({ ...clientForm, corporateName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Contato</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="E-mail" type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Telefone / WhatsApp" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Dados Fiscais / Localização</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="CNPJ" value={clientForm.cnpj} onChange={e => setClientForm({ ...clientForm, cnpj: e.target.value })} />
                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-24 resize-none" placeholder="Endereço Completo" value={clientForm.address} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Status do Contrato</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none"
                  value={clientForm.status}
                  onChange={e => setClientForm({ ...clientForm, status: e.target.value as any })}
                >
                  <option value="active">Ativo (Em dia)</option>
                  <option value="inactive">Inativo (Pausado)</option>
                  <option value="overdue">Inadimplente</option>
                  <option value="terminated">Contrato Encerrado</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Observações Internas</label>
            <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-20" placeholder="Observações sobre o cliente..." value={clientForm.observations} onChange={e => setClientForm({ ...clientForm, observations: e.target.value })} />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">{modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'email'} onClose={() => setActiveModal('none')} title="Vincular Conta de E-mail">
        <form onSubmit={handleCreateEmailSender} className="space-y-4">
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nome do Remetente" value={newEmail.fromName} onChange={e => setNewEmail({ ...newEmail, fromName: e.target.value })} required />
          <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Endereço de E-mail" type="email" value={newEmail.email} onChange={e => setNewEmail({ ...newEmail, email: e.target.value })} required />
          <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={newEmail.provider} onChange={e => setNewEmail({ ...newEmail, provider: e.target.value })}>
            <option value="smtp">SMTP Personalizado</option>
            <option value="sendgrid">SendGrid API</option>
            <option value="aws">AWS SES</option>
            <option value="resend">Resend</option>
          </select>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-bold">Configurações de Autenticação</p>
            <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm mb-2" placeholder="API Key / Senha SMTP" type="password" />
            <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" placeholder="Host (para SMTP)" disabled={newEmail.provider !== 'smtp'} />
          </div>
          <div className="flex justify-end pt-4"><button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">{modalLoading ? <Loader2 className="animate-spin" /> : 'Vincular'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'task-create'} onClose={() => setActiveModal('none')} title="Nova Tarefa">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <input
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            placeholder="Título da Tarefa"
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <textarea
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-24"
            placeholder="Descrição detalhada..."
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Data de Início</label>
              <input
                type="datetime-local"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                value={newTask.startDate}
                onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Data de Vencimento</label>
              <input
                type="datetime-local"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                value={newTask.dueDate}
                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Status</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm appearance-none"
              value={newTask.status}
              onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
            >
              <option value="pending">Pendente</option>
              <option value="completed">Concluída</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Checklist</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                placeholder="Adicionar item..."
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
              {newTask.checklist.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <button
                    type="button"
                    onClick={() => toggleChecklistItem(idx, false)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 hover:border-emerald-400'}`}
                  >
                    {item.completed && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className={`text-sm flex-1 font-medium ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                  <button type="button" onClick={() => setNewTask({ ...newTask, checklist: newTask.checklist.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500 p-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">
              {modalLoading ? <Loader2 className="animate-spin" /> : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </Modal>


      <Modal isOpen={activeModal === 'task-detail'} onClose={() => setActiveModal('none')} title="Detalhes da Tarefa">
        {selectedTask && (
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-lg"
              value={selectedTask.title}
              onChange={e => setSelectedTask({ ...selectedTask, title: e.target.value })}
            />
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-24"
              value={selectedTask.description || ''}
              onChange={e => setSelectedTask({ ...selectedTask, description: e.target.value })}
              placeholder="Sem descrição"
            />

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Status</label>
              <select
                className={`w-full px-4 py-3 border rounded-xl outline-none text-sm appearance-none font-bold ${selectedTask.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                value={selectedTask.status}
                onChange={e => setSelectedTask({ ...selectedTask, status: e.target.value as 'pending' | 'completed' })}
              >
                <option value="pending">Pendente</option>
                <option value="completed">Concluída</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Início</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  value={formatDateForInput(selectedTask.startDate)}
                  onChange={e => setSelectedTask({ ...selectedTask, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Vencimento</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  value={formatDateForInput(selectedTask.dueDate)}
                  onChange={e => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 block">Checklist</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  placeholder="Novo item..."
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                />
                <button type="button" onClick={handleAddChecklistItem} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600">
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {(selectedTask.checklist || []).map((item: any, idx: number) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(idx, true)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 hover:border-emerald-400'}`}
                    >
                      {item.completed && <Check size={12} strokeWidth={3} />}
                    </button>
                    <span className={`text-sm flex-1 font-medium ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.text}</span>
                    <button type="button" onClick={() => setSelectedTask({ ...selectedTask, checklist: selectedTask.checklist.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-rose-500 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCompleteTask}
                className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition-colors ${selectedTask.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
              >
                <CheckCircle2 size={18} />
                <span>{selectedTask.status === 'completed' ? 'Tarefa Concluída' : 'Marcar como Concluída'}</span>
              </button>
              <button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">
                {modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
              </button>

            </div>
          </form>
        )}
      </Modal>

      {/* Backup Modal */}
      <Modal isOpen={activeModal === 'backup'} onClose={() => setActiveModal('none')} title="Backup e Sincronização">
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Download size={16} />
              Exportação Manual
            </h4>
            <p className="text-xs text-slate-500 mb-4">Baixe todos os leads cadastrados neste cliente em formato CSV.</p>
            <button
              onClick={handleDownloadCSV}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              <Download size={16} />
              <span>Baixar CSV</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-slate-400 font-bold uppercase">Integração Google Sheets</span>
            </div>
          </div>

          <form onSubmit={handleSaveBackupConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">URL do Webhook (Google Apps Script)</label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-mono"
                placeholder="https://script.google.com/macros/s/..."
                value={backupConfig.url}
                onChange={e => setBackupConfig({ ...backupConfig, url: e.target.value })}
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">Crie um script no Google Sheets para receber requisições POST com os dados.</p>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="auto_sync"
                checked={backupConfig.auto_sync}
                onChange={e => setBackupConfig({ ...backupConfig, auto_sync: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <label htmlFor="auto_sync" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                Sincronizar automaticamente novos leads
              </label>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-400">
                {client?.google_sheets_config?.last_sync && (
                  <span>Última sinc: {new Date(client.google_sheets_config.last_sync).toLocaleString('pt-BR')}</span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleSyncToSheets()}
                  disabled={modalLoading || !backupConfig.url}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={14} className={modalLoading ? "animate-spin" : ""} />
                  <span>Sincronizar Agora</span>
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {modalLoading ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Config'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'success'} onClose={() => setActiveModal('none')} title="">
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-300">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Sucesso!</h3>
          <p className="text-slate-500">{successMessage}</p>
          <button
            onClick={() => setActiveModal('none')}
            className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors w-full"
          >
            Continuar
          </button>
        </div>
      </Modal>
    </div >
  );
};

export default ClientDetail;
