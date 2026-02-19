
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Settings,
  Plus,
  CheckCircle2,
  Trash2,
  MoreVertical,
  Key,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
} from 'lucide-react';
import { Client, OperationalCost } from '../types';
import ClientCredentials from '../components/ClientCredentials';
import { supabase } from '../services/supabase';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

// Interface locally defined for Financial Transactions
interface Transaction {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: number;
  description: string;
  category: string;
  status: 'pendente' | 'pago' | 'atrasado';
  client_name?: string;
  payment_method?: string;
  created_at?: string;
}

const ClientDetail: React.FC = () => {
  const { user } = useAuth();
  const { clientId } = useParams();
  const [activeTab, setActiveTab] = useState<'credentials' | 'costs'>('costs');
  const [copied, setCopied] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [costs, setCosts] = useState<OperationalCost[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<Transaction[]>([]);

  // Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'success' | 'client-config' | 'cost'>('none');
  const [modalLoading, setModalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Client Config State
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    observations: '',
    cnpj: '',
    corporateName: '',
    address: '',
    status: 'active' as Client['status']
  });

  // Costs State
  const [newCost, setNewCost] = useState({ description: '', category: 'Infrastructure', value: '', date: new Date().toISOString().split('T')[0] });
  const [costFilterMonth, setCostFilterMonth] = useState(new Date().getMonth());

  const [costFilterYear, setCostFilterYear] = useState(new Date().getFullYear());






  const handleCreateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('operational_costs').insert({
        client_id: clientId,
        description: newCost.description,
        category: newCost.category,
        value: parseFloat(newCost.value.replace('R$', '').replace('.', '').replace(',', '.').trim()),
        date: newCost.date
      });

      if (error) throw error;

      setActiveModal('none');
      setNewCost({ description: '', category: 'Infrastructure', value: '', date: new Date().toISOString().split('T')[0] });
      setSuccessMessage('Custo adicionado com sucesso!');
      setActiveModal('success');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar custo');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm('Excluir este custo?')) return;
    try {
      const { error } = await supabase.from('operational_costs').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir custo');
    }
  };

  const handleOpenClientConfig = () => {
    if (!client) return;
    setClientForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      observations: client.observations || '',
      cnpj: client.cnpj || '',
      corporateName: client.corporateName || '',
      address: client.address || '',
      status: client.status || 'active'
    });
    setActiveModal('client-config');
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('clients').update({
        name: clientForm.name,
        email: clientForm.email,
        phone: clientForm.phone,
        observations: clientForm.observations,
        cnpj: clientForm.cnpj,
        corporate_name: clientForm.corporateName,
        address: clientForm.address,
        status: clientForm.status
      }).eq('id', clientId);

      if (error) throw error;
      setActiveModal('none');
      fetchData(); // Refresh all data
    } catch (err) { console.error(err); alert('Erro ao atualizar cliente'); }
    finally { setModalLoading(false); }
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };



  useEffect(() => {
    if (clientId) {
      console.log('useEffect triggered. clientId:', clientId, 'user:', user?.id);
      fetchData();
    }
  }, [clientId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('fetchData started. User:', user?.id);

      // 1. Fetch Client Info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) console.error('Error fetching client:', clientError);

      if (clientData) {
        setClient({
          id: clientData.id,
          name: clientData.name,
          status: clientData.status,
          createdAt: clientData.created_at,
          email: clientData.email,
          phone: clientData.phone,
          observations: clientData.observations,
          cnpj: clientData.cnpj,
          corporateName: clientData.corporate_name,
          address: clientData.address,

        });
      }



      // 6. Fetch Costs
      const { data: costsData } = await supabase
        .from('operational_costs')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });



      if (costsData) {
        setCosts(costsData.map((c: any) => ({
          id: c.id,
          clientId: c.client_id,
          description: c.description,
          category: c.category,
          value: c.value,
          date: c.date,
          createdAt: c.created_at
        })));
      }

      // 7. Fetch Financial Transactions (for dynamic revenue)
      if (user?.id) {
        const { data: trxData } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('user_id', user.id);

        if (trxData) {
          // We store all transactions for this user, filtering happens in render
          // This is efficient enough for now as transaction count per user isn't huge
          // Alternatively, we could filter by client_name here if strictly needed, 
          // but client name might not always match perfectly if edited, so getting all allows soft matching if needed later.
          // For this implementation, we will trust client_name matches.
          setFinancialTransactions(trxData.map((t: any) => ({
            id: t.id,
            user_id: t.user_id,
            transaction_date: t.transaction_date,
            amount: t.amount,
            description: t.description,
            category: t.category,
            status: t.status,
            client_name: t.client_name,
            payment_method: t.payment_method,
            created_at: t.created_at
          })));
        }
      }

      // Update stats based on fetched data


    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all shrink-0 ${activeTab === id
        ? 'border-slate-900 text-slate-900 font-bold'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
        }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;
  }

  if (!client) {
    return <div>Cliente não encontrado</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <Link to="/clients" className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-600 shadow-sm shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
              <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono uppercase tracking-widest shrink-0">ID: {clientId?.substring(0, 8)}...</span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 truncate">Gestão de ambiente isolado e audiência</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleOpenClientConfig}
            className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Settings size={16} />
            <span>Configurar</span>
          </button>

        </div>
      </div>

      {/* Tabs Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-16 lg:top-0 z-20 flex px-2 overflow-x-auto no-scrollbar rounded-t-3xl">

        <TabButton id="credentials" label="Acessos" icon={Key} />
        <TabButton id="costs" label="Custos" icon={DollarSign} />
      </div>

      <div className="pt-4">





        {/* Sidebar */}






        {activeTab === 'credentials' && (
          <ClientCredentials clientId={clientId!} />
        )}

        {activeTab === 'costs' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Financial Calculations */}
            {(() => {
              const currentMonthRevenue = financialTransactions
                .filter(t => {
                  // Métodos de Normalização
                  const normalize = (s: string) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const getDigits = (s: string) => (s || '').replace(/\D/g, '');

                  const tClientName = normalize(t.client_name);
                  const tDigits = getDigits(t.client_name || ''); // Use only client_name for now, description can be ambiguous

                  const clientName = normalize(client?.name);
                  const corporateName = normalize(client?.corporateName);
                  const clientDocument = getDigits(client?.cnpj); // Pode ser CPF ou CNPJ

                  // 1. Busca por Documento (Prioritária)
                  // Verifica se os dígitos do documento do cliente estão presentes nos dígitos da transação
                  // Exigimos pelo menos 11 dígitos (CPF) para evitar falsos positivos
                  // Se tDigits for maior que 3 mas for igual a clientDocument, match
                  const hasDocumentMatch = clientDocument.length >= 11 && tDigits.includes(clientDocument);

                  // 2. Busca por Nome (Secundária)
                  const hasNameMatch =
                    tClientName === clientName ||
                    (corporateName && tClientName === corporateName) ||
                    (clientName.length > 3 && tClientName.includes(clientName)) ||
                    (corporateName && corporateName.length > 3 && tClientName.includes(corporateName)) ||
                    (tClientName.length > 3 && clientName.includes(tClientName));


                  const isClientMatch = hasDocumentMatch || hasNameMatch;

                  const trxDate = new Date(new Date(t.transaction_date).getTime() + new Date(t.transaction_date).getTimezoneOffset() * 60000);
                  const isMonthMatch = trxDate.getMonth() === costFilterMonth;
                  const isYearMatch = trxDate.getFullYear() === costFilterYear;
                  const isStatusMatch = (t.status || '').toLowerCase() === 'pago';

                  if (isClientMatch) {
                    console.log('Match Detail (Document-First):', {
                      tClient: t.client_name,
                      docMatch: hasDocumentMatch,
                      nameMatch: hasNameMatch,
                      match: isMonthMatch && isYearMatch && isStatusMatch
                    });
                  }

                  return isClientMatch && isMonthMatch && isYearMatch && isStatusMatch;
                })
                .reduce((acc, curr) => acc + curr.amount, 0);

              console.log('Calculated Revenue:', currentMonthRevenue);

              const currentMonthCosts = costs
                .filter(c => {
                  const d = new Date(c.date);
                  return d.getMonth() === costFilterMonth && d.getFullYear() === costFilterYear;
                })
                .reduce((acc, curr) => acc + curr.value, 0);

              const realProfit = currentMonthRevenue - currentMonthCosts;
              const margin = currentMonthRevenue > 0 ? (realProfit / currentMonthRevenue) * 100 : 0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Receita Mensal</h3>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <TrendingUp size={18} />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentMonthRevenue)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Calculado (Transações Pagas)</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Custos ({new Date(costFilterYear, costFilterMonth).toLocaleString('default', { month: 'short' })})</h3>
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                        <TrendingDown size={18} />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentMonthCosts)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Despesas Operacionais</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lucro Real</h3>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <DollarSign size={18} />
                      </div>
                    </div>
                    <div className={`text-2xl font-black ${realProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realProfit)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Receita - Custos</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Margem</h3>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <PieChart size={18} />
                      </div>
                    </div>
                    <div className={`text-2xl font-black ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {margin.toFixed(1)}%
                    </div>
                    <p className="text-xs text-slate-400 mt-1">% de Lucro</p>
                  </div>
                </div>
              );
            })()}

            {/* Costs List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <h3 className="font-bold text-slate-900">Detalhamento de Custos</h3>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <select
                      value={costFilterMonth}
                      onChange={(e) => setCostFilterMonth(parseInt(e.target.value))}
                      className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2 py-1"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select
                      value={costFilterYear}
                      onChange={(e) => setCostFilterYear(parseInt(e.target.value))}
                      className="bg-transparent text-sm font-bold text-slate-600 outline-none px-2 py-1"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal('cost')}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
                >
                  <Plus size={14} />
                  <span>Novo Custo</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Descrição</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {costs
                      .filter(c => {
                        const d = new Date(c.date);
                        return d.getMonth() === costFilterMonth && d.getFullYear() === costFilterYear;
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                          Nenhum custo registrado neste período.
                        </td>
                      </tr>
                    ) : (
                      costs
                        .filter(c => {
                          const d = new Date(c.date);
                          return d.getMonth() === costFilterMonth && d.getFullYear() === costFilterYear;
                        })
                        .map(cost => (
                          <tr key={cost.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 font-medium text-slate-900">{cost.description}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{cost.category}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{new Date(cost.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost.value)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteCost(cost.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}

      <Modal isOpen={activeModal === 'cost'} onClose={() => setActiveModal('none')} title="Adicionar Custo Operacional">
        <form onSubmit={handleCreateCost} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Servidor AWS, Licença de Software..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
              value={newCost.description}
              onChange={e => setNewCost({ ...newCost, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Categoria</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                value={newCost.category}
                onChange={e => setNewCost({ ...newCost, category: e.target.value })}
              >
                <option value="Infrastructure">Infraestrutura</option>
                <option value="License">Licenças</option>
                <option value="Labor">Mão de Obra</option>
                <option value="Marketing">Marketing / Mídia</option>
                <option value="Other">Outros</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Data</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                value={newCost.date}
                onChange={e => setNewCost({ ...newCost, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Valor (R$)</label>
            <input
              type="text"
              placeholder="0,00"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all font-mono"
              value={newCost.value}
              onChange={e => setNewCost({ ...newCost, value: e.target.value })}
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-50 flex items-center gap-2"
            >
              {modalLoading && <Loader2 size={16} className="animate-spin" />}
              Adicionar Custo
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'client-config'} onClose={() => setActiveModal('none')} title="Configurações do Cliente">
        <form onSubmit={handleUpdateClient} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Informações Básicas</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="Nome do Cliente" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required />
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Razão Social" value={clientForm.corporateName} onChange={e => setClientForm({ ...clientForm, corporateName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Contato</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="E-mail" type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Telefone / WhatsApp" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Dados Fiscais / Localização</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none mb-3" placeholder="CNPJ" value={clientForm.cnpj} onChange={e => setClientForm({ ...clientForm, cnpj: e.target.value })} />
                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-24 resize-none" placeholder="Endereço Completo" value={clientForm.address} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Status do Contrato</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none"
                  value={clientForm.status}
                  onChange={e => setClientForm({ ...clientForm, status: e.target.value as any })}
                >
                  <option value="active">Ativo (Em dia)</option>
                  <option value="inactive">Inativo (Pausado)</option>
                  <option value="overdue">Inadimplente</option>
                  <option value="terminated">Contrato Encerrado</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Observações Internas</label>
            <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-20" placeholder="Observações sobre o cliente..." value={clientForm.observations} onChange={e => setClientForm({ ...clientForm, observations: e.target.value })} />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="submit" disabled={modalLoading} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">{modalLoading ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={activeModal === 'success'} onClose={() => setActiveModal('none')} title="">
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-300">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Sucesso!</h3>
          <p className="text-slate-500">{successMessage}</p>
          <button
            onClick={() => setActiveModal('none')}
            className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors w-full"
          >
            Continuar
          </button>
        </div>
      </Modal>



    </div >
  );
};

export default ClientDetail;
