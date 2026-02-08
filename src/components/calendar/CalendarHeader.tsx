import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCw, LogOut, LogIn, Plus } from 'lucide-react';

interface CalendarHeaderProps {
    filterMode: 'today' | 'week' | 'month';
    onFilterChange: (mode: 'today' | 'week' | 'month') => void;
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    isConnected: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    refreshing: boolean;
    onRefresh: () => void;
    onAddEvent: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    filterMode,
    onFilterChange,
    currentDate,
    onPrev,
    onNext,
    onToday,
    isConnected,
    onConnect,
    onDisconnect,
    refreshing,
    onRefresh,
    onAddEvent
}) => {
    const monthYear = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

    return (
        <div className="flex flex-col gap-6 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">Google Agenda</h3>
                        <p className="text-xs font-medium text-slate-500 capitalize">{capitalizedMonthYear}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isConnected && (
                        <>
                            <button
                                onClick={onAddEvent}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm mr-2"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline text-xs font-bold">Novo</span>
                            </button>

                            <button
                                onClick={onRefresh}
                                disabled={refreshing}
                                className={`p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 ${refreshing ? 'animate-spin' : ''
                                    }`}
                                title="Atualizar eventos"
                            >
                                <RotateCw size={16} />
                            </button>
                        </>
                    )}

                    <button
                        onClick={isConnected ? onDisconnect : onConnect}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isConnected
                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-rose-500 hover:border-rose-200'
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                            }`}
                    >
                        {isConnected ? (
                            <>
                                <LogOut size={14} />
                                <span>Sair</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={14} />
                                <span>Conectar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {isConnected && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Filters */}
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => onFilterChange('today')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'today'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Hoje
                        </button>
                        <button
                            onClick={() => onFilterChange('week')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'week'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Próximos 7 dias
                        </button>
                        <button
                            onClick={() => onFilterChange('month')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'month'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Mês
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={onPrev}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center capitalize">
                            {filterMode === 'today' ? 'Hoje' : capitalizedMonthYear}
                        </span>
                        <button
                            onClick={onNext}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarHeader;
