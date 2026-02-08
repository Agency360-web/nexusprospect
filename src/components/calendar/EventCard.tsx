import React from 'react';
import { Clock, MapPin, Video, User, Link2, ExternalLink } from 'lucide-react';
import { formatEventTime, getEventDate, getEventColorClasses, CalendarEvent } from '../../services/googleCalendar';

interface EventCardProps {
    event: CalendarEvent;
    onLinkClick: (event: CalendarEvent) => void;
    compact?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, onLinkClick, compact = false }) => {
    const hasVideoCall = event.conferenceData?.entryPoints?.some(e => e.uri);

    // Time logic
    const now = new Date();
    const start = getEventDate(event);

    let end: Date;
    if (event.end.dateTime) {
        end = new Date(event.end.dateTime);
    } else if (event.end.date) {
        const [y, m, d] = event.end.date.split('-').map(Number);
        end = new Date(y, m - 1, d);
    } else {
        end = new Date();
    }

    // Get mapped Google colors
    const colors = getEventColorClasses(event.colorId);

    // Status/Opacity logic based on time
    let containerOpacity = 'opacity-100';
    let isPast = end < now;

    if (isPast) {
        containerOpacity = 'opacity-60 grayscale-[0.3]'; // Fade past events
    }

    // Styles
    // Use border color from mapping, bg color from mapping
    const containerClasses = `${colors.bg} ${colors.border} border hover:shadow-sm transition-all`;
    const textClasses = colors.text;
    const dotClasses = colors.dot;

    if (compact) {
        return (
            <div
                className={`group p-2.5 px-3 rounded-lg ${containerClasses} ${containerOpacity} mb-1 cursor-pointer hover:brightness-95`}
                onClick={() => onLinkClick(event)}
            >
                <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wide opacity-80 ${textClasses}`}>
                        {formatEventTime(event)}
                    </span>
                </div>
                <div className={`text-xs font-semibold truncate leading-tight ${textClasses}`}>
                    {event.summary}
                </div>
                {event.linkedClient && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600 bg-white/50 px-1.5 py-0.5 rounded-md w-fit border border-black/5">
                        <User size={10} />
                        <span className="truncate max-w-[80px] font-medium">{event.linkedClient.name}</span>
                    </div>
                )}
            </div>
        );
    }

    // Standard View (Still compact structure but valid logic for non-compact usage)
    return (
        <div className={`group relative py-2.5 px-3 rounded-lg ${containerClasses} ${containerOpacity} hover:brightness-95`}>
            {/* Side Accent */}
            <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full ${dotClasses}`} />

            <div className="pl-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-black/5 bg-white/50 ${textClasses}`}>
                            <Clock size={10} />
                            {formatEventTime(event)}
                        </span>
                        {hasVideoCall && (
                            <span className="text-[10px] font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Video size={10} />
                                Meet
                            </span>
                        )}
                    </div>

                    <h4 className={`font-bold text-sm truncate leading-tight group-hover:opacity-80 transition-opacity ${textClasses}`}>
                        {event.summary}
                    </h4>

                    {(event.location || event.linkedClient) && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {event.location && (
                                <div className="flex items-center gap-1 text-[10px] opacity-70 max-w-[150px] truncate text-slate-600">
                                    <MapPin size={10} />
                                    {event.location}
                                </div>
                            )}

                            {event.linkedClient ? (
                                <div
                                    className="flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-white/60 border border-black/5 px-1.5 py-0.5 rounded cursor-pointer hover:bg-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLinkClick(event);
                                    }}
                                >
                                    <User size={10} />
                                    {event.linkedClient.name}
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLinkClick(event);
                                    }}
                                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Link2 size={10} />
                                    Vincular
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {event.htmlLink && (
                        <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Abrir no Google Agenda"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                    {!event.linkedClient && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onLinkClick(event);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors sm:hidden"
                            title="Vincular Cliente"
                        >
                            <Link2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventCard;
