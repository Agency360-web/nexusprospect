import React, { useState } from 'react';
import { X, Clock, MapPin, AlignLeft, User, ExternalLink, Trash2, Edit2, Link2, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent, formatEventDate, formatEventTime, getEventColorClasses } from '../../services/googleCalendar';

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent | null;
    onEdit: (event: CalendarEvent) => void;
    onDelete: (eventId: string) => void;
    onLinkClient: (event: CalendarEvent) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
    isOpen,
    onClose,
    event,
    onEdit,
    onDelete,
    onLinkClient
}) => {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen || !event) return null;

    const colors = getEventColorClasses(event.colorId);
    const hasVideoCall = event.conferenceData?.entryPoints?.some(e => e.uri);

    const handleDelete = () => {
        if (confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
            setIsDeleting(true);
            onDelete(event.id);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Color Accent */}
                <div className={`h-2 w-full ${colors.bg.replace('bg-', 'bg-').replace('50', '500')}`} /> {/* Use darker shade for header line */}

                <div className="flex items-start justify-between p-5 pt-4">
                    <h2 className={`text-xl font-bold text-slate-900 leading-tight ${colors.text}`}>
                        {event.summary}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors shrink-0 ml-2">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 pb-6 flex flex-col gap-4">
                    {/* Time */}
                    <div className="flex items-start gap-3">
                        <Clock className="text-slate-400 shrink-0 mt-0.5" size={18} />
                        <div>
                            <div className="text-sm font-medium text-slate-900">
                                {formatEventDate(event)}
                            </div>
                            <div className="text-sm text-slate-500">
                                {formatEventTime(event)}
                            </div>
                        </div>
                    </div>

                    {/* Location or Meet */}
                    {(event.location || hasVideoCall) && (
                        <div className="flex items-start gap-3">
                            <MapPin className="text-slate-400 shrink-0 mt-0.5" size={18} />
                            <div className="text-sm text-slate-700">
                                {hasVideoCall && (
                                    <a
                                        href={event.conferenceData?.entryPoints?.[0]?.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors mb-1 font-medium"
                                    >
                                        Entrar no Google Meet
                                    </a>
                                )}
                                {event.location && (
                                    <span className="block">{event.location}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="flex items-start gap-3">
                            <AlignLeft className="text-slate-400 shrink-0 mt-0.5" size={18} />
                            <div
                                className="text-sm text-slate-600 whitespace-pre-wrap max-h-[150px] overflow-y-auto pr-1"
                                dangerouslySetInnerHTML={{ __html: event.description }}
                            />
                        </div>
                    )}

                    {/* Client Link */}
                    <div className="flex items-start gap-3 pt-2">
                        <User className="text-slate-400 shrink-0 mt-0.5" size={18} />
                        <div className="flex-1">
                            {event.linkedClient ? (
                                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="text-sm font-medium text-slate-900">
                                        {event.linkedClient.name}
                                    </span>
                                    <button
                                        onClick={() => onLinkClient(event)}
                                        className="text-xs text-slate-500 hover:text-slate-900 underline"
                                    >
                                        Alterar
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => onLinkClient(event)}
                                    className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                                >
                                    <Link2 size={14} />
                                    Vincular a um cliente
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50 p-4 flex items-center justify-between border-t border-slate-100">
                    {event.htmlLink && (
                        <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Abrir no Google Agenda"
                        >
                            <ExternalLink size={18} />
                        </a>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Evento"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={() => onEdit(event)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Edit2 size={16} />
                            Editar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailsModal;
