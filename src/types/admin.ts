export interface FinancialKPIs {
    mrr: number;
    mrr_growth_percent: number;
    forecast_30d: number;
    overdue_amount: number;
    avg_ticket: number;
    active_subscribers: number;
    churn_rate: number;
    churn_growth_percent: number;
    expenses?: number;
    balance?: number;
}

export interface Transaction {
    id: string;
    client_name: string;
    description: string;
    transaction_date: string;
    amount: number;
    status: 'pago' | 'pendente' | 'atrasado' | 'cancelado';
    manual_override?: boolean;
    payment_method?: string;
    category?: 'profissional';
}

export type DateRange = 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'nextMonth' | 'all' | 'custom';
