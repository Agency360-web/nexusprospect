import React, { useState } from 'react';
import {
    GraduationCap,
    PlayCircle,
    Search,
    BookOpen,
    Video,
    ChevronRight,
    Rocket,
    Settings,
    MessageSquare,
    Zap,
    X
} from 'lucide-react';

interface Tutorial {
    id: string;
    title: string;
    description: string;
    duration: string;
    category: string;
    thumbnail: string;
    videoUrl?: string; // Will be used when videos are ready
}

const CATEGORIES = [
    { id: 'all', name: 'Todos', icon: BookOpen },
    { id: 'getting-started', name: 'Primeiros Passos', icon: Rocket },
    { id: 'campaigns', name: 'Campanhas & Disparos', icon: Zap },
    { id: 'settings', name: 'Configurações', icon: Settings },
    { id: 'tools', name: 'Ferramentas', icon: WrenchIcon },
];

// Reusing Wrench icon but defining here if not imported properly
function WrenchIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    );
}

// Exemplos de Tutoriais (Placeholders)
const TUTORIALS: Tutorial[] = [
    {
        id: '1',
        title: 'Visão Geral do Sistema',
        description: 'Aprenda como navegar pelo Nexus e descubra todas as ferramentas disponíveis para escalar sua prospecção.',
        duration: '05:30',
        category: 'getting-started',
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop',
    },
    {
        id: '2',
        title: 'Como conectar seu WhatsApp',
        description: 'Passo a passo detalhado para conectar suas instâncias de WhatsApp e mantê-las ativas e estáveis.',
        duration: '03:45',
        category: 'settings',
        thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2574&auto=format&fit=crop',
    },
    {
        id: '3',
        title: 'Criando sua primeira Campanha Simples',
        description: 'Aprenda a importar contatos, configurar mensagens e iniciar sua primeira campanha de disparos.',
        duration: '08:15',
        category: 'campaigns',
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop',
    },
    {
        id: '4',
        title: 'Utilizando Agentes de IA nas Campanhas',
        description: 'Como configurar o Prompts do ChatGPT para gerar variações exclusivas em cada mensagem disparada.',
        duration: '12:00',
        category: 'campaigns',
        thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2670&auto=format&fit=crop',
    },
    {
        id: '5',
        title: 'Extração de Leads do Google Maps',
        description: 'Descubra como encontrar contatos qualificados (B2B) usando nossa ferramenta de extração no mapa.',
        duration: '06:20',
        category: 'tools',
        thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2674&auto=format&fit=crop',
    },
    {
        id: '6',
        title: 'Aquecedor de WhatsApp',
        description: 'Evite bloqueios aquecendo suas contas novas com nossa ferramenta de interação automática.',
        duration: '07:10',
        category: 'tools',
        thumbnail: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=2670&auto=format&fit=crop',
    }
];

const Tutorials: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedVideo, setSelectedVideo] = useState<Tutorial | null>(null);

    const filteredTutorials = TUTORIALS.filter(tutorial => {
        const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || tutorial.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Header - Premium Dark Hero */}
            <div className="relative bg-slate-900 rounded-xl shadow-2xl shadow-slate-900/10 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 p-8">
                    <div className="text-white">
                        <h1 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                            <GraduationCap className="text-slate-400" size={32} />
                            Central de Tutoriais
                        </h1>
                        <p className="text-slate-300 font-medium max-w-xl">
                            Aprenda a dominar o Nexus Prospect assistindo aos nossos tutoriais.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative z-20 w-full md:w-auto min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar tutoriais..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-400 rounded-xl pl-11 pr-4 py-3 outline-none focus:bg-white/20 focus:border-yellow-500/50 transition-all backdrop-blur-md"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-8">



                {/* List of Tutoriais (List Pattern from Tools) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header da Tabela */}
                    <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50 border-b border-slate-100 hidden md:grid">
                        <div className="col-span-7">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tutorial</span>
                        </div>
                        <div className="col-span-3 text-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria / Duração</span>
                        </div>
                        <div className="col-span-2 text-right">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</span>
                        </div>
                    </div>

                    {filteredTutorials.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Search size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum tutorial encontrado</h3>
                            <p className="text-slate-500 font-medium">Tente buscar com outros termos ou selecione outra categoria.</p>
                            <button
                                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                                className="mt-8 px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {filteredTutorials.map((tutorial) => {
                                const categoryInfo = CATEGORIES.find(c => c.id === tutorial.category);
                                const CategoryIcon = categoryInfo?.icon || BookOpen;

                                return (
                                    <div
                                        key={tutorial.id}
                                        className="grid grid-cols-12 gap-4 px-6 md:px-8 py-3 items-center hover:bg-slate-50/80 transition-all group cursor-pointer"
                                        onClick={() => setSelectedVideo(tutorial)}
                                    >
                                        {/* Coluna 1: Info Principal */}
                                        <div className="col-span-12 md:col-span-7 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all shrink-0">
                                                <div className="relative">
                                                    <img
                                                        src={tutorial.thumbnail}
                                                        alt=""
                                                        className="w-6 h-6 rounded-md object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <PlayCircle size={14} className="text-slate-900" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-800 transition-colors leading-tight">
                                                    {tutorial.title}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">
                                                    {tutorial.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Coluna 2: Categoria e Duração */}
                                        <div className="hidden md:flex col-span-3 flex-col items-center gap-1.5">
                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-100">
                                                {categoryInfo?.name}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                                <Video size={12} />
                                                {tutorial.duration}
                                            </span>
                                        </div>

                                        {/* Coluna 3: Ação */}
                                        <div className="col-span-12 md:col-span-2 flex justify-end">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-slate-600 group-hover:bg-slate-100 transition-all border border-transparent group-hover:border-slate-200">
                                                <PlayCircle size={20} className="transform group-hover:scale-110 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Video Player Modal (Placeholder) */}
            {selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Video Player Area */}
                        <div className="aspect-video bg-black relative flex items-center justify-center">
                            {/* Fechar botão (Overlay) */}
                            <button
                                onClick={() => setSelectedVideo(null)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
                            >
                                <X size={20} />
                            </button>

                            {/* Placeholder message since no video URL exists yet */}
                            <div className="text-center p-6">
                                <PlayCircle size={64} className="text-white/20 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Vídeo Indisponível</h3>
                                <p className="text-slate-400 font-medium">O vídeo "{selectedVideo.title}" será disponibilizado em breve.</p>
                            </div>
                        </div>

                        {/* Video Info Area */}
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    {CATEGORIES.find(c => c.id === selectedVideo.category)?.name}
                                </span>
                                <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                                    <Video size={16} />
                                    {selectedVideo.duration}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-3">{selectedVideo.title}</h2>
                            <p className="text-slate-600 font-medium leading-relaxed max-w-3xl">
                                {selectedVideo.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tutorials;
