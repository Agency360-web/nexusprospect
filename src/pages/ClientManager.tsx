import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { ClientWithStats } from '../types/clients';

// Modular Components
import ClientHeader from '../components/clients/ClientHeader';
import ClientList from '../components/clients/ClientList';
import ClientFormModal from '../components/clients/ClientFormModal';

const ClientManager: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState<ClientWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
    const [activeMenuClientId, setActiveMenuClientId] = useState<string | null>(null);
    const [createLoading, setCreateLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    useEffect(() => {
        if (user) {
            fetchClients();
        }
    }, [user]);

    const fetchClients = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const clientsWithStats = (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                corporateName: c.corporate_name,
                cnpj: c.cnpj,
                status: c.status,
                createdAt: c.created_at,
                email: c.email || '',
                phone: c.phone || '',
                contactPerson: c.contact_person,
                address: c.address,
                zipCode: c.zip_code,
                neighborhood: c.neighborhood,
                city: c.city,
                state: c.state,
                defaultServices: c.default_services,
                defaultTerm: c.default_term,
                defaultValue: c.default_value,
                defaultPaymentMethod: c.default_payment_method,
                defaultPaymentConditions: c.default_payment_conditions,
                observations: c.observations || '',
                onlineNumbers: 0,
                totalNumbers: 0
            }));

            setClients(clientsWithStats);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setModalMode('create');
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (e: React.MouseEvent, client: ClientWithStats) => {
        e.stopPropagation();
        setModalMode('edit');
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleDeleteClient = async (e: React.MouseEvent, clientId: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este cliente? Todas as campanhas, leads e configurações serão perdidas.')) return;

        try {
            setLoading(true);
            const { error } = await supabase.from('clients').delete().eq('id', clientId);
            if (error) throw error;
            fetchClients();
        } catch (err) {
            console.error('Error deleting client:', err);
            alert('Erro ao excluir cliente.');
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (formData: any) => {
        if (!formData.name || !user) return;

        setCreateLoading(true);
        try {
            const clientPayload = {
                name: formData.name,
                corporate_name: formData.corporateName,
                cnpj: formData.cnpj,
                email: formData.email,
                phone: formData.phone,
                contact_person: formData.contactPerson,
                zip_code: formData.zipCode,
                address: formData.address,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state,
                default_services: formData.defaultServices,
                default_term: formData.defaultTerm,
                default_value: formData.defaultValue,
                default_payment_method: formData.defaultPaymentMethod,
                default_payment_conditions: formData.defaultPaymentConditions,
                observations: formData.observations,
            };

            if (modalMode === 'create') {
                const { error } = await supabase.from('clients').insert({
                    ...clientPayload,
                    status: 'active',
                    user_id: user.id
                });
                if (error) throw error;
            } else if (modalMode === 'edit' && editingClient) {
                const { error } = await supabase.from('clients').update(clientPayload).eq('id', editingClient.id);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchClients();
        } catch (err) {
            console.error('Error saving client:', err);
            alert('Erro ao salvar cliente.');
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            <ClientHeader onNewClient={handleOpenCreate} />

            <ClientFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleFormSubmit}
                mode={modalMode}
                initialData={editingClient}
                loading={createLoading}
            />

            <ClientList
                clients={clients}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteClient}
                activeMenuClientId={activeMenuClientId}
                setActiveMenuClientId={setActiveMenuClientId}
            />
        </div>
    );
};

export default ClientManager;
