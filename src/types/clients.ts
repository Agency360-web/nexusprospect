import { Client } from './index';

export interface ClientWithStats extends Client {
    onlineNumbers: number;
    totalNumbers: number;
}
