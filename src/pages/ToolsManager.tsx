import React, { useState } from 'react';
import ToolHeader from '../components/tools/ToolHeader';
import ToolList, { ToolItem } from '../components/tools/ToolList';
import { Smartphone, RefreshCw } from 'lucide-react';

const TOOLS_DATA: ToolItem[] = [
    {
        id: 'whatsapp-verifier',
        name: 'Verificador de WhatsApp',
        description: 'Valide números de telefone para saber se possuem WhatsApp ativo.',
        status: 'active',
        path: '/tools/whatsapp-verifier',
        icon: <Smartphone size={20} />
    },
    {
        id: 'contact-synchronizer',
        name: 'Sincronizador de Contatos',
        description: 'Importe os contatos do WhatsApp diretamente para uma pasta dentro da Nexus.',
        status: 'active',
        path: '/tools/contact-synchronizer',
        icon: <RefreshCw size={20} />
    }
];

const ToolsManager: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="space-y-8 pb-20">
            <ToolHeader />

            <ToolList
                tools={TOOLS_DATA}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
        </div>
    );
};

export default ToolsManager;
