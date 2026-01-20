
import { createClient } from '@supabase/supabase-js';

// Helper to map Asaas status to our DB status
function mapStatus(asaasStatus) {
    const map = {
        'RECEIVED': 'pago',
        'CONFIRMED': 'pendente',
        'PENDING': 'pendente',
        'OVERDUE': 'atrasado',
        'REFUNDED': 'cancelado',
        'DELETED': 'cancelado',
        'DUNNING_REQUESTED': 'atrasado',
        'DUNNING_RECEIVED': 'pago',
        'AWAITING_RISK_ANALYSIS': 'pendente'
    };
    return map[asaasStatus] || 'pendente';
}

// Helper to fetch all pages from Asaas
async function fetchAll(url, apiKey, maxPages = 10) {
    let allData = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < maxPages) {
        const separator = url.includes('?') ? '&' : '?';
        const pagedUrl = `${url}${separator}limit=${limit}&offset=${offset}`;

        const response = await fetch(pagedUrl, {
            headers: { "access_token": apiKey }
        });

        if (!response.ok) {
            console.error(`Error fetching page ${pageCount}: ${response.status}`);
            break;
        }

        const json = await response.json();
        const data = json.data || [];
        allData = allData.concat(data);

        hasMore = json.hasMore;
        offset += limit;
        pageCount++;
    }

    return allData;
}

export default async function handler(req, res) {
    // 1. CORS Configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const ASAAS_API_URL = "https://www.asaas.com/api/v3";
        const asaasApiKey = process.env.ASAAS_API_KEY;
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        const { userId } = req.body || {};

        if (!asaasApiKey || !supabaseUrl || !supabaseKey || !userId) {
            return res.status(200).json({ success: false, error: 'Configuration or UserID missing' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // --- 2. Fetch Data (Paginated) ---

        // A. Customers (To map names) - Fetching up to 500 customers for now
        const customers = await fetchAll(`${ASAAS_API_URL}/customers`, asaasApiKey, 5);
        const customersMap = new Map(customers.map(c => [c.id, c.name || c.email || 'Cliente sem nome']));

        // B. Payments (Deep history + Future)
        // Fetching payments from 12 months ago to present/future
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const payments = await fetchAll(`${ASAAS_API_URL}/payments?dateCreated[ge]=${startDate.toISOString().split('T')[0]}`, asaasApiKey, 20); // Up to 2000 payments

        // --- 3. Calculate KPIs ---

        const now = new Date();
        const next12Months = new Date();
        next12Months.setFullYear(now.getFullYear() + 1);
        const next30Days = new Date();
        next30Days.setDate(now.getDate() + 30);

        // A. MRR (Total Receivable Next 12 Months / 12)
        // Considers PENDING, CONFIRMED, OVERDUE payments due in the next 12 months.
        const futurePayments = payments.filter(p => {
            const dueDate = new Date(p.dueDate);
            return (p.status === 'PENDING' || p.status === 'CONFIRMED' || p.status === 'OVERDUE') &&
                dueDate >= now && dueDate <= next12Months;
        });
        const totalFutureRevenue = futurePayments.reduce((acc, curr) => acc + curr.value, 0);
        const mrr = totalFutureRevenue / 12;

        // B. Forecast 30d (Aguardando pagamento)
        const forecastPayments = payments.filter(p => {
            const dueDate = new Date(p.dueDate);
            return (p.status === 'PENDING' || p.status === 'CONFIRMED') &&
                dueDate >= now && dueDate <= next30Days;
        });
        const forecast = forecastPayments.reduce((acc, curr) => acc + curr.value, 0);

        // C. Overdue (All time overdue found in the fetch window)
        const overduePayments = payments.filter(p => p.status === 'OVERDUE');
        const overdueAmount = overduePayments.reduce((acc, curr) => acc + curr.value, 0);

        // D. Active Subscribers (Unique customers with at least one Sync'd payment)
        // Or accurate logic: Unique Customers who have a FUTURE payment pending?
        // Let's use 'Unique Customers in the Payment List' as a base.
        const activeSubscribers = new Set(payments.filter(p => p.status !== 'DELETED').map(p => p.customer)).size;

        // E. Ticket Médio (Average Transaction Value of VALID payments)
        const validPayments = payments.filter(p => p.status !== 'DELETED' && p.status !== 'REFUNDED');
        const avgTicket = validPayments.length > 0
            ? validPayments.reduce((acc, curr) => acc + curr.value, 0) / validPayments.length
            : 0;

        // F. Churn Rate (Mocked or simple for now)
        // We lack historical subscription state here. 
        // We will query subscriptions briefly.
        let churnRate = 0;
        try {
            const subs = await fetchAll(`${ASAAS_API_URL}/subscriptions`, asaasApiKey, 5); // Up to 500
            const totalSubs = subs.length;
            const inactiveSubs = subs.filter(s => s.status === 'INACTIVE' || s.status === 'EXPIRED').length;
            churnRate = totalSubs > 0 ? (inactiveSubs / totalSubs) * 100 : 0;
        } catch (e) {
            // Ignore sub fetch error, default 0
        }

        // --- 4. Transform Transactions for DB ---
        // Sort by Due Date descending
        payments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

        const dbTransactions = payments.map(p => {
            const customerName = customersMap.get(p.customer) || 'Cliente';
            return {
                user_id: userId,
                client_name: customerName,
                description: p.description || `Fatura ${customerName}`,
                transaction_date: p.dueDate || p.dateCreated, // Using Due Date as primary reference for financial timeline
                amount: p.value,
                status: mapStatus(p.status)
            };
        });

        // --- 5. Database Upsert ---

        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('user_id', userId);
        if (deleteError) throw deleteError;

        if (dbTransactions.length > 0) {
            const { error: insertError } = await supabase
                .from('financial_transactions')
                .insert(dbTransactions);
            if (insertError) throw insertError;
        }

        const { error: upsertError } = await supabase
            .from('financial_kpis')
            .upsert({
                user_id: userId,
                mrr: mrr,
                forecast_30d: forecast,
                overdue_amount: overdueAmount,
                active_subscribers: activeSubscribers,
                avg_ticket: avgTicket,
                churn_rate: churnRate
            }, { onConflict: 'user_id' });

        if (upsertError) throw upsertError;

        return res.status(200).json({
            success: true,
            status: "success",
            message: "Data synced refined with pagination",
            payments_found: payments.length,
            kpis: { mrr, forecast, overdueAmount }
        });

    } catch (error) {
        console.error('Vercel Sync Error:', error);
        return res.status(200).json({ success: false, error: error.message });
    }
}
