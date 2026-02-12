import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Video, Trash2, ExternalLink } from 'lucide-react';
import { Meeting } from '../../types';
import { supabase } from '../../services/supabase';
import Modal from '../ui/Modal';

interface MeetingsWidgetProps {
    clientId: string;
}

const MeetingsWidget: React.FC<MeetingsWidgetProps> = ({ clientId }) => {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newMeeting, setNewMeeting] = useState({
        title: '',
        date: '',
        time: '',
        link: ''
    });

    const fetchMeetings = async () => {
        try {
            const { data, error } = await supabase
                .from('client_meetings')
                .select('*')
                .eq('client_id', clientId)
                .order('date', { ascending: true });

            if (error) throw error;
            setMeetings(data || []);
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeetings();
    }, [clientId]);

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dateTime = new Date(`${newMeeting.date}T${newMeeting.time}`);

            const { error } = await supabase
                .from('client_meetings')
                .insert({
                    client_id: clientId,
                    title: newMeeting.title,
                    date: dateTime.toISOString(),
                    link: newMeeting.link,
                    status: 'scheduled'
                });

            if (error) throw error;

            setIsModalOpen(false);
            setNewMeeting({ title: '', date: '', time: '', link: '' });
            fetchMeetings();
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Erro ao agendar reunião');
        }
    };

    const handleDeleteMeeting = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta reunião?')) return;
        try {
            const { error } = await supabase
                .from('client_meetings')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchMeetings();
        } catch (error) {
            console.error('Error deleting meeting:', error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <Calendar size={18} className="text-slate-400" />
                    <span>Próximas Reuniões</span>
                </h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px] pr-1">
                {loading ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
                ) : meetings.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Nenhuma reunião agendada</div>
                ) : (
                    meetings.map(meeting => {
                        const meetingDate = new Date(meeting.date);
                        const isToday = new Date().toDateString() === meetingDate.toDateString();

                        return (
                            <div key={meeting.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-slate-900 truncate pr-6">{meeting.title}</div>
                                    <button onClick={() => handleDeleteMeeting(meeting.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="flex items-center space-x-4 text-xs text-slate-500 mb-3">
                                    <div className={`flex items-center space-x-1 ${isToday ? 'text-emerald-600 font-bold' : ''}`}>
                                        <Calendar size={12} />
                                        <span>{meetingDate.toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Clock size={12} />
                                        <span>{meetingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>

                                {meeting.link && (
                                    <a
                                        href={meeting.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center space-x-2 w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                    >
                                        <Video size={14} />
                                        <span>Entrar na Reunião</span>
                                        <ExternalLink size={10} className="ml-1 opacity-50" />
                                    </a>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agendar Reunião">
                <form onSubmit={handleCreateMeeting} className="space-y-4">
                    <input
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        placeholder="Título da Reunião"
                        value={newMeeting.title}
                        onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Data</label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={newMeeting.date}
                                onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Hora</label>
                            <input
                                type="time"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                value={newMeeting.time}
                                onChange={e => setNewMeeting({ ...newMeeting, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <input
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        placeholder="Link da Reunião (Meet/Zoom)"
                        value={newMeeting.link}
                        onChange={e => setNewMeeting({ ...newMeeting, link: e.target.value })}
                    />
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">
                            Agendar
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MeetingsWidget;
