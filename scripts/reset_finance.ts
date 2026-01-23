
import { supabase } from '../lib/supabase';

async function resetFinanceData() {
    console.log('Iniciando limpeza de dados financeiros...');

    try {
        // 1. Delete Transactions
        const { error: trxError, count: trxCount } = await supabase
            .from('financial_transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq a dummy UUID)

        if (trxError) throw trxError;
        console.log(`Transações excluídas.`);

        // 2. Delete KPIs
        const { error: kpiError } = await supabase
            .from('financial_kpis')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (kpiError) throw kpiError;
        console.log(`KPIs excluídos.`);

        console.log('Dados financeiros resetados com sucesso!');
    } catch (error) {
        console.error('Erro ao resetar dados:', error);
    }
}

resetFinanceData();
