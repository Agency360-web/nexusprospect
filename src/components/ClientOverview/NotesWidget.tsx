import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Pin, Trash2 } from 'lucide-react';
import { Note } from '../../types';
import { supabase } from '../../services/supabase';

interface NotesWidgetProps {
    clientId: string;
}

const NotesWidget: React.FC<NotesWidgetProps> = ({ clientId }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const fetchNotes = async () => {
        try {
            const { data, error } = await supabase
                .from('client_notes')
                .select('*')
                .eq('client_id', clientId)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [clientId]);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            const { error } = await supabase
                .from('client_notes')
                .insert({
                    client_id: clientId,
                    content: newNote,
                    is_pinned: true // Default to pinned for now since it's "Important Notes"
                });

            if (error) throw error;
            setNewNote('');
            setIsAdding(false);
            fetchNotes();
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    const handleDeleteNote = async (id: string) => {
        try {
            const { error } = await supabase
                .from('client_notes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchNotes();
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const togglePin = async (note: Note) => {
        try {
            const { error } = await supabase
                .from('client_notes')
                .update({ is_pinned: !note.isPinned })
                .eq('id', note.id);

            if (error) throw error;
            fetchNotes();
        } catch (error) {
            console.error('Error updating note:', error);
        }
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <StickyNote size={18} className="text-slate-400" />
                    <span>Anotações Importantes</span>
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddNote} className="mb-4">
                    <textarea
                        className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl outline-none text-sm resize-none mb-2"
                        placeholder="Digite sua anotação..."
                        rows={3}
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[300px] pr-1">
                {loading ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Nenhuma anotação</div>
                ) : (
                    notes.map(note => (
                        <div key={note.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl relative group">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-amber-100/50">
                                <span className="text-[10px] font-bold text-amber-400 uppercase">
                                    {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => togglePin(note)} className={`p-1 hover:bg-amber-100 rounded ${note.isPinned ? 'text-amber-500' : 'text-slate-400'}`}>
                                        <Pin size={12} className={note.isPinned ? 'fill-amber-500' : ''} />
                                    </button>
                                    <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotesWidget;
