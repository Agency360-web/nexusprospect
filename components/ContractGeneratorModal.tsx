import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ContractTemplate, Contract, Client } from '../types';
import { X, Save, FileText, ChevronRight, Download, Edit3, Plus, UserCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface ContractGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ContractGeneratorModal: React.FC<ContractGeneratorModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');

    // Editor modules configuration
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'font',
        'align'
    ];

    const [variables, setVariables] = useState<Record<string, string>>({
        razao_social: '',
        cnpj: '',
        endereco: '',
        cep: '',
        cidade: '',
        bairro: '',
        email: '',
        responsavel: '',
        servicos: '',
        prazo: '',
        valor_total: '',
        forma_pagamento: '',
        condicoes_pagamento: ''
    });
    const [loading, setLoading] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            fetchClients();
            resetState();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedTemplate && !isCreatingTemplate) {
            updatePreview();
        }
    }, [selectedTemplate, variables, isCreatingTemplate]);

    const resetState = () => {
        setVariables({
            razao_social: '',
            cnpj: '',
            endereco: '',
            cep: '',
            cidade: '',
            bairro: '',
            email: '',
            responsavel: '',
            servicos: '',
            prazo: '',
            valor_total: '',
            forma_pagamento: '',
            condicoes_pagamento: ''
        });
        setSelectedTemplate(null);
        setIsCreatingTemplate(false);
        setNewTemplateName('');
        setNewTemplateContent('<p><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</strong></p><p><br></p><p>CONTRATANTE: {{razao_social}}, CNPJ: {{cnpj}}...</p>');
    };

    const fetchTemplates = async () => {
        try {
            const { data } = await supabase
                .from('contract_templates')
                .select('*')
                .eq('user_id', user?.id);
            if (data) setTemplates(data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchClients = async () => {
        try {
            const { data } = await supabase
                .from('clients')
                .select('*')
                .eq('status', 'active');
            if (data) setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleClientImport = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        setVariables(prev => ({
            ...prev,
            razao_social: client.corporateName || client.name,
            cnpj: client.cnpj || '',
            endereco: client.address || '',
            email: client.email || '',
            responsavel: client.name,
            // Keep other fields as they might be specific to the contract
        }));
    };

    const updatePreview = () => {
        if (!selectedTemplate) return;
        let content = selectedTemplate.content;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(regex, value || `{{${key}}}`);
        });
        setPreviewContent(content);
    };

    const handleSaveContract = async () => {
        if (!selectedTemplate) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('contracts').insert({
                user_id: user?.id,
                template_id: selectedTemplate.id,
                client_name: variables.razao_social || 'Cliente Sem Nome',
                status: 'generated',
                variables: variables,
                content_snapshot: previewContent
            });

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving contract:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!newTemplateName || !newTemplateContent) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.from('contract_templates').insert({
                user_id: user?.id,
                name: newTemplateName,
                content: newTemplateContent
            }).select().single();

            if (error) throw error;

            setTemplates([...templates, data]);
            setIsCreatingTemplate(false);
            setSelectedTemplate(data);
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-7xl h-[90vh] flex overflow-hidden shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* Sidebar / Form */}
                <div className="w-[400px] border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
                    <div className="p-8 border-b border-slate-200">
                        {isCreatingTemplate ? (
                            <button
                                onClick={() => setIsCreatingTemplate(false)}
                                className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 transition-colors"
                            >
                                <ArrowLeft size={14} className="mr-1" />
                                Voltar
                            </button>
                        ) : null}
                        <h2 className="text-xl font-bold text-slate-900">
                            {isCreatingTemplate ? 'Novo Modelo' : 'Novo Contrato'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {isCreatingTemplate
                                ? 'Crie um novo modelo de contrato.'
                                : 'Preencha os dados para gerar o documento.'}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">

                        {!isCreatingTemplate ? (
                            <>
                                {/* Template Selection */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Modelo de Contrato</label>
                                    <select
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-slate-900 outline-none transition-all cursor-pointer"
                                        value={selectedTemplate?.id || ''}
                                        onChange={(e) => {
                                            const t = templates.find(t => t.id === e.target.value);
                                            setSelectedTemplate(t || null);
                                        }}
                                    >
                                        <option value="">Selecione um modelo...</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => setIsCreatingTemplate(true)}
                                        className="w-full py-2 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-xs font-bold flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} />
                                        Criar Novo Modelo
                                    </button>
                                </div>

                                {selectedTemplate && (
                                    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">

                                        {/* Client Import */}
                                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                            <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wide mb-3">
                                                <UserCheck size={14} />
                                                Importar Cliente
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-indigo-900 focus:border-indigo-500 outline-none"
                                                onChange={(e) => handleClientImport(e.target.value)}
                                            >
                                                <option value="">Selecione para preencher...</option>
                                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} - {c.corporateName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                            <Edit3 size={16} className="text-slate-900" />
                                            <span className="text-sm font-bold text-slate-900">Variáveis do Contrato</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {Object.keys(variables).map((key) => (
                                                <div key={key} className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                                        {key.replace(/_/g, ' ')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder={`Digite...`}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-300"
                                                        value={variables[key]}
                                                        onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nome do Modelo</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Contrato Padrão 2024"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-slate-900 outline-none transition-all"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                    />
                                </div>

                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 leading-relaxed">
                                    <strong>Dica:</strong> Use variáveis entre chaves duplas para criar campos dinâmicos. <br />
                                    Ex: <code>{`{{razao_social}}`}</code>, <code>{`{{valor}}`}</code>, <code>{`{{prazo}}`}</code>.
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-200 bg-white">
                        {!isCreatingTemplate ? (
                            <button
                                disabled={!selectedTemplate || loading}
                                onClick={handleSaveContract}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Salvar Contrato</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                disabled={!newTemplateName || loading}
                                onClick={handleSaveTemplate}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Salvar Modelo</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex justify-center relative">
                    <div className="w-full max-w-4xl bg-white shadow-xl min-h-[1000px] relative animate-in fade-in zoom-in-95 duration-300 flex flex-col">

                        {isCreatingTemplate ? (
                            <div className="flex-1 flex flex-col h-full editor-container">
                                <ReactQuill
                                    theme="snow"
                                    value={newTemplateContent}
                                    onChange={setNewTemplateContent}
                                    className="flex-1 flex flex-col h-full border-none"
                                    modules={modules}
                                    formats={formats}
                                    style={{ height: '100%', fontFamily: 'Courier New' }}
                                />
                                <style>{`
                                    .ql-container { font-family: 'Courier New', monospace; font-size: 14px; }
                                    .ql-editor { min-height: 100%; padding: 4rem; }
                                    .ql-toolbar { border-top: none !important; border-left: none !important; border-right: none !important; border-bottom: 1px solid #e2e8f0 !important; background: #f8fafc; }
                                    .ql-container.ql-snow { border: none !important; }
                                `}</style>
                            </div>
                        ) : selectedTemplate ? (
                            <div className="p-16 prose max-w-none font-mono whitespace-pre-wrap text-slate-900 text-sm leading-relaxed" style={{ fontFamily: 'Courier New' }}>
                                <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <FileText size={48} className="mb-4 opacity-20" />
                                <p>Selecione um modelo para visualizar</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractGeneratorModal;
