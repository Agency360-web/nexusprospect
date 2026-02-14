import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface EditCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: any;
    onUpdate: () => void;
}

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({ isOpen, onClose, campaign, onUpdate }) => {
    const [name, setName] = useState('');
    const [delayMin, setDelayMin] = useState(0);
    const [delayMax, setDelayMax] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (campaign) {
            setName(campaign.nome_campanha);
            setDelayMin(campaign.delay_min_segundos || 150);
            setDelayMax(campaign.delay_max_segundos || 300);
        }
    }, [campaign]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('campanhas_disparo')
                .update({
                    nome_campanha: name,
                    delay_min_segundos: delayMin,
                    delay_max_segundos: delayMax,
                    updatedAt: new Date()
                })
                .eq('id', campaign.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating campaign:', error);
            alert('Erro ao atualizar campanha.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !campaign) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">Editar Campanha</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome da Campanha</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all text-slate-700 font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Delay Mín (s)</label>
                            <input
                                type="number"
                                value={delayMin}
                                onChange={(e) => setDelayMin(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all text-slate-700 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Delay Máx (s)</label>
                            <input
                                type="number"
                                value={delayMax}
                                onChange={(e) => setDelayMax(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all text-slate-700 font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-brand-600 text-slate-900 font-bold rounded-lg hover:bg-brand-500 transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditCampaignModal;
