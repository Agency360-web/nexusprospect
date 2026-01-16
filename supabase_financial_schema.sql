-- Financial Tables for Administration Dashboard

-- 1. Financial KPIs (For the 5 top cards)
create table if not exists public.financial_kpis (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) not null,
    mrr decimal(10,2) default 0,
    mrr_growth_percent decimal(5,2) default 0,
    forecast_30d decimal(10,2) default 0,
    overdue_amount decimal(10,2) default 0,
    avg_ticket decimal(10,2) default 0,
    active_subscribers int default 0,
    churn_rate decimal(5,2) default 0,
    churn_growth_percent decimal(5,2) default 0,
    updated_at timestamptz default now(),
    unique(user_id)
);

-- 2. Financial Monthly Metrics (For the Revenue Chart)
create table if not exists public.financial_monthly_metrics (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) not null,
    month_label text not null, -- e.g., 'Jan', 'Fev'
    year int not null,
    revenue decimal(10,2) default 0,
    expense decimal(10,2) default 0,
    target decimal(10,2) default 0,
    sort_order int, -- To help sorting Jan->Dec
    created_at timestamptz default now(),
    unique(user_id, month_label, year)
);

-- 3. Financial Transactions (For the Table)
create table if not exists public.financial_transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) not null,
    client_name text, -- De-normalized for simplicity or use relation
    description text,
    transaction_date timestamptz default now(),
    amount decimal(10,2) not null,
    status text check (status in ('pago', 'pendente', 'atrasado', 'cancelado')) default 'pendente',
    created_at timestamptz default now()
);

-- RLS Policies

-- Enable RLS
alter table public.financial_kpis enable row level security;
alter table public.financial_monthly_metrics enable row level security;
alter table public.financial_transactions enable row level security;

-- Policies for Financial KPIs
create policy "Users can view own kpis" on public.financial_kpis
    for select using (auth.uid() = user_id);
create policy "Users can manage own kpis" on public.financial_kpis
    for all using (auth.uid() = user_id);

-- Policies for Financial Monthly Metrics
create policy "Users can view own monthly metrics" on public.financial_monthly_metrics
    for select using (auth.uid() = user_id);
create policy "Users can manage own monthly metrics" on public.financial_monthly_metrics
    for all using (auth.uid() = user_id);

-- Policies for Financial Transactions
create policy "Users can view own transactions" on public.financial_transactions
    for select using (auth.uid() = user_id);
create policy "Users can manage own transactions" on public.financial_transactions
    for all using (auth.uid() = user_id);
