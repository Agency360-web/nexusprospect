import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, Send, Clock, FileText } from 'lucide-react';
import { Contract } from '../types';
import { supabase } from '../lib/supabase';

interface ContractViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    onUpdate: () => void;
}

const ContractViewerModal: React.FC<ContractViewerModalProps> = ({ isOpen, onClose, contract, onUpdate }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [currentStatus, setCurrentStatus] = React.useState<Contract['status']>('generated');

    React.useEffect(() => {
        if (contract) {
            setCurrentStatus(contract.status);
        }
    }, [contract]);

    if (!isOpen || !contract) return null;

    const handleStatusChange = async (newStatus: Contract['status']) => {
        // Optimistic update
        const previousStatus = currentStatus;
        setCurrentStatus(newStatus);

        try {
            const { error } = await supabase
                .from('contracts')
                .update({ status: newStatus })
                .eq('id', contract.id);

            if (error) throw error;

            // Background update to ensure consistency
            onUpdate();
        } catch (err) {
            console.error('Error updating status:', err);
            // Revert on error
            setCurrentStatus(previousStatus);
            alert('Erro ao atualizar status');
        }
    };

    const handlePrint = () => {
        // Create a new window for printing to ensure styles are applied correctly without UI interface
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir.');
            return;
        }

        const content = contract.content_snapshot;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Contrato - ${contract.client_name}</title>
                    <style>
                        body {
                            font-family: 'Courier New', Courier, monospace;
                            padding: 20mm; /* Use mm for print consistency */
                            max-width: 100%;
                            margin: 0;
                            line-height: 1.6;
                            color: #000;
                        }
                        .prose {
                            width: 100%;
                        }
                        @media print {
                            @page { 
                                margin: 0; 
                                size: auto;
                            }
                            body { 
                                -webkit-print-color-adjust: exact;
                                margin: 0;
                                padding: 20mm;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        // Small delay to ensure content is loaded
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <FileText size={20} className="text-indigo-600" />
                            {contract.client_name}
                        </h2>
                        <p className="text-sm text-slate-500">Visualização do Contrato #{contract.id.substring(0, 8)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status Actions */}
                        <div className="mr-4 flex items-center bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => handleStatusChange('generated')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${currentStatus === 'generated' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Clock size={14} />
                                Gerado
                            </button>
                            <button
                                onClick={() => handleStatusChange('sent_to_signature')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${currentStatus === 'sent_to_signature' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-blue-700'}`}
                            >
                                <Send size={14} />
                                Enviado
                            </button>
                            <button
                                onClick={() => handleStatusChange('signed')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${currentStatus === 'signed' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-emerald-700'}`}
                            >
                                <CheckCircle2 size={14} />
                                Assinado
                            </button>
                        </div>

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                        >
                            <Printer size={18} />
                            <span>Imprimir / PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex justify-center">
                    <div
                        ref={printRef}
                        className="w-full max-w-[210mm] bg-white shadow-xl min-h-[297mm] p-[20mm] text-slate-900"
                        style={{ fontFamily: '"Courier New", Courier, monospace' }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: contract.content_snapshot }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractViewerModal;
