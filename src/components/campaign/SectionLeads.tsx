import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, Phone, User as UserIcon } from 'lucide-react';
import Papa from 'papaparse';

export type LeadsConfigType = {
    fileName: string;
    data: any[];
    headers: string[];
    mapping: {
        name: string;
        phone: string;
    };
    skipEmptyPhones: boolean;
};

interface Props {
    leadsConfig: LeadsConfigType;
    setLeadsConfig: React.Dispatch<React.SetStateAction<LeadsConfigType>>;
}

const SectionLeads: React.FC<Props> = ({ leadsConfig, setLeadsConfig }) => {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = (file: File) => {
        setError(null);
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Por favor, envie um arquivo CSV válido.');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError('Ocorreu um erro ao processar o CSV.');
                    return;
                }

                const headers = results.meta.fields || [];
                
                // Tenta preencher automaticamente caso encontre colunas com nomes óbvios
                const autoName = headers.find(h => h.toLowerCase().includes('nome')) || '';
                const autoPhone = headers.find(h => h.toLowerCase().includes('telefone') || h.toLowerCase().includes('celular') || h.toLowerCase().includes('whatsapp')) || '';

                setLeadsConfig({
                    ...leadsConfig,
                    fileName: file.name,
                    data: results.data,
                    headers,
                    mapping: {
                        name: autoName,
                        phone: autoPhone
                    }
                });
            },
            error: (err: any) => {
                setError(`Erro ao ler arquivo: ${err.message}`);
            }
        });
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleUpdateMapping = (field: 'name' | 'phone', value: string) => {
        setLeadsConfig({
            ...leadsConfig,
            mapping: {
                ...leadsConfig.mapping,
                [field]: value
            }
        });
    };

    return (
        <section id="sec-7" className="bg-white border border-slate-200 rounded-lg p-6">
            <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4">
                <FileSpreadsheet className="text-slate-700" size={18} />
                7. Leads e Segmentação (CSV)
            </h4>

            {!leadsConfig.fileName ? (
                <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive ? 'border-slate-500 bg-slate-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={onDrop}
                >
                    <UploadCloud className="mx-auto text-slate-400 mb-3" size={32} />
                    <p className="font-bold text-slate-700 text-sm mb-1">Arraste e solte o seu arquivo CSV aqui</p>
                    <p className="text-xs text-slate-500 mb-4">ou clique para procurar no seu computador</p>
                    
                    <label className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-2.5 px-6 rounded-md cursor-pointer transition-colors shadow-sm text-sm inline-block">
                        Procurar Arquivo
                        <input type="file" className="hidden" accept=".csv" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} />
                    </label>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-xs font-bold flex items-center justify-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-md">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-200 p-2 rounded-md">
                                <FileSpreadsheet className="text-slate-600" size={20} />
                            </div>
                            <div>
                                <h5 className="font-bold text-slate-800 text-sm">{leadsConfig.fileName}</h5>
                                <p className="text-xs text-slate-500">{leadsConfig.data.length} leads identificados</p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setLeadsConfig({ fileName: '', data: [], headers: [], mapping: { name: '', phone: '' }, skipEmptyPhones: true })}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md font-bold transition-all"
                        >
                            Trocar Arquivo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-md border border-slate-200">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><UserIcon size={14} className="text-slate-500"/> Coluna de Nome</label>
                            <select 
                                value={leadsConfig.mapping.name}
                                onChange={(e) => handleUpdateMapping('name', e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-xs font-medium"
                            >
                                <option value="">[ Não mapear ]</option>
                                {leadsConfig.headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"><Phone size={14} className="text-slate-500"/> Coluna de Telefone / WhatsApp *</label>
                            <select 
                                value={leadsConfig.mapping.phone}
                                onChange={(e) => handleUpdateMapping('phone', e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-md focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-xs font-medium"
                            >
                                <option value="">[ Selecione a coluna ]</option>
                                {leadsConfig.headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* PREVIEW TABELA POCKET */}
                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Preview dos Dados (Primeiros 3)</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-slate-600">
                                <thead className="text-[10px] text-slate-500 bg-slate-50 border-b border-slate-100 uppercase font-bold">
                                    <tr>
                                        {leadsConfig.mapping.name && <th className="px-4 py-2">Nome Mapeado</th>}
                                        {leadsConfig.mapping.phone && <th className="px-4 py-2">Telefone Mapeado</th>}
                                        <th className="px-4 py-2 text-slate-400">Outros Campos Ocultos...</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leadsConfig.data.slice(0, 3).map((row, i) => (
                                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                            {leadsConfig.mapping.name && <td className="px-4 py-2 font-medium">{row[leadsConfig.mapping.name] || '-'}</td>}
                                            {leadsConfig.mapping.phone && <td className="px-4 py-2 font-bold text-slate-700">{row[leadsConfig.mapping.phone] || '-'}</td>}
                                            <td className="px-4 py-2 text-slate-300 italic">...</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={leadsConfig.skipEmptyPhones} 
                            onChange={(e) => setLeadsConfig({...leadsConfig, skipEmptyPhones: e.target.checked})}
                            className="w-3.5 h-3.5 rounded text-slate-800 focus:ring-slate-500"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Pular contatos sem telefone</span>
                    </label>
                </div>
            )}
        </section>
    );
};

export default SectionLeads;
