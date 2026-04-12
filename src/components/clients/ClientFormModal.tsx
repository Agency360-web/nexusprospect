import React, { useState, useEffect } from 'react';
import {
    Building2,
    ShieldCheck,
    Mail,
    Phone,
    User,
    MapPin,
    FileText,
    ClipboardList,
    Clock,
    DollarSign,
    CreditCard,
    Loader2,
    Plus
} from 'lucide-react';
import Modal from '../ui/Modal';
import { ClientWithStats } from '../../types/clients';

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: any) => Promise<void>;
    mode: 'create' | 'edit';
    initialData: ClientWithStats | null;
    loading: boolean;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    mode,
    initialData,
    loading
}) => {
    const [formData, setFormData] = useState({
        name: '',
        corporateName: '',
        cnpj: '',
        email: '',
        phone: '',
        contactPerson: '',
        zipCode: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        defaultServices: '',
        defaultTerm: '',
        defaultValue: '',
        defaultPaymentMethod: '',
        defaultPaymentConditions: '',
        observations: ''
    });

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setFormData({
                name: initialData.name,
                corporateName: initialData.corporateName || '',
                cnpj: initialData.cnpj || '',
                email: initialData.email,
                phone: initialData.phone || '',
                contactPerson: initialData.contactPerson || '',
                zipCode: initialData.zipCode || '',
                address: initialData.address || '',
                neighborhood: initialData.neighborhood || '',
                city: initialData.city || '',
                state: initialData.state || '',
                defaultServices: initialData.defaultServices || '',
                defaultTerm: initialData.defaultTerm || '',
                defaultValue: initialData.defaultValue || '',
                defaultPaymentMethod: initialData.defaultPaymentMethod || '',
                defaultPaymentConditions: initialData.defaultPaymentConditions || '',
                observations: initialData.observations || ''
            });
        } else {
            setFormData({
                name: '', corporateName: '', cnpj: '', email: '', phone: '', contactPerson: '',
                zipCode: '', address: '', neighborhood: '', city: '', state: '',
                defaultServices: '', defaultTerm: '', defaultValue: '', defaultPaymentMethod: '', defaultPaymentConditions: '',
                observations: ''
            });
        }
    }, [mode, initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'create' ? "Novo Cliente" : "Editar Cliente"}
            size="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Company Info */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Building2 size={18} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dados da Empresa</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="client-name" className="text-[13px] font-bold text-slate-600 ml-1">Nome Fantasia (Interno)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Building2 size={16} />
                                </div>
                                <input
                                    id="client-name"
                                    type="text"
                                    placeholder="Ex: Tech Solutions"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="corporate-name" className="text-[13px] font-bold text-slate-600 ml-1">Razão Social</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Building2 size={16} />
                                </div>
                                <input
                                    id="corporate-name"
                                    type="text"
                                    placeholder="Ex: Tech Solutions Ltda"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={formData.corporateName}
                                    onChange={e => setFormData({ ...formData, corporateName: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">CNPJ</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <ShieldCheck size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="00.000.000/0001-00"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={formData.cnpj}
                                    onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">E-mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="contato@empresa.com"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Telefone / WhatsApp</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Phone size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="(11) 99999-9999"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-slate-600 ml-1">Nome do Responsável</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <User size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Quem assina o contrato?"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                value={formData.contactPerson}
                                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Address */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <MapPin size={18} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Endereço Completo</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2 md:col-span-1">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">CEP</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                    <MapPin size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="00000-000"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                    value={formData.zipCode}
                                    onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Endereço (Rua, Número, Comp)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                    <MapPin size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Av. Paulista, 1000 - Cj 10"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Bairro</label>
                            <input
                                type="text"
                                placeholder="Bairro"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                value={formData.neighborhood}
                                onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Cidade</label>
                            <input
                                type="text"
                                placeholder="Cidade"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Estado</label>
                            <input
                                type="text"
                                placeholder="UF"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                value={formData.state}
                                onChange={e => setFormData({ ...formData, state: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Contract Defaults */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <FileText size={18} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dados Padrão do Contrato</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-slate-600 ml-1">Serviços Contratados</label>
                        <div className="relative group">
                            <div className="absolute top-3 left-4 pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                                <ClipboardList size={16} />
                            </div>
                            <textarea
                                placeholder="Descrição resumida dos serviços..."
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all min-h-[80px]"
                                value={formData.defaultServices}
                                onChange={e => setFormData({ ...formData, defaultServices: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Prazo do Contrato</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                                    <Clock size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ex: 12 meses"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                    value={formData.defaultTerm}
                                    onChange={e => setFormData({ ...formData, defaultTerm: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Valor Total</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                                    <DollarSign size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ex: R$ 5.000,00"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                    value={formData.defaultValue}
                                    onChange={e => setFormData({ ...formData, defaultValue: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Forma de Pagamento</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                                    <CreditCard size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ex: Boleto Bancário"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                    value={formData.defaultPaymentMethod}
                                    onChange={e => setFormData({ ...formData, defaultPaymentMethod: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-slate-600 ml-1">Condições de Pagamento</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                                    <ClipboardList size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ex: Dia 10 de cada mês"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                    value={formData.defaultPaymentConditions}
                                    onChange={e => setFormData({ ...formData, defaultPaymentConditions: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Obs */}
                <div className="space-y-3 pt-2">
                    <label className="text-[13px] font-bold text-slate-600 ml-1 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        Observações Gerais
                    </label>
                    <textarea
                        placeholder="Notas internas sobre o cliente..."
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all min-h-[100px]"
                        value={formData.observations}
                        onChange={e => setFormData({ ...formData, observations: e.target.value })}
                    />
                </div>

                <div className="pt-6 flex justify-end items-center gap-4 sticky bottom-0 bg-white py-4 border-t border-slate-100 -mx-6 px-6 z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        <span>{mode === 'create' ? 'Criar Cliente' : 'Salvar Alterações'}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ClientFormModal;
