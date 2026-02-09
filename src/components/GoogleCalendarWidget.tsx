import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    exchangeCodeForTokens,
    refreshAccessToken,
    fetchCalendarEvents,
    getWeekRange,
    getMonthRange,
    getTodayRange,
    isGoogleCalendarConfigured,
    formatEventDate,
    formatEventTime,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    GoogleCalendarInput,
    CalendarEvent
} from '../services/googleCalendar';
import { useAuth } from '../contexts/AuthContext';
import Modal from './ui/Modal';
import EventDetailsModal from './calendar/EventDetailsModal';
import EventFormModal from './calendar/EventFormModal';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarList from './calendar/CalendarList';
import CalendarGrid from './calendar/CalendarGrid';
import { Clock, Users, X, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

interface EventWithClient extends CalendarEvent {
    // linkedClient already in CalendarEvent interface but overriding for safety if needed
}

interface Client {
    id: string;
    name: string;
}

const GoogleCalendarWidget: React.FC = () => {
    const { user } = useAuth();

    // State
    const [filterMode, setFilterMode] = useState<'today' | 'week' | 'month'>('today');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventWithClient[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventWithClient | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [searchClient, setSearchClient] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Initial Check & OAuth Callback
    useEffect(() => {
        const handleOAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code && user) {
                try {
                    const tokens = await exchangeCodeForTokens(code);
                    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

                    await supabase.from('user_google_tokens').upsert({
                        user_id: user.id,
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        expires_at: expiresAt.toISOString(),
                        scope: tokens.scope
                    }, { onConflict: 'user_id' });

                    window.history.replaceState({}, document.title, window.location.pathname);
                    setIsConnected(true);
                    // Fetch will be triggered by useEffect dependency on isConnected/currentDate/filterMode
                } catch (error) {
                    console.error('OAuth callback error:', error);
                }
            }
        };

        handleOAuthCallback();
        if (isGoogleCalendarConfigured()) {
            checkConnection();
        }
    }, [user]);

    // Check Connection & Token
    const checkConnection = useCallback(async () => {
        if (!user) return;

        try {
            const { data: tokenData } = await supabase
                .from('user_google_tokens')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (tokenData) {
                const expiresAt = new Date(tokenData.expires_at);
                const now = new Date();

                if (expiresAt > now) {
                    setIsConnected(true);
                } else if (tokenData.refresh_token) {
                    try {
                        const newTokens = await refreshAccessToken(tokenData.refresh_token);
                        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

                        await supabase.from('user_google_tokens').update({
                            access_token: newTokens.access_token,
                            expires_at: newExpiresAt.toISOString()
                        }).eq('user_id', user.id);

                        setIsConnected(true);
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        setIsConnected(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking connection:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Fetch Events Logic
    const fetchEvents = useCallback(async () => {
        if (!user || !isConnected) return;

        try {
            setRefreshing(true);
            const accessTokenData = await supabase
                .from('user_google_tokens')
                .select('access_token')
                .eq('user_id', user.id)
                .single();

            if (!accessTokenData.data) return;

            let start, end;

            if (filterMode === 'today') {
                const range = getTodayRange();
                start = range.start;
                end = range.end;
            } else if (filterMode === 'week') {
                const range = getWeekRange();
                start = range.start;
                end = range.end;
            } else { // month
                const range = getMonthRange(currentDate);
                start = range.start;
                end = range.end;
            }

            const calendarEvents = await fetchCalendarEvents(accessTokenData.data.access_token, start, end);

            // Fetch linked clients
            const eventIds = calendarEvents.map(e => e.id);
            if (eventIds.length > 0) {
                const { data: links } = await supabase
                    .from('calendar_event_clients')
                    .select('event_id, client_id, clients(id, name)')
                    .eq('user_id', user.id)
                    .in('event_id', eventIds);

                // Merge
                const eventsWithClients = calendarEvents.map(event => {
                    const link = links?.find(l => l.event_id === event.id);
                    return {
                        ...event,
                        linkedClient: link?.clients ? { id: (link.clients as any).id, name: (link.clients as any).name } : null
                    };
                });
                setEvents(eventsWithClients);
            } else {
                setEvents(calendarEvents);
            }

        } catch (error: any) {
            if (error.message === 'TOKEN_EXPIRED') {
                setIsConnected(false); // Prompt re-login or auto-refresh next time
            }
            console.error('Error fetching events:', error);
        } finally {
            setRefreshing(false);
        }
    }, [user, isConnected, filterMode, currentDate]);

    // Fetch Clients for Modal
    useEffect(() => {
        const fetchClients = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('clients')
                .select('id, name')
                .eq('user_id', user.id)
                .order('name');
            setClients(data || []);
        };
        fetchClients();
    }, [user]);

    // Trigger fetch on dependencies
    useEffect(() => {
        if (isConnected) {
            fetchEvents();
        }
    }, [fetchEvents]);

    // Handlers
    const handleConnect = () => {
        import('../services/googleCalendar').then(module => {
            const authUrl = module.getGoogleAuthUrl(user?.id);
            window.location.href = authUrl;
        });
    };

    const handleDisconnect = async () => {
        if (!user) return;
        await supabase.from('user_google_tokens').delete().eq('user_id', user.id);
        setIsConnected(false);
        setEvents([]);
    };

    const handleLinkClient = async (clientId: string | null) => {
        if (!selectedEvent || !user) return;

        try {
            if (clientId) {
                const client = clients.find(c => c.id === clientId);
                await supabase.from('calendar_event_clients').upsert({
                    user_id: user.id,
                    event_id: selectedEvent.id,
                    event_title: selectedEvent.summary,
                    event_start: selectedEvent.start.dateTime || selectedEvent.start.date,
                    event_end: selectedEvent.end.dateTime || selectedEvent.end.date,
                    client_id: clientId
                }, { onConflict: 'user_id,event_id' });

                setEvents(prev => prev.map(e =>
                    e.id === selectedEvent.id
                        ? { ...e, linkedClient: client ? { id: client.id, name: client.name } : null }
                        : e
                ));
            } else {
                await supabase
                    .from('calendar_event_clients')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('event_id', selectedEvent.id);

                setEvents(prev => prev.map(e =>
                    e.id === selectedEvent.id ? { ...e, linkedClient: null } : e
                ));
            }
            setLinkModalOpen(false);
            // Don't clear selectedEvent here if we want to go back to details, but usually we close link modal and force user to reopen
            // Or we could reopen details modal. Let's just close for now.
            setSelectedEvent(null);
        } catch (error) {
            console.error('Error linking client:', error);
        }
    };

    // CRUD Handlers
    const handleCreateEvent = async (eventInput: GoogleCalendarInput, clientId?: string) => {
        if (!user) return;
        try {
            const { data: tokenData } = await supabase
                .from('user_google_tokens')
                .select('access_token')
                .eq('user_id', user.id)
                .single();

            if (tokenData?.access_token) {
                const newEvent = await createCalendarEvent(tokenData.access_token, eventInput);

                if (clientId) {
                    await supabase.from('calendar_event_clients').insert({
                        user_id: user.id,
                        event_id: newEvent.id,
                        event_title: newEvent.summary,
                        event_start: newEvent.start.dateTime || newEvent.start.date,
                        event_end: newEvent.end.dateTime || newEvent.end.date,
                        client_id: clientId
                    });
                }

                fetchEvents(); // Refresh list
                setIsFormModalOpen(false);
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Erro ao criar evento. Verifique se você está conectado e se concedeu as permissões necessárias.');
        }
    };

    const handleUpdateEvent = async (eventInput: GoogleCalendarInput, clientId?: string) => {
        if (!user || !selectedEvent) return;
        try {
            const { data: tokenData } = await supabase
                .from('user_google_tokens')
                .select('access_token')
                .eq('user_id', user.id)
                .single();

            if (tokenData?.access_token) {
                const updatedEvent = await updateCalendarEvent(tokenData.access_token, selectedEvent.id, eventInput);

                if (clientId) {
                    await supabase.from('calendar_event_clients').upsert({
                        user_id: user.id,
                        event_id: updatedEvent.id,
                        event_title: updatedEvent.summary,
                        event_start: updatedEvent.start.dateTime || updatedEvent.start.date,
                        event_end: updatedEvent.end.dateTime || updatedEvent.end.date,
                        client_id: clientId
                    }, { onConflict: 'user_id,event_id' });
                } else {
                    // If client was removed (it was selected but now undefined)
                    // We should delete the link
                    await supabase
                        .from('calendar_event_clients')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('event_id', updatedEvent.id);
                }

                fetchEvents();
                setIsFormModalOpen(false);
                setSelectedEvent(null);
            }
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Erro ao atualizar evento.');
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!user) return;
        try {
            const { data: tokenData } = await supabase
                .from('user_google_tokens')
                .select('access_token')
                .eq('user_id', user.id)
                .single();

            if (tokenData?.access_token) {
                await deleteCalendarEvent(tokenData.access_token, eventId);
                fetchEvents();
                setIsDetailsModalOpen(false);
                setSelectedEvent(null);
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Erro ao excluir evento.');
        }
    };

    const openCreateModal = () => {
        setSelectedEvent(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        // Cast to EventWithClient if needed, but for form it's fine
        setSelectedEvent(event as EventWithClient);
        setIsDetailsModalOpen(false);
        setIsFormModalOpen(true);
    };

    const openLinkModal = (event: CalendarEvent) => {
        setSelectedEvent(event as EventWithClient);
        setIsDetailsModalOpen(false);
        setLinkModalOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event as EventWithClient);
        setIsDetailsModalOpen(true);
    };

    // Navigation Handlers
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleTodayNav = () => {
        setCurrentDate(new Date());
    };

    const filteredClients = useMemo(() => {
        if (!searchClient) return clients;
        return clients.filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()));
    }, [clients, searchClient]);


    // Renders
    if (!isGoogleCalendarConfigured()) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl">
                        <CalendarIcon size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Google Agenda</h3>
                </div>
                <div className="text-center py-6 text-slate-500">
                    <p className="text-sm">Configuração necessária.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm transition-all hover:shadow-md">
            <CalendarHeader
                filterMode={filterMode}
                onFilterChange={setFilterMode}
                currentDate={currentDate}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleTodayNav}
                isConnected={isConnected}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                refreshing={refreshing}
                onRefresh={fetchEvents}
                onAddEvent={openCreateModal}
            />
            {!isConnected ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                        <CalendarIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 mb-2">Google Agenda não conectada</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        Para visualizar seus compromissos, você precisa integrar sua conta do Google.
                    </p>
                    <a
                        href="#/settings"
                        className="mt-6 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        Ir para Configurações
                    </a>
                </div>
            ) : (
                <div className="min-h-[300px]">
                    {(filterMode === 'today' || filterMode === 'week') && (
                        <CalendarList
                            events={events}
                            onLinkClick={handleEventClick}
                            loading={loading || refreshing}
                        />
                    )}
                    {filterMode === 'month' && (
                        <CalendarGrid
                            currentDate={currentDate}
                            events={events}
                            onLinkClick={handleEventClick}
                            loading={loading || refreshing}
                        />
                    )}
                </div>
            )}

            {/* Link Client Modal - Colors Updated */}
            <Modal
                isOpen={linkModalOpen}
                onClose={() => { setLinkModalOpen(false); setSelectedEvent(null); setSearchClient(''); }}
                title="Vincular Cliente"
            >
                <div className="space-y-4">
                    {selectedEvent && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-900 mb-1">{selectedEvent.summary}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock size={14} />
                                <span>{formatEventDate(selectedEvent)} às {formatEventTime(selectedEvent)}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchClient}
                            onChange={(e) => setSearchClient(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-[250px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {selectedEvent?.linkedClient && (
                            <button
                                onClick={() => handleLinkClient(null)}
                                className="w-full flex items-center justify-between p-3 hover:bg-rose-50 rounded-xl transition-colors text-left group border border-transparent hover:border-rose-100"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-rose-100 text-rose-500 rounded-lg">
                                        <X size={14} />
                                    </div>
                                    <span className="text-rose-600 font-medium">Remover vínculo atual</span>
                                </div>
                            </button>
                        )}

                        {filteredClients.length === 0 ? (
                            <div className="text-center py-4 text-slate-400 text-sm">
                                Nenhum cliente encontrado.
                            </div>
                        ) : (
                            filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => handleLinkClient(client.id)}
                                    className={`w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all text-left group border ${selectedEvent?.linkedClient?.id === client.id
                                        ? 'bg-slate-100 border-slate-200'
                                        : 'border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg ${selectedEvent?.linkedClient?.id === client.id
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                                            }`}>
                                            <Users size={14} />
                                        </div>
                                        <span className={`font-medium ${selectedEvent?.linkedClient?.id === client.id
                                            ? 'text-slate-900'
                                            : 'text-slate-700'
                                            }`}>{client.name}</span>
                                    </div>
                                    {selectedEvent?.linkedClient?.id === client.id && (
                                        <div className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                                            Vinculado
                                        </div>
                                    )}
                                    <ChevronRight size={16} className={`transition-colors ${selectedEvent?.linkedClient?.id === client.id
                                        ? 'text-slate-400'
                                        : 'text-slate-300 group-hover:text-slate-400'
                                        }`} />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Event Details Modal */}
            <EventDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => { setIsDetailsModalOpen(false); setSelectedEvent(null); }}
                event={selectedEvent}
                onEdit={openEditModal}
                onDelete={handleDeleteEvent}
                onLinkClient={openLinkModal}
            />

            {/* Event Form Modal */}
            <EventFormModal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setSelectedEvent(null); }}
                onSubmit={selectedEvent ? handleUpdateEvent : handleCreateEvent}
                initialData={selectedEvent}
                title={selectedEvent ? 'Editar Evento' : 'Novo Evento'}
                clients={clients}
            />
        </div>
    );
};

export default GoogleCalendarWidget;
