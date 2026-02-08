import React, { useMemo } from 'react';
import { CalendarEvent } from './EventCard';
import EventCard from './EventCard';
import { formatEventDate, getEventDate } from '../../services/googleCalendar';

interface CalendarListProps {
    events: CalendarEvent[];
    onLinkClick: (event: CalendarEvent) => void;
    loading?: boolean;
}

const CalendarList: React.FC<CalendarListProps> = ({ events, onLinkClick, loading }) => {
    // Group events by date
    const groupedEvents = useMemo(() => {
        const groups: Record<string, CalendarEvent[]> = {};

        events.forEach(event => {
            // Using the helper function for friendly date headers
            const dateKey = formatEventDate(event);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(event);
        });

        return groups;
    }, [events]);

    const sortedDates = Object.keys(groupedEvents);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-50 rounded-xl"></div>
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <span className="text-2xl grayscale opacity-50">📅</span>
                </div>
                <p className="font-medium text-slate-600">Nenhum evento encontrado</p>
                <p className="text-sm opacity-60">Sua agenda está livre neste período.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {sortedDates.map(date => (
                <div key={date} className="relative">
                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                            {date}
                        </h4>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            {groupedEvents[date].length} eventos
                        </span>
                    </div>

                    <div className="space-y-3 pl-2 border-l-2 border-slate-200 hover:border-slate-300 transition-colors">
                        {groupedEvents[date].map(event => (
                            <EventCard
                                key={event.id}
                                event={event}
                                onLinkClick={onLinkClick}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CalendarList;
