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
    ShieldCheck
} from 'lucide-react';

const SidebarItem: React.FC<{
    to: string;
    icon: React.ReactNode;
    label: string;
    active: boolean
}> = ({ to, icon, label, active }) => (
    <Link
        to={to}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${active
            ? 'bg-slate-900 text-white shadow-md'
            : 'text-slate-600 hover:bg-slate-100'
            }`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </Link>
);

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    return (
        <div className="flex min-h-screen bg-slate-50">
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 p-3 bg-slate-900 text-white rounded-full shadow-xl"
            >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                <Send size={18} className="text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight">NexusDispatch</span>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <SidebarItem
                            to="/"
                            icon={<LayoutDashboard size={20} />}
                            label="Dashboard"
                            active={location.pathname === '/'}
                        />
                        <SidebarItem
                            to="/clients"
                            icon={<Users size={20} />}
                            label="Clientes"
                            active={location.pathname.startsWith('/clients')}
                        />
                        <SidebarItem
                            to="/new-campaign"
                            icon={<PlusCircle size={20} />}
                            label="Nova Campanha"
                            active={location.pathname === '/new-campaign'}
                        />
                        <SidebarItem
                            to="/history"
                            icon={<History size={20} />}
                            label="Relatórios"
                            active={location.pathname === '/history'}
                        />
                    </nav>

                    <div className="p-4 border-t border-slate-100 space-y-2">
                        <div className="px-4 py-2 flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <ShieldCheck size={12} />
                            <span>Admin Hub</span>
                        </div>
                        <SidebarItem
                            to="/settings"
                            icon={<Settings size={20} />}
                            label="Configurações"
                            active={location.pathname.startsWith('/settings')}
                        />
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-x-hidden">
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center text-sm text-slate-500">
                        <span>Nexus Hub</span>
                        <ChevronRight size={14} className="mx-2" />
                        <span className="text-slate-900 font-medium capitalize">
                            {location.pathname === '/' ? 'Home' : location.pathname.split('/')[1].replace('-', ' ')}
                        </span>
                    </div>

                </header>

                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
