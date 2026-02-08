import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    Calendar,
    Clock,
    ExternalLink,
    Link2,
    X,
    Users,
    MapPin,
    Video,
    Loader2,
    RefreshCw,
    LogIn,
    LogOut,
    ChevronRight
} from 'lucide-react';
import {
    getGoogleAuthUrl,
    exchangeCodeForTokens,
    refreshAccessToken,
    fetchCalendarEvents,
    formatEventTime,
    formatEventDate,
    getWeekRange,
    isGoogleCalendarConfigured,
    CalendarEvent
} from '../services/googleCalendar';
import { useAuth } from '../contexts/AuthContext';
import Modal from './ui/Modal';

interface EventWithClient extends CalendarEvent {
    linkedClient?: {
        id: string;
        name: string;
    } | null;
}

interface Client {
    id: string;
    name: string;
}

const GoogleCalendarWidget: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventWithClient[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventWithClient | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [searchClient, setSearchClient] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Check for OAuth callback code in URL
    useEffect(() => {
        const handleOAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code && user) {
                try {
                    const tokens = await exchangeCodeForTokens(code);

                    // Store tokens in database
                    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

                    await supabase.from('user_google_tokens').upsert({
                        user_id: user.id,
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        expires_at: expiresAt.toISOString(),
                        scope: tokens.scope
                    }, { onConflict: 'user_id' });

                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);

                    setIsConnected(true);
                    fetchEvents(tokens.access_token);
                } catch (error) {
                    console.error('OAuth callback error:', error);
                }
            }
        };

        handleOAuthCallback();
    }, [user]);

    // Fetch stored tokens and check connection
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
                    fetchEvents(tokenData.access_token);
                } else if (tokenData.refresh_token) {
                    // Token expired, try to refresh
                    try {
                        const newTokens = await refreshAccessToken(tokenData.refresh_token);
                        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

                        await supabase.from('user_google_tokens').update({
                            access_token: newTokens.access_token,
                            expires_at: newExpiresAt.toISOString()
                        }).eq('user_id', user.id);

                        setIsConnected(true);
                        fetchEvents(newTokens.access_token);
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

    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    // Fetch clients for linking
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

    const fetchEvents = async (accessToken: string) => {
        try {
            setRefreshing(true);
            const { start, end } = getWeekRange();
            const calendarEvents = await fetchCalendarEvents(accessToken, start, end);

            // Fetch linked clients for these events
            const eventIds = calendarEvents.map(e => e.id);
            const { data: links } = await supabase
                .from('calendar_event_clients')
                .select('event_id, client_id, clients(id, name)')
                .eq('user_id', user?.id)
                .in('event_id', eventIds);

            // Merge events with client links
            const eventsWithClients = calendarEvents.map(event => {
                const link = links?.find(l => l.event_id === event.id);
                return {
                    ...event,
                    linkedClient: link?.clients ? { id: (link.clients as any).id, name: (link.clients as any).name } : null
                };
            });

            setEvents(eventsWithClients);
        } catch (error: any) {
            if (error.message === 'TOKEN_EXPIRED') {
                setIsConnected(false);
            }
            console.error('Error fetching events:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleConnect = () => {
        const authUrl = getGoogleAuthUrl(user?.id);
        window.location.href = authUrl;
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

                // Update local state
                setEvents(prev => prev.map(e =>
                    e.id === selectedEvent.id
                        ? { ...e, linkedClient: client ? { id: client.id, name: client.name } : null }
                        : e
                ));
            } else {
                // Remove link
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
            setSelectedEvent(null);
        } catch (error) {
            console.error('Error linking client:', error);
        }
    };

    const filteredClients = useMemo(() => {
        if (!searchClient) return clients;
        return clients.filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()));
    }, [clients, searchClient]);

    const todayEvents = useMemo(() => {
        const today = new Date().toDateString();
        return events.filter(e => {
            const eventDate = new Date(e.start.dateTime || e.start.date || '');
            return eventDate.toDateString() === today;
        });
    }, [events]);

    const upcomingEvents = useMemo(() => {
        const today = new Date().toDateString();
        return events.filter(e => {
            const eventDate = new Date(e.start.dateTime || e.start.date || '');
            return eventDate.toDateString() !== today;
        });
    }, [events]);

    if (!isGoogleCalendarConfigured()) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
                        <Calendar size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Google Agenda</h3>
                </div>
                <div className="text-center py-6 text-slate-500">
                    <p className="text-sm">Configuração necessária.</p>
                    <p className="text-xs mt-1">Adicione VITE_GOOGLE_CLIENT_ID e VITE_GOOGLE_CLIENT_SECRET no .env.local</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-3xl border border-blue-100 p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 leading-tight">Minha Agenda</h3>
                            <p className="text-xs font-medium text-slate-400">Próximos 7 dias</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isConnected && (
                            <button
                                onClick={() => checkConnection()}
                                disabled={refreshing}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                        )}
                        <button
                            onClick={isConnected ? handleDisconnect : handleConnect}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isConnected
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                        >
                            {isConnected ? (
                                <>
                                    <LogOut size={14} />
                                    <span>Desconectar</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={14} />
                                    <span>Conectar Google</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                            <Calendar className="w-6 h-6 text-blue-400" />
                        </div>
                        <p className="text-slate-600 font-medium text-sm mb-1">Conecte sua agenda</p>
                        <p className="text-slate-400 text-xs">Veja seus compromissos e vincule a clientes</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                            <span className="text-xl">📅</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Nenhum evento nos próximos 7 dias</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Today's Events */}
                        {todayEvents.length > 0 && (
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2">Hoje</div>
                                <div className="space-y-2">
                                    {todayEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onLinkClick={() => { setSelectedEvent(event); setLinkModalOpen(true); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming Events */}
                        {upcomingEvents.length > 0 && (
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Próximos</div>
                                <div className="space-y-2">
                                    {upcomingEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onLinkClick={() => { setSelectedEvent(event); setLinkModalOpen(true); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Link Client Modal */}
            <Modal
                isOpen={linkModalOpen}
                onClose={() => { setLinkModalOpen(false); setSelectedEvent(null); setSearchClient(''); }}
                title="Vincular Cliente"
            >
                <div className="space-y-4">
                    {selectedEvent && (
                        <div className="bg-blue-50 p-4 rounded-xl">
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
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    <div className="max-h-[250px] overflow-y-auto space-y-1">
                        {selectedEvent?.linkedClient && (
                            <button
                                onClick={() => handleLinkClient(null)}
                                className="w-full flex items-center justify-between p-3 hover:bg-rose-50 rounded-xl transition-colors text-left group"
                            >
                                <div className="flex items-center gap-2">
                                    <X size={16} className="text-rose-500" />
                                    <span className="text-rose-600 font-medium">Remover vínculo</span>
                                </div>
                            </button>
                        )}

                        {filteredClients.map(client => (
                            <button
                                key={client.id}
                                onClick={() => handleLinkClient(client.id)}
                                className={`w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors text-left group ${selectedEvent?.linkedClient?.id === client.id ? 'bg-blue-50 border border-blue-200' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-slate-400" />
                                    <span className="font-medium text-slate-700">{client.name}</span>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </>
    );
};

// Event Card Component
const EventCard: React.FC<{ event: EventWithClient; onLinkClick: () => void }> = ({ event, onLinkClick }) => {
    const hasVideoCall = event.conferenceData?.entryPoints?.some(e => e.uri);

    return (
        <div className="group bg-slate-50 hover:bg-white p-3 rounded-xl border border-transparent hover:border-blue-100 transition-all">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-700 text-sm mb-1 truncate group-hover:text-blue-600 transition-colors">
                        {event.summary}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">
                            {formatEventTime(event)}
                        </span>

                        {event.location && (
                            <span className="text-slate-400 flex items-center gap-1 truncate max-w-[120px]">
                                <MapPin size={12} />
                                {event.location}
                            </span>
                        )}

                        {hasVideoCall && (
                            <span className="text-emerald-500 flex items-center gap-1">
                                <Video size={12} />
                                <span>Chamada</span>
                            </span>
                        )}
                    </div>

                    {/* Linked Client Badge */}
                    {event.linkedClient && (
                        <div className="mt-2 inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                            <Users size={12} />
                            <span className="font-medium">{event.linkedClient.name}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onLinkClick}
                        className={`p-1.5 rounded-lg transition-all ${event.linkedClient
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'
                            }`}
                        title={event.linkedClient ? 'Alterar cliente' : 'Vincular cliente'}
                    >
                        <Link2 size={14} />
                    </button>

                    {event.htmlLink && (
                        <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoogleCalendarWidget;
