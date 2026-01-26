import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ContractTemplate, Contract, Client } from '../types';
import { X, Save, FileText, ChevronRight, UserCheck, ArrowLeft, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Highlighter, Palette, Plus, Trash2, Edit2, Image as ImageIcon, Minus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { EditorContent, useEditor, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { ResizableImage } from './ResizableImage';

// Simple Error Boundary to catch crashes
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <div className="bg-slate-900 text-[#ffd700] p-4 rounded-lg mb-4">
                        <h3 className="font-bold mb-2">Algo deu errado no editor</h3>
                        <pre className="text-xs text-left overflow-auto max-h-40">{this.state.error?.message}</pre>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

interface ContractGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contractToEdit?: Contract | null;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 flex-wrap sticky top-0 z-10">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Negrito"
            >
                <Bold size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Itálico"
            >
                <Italic size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Sublinhado"
            >
                <Underline size={16} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Alinhar à Esquerda"
            >
                <AlignLeft size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Centralizar"
            >
                <AlignCenter size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Alinhar à Direita"
            >
                <AlignRight size={16} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('highlight') ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Marca-texto"
            >
                <Highlighter size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().setFontFamily('Courier New').run()}
                className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('textStyle', { fontFamily: 'Courier New' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                title="Fonte Courier New (Padrão Contrato)"
            >
                <Type size={16} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button
                onClick={() => document.getElementById('logo-upload')?.click()}
                className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-500"
                title="Inserir Logo / Imagem"
            >
                <ImageIcon size={16} />
            </button>
            <button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-500"
                title="Linha Horizontal"
            >
                <Minus size={16} />
            </button>

            {editor.isActive('image') && (
                <>
                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                    <button
                        onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()}
                        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.getAttributes('image').align === 'left' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                        title="Alinhar à Esquerda"
                    >
                        <AlignLeft size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
                        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.getAttributes('image').align === 'center' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                        title="Centralizar"
                    >
                        <AlignCenter size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()}
                        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.getAttributes('image').align === 'right' ? 'bg-slate-200 text-slate-900' : 'text-slate-500'}`}
                        title="Alinhar à Direita"
                    >
                        <AlignRight size={16} />
                    </button>
                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                    <button
                        onClick={() => editor.chain().focus().deleteSelection().run()}
                        className="p-2 rounded hover:bg-rose-100 transition-colors text-rose-500"
                        title="Remover Imagem"
                    >
                        <Trash2 size={16} />
                    </button>
                </>
            )}
        </div>
    );
};

const ContractGeneratorModal: React.FC<ContractGeneratorModalProps> = ({ isOpen, onClose, onSuccess, contractToEdit }) => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    // Variables definition
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

    const editor = useEditor({
        extensions: [
            StarterKit,

            UnderlineExtension,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            FontFamily,
            Color,
            Highlight,
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        width: {
                            default: '100%',
                            renderHTML: attributes => ({
                                width: attributes.width,
                                style: `width: ${attributes.width}`,
                            }),
                        },
                        align: {
                            default: 'left',
                            renderHTML: attributes => ({
                                align: attributes.align,
                            }),
                        },
                    };
                },
                addNodeView() {
                    return ReactNodeViewRenderer(ResizableImage);
                },
            }).configure({
                inline: true,
                allowBase64: true,
            }),
        ],
        content: '<p><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</strong></p><p><br></p><p>CONTRATANTE: {{razao_social}}, CNPJ: {{cnpj}}...</p>',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[500px] pt-8 px-8 pb-[40mm] font-mono',
                style: 'font-family: "Courier New", Courier, monospace;',
            },
        },
    });


    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
            fetchClients();
            if (contractToEdit) {
                // Edit Mode Setup
                setIsCreatingTemplate(true); // Reuse the editor UI
                setVariables(contractToEdit.variables || {});
                if (editor) {
                    editor.commands.setContent(contractToEdit.content_snapshot);
                }
            } else {
                resetState();
            }
        }
    }, [isOpen, contractToEdit]); // Added contractToEdit dependency

    useEffect(() => {
        if (contractToEdit && editor && isOpen) {
            // Ensure content is loaded when editor becomes ready involved in edit mode
            if (editor.isEmpty) {
                editor.commands.setContent(contractToEdit.content_snapshot);
            }
        }
    }, [editor, contractToEdit, isOpen]);

    useEffect(() => {
        if (selectedTemplate && !isCreatingTemplate && !contractToEdit) {
            updatePreview();
        }
    }, [selectedTemplate, variables, isCreatingTemplate, contractToEdit]);

    // Update editor content when switching to create mode
    useEffect(() => {
        if (isCreatingTemplate && editor) {
            if (!newTemplateName) {
                editor.commands.setContent('<p><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</strong></p><p><br></p><p>CONTRATANTE: {{razao_social}}, CNPJ: {{cnpj}}...</p>');
            }
        }
    }, [isCreatingTemplate, editor]);

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
        // editor content reset is handled by effect
    };

    const fetchTemplates = async () => {
        try {
            const { data } = await supabase
                .from('contract_templates')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
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
            cep: client.zipCode || '',
            cidade: client.city || '',
            bairro: client.neighborhood || '',
            email: client.email || '',
            responsavel: client.contactPerson || client.name,
            servicos: client.defaultServices || '',
            prazo: client.defaultTerm || '',
            valor_total: client.defaultValue || '',
            forma_pagamento: client.defaultPaymentMethod || '',
            condicoes_pagamento: client.defaultPaymentConditions || '',
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
        setLoading(true);

        try {
            if (contractToEdit) {
                // Update existing contract
                const content = editor?.getHTML() || '';
                const { error } = await supabase.from('contracts').update({
                    content_snapshot: content,
                    variables: variables,
                    // We might want to allow updating status or other fields too
                }).eq('id', contractToEdit.id);

                if (error) throw error;
            } else {
                // Create new contract
                if (!selectedTemplate) return;
                const { error } = await supabase.from('contracts').insert({
                    user_id: user?.id,
                    template_id: selectedTemplate.id,
                    client_name: variables.razao_social || 'Cliente Sem Nome',
                    status: 'generated',
                    variables: variables,
                    content_snapshot: previewContent
                });
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving contract:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!newTemplateName || !editor) return;
        const content = editor.getHTML();
        if (!content) return;

        setLoading(true);

        try {
            if (selectedTemplate) {
                // Update existing
                const { data, error } = await supabase.from('contract_templates')
                    .update({
                        name: newTemplateName,
                        content: content
                    })
                    .eq('id', selectedTemplate.id)
                    .select().single();

                if (error) throw error;

                // Update in list
                setTemplates(templates.map(t => t.id === selectedTemplate.id ? data : t));
                setSelectedTemplate(data);
                setIsCreatingTemplate(false);

            } else {
                // Create new
                const { data, error } = await supabase.from('contract_templates').insert({
                    user_id: user?.id,
                    name: newTemplateName,
                    content: content
                }).select().single();

                if (error) throw error;

                setTemplates([data, ...templates]);
                setIsCreatingTemplate(false);
                setSelectedTemplate(data);
            }
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setLoading(false);
        }
    };

    const insertVariable = (key: string) => {
        if (editor) {
            editor.chain().focus().insertContent(`{{${key}}}`).run();
        }
    };

    const imgInputRef = React.useRef<HTMLInputElement>(null);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !editor) return;
        const file = e.target.files[0];

        try {
            setLoading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('contract-assets')
                .upload(fileName, file);

            if (uploadError) {
                // Try to see if it's a bucket doesn't exist error (sometimes 404)
                if (uploadError.message.includes('bucket')) {
                    alert('Erro: Bucket de armazenamento "contract-assets" não encontrado. Contate o administrador.');
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('contract-assets')
                .getPublicUrl(fileName);

            editor.chain().focus().setImage({ src: publicUrl }).run();

        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Falha ao fazer upload da logo.');
        } finally {
            setLoading(false);
            if (imgInputRef.current) imgInputRef.current.value = '';
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

                {/* Sidebar */}
                <div className="w-[350px] border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
                    <div className="p-6 border-b border-slate-200">
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
                            {contractToEdit ? 'Editar Contrato' : isCreatingTemplate ? 'Novo Modelo' : 'Novo Contrato'}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {!isCreatingTemplate ? (
                            <>
                                {/* Selection Mode */}
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

                                    {selectedTemplate && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setNewTemplateName(selectedTemplate.name);
                                                    if (editor) {
                                                        editor.commands.setContent(selectedTemplate.content);
                                                    }
                                                    setIsCreatingTemplate(true);
                                                    // We implicitly track we are editing 'selectedTemplate' because it's set
                                                }}
                                                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Edit2 size={14} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
                                                    setLoading(true);
                                                    try {
                                                        const { error } = await supabase.from('contract_templates').delete().eq('id', selectedTemplate.id);
                                                        if (error) throw error;

                                                        // Update list
                                                        setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
                                                        setSelectedTemplate(null);
                                                    } catch (err) {
                                                        console.error('Error deleting template:', err);
                                                        alert('Erro ao excluir modelo');
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                                className="flex-1 py-2 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                Excluir
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setSelectedTemplate(null);
                                            // Reset editor content for new clean slate
                                            if (editor) {
                                                editor.commands.setContent('<p><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</strong></p><p><br></p><p>CONTRATANTE: {{razao_social}}, CNPJ: {{cnpj}}...</p>');
                                            }
                                            setNewTemplateName('');
                                            setIsCreatingTemplate(true);
                                        }}
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
                            // Creation Mode Sidebar - Variables
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

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">Variáveis Disponíveis</label>
                                    <p className="text-xs text-slate-400 mb-4">Clique para inserir no cursor.</p>

                                    <div className="grid grid-cols-1 gap-2">
                                        {Object.keys(variables).map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => insertVariable(key)}
                                                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all group text-left"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                        <FileText size={12} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-900 font-mono">
                                                        {`{{${key}}}`}
                                                    </span>
                                                </div>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-200 bg-white">
                        {!isCreatingTemplate || contractToEdit ? (
                            <button
                                disabled={(!selectedTemplate && !contractToEdit) || loading}
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
                            <div className="flex-1 flex flex-col h-full">
                                <MenuBar editor={editor} />
                                <EditorContent editor={editor} className="flex-1" />
                            </div>
                        ) : selectedTemplate ? (
                            <div className="pt-16 px-16 pb-[40mm] prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none font-mono whitespace-pre-wrap text-slate-900 leading-relaxed" style={{ fontFamily: 'Courier New' }}>
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

            <input
                type="file"
                id="logo-upload"
                className="hidden"
                accept="image/*"
                ref={imgInputRef}
                onChange={handleLogoUpload}
            />
        </div>
    );
};

export default ContractGeneratorModal;
