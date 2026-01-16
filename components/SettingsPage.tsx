import React, { useState } from 'react';
import {
  Settings,
  Users,
  Building2,
  Webhook,
  Smartphone,
  Tag as TagIcon,
  Zap,
  ShieldCheck,
  ScrollText,
  Clock,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Terminal,
  Activity,
  MoreVertical,
  ChevronRight,
  Database,
  Key,
  Bell,
  Eye,
  EyeOff,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from './ui/Modal';
import { supabase } from '../lib/supabase';

type SettingsTab = 'general' | 'users' | 'clients' | 'webhooks' | 'whatsapp' | 'leads' | 'campaigns' | 'security' | 'audit';

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saveLoading, setSaveLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [platformName, setPlatformName] = useState(user?.user_metadata?.platform_name || 'NexusDispatch');

  // Interactive States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [globalRateLimit, setGlobalRateLimit] = useState(60);
  const [autoBlock, setAutoBlock] = useState(5);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          platform_name: platformName
        }
      });
      if (error) throw error;
      alert('Alterações salvas com sucesso!');
      window.location.reload(); // Reload to refresh context
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao salvar alterações.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setTimeout(() => {
      setSaveLoading(false);
      setIsNewUserModalOpen(false);
      alert('Usuário convidado com sucesso!');
    }, 1000);
  };

  const TabItem = ({ id, label, icon: Icon }: { id: SettingsTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === id
        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon size={18} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );

  const SectionHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
    <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-end">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Navigation Sidebar */}
        <aside className="lg:w-72 space-y-2">
          <div className="px-4 py-2 mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Painel de Controle</p>

            <div className="mt-6 flex items-center space-x-3 p-3 bg-slate-100 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Conta Atual</div>
                <div className="text-[10px] text-slate-500 truncate" title={user?.email}>{user?.email}</div>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            <TabItem id="general" label="Geral" icon={Settings} />
            <TabItem id="users" label="Usuários & Acessos" icon={Users} />
            <TabItem id="clients" label="Clientes (Tenants)" icon={Building2} />
            <TabItem id="webhooks" label="Webhooks Globais" icon={Webhook} />
            <TabItem id="whatsapp" label="Provedores WhatsApp" icon={Smartphone} />
            <TabItem id="leads" label="Campos de Leads" icon={TagIcon} />
            <TabItem id="campaigns" label="Padrões de Campanha" icon={Zap} />
            <TabItem id="security" label="Segurança & Limites" icon={ShieldCheck} />
            <TabItem id="audit" label="Logs & Auditoria" icon={ScrollText} />

            <div className="pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-rose-500 hover:bg-rose-50"
              >
                <LogOut size={18} />
                <span className="text-sm font-bold">Sair da Conta</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[750px]">

          <div className="p-8 flex-1 overflow-y-auto max-h-[750px]">
            {activeTab === 'general' && (
              <div className="space-y-8 max-w-2xl animate-in slide-in-from-right-2 duration-300">
                <SectionHeader title="Configurações Gerais" subtitle="Informações básicas da sua plataforma white-label." />

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome de Exibição (Seu Nome)</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Lucas Renato"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all font-bold text-slate-900"
                    />
                    <p className="text-xs text-slate-400">Este nome aparecerá na saudação do Dashboard.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome da Plataforma</label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Logo da Empresa</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-dashed border-slate-300">
                        <Plus size={24} />
                      </div>
                      <p className="text-xs text-slate-400">Recomendado: SVG ou PNG (512x512px)</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Modo Manutenção</div>
                      <div className="text-xs text-slate-500">Bloqueia o acesso a todos os usuários exceto Super Admins.</div>
                    </div>
                    <button
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={`w-12 h-6 rounded-full relative p-1 transition-colors ${maintenanceMode ? 'bg-slate-900' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                <SectionHeader
                  title="Usuários & Acessos"
                  subtitle="Gerencie membros da equipe interna e suas permissões."
                  action={
                    <button
                      onClick={() => setIsNewUserModalOpen(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10"
                    >
                      <Plus size={16} />
                      <span>Novo Usuário</span>
                    </button>
                  }
                />

                <div className="space-y-3">
                  {[
                    { name: 'Admin Principal', email: 'admin@nexus.io', role: 'Super Admin', status: 'Ativo' },
                    { name: 'Ana Operadora', email: 'ana@nexus.io', role: 'Operador', status: 'Ativo' },
                    { name: 'Suporte Nexus', email: 'help@nexus.io', role: 'Suporte', status: 'Inativo' },
                  ].map((user, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200">
                          <Users size={20} className="text-slate-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 uppercase tracking-tight">{user.role}</div>
                          <div className={`text-[10px] font-bold uppercase ${user.status === 'Ativo' ? 'text-emerald-500' : 'text-slate-400'}`}>{user.status}</div>
                        </div>
                        <button className="p-2 text-slate-300 hover:text-slate-600"><MoreVertical size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'webhooks' && (
              <div className="space-y-8 max-w-2xl animate-in slide-in-from-right-2 duration-300">
                <SectionHeader title="Webhooks Globais" subtitle="Endpoints de monitoramento do sistema em tempo real." />

                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Webhook de Monitoramento Global</label>
                      <div className="flex space-x-2">
                        <input type="text" readOnly defaultValue="https://monitor.nexusdispatch.com/v1/health" className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono" />
                        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600"><RefreshCw size={16} /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-slate-700">Notificar falhas de entrega críticas</span>
                      <div className="w-12 h-6 bg-slate-900 rounded-full relative p-1">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm ml-auto"></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Key size={16} />
                      <span>Assinatura de Segurança</span>
                    </h4>
                    <div className="flex items-center space-x-3">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        readOnly
                        defaultValue="sk_global_live_51M89B0L"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500"
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="space-y-8 animate-in slide-in-from-right-2 duration-300">
                <SectionHeader
                  title="Provedores de WhatsApp"
                  subtitle="Configure os backends de conexão para os disparos."
                  action={
                    <button className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10">
                      <Plus size={16} />
                      <span>Adicionar Gateway</span>
                    </button>
                  }
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-900 relative">
                    <div className="absolute top-4 right-4 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">Default</div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                        <Terminal size={24} className="text-slate-600" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Nexus-Core-API</div>
                        <div className="text-xs text-slate-500">Gateway Nativo (Instance v3)</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                      <span>Status: Online</span>
                      <span className="text-emerald-500">Latency: 42ms</span>
                    </div>
                  </div>

                  <div className="p-6 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer group">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 group-hover:bg-slate-100 transition-colors">
                        <Database size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Twilio API</div>
                        <div className="text-xs text-slate-500">Integration v1.2</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                      <span>Status: Offline</span>
                      <span className="text-slate-300">Não configurado</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 max-w-2xl animate-in slide-in-from-right-2 duration-300">
                <SectionHeader title="Segurança & Limites" subtitle="Políticas globais para evitar bloqueios e abusos." />

                <div className="space-y-6">
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-4">
                    <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Atenção com Políticas Anti-Spam</h4>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Configurações mal dimensionadas podem levar ao banimento imediato dos números de WhatsApp associados. Recomendamos intervalos de pelo menos 15 segundos entre disparos.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-bold text-slate-900">Rate Limit Global (Mensagens/Minuto)</div>
                        <input type="number" defaultValue="60" className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-center font-bold" />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-bold text-slate-900">Bloqueio Automático por Erros</div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400">Após</span>
                          <input
                            type="number"
                            value={autoBlock}
                            onChange={(e) => setAutoBlock(parseInt(e.target.value))}
                            className="w-16 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-center font-bold"
                          />
                          <span className="text-xs text-slate-400">falhas seguidas</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900">Política de Consentimento Opt-In</div>
                      <div className="w-12 h-6 bg-slate-900 rounded-full relative p-1">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm ml-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                <SectionHeader title="Logs & Auditoria" subtitle="Rastro completo de atividades críticas na plataforma." />

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-sm">
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico de Ações Administrativas</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      { user: 'Admin', action: 'Criação de Campaign', target: 'cli_1', time: 'Há 5 minutos' },
                      { user: 'Admin', action: 'Alteração de Provedor', target: 'System', time: 'Há 22 minutos' },
                      { user: 'Ana', action: 'Exportação de Leads', target: 'cli_2', time: 'Há 1 hora' },
                    ].map((log, i) => (
                      <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <Activity size={16} className="text-slate-300" />
                          <div>
                            <span className="font-bold text-slate-900">{log.user}</span>
                            <span className="mx-2 text-slate-400">•</span>
                            <span className="text-slate-600">{log.action}</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 font-mono tracking-tighter">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Other detailed tabs */}
            {['leads', 'campaigns', 'clients'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4 animate-in fade-in">
                <Database size={48} className="opacity-10" />
                <div className="text-center">
                  <h3 className="font-bold text-slate-900">Módulo Administrativo em Escala</h3>
                  <p className="text-sm max-w-xs mx-auto">Estas configurações gerenciam comportamentos globais de processamento de leads e campanhas.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Bar */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
            <div className="text-xs text-slate-400 font-medium">
              Modificações aplicadas a todos os ambientes isolados.
            </div>
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className={`flex items-center space-x-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/10 transition-all ${saveLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 active:scale-95'
                }`}
            >
              {saveLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <><Save size={18} /><span>Salvar Alterações Globais</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;