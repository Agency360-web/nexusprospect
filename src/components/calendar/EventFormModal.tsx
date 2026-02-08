import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, AlignLeft, Calendar as CalendarIcon, Save, Trash2, Users } from 'lucide-react';
import { GoogleCalendarInput, CalendarEvent, GOOGLE_EVENT_COLORS } from '../../services/googleCalendar';

interface Client {
    id: string;
    name: string;
}

interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (event: GoogleCalendarInput, clientId?: string) => Promise<void>;
    initialData?: CalendarEvent | null;
    title?: string;
    clients: Client[];
}

const EventFormModal: React.FC<EventFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title = 'Novo Evento',
    clients
}) => {
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [allDay, setAllDay] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('10:00');
    const [colorId, setColorId] = useState<string | undefined>(undefined);
    const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    // Initialize form
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setSummary(initialData.summary || '');
                setDescription(initialData.description || '');
                setLocation(initialData.location || '');
                setColorId(initialData.colorId);
                setSelectedClientId(initialData.linkedClient?.id);

                if (initialData.start.date) {
                    setAllDay(true);
                    setStartDate(initialData.start.date);
                    setEndDate(initialData.end.date || initialData.start.date);
                } else if (initialData.start.dateTime) {
                    setAllDay(false);
                    const start = new Date(initialData.start.dateTime);
                    const end = initialData.end.dateTime ? new Date(initialData.end.dateTime) : new Date(start.getTime() + 3600000);

                    setStartDate(start.toISOString().split('T')[0]);
                    setStartTime(start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                    setEndDate(end.toISOString().split('T')[0]);
                    setEndTime(end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                }
            } else {
                // Default values for new event
                const now = new Date();
                const startStr = now.toISOString().split('T')[0];
                setSummary('');
                setDescription('');
                setLocation('');
                setAllDay(false);
                setStartDate(startStr);
                setEndDate(startStr);
                setStartTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                // Default end time + 1 hour
                now.setHours(now.getHours() + 1);
                setEndTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                setEndTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                setColorId(undefined);
                setSelectedClientId(undefined);
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const input: GoogleCalendarInput = {
                summary,
                description,
                location,
                colorId,
                start: {},
                end: {}
            };

            if (allDay) {
                input.start.date = startDate;
                input.end.date = endDate;
                // Google Calendar requires end date to be exclusive for all-day events
                // If user selects same day, we need to send next day as end
                // If user selects range, end date should be +1 day from visual end date?
                // Actually, standard behavior is usually inclusive in UI, exclusive in API.
                // Let's assume startDate === endDate means 1 day event. API needs endDate = startDate + 1 day.

                const endD = new Date(endDate);
                endD.setDate(endD.getDate() + 1);
                input.end.date = endD.toISOString().split('T')[0];

            } else {
                // Combine date and time
                // Need to handle timezone carefully.
                // Creating date from string + time string
                const startDateTime = new Date(`${startDate}T${startTime}`);
                const endDateTime = new Date(`${endDate}T${endTime}`);

                input.start.dateTime = startDateTime.toISOString();
                input.end.dateTime = endDateTime.toISOString();
            }

            await onSubmit(input, selectedClientId);
            onClose();
        } catch (error) {
            console.error('Error saving event:', error);
            // Could add error state here
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                    {/* Title */}
                    <div>
                        <input
                            type="text"
                            placeholder="Adicionar título"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full text-xl font-semibold placeholder:text-slate-400 border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 px-0 py-2 transition-colors bg-transparent"
                            required
                        />
                    </div>

                    {/* Type Toggle */}
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={allDay}
                                onChange={(e) => setAllDay(e.target.checked)}
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                            Dia inteiro
                        </label>
                    </div>

                    {/* Date/Time Row */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <Clock className="text-slate-400 shrink-0" size={18} />
                            <div className="flex-1 flex flex-wrap gap-2 items-center">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="p-1.5 text-sm border-0 bg-slate-50 rounded hover:bg-slate-100 focus:ring-1 focus:ring-slate-200 text-slate-700"
                                    required
                                />
                                {!allDay && (
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="p-1.5 text-sm border-0 bg-slate-50 rounded hover:bg-slate-100 focus:ring-1 focus:ring-slate-200 text-slate-700"
                                        required
                                    />
                                )}
                                <span className="text-slate-400 text-sm">→</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="p-1.5 text-sm border-0 bg-slate-50 rounded hover:bg-slate-100 focus:ring-1 focus:ring-slate-200 text-slate-700"
                                    required
                                />
                                {!allDay && (
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="p-1.5 text-sm border-0 bg-slate-50 rounded hover:bg-slate-100 focus:ring-1 focus:ring-slate-200 text-slate-700"
                                        required
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="flex items-center gap-3">
                        <div className="w-[18px]" /> {/* Spacer for icon alignment */}
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(GOOGLE_EVENT_COLORS).map(([id, colors]) => (
                                <button
                                    type="button"
                                    key={id}
                                    onClick={() => setColorId(id)}
                                    className={`w-6 h-6 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center transition-transform hover:scale-110 ${colorId === id ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
                                    title={`Color ${id}`}
                                >
                                    {colorId === id && <div className={`w-2 h-2 rounded-full ${colors.dot}`} />}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setColorId(undefined)}
                                className={`w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 ${!colorId ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                title="Cor Padrão"
                            >
                                {!colorId && <div className="w-2 h-2 rounded-full bg-slate-500" />}
                            </button>
                        </div>
                    </div>

                    {/* Client Selector */}
                    <div className="flex items-center gap-3">
                        <Users className="text-slate-400 shrink-0" size={18} />
                        <select
                            value={selectedClientId || ''}
                            onChange={(e) => setSelectedClientId(e.target.value || undefined)}
                            className="flex-1 p-2 text-sm border-0 bg-slate-50 rounded-lg hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-200 transition-colors text-slate-700 cursor-pointer appearance-none"
                        >
                            <option value="">Vincular a um cliente (opcional)</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-3">
                        <MapPin className="text-slate-400 mt-2" size={18} />
                        <input
                            type="text"
                            placeholder="Adicionar local"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="flex-1 p-2 text-sm border-0 bg-slate-50 rounded-lg hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-200 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div className="flex items-start gap-3">
                        <AlignLeft className="text-slate-400 mt-2" size={18} />
                        <textarea
                            placeholder="Adicionar descrição"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="flex-1 p-2 text-sm border-0 bg-slate-50 rounded-lg hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-200 transition-colors resize-none"
                        />
                    </div>

                    {/* FooterActions */}
                    <div className="flex items-center justify-end gap-2 mt-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Salvar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default EventFormModal;
