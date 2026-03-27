import React, { useRef } from 'react';
import { MousePointerClick, Plus, Trash2, GripVertical, Info } from 'lucide-react';

export type InteractiveButton = {
    id: string;
    text: string;
    url?: string;
};

interface Props {
    buttons: InteractiveButton[];
    setButtons: React.Dispatch<React.SetStateAction<InteractiveButton[]>>;
}

const SectionButtons: React.FC<Props> = ({ buttons, setButtons }) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleAdd = () => {
        if (buttons.length >= 1) return; // Limite = 1 botão
        setButtons([...buttons, { id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), text: '', url: '' }]);
    };

    const handleUpdate = (id: string, field: 'text' | 'url', value: string) => {
        setButtons(buttons.map(btn => btn.id === id ? { ...btn, [field]: value } : btn));
    };

    const handleRemove = (id: string) => {
        setButtons(buttons.filter(btn => btn.id !== id));
    };

    const handleSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        
        const _buttons = [...buttons];
        const draggedContent = _buttons[dragItem.current];
        _buttons.splice(dragItem.current, 1);
        _buttons.splice(dragOverItem.current, 0, draggedContent);
        
        setButtons(_buttons);
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <section id="sec-6" className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-1">
                        <MousePointerClick className="text-slate-700" size={18} />
                        7. Botões Interativos
                    </h4>
                    <p className="text-slate-500 text-sm">Aparece no final da mensagem (Máximo 1 botão).</p>
                </div>
            </div>

            <div className="space-y-2 mb-3">
                {buttons.map((btn, index) => (
                    <div 
                        key={btn.id} 
                        className="bg-slate-50 border border-slate-200 rounded-md p-2 flex items-start gap-2 group transition-all"
                        draggable
                        onDragStart={(e) => {
                            dragItem.current = index;
                            e.currentTarget.classList.add('opacity-50');
                        }}
                        onDragEnd={(e) => {
                            e.currentTarget.classList.remove('opacity-50');
                        }}
                        onDragEnter={() => {
                            dragOverItem.current = index;
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleSort}
                    >
                        <div className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 pt-2.5">
                            <GripVertical size={16} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <input 
                                type="text" 
                                value={btn.text} 
                                onChange={(e) => handleUpdate(btn.id, 'text', e.target.value)}
                                placeholder={`Texto do Botão ${index + 1}`}
                                maxLength={20}
                                className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" 
                            />
                            <input 
                                type="url" 
                                value={btn.url || ''} 
                                onChange={(e) => handleUpdate(btn.id, 'url', e.target.value)}
                                placeholder={`Link do Botão ${index + 1} (Ex: https://nexusprospect.com.br) - Opcional`}
                                className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-sm font-medium" 
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={() => handleRemove(btn.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all mt-0.5"
                            title="Remover Botão"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {buttons.length < 1 && (
                <button 
                    type="button" 
                    onClick={handleAdd}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-bold py-2.5 rounded-md flex items-center justify-center gap-1.5 transition-all text-sm"
                >
                    <Plus size={16} />
                    Adicionar Botão
                </button>
            )}

            {buttons.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <Info size={12} />
                    Máx. 20 caracteres por botão
                </div>
            )}
        </section>
    );
};

export default SectionButtons;
