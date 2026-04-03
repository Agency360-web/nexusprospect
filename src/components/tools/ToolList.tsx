import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Circle, ExternalLink } from 'lucide-react';

export interface ToolItem {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive';
    path: string;
    icon: React.ReactNode;
}

interface ToolListProps {
    tools: ToolItem[];
    searchTerm: string;
    setSearchTerm: (value: string) => void;
}

const ToolList: React.FC<ToolListProps> = ({
    tools,
    searchTerm,
    setSearchTerm
}) => {
    const navigate = useNavigate();

    const filteredTools = tools.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="relative group w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-[#ffd700] transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar ferramenta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#ffd700] focus:ring-4 focus:ring-[#ffd700]/20 transition-all shadow-sm group-hover:shadow-md"
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-8">Ferramenta</div>
                    <div className="col-span-2 flex items-center justify-center">Status</div>
                    <div className="col-span-2 text-right">Ação</div>
                </div>

                <div className="divide-y divide-slate-100">
                    {filteredTools.map(tool => (
                        <div
                            key={tool.id}
                            onClick={() => navigate(tool.path)}
                            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                            <div className="col-span-8 flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-slate-900 transition-colors">
                                    {tool.icon}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate" title={tool.name}>{tool.name}</h3>
                                    <p className="text-xs text-slate-500 truncate" title={tool.description}>{tool.description}</p>
                                </div>
                            </div>

                            <div className="col-span-2 flex items-center justify-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${tool.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <Circle size={6} className={`mr-1.5 fill-current ${tool.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                    {tool.status === 'active' ? 'Ativo' : 'Em Breve'}
                                </span>
                            </div>

                            <div className="col-span-2 flex items-center justify-end">
                                <div className="p-2 rounded-lg text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-all">
                                    <ExternalLink size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredTools.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Search size={40} className="mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">Nenhuma ferramenta encontrada</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToolList;
