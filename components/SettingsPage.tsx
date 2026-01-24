import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Plus,
  Save,
  MoreVertical,
  LogOut,
  User,
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRBAC } from '../hooks/useRBAC';
import Modal from './ui/Modal';
import { supabase } from '../lib/supabase';

type SettingsTab = 'general' | 'users';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
}

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { hasRole } = useRBAC();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saveLoading, setSaveLoading] = useState(false);

  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [platformName, setPlatformName] = useState(user?.user_metadata?.platform_name || 'NexusDispatch');

  // Real Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Interactive States
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);

  // New User Form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [newUserPermissions, setNewUserPermissions] = useState<string[]>(['dashboard', 'reports']);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchProfiles();
    }
  }, [activeTab]);

  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      // Update Auth User Metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          platform_name: platformName
        }
      });
      if (error) throw error;

      // Update Profile Table as well
      if (user) {
        await supabase
          .from('profiles')
          .update({ full_name: displayName })
          .eq('id', user.id);
      }

      alert('Alterações salvas com sucesso!');
      window.location.reload(); // Reload to refresh context
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao salvar alterações.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      // Call the Edge Function to send real invitation
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: newUserEmail,
          role: newUserRole,
          allowed_pages: newUserPermissions
        }
      });

      if (error) {
        // Handle specific error messages from the function if possible
        const errorMessage = error.context?.json?.error || error.message || 'Erro desconhecido';
        throw new Error(errorMessage);
      }

      alert('Convite enviado com sucesso! O usuário receberá um e-mail para definir a senha.');
      setIsNewUserModalOpen(false);
      setNewUserEmail('');
      setNewUserPermissions(['dashboard', 'reports']); // Reset defaults
      setNewUserRole('user');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      alert(`Erro ao enviar convite: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza? Essa ação excluirá o usuário permanentemente.')) return;

    setSaveLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });

      if (error) throw error;

      setProfiles(profiles.filter(p => p.id !== userId));
      alert('Usuário removido com sucesso.');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Erro ao remover: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const TabItem = ({ id, label, icon: Icon }: { id: SettingsTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === id
        ? 'bg-[#ffd700] text-slate-900 shadow-lg shadow-[#ffd700]/50'
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
                <div className="text-xs font-bold text-slate-900 truncate">{displayName || 'Usuário'}</div>
                <div className="text-[10px] text-slate-500 truncate" title={user?.email}>{user?.email}</div>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            <TabItem id="general" label="Geral" icon={Settings} />
            <TabItem id="users" label="Usuários & Acessos" icon={Users} />

            <div className="pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-[#ea384c] hover:bg-red-50"
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-yellow-500 transition-all font-bold text-slate-900"
                    />
                    <p className="text-xs text-slate-400">Este nome aparecerá na saudação do Dashboard.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome da Plataforma</label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-yellow-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Logo da Empresa</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-[#ffd700] border border-dashed border-slate-800">
                        <Plus size={24} />
                      </div>
                      <p className="text-xs text-slate-400">Recomendado: SVG ou PNG (512x512px)</p>
                    </div>
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
                      className="flex items-center space-x-2 px-4 py-2 bg-[#ffd700] text-slate-900 rounded-xl text-xs font-bold shadow-lg shadow-[#ffd700]/30 hover:bg-[#f8ab15] transition-colors"
                    >
                      <Plus size={16} />
                      <span>Novo Usuário</span>
                    </button>
                  }
                />

                <div className="space-y-3">
                  {loadingProfiles ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
                  ) : profiles.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">Nenhum usuário encontrado (além de você).</div>
                  ) : (
                    profiles.map((profile, i) => (
                      <div key={profile.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200">
                            <User size={20} className="text-slate-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{profile.full_name || 'Sem nome'}</div>
                            <div className="text-xs text-slate-500">{profile.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-900 uppercase tracking-tight">{profile.role || 'User'}</div>
                            <div className={`text-[10px] font-bold uppercase ${profile.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`}>{profile.status || 'Active'}</div>
                          </div>

                          {/* Only Admins can delete, and cannot delete themselves */}
                          {hasRole('admin') && user?.id !== profile.id && (
                            <button
                              onClick={() => handleDeleteUser(profile.id)}
                              title="Remover Usuário"
                              className="p-2 text-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
              className={`flex items-center space-x-2 px-8 py-3 bg-[#ffd700] text-slate-900 rounded-2xl font-bold shadow-xl shadow-[#ffd700]/30 transition-all ${saveLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#f8ab15] active:scale-95'
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

      {/* New User Modal */}
      {isNewUserModalOpen && (
        <Modal
          isOpen={isNewUserModalOpen}
          onClose={() => setIsNewUserModalOpen(false)}
          title="Convidar Novo Usuário"
        >
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email do Usuário</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="colaborador@nexus.io"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função</label>
                <select
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-yellow-500"
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value)}
                >
                  <option value="user">Usuário Básico</option>
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  * Admins têm acesso total automático. Outros cargos dependem das permissões abaixo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Permissões de Acesso (Páginas)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'admin', label: 'Admin Hub' },
                    { id: 'clients', label: 'Clientes' },
                    { id: 'reports', label: 'Relatórios' },
                    { id: 'transmission', label: 'Transmissão' },
                    { id: 'settings', label: 'Configurações' },
                  ].map((page) => (
                    <label key={page.id} className="flex items-center space-x-2 p-2 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={newUserPermissions.includes(page.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUserPermissions([...newUserPermissions, page.id]);
                          } else {
                            setNewUserPermissions(newUserPermissions.filter(p => p !== page.id));
                          }
                        }}
                        className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-400 border-gray-300"
                      />
                      <span className="text-xs font-medium text-slate-700">{page.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-50">
              <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm">Cancelar</button>
              <button type="submit" disabled={saveLoading} className="flex-1 py-2 bg-[#ffd700] text-slate-900 rounded-lg font-bold text-sm hover:bg-[#f8ab15] shadow-lg shadow-[#ffd700]/30">
                {saveLoading ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SettingsPage;