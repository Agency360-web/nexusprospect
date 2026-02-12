import React from 'react';
import { Client } from '../../types';
import ContractCard from './ContractCard';
import TasksWidget from './TasksWidget';
import MeetingsWidget from './MeetingsWidget';
import NotesWidget from './NotesWidget';
import ComplaintsWidget from './ComplaintsWidget';

interface ClientOverviewProps {
    client: Client;
    onUpdate: () => void;
}

const ClientOverview: React.FC<ClientOverviewProps> = ({ client, onUpdate }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Contract & Tasks */}
                <div className="space-y-6">
                    <ContractCard client={client} onUpdate={onUpdate} />
                    <TasksWidget clientId={client.id} />
                </div>

                {/* Middle Column: Meetings & Complaints */}
                <div className="space-y-6">
                    <MeetingsWidget clientId={client.id} />
                    <ComplaintsWidget clientId={client.id} />
                </div>

                {/* Right Column: Notes */}
                <div className="space-y-6">
                    <NotesWidget clientId={client.id} />
                </div>
            </div>
        </div>
    );
};

export default ClientOverview;
