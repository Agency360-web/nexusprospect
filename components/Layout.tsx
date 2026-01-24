import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Send,
    History,
    Settings,
    PlusCircle,
    Menu,
    X,
    Users,
    ChevronRight,
    ShieldCheck,
    DollarSign,
    Building2,
    ChevronLeft
} from 'lucide-react';
import { useRBAC } from '../hooks/useRBAC';

const SidebarItem: React.FC<{
    to: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    isCollapsed: boolean;
}> = ({ to, icon, label, active, isCollapsed }) => (
    <Link
        to={to}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${active
            ? 'bg-slate-900 text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-100'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
        title={isCollapsed ? label : ''}
    >
        {icon}
        {!isCollapsed && <span className="font-medium animate-in fade-in duration-200">{label}</span>}
    </Link>
);

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Mobile drawer state
    const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapse state
    const location = useLocation();
    const { canAccess } = useRBAC();

    return (
        <div className="flex min-h-screen bg-slate-50">
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 p-3 bg-slate-900 text-white rounded-full shadow-xl"
            >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <aside className={`
        fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
                <div className="flex flex-col h-full">
                    <div className={`p-6 border-b border-slate-100 flex items-center transition-all duration-300 ${isCollapsed ? 'flex-col justify-center gap-2' : 'flex-row justify-between'}`}>
                        <div className={`flex items-center space-x-2 ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
                                <Send size={18} className="text-white" />
                            </div>
                            {!isCollapsed && (
                                <span className="text-xl font-bold text-slate-900 tracking-tight animate-in fade-in duration-200 whitespace-nowrap">
                                    NexusDispatch
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {canAccess('dashboard') && (
                            <SidebarItem
                                to="/"
                                icon={<LayoutDashboard size={20} />}
                                label="Dashboard"
                                active={location.pathname === '/'}
                                isCollapsed={isCollapsed}
                            />
                        )}
                        {canAccess('admin') && (
                            <SidebarItem
                                to="/admin"
                                icon={<Building2 size={20} />}
                                label="Administração"
                                active={location.pathname.startsWith('/admin')}
                                isCollapsed={isCollapsed}
                            />
                        )}
                        {canAccess('clients') && (
                            <SidebarItem
                                to="/clients"
                                icon={<Users size={20} />}
                                label="Clientes"
                                active={location.pathname.startsWith('/clients')}
                                isCollapsed={isCollapsed}
                            />
                        )}
                        {canAccess('reports') && (
                            <SidebarItem
                                to="/history"
                                icon={<History size={20} />}
                                label="Relatórios"
                                active={location.pathname === '/history'}
                                isCollapsed={isCollapsed}
                            />
                        )}
                        {canAccess('transmission') && (
                            <SidebarItem
                                to="/new-campaign"
                                icon={<PlusCircle size={20} />}
                                label="Transmissão"
                                active={location.pathname === '/new-campaign'}
                                isCollapsed={isCollapsed}
                            />
                        )}
                    </nav>

                    <div className="p-4 border-t border-slate-100 space-y-2">
                        {!isCollapsed && canAccess('admin') && (
                            <div className="px-4 py-2 flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-in fade-in duration-200">
                                <ShieldCheck size={12} />
                                <span>Admin Hub</span>
                            </div>
                        )}

                        {canAccess('settings') && (
                            <SidebarItem
                                to="/settings"
                                icon={<Settings size={20} />}
                                label="Configurações"
                                active={location.pathname.startsWith('/settings')}
                                isCollapsed={isCollapsed}
                            />
                        )}
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-x-hidden">
                <div className="p-8 pt-16 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
