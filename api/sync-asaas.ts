
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
        // Use logic to pick up Vite env vars if standard ones aren't set (Vercel sometimes exposes VITE_ prefixed ones if configured in project)
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        // Get userId from Body (passed by frontend)
        const { userId } = req.body || {};

        if (!asaasApiKey) {
            return res.status(200).json({ success: false, error: 'ASAAS_API_KEY not configured' });
        }
        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).json({ success: false, error: 'Supabase credentials missing' });
        }
        if (!userId) {
            return res.status(200).json({ success: false, error: 'User ID is required for sync' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Fetch data from Asaas (Payments)
        // Fetching payments from the beginning of the current year (or a reasonable window)
        // Use limit=100 to get a good chunk. For production, pagination loop is needed.
        const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const paymentsResponse = await fetch(`${ASAAS_API_URL}/payments?limit=100&dateCreated[ge]=${startDate}`, {
            headers: { "access_token": asaasApiKey }
        });

        if (!paymentsResponse.ok) {
            const errorText = await paymentsResponse.text();
            throw new Error(`Asaas API Error: ${paymentsResponse.status} - ${errorText}`);
        }

        const paymentsData = await paymentsResponse.json();
        const payments = paymentsData.data || [];

        // 3. Transform Data
        const dbTransactions = payments.map(p => ({
            user_id: userId,
            client_name: p.customer, // In Asaas this is ID, ideally we fetch customer name, but for now ID or we map later.
            // Note: Optimally we would fetch /customers to map ID to Name, or just use the ID if that's what we have.
            // Let's check if 'p.customer' is the ID. Yes. 
            // We can leave it as ID for now or try to fetch. Fetched 'customer' object might be expanded? No, usually separate.
            // For MVP speed, we'll prefix "Cliente " + ID or just leave blank/ID.
            // Better: use description or "Venda Asaas".
            description: p.description || `Pagamento Asaas ${p.installmentNumber || ''}`,
            transaction_date: p.paymentDate || p.dateCreated, // paymentDate is when it was paid (for paid ones), dateCreated for others.
            amount: p.value,
            status: mapStatus(p.status)
        }));

        // 4. Calculate KPIs
        const totalRevenue = payments
            .filter(p => p.status === 'RECEIVED' || p.status === 'DUNNING_RECEIVED')
            .reduce((acc, curr) => acc + curr.value, 0);

        const overdueAmount = payments
            .filter(p => p.status === 'OVERDUE')
            .reduce((acc, curr) => acc + curr.value, 0);

        const uniqueCustomers = new Set(payments.map(p => p.customer));
        const activeSubscribers = uniqueCustomers.size; // Approximation

        const avgTicket = activeSubscribers > 0 ? totalRevenue / payments.filter(p => p.status === 'RECEIVED').length : 0; // Avg per transaction
        // or Total / Subscribers (ARPU)? "Ticket Médio" usually means per transaction.
        // Let's allow safe division.
        const paidCount = payments.filter(p => p.status === 'RECEIVED').length;
        const realAvgTicket = paidCount > 0 ? totalRevenue / paidCount : 0;

        // MRR Approximation: If we assume all these are monthly... 
        // Better: Sum of 'RECEIVED' in LAST 30 DAYS.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const mrr = payments
            .filter(p => (p.status === 'RECEIVED' || p.status === 'CONFIRMED') && new Date(p.dateCreated) > thirtyDaysAgo)
            .reduce((acc, curr) => acc + curr.value, 0);

        const forecast = payments
            .filter(p => (p.status === 'PENDING' || p.status === 'CONFIRMED' || p.status === 'OVERDUE') && new Date(p.dueDate) > new Date())
            .reduce((acc, curr) => acc + curr.value, 0);


        // 5. Database Updates

        // A. Clear old transactions for this user (Simple Sync Strategy)
        // We delete all transactions that look like Asaas imports (or all to be safe for this view)?
        // Risky if they manually added some. 
        // We'll trust the User wants this View to be Asaas-mirrored.
        const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // B. Insert new transactions
        if (dbTransactions.length > 0) {
            const { error: insertError } = await supabase
                .from('financial_transactions')
                .insert(dbTransactions);

            if (insertError) throw insertError;
        }

        // C. Update KPIs
        const { error: upsertError } = await supabase
            .from('financial_kpis')
            .upsert({
                user_id: userId,
                mrr: mrr,
                forecast_30d: forecast,
                overdue_amount: overdueAmount,
                active_subscribers: activeSubscribers,
                avg_ticket: realAvgTicket,
                // churn_rate: 0 // Keep existing or calc
            }, { onConflict: 'user_id' });

        if (upsertError) throw upsertError;

        return res.status(200).json({
            success: true,
            status: "success",
            message: "Data synced successfully",
            payments_found: payments.length,
            kpis: {
                mrr,
                forecast,
                overdueAmount
            }
        });

    } catch (error) {
        console.error('Vercel Sync Error:', error);
        return res.status(200).json({
            success: false,
            error: error.message
        });
    }
}
