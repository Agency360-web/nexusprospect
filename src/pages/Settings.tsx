import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Cable,
  Webhook,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ConnectionsTab from '../components/settings/ConnectionsTab';
import WebhookTab from '../components/settings/WebhookTab';
import ChangePasswordTab from '../components/settings/ChangePasswordTab';
import EmailConnectionsTab from '../components/settings/EmailConnectionsTab';

type SettingsTab = 'connections' | 'email' | 'webhook' | 'security';

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>('connections');
  const displayName = user?.user_metadata?.full_name || '';

  const TabItem = ({ id, label, icon: Icon }: { id: SettingsTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id
        ? 'bg-slate-900 text-white shadow-md'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon size={18} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
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
                <div className="text-xs font-bold text-slate-900 truncate">{displayName || 'Usuário'}</div>
                <div className="text-[10px] text-slate-500 truncate" title={user?.email}>{user?.email}</div>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            <TabItem id="connections" label="Conexão do WhatsApp" icon={Cable} />
            <TabItem id="email" label="Conexões de E-mail" icon={Mail} />
            <TabItem id="webhook" label="Webhook" icon={Webhook} />
            <TabItem id="security" label="Segurança" icon={ShieldCheck} />

            <div className="pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-[#ea384c] hover:bg-red-50"
              >
                <LogOut size={18} />
                <span className="text-sm font-bold">Sair da Conta</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-180px)]">

          <div className="p-8 flex-1">
            {activeTab === 'connections' && (
              <ConnectionsTab />
            )}

            {activeTab === 'email' && (
              <EmailConnectionsTab />
            )}

            {activeTab === 'webhook' && (
              <WebhookTab />
            )}

            {activeTab === 'security' && (
              <ChangePasswordTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;