
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
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

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

        // --- 1. Fetch Local Overrides ---
        // We must know which transactions NOT to overwrite status
        const { data: localOverrides } = await supabase
            .from('financial_transactions')
            .select('asaas_id, status, description, payment_method')
            .eq('user_id', userId)
            .eq('manual_override', true);

        const overrideMap = new Map();
        if (localOverrides) {
            localOverrides.forEach(tx => {
                if (tx.asaas_id) overrideMap.set(tx.asaas_id, tx);
            });
        }

        // --- 2. Fetch Data from Asaas ---
        // Customers
        const customers = await fetchAll(`${ASAAS_API_URL}/customers`, asaasApiKey, 5); // Limit 500
        const customersMap = new Map(customers.map(c => [c.id, c.name || c.email || 'Cliente sem nome']));

        // Payments
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const payments = await fetchAll(`${ASAAS_API_URL}/payments?dateCreated[ge]=${startDate.toISOString().split('T')[0]}`, asaasApiKey, 20); // Limit 2000

        // --- 3. Transform Transactions with Smart Merge ---
        payments.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

        const dbTransactions = payments.map(p => {
            const customerName = customersMap.get(p.customer) || 'Cliente';

            // CHECK OVERRIDE
            const local = overrideMap.get(p.id);
            const useLocalStatus = local ? true : false;

            return {
                user_id: userId,
                asaas_id: p.id, // VITAL for Upsert matching
                client_name: customerName,
                // Only overwrite description if not overridden? Ideally keep Asaas desc unless we want local custom desc. 
                // Let's stick to Asaas description unless mapped otherwise, but for status we strictly check.
                description: p.description || `Fatura ${customerName}`,
                transaction_date: p.dueDate || p.dateCreated,
                amount: p.value,
                // If local override exists, keep local status. Else map from Asaas.
                status: useLocalStatus && local.status ? local.status : mapStatus(p.status),
                manual_override: useLocalStatus ? true : false, // Persist or set
                payment_method: useLocalStatus && local.payment_method ? local.payment_method : (p.billingType || 'BOLETO')
            };
        });

        // --- 4. Database Upsert (Instead of Delete+Insert) ---
        // Using onConflict: 'asaas_id' to update existing records
        if (dbTransactions.length > 0) {
            const { error: upsertError } = await supabase
                .from('financial_transactions')
                .upsert(dbTransactions, {
                    onConflict: 'asaas_id',
                    ignoreDuplicates: false
                });

            if (upsertError) throw upsertError;
        }

        // --- 5. Calculate KPIs (Recalculate based on the MERGED data) ---
        // We technically need to re-query DB or use mapped array. 
        // Using `dbTransactions` array is safe as it represents the End State.

        const now = new Date();
        const next12Months = new Date();
        next12Months.setFullYear(now.getFullYear() + 1);
        const next30Days = new Date();
        next30Days.setDate(now.getDate() + 30);

        // MRR
        const futurePayments = dbTransactions.filter(p => {
            const dueDate = new Date(p.transaction_date); // using transaction_date as due date proxy
            return (p.status === 'pendente' || p.status === 'atrasado') && // Removed 'pago' from MRR future projection? No, MRR includes confirmed future revenue. 
                dueDate >= now && dueDate <= next12Months;
        });
        // Use original array for MRR logic? No, use mapped statuses.
        // Actually MRR should be "Contracted Value".
        // Let's stick to previous logic: Sum Future / 12.
        const totalFutureRevenue = futurePayments.reduce((acc, curr) => acc + curr.amount, 0);
        const mrr = totalFutureRevenue / 12;

        // Forecast 30d
        const forecast = dbTransactions
            .filter(p => p.status === 'pendente' && new Date(p.transaction_date) <= next30Days && new Date(p.transaction_date) >= now)
            .reduce((acc, curr) => acc + curr.amount, 0);

        // Overdue
        const overdueAmount = dbTransactions
            .filter(p => p.status === 'atrasado')
            .reduce((acc, curr) => acc + curr.amount, 0);

        // Active Subscribers (Unique Clients in list)
        const activeSubscribers = new Set(dbTransactions.map(p => p.client_name)).size;

        // Avg Ticket (of Paid)
        const paidTx = dbTransactions.filter(p => p.status === 'pago');
        const avgTicket = paidTx.length > 0
            ? paidTx.reduce((acc, curr) => acc + curr.amount, 0) / paidTx.length
            : 0;

        // Churn (Mock/Simple)
        let churnRate = 0; // Default

        // Upsert KPIs
        const { error: kpiError } = await supabase
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

        if (kpiError) throw kpiError;

        return res.status(200).json({
            success: true,
            status: "success",
            message: "Sync with Manual Overrides completed",
            transactions_processed: dbTransactions.length
        });

    } catch (error) {
        console.error('Vercel Sync Error:', error);
        return res.status(200).json({ success: false, error: error.message });
    }
}
