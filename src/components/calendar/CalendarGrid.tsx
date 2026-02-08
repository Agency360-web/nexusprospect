import React, { useMemo } from 'react';
import { getMonthRange, getEventDate, getEventColorClasses, CalendarEvent } from '../../services/googleCalendar';

interface CalendarGridProps {
    currentDate: Date;
    events: CalendarEvent[];
    onLinkClick: (event: CalendarEvent) => void;
    loading?: boolean;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ currentDate, events, onLinkClick, loading }) => {
    const days = useMemo(() => {
        const { start, end } = getMonthRange(currentDate);
        const daysArray: Date[] = [];
        const day = new Date(start);

        while (day <= end) {
            daysArray.push(new Date(day));
            day.setDate(day.getDate() + 1);
        }
        return daysArray;
    }, [currentDate]);

    // Group events by date (YYYY-MM-DD for easy lookup)
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        events.forEach(event => {
            const date = getEventDate(event);
            const dateKey = date.toDateString();
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(event);
        });
        return map;
    }, [events]);

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    if (loading) {
        return (
            <div className="grid grid-cols-7 gap-1 h-[500px] animate-pulse">
                {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg border border-slate-100"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full select-none">
            {/* Week Headers */}
            <div className="grid grid-cols-7 mb-2 text-center">
                {weekDays.map((d, i) => (
                    <div key={i} className="text-xs font-bold text-slate-900 py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr gap-1 flex-1">
                {days.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dateKey = day.toDateString();
                    const dayEvents = eventsByDate[dateKey] || [];
                    const hasEvents = dayEvents.length > 0;

                    return (
                        <div
                            key={index}
                            className={`min-h-[100px] p-1.5 border rounded-lg transition-all flex flex-col gap-1 
                                ${isCurrentMonth ? 'bg-white border-slate-100' : 'bg-slate-50/30 border-transparent'}
                                ${isToday ? 'ring-2 ring-slate-900 border-slate-900 z-10' : 'hover:border-slate-300'}
                            `}
                        >
                            {/* Day Number */}
                            <div className="flex justify-center mb-1">
                                <span className={`
                                    text-xs font-semibold px-2 py-0.5 rounded-full
                                    ${isToday
                                        ? 'bg-slate-900 text-white'
                                        : isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}
                                `}>
                                    {day.getDate()}
                                </span>
                            </div>

                            {/* Events Dots/List */}
                            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                {dayEvents.slice(0, 3).map(event => {
                                    const colors = getEventColorClasses(event.colorId);
                                    return (
                                        <div
                                            key={event.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onLinkClick(event);
                                            }}
                                            className={`
                                                text-[9px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:brightness-95 transition-all font-medium border
                                                ${colors.bg} ${colors.text} ${colors.border}
                                            `}
                                            title={event.summary}
                                        >
                                            {event.summary}
                                        </div>
                                    );
                                })}
                                {dayEvents.length > 3 && (
                                    <div className="text-[9px] text-slate-400 text-center font-medium hover:text-slate-600 cursor-pointer">
                                        +{dayEvents.length - 3} mais
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarGrid;
