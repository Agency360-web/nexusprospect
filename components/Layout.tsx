import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Send,
    Settings,
    Menu,
    X,
    Users,
    ChevronRight,
    ShieldCheck,
    DollarSign,
    Building2,
    ChevronLeft,

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
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Mobile Top Header - Visible only on mobile */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                    <img src="/logo-icon.jpg" alt="Nexus" className="w-8 h-8 object-contain rounded-lg" />
                    <span className="font-black text-slate-900 tracking-tight">NEXUS</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 lg:static lg:translate-x-0 h-full
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
                <div className="flex flex-col h-full">
                    <div className={`p-6 border-b border-slate-100 flex items-center transition-all duration-300 ${isCollapsed ? 'flex-col justify-center gap-2' : 'flex-row justify-between'}`}>
                        <div className={`flex items-center space-x-2 ${isCollapsed ? 'justify-center' : ''}`}>
                            {isCollapsed ? (
                                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                                    <img src="/logo-icon.jpg" alt="Nexus" className="w-9 h-9 object-contain rounded-lg" />
                                </div>
                            ) : (
                                <img src="/logo.png" alt="Conecta Marketing" className="h-28 w-auto object-contain animate-in fade-in duration-200" />
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

            <main className="flex-1 overflow-y-auto min-h-0 relative">
                <div className="p-4 md:p-8 pt-20 lg:pt-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;

