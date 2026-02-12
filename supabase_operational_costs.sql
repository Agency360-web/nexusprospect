-- Create operational_costs table
create table if not exists public.operational_costs (
    id uuid not null default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    description text not null,
    category text not null, -- e.g., 'Infrastructure', 'License', 'Labor', 'Marketing'
    value decimal(10, 2) not null,
    date date not null default current_date,
    created_at timestamp with time zone not null default now(),

    constraint operational_costs_pkey primary key (id)
);

-- Enable RLS
alter table public.operational_costs enable row level security;

-- Create policies (assuming authenticated users can manage costs for their clients)
-- View policies
create policy "Users can view costs for their clients" on public.operational_costs
    for select using (
        exists (
            select 1 from public.clients
            where clients.id = operational_costs.client_id
            and clients.user_id = auth.uid()
        )
    );

-- Insert policies
create policy "Users can insert costs for their clients" on public.operational_costs
    for insert with check (
        exists (
            select 1 from public.clients
            where clients.id = operational_costs.client_id
            and clients.user_id = auth.uid()
        )
    );

-- Update policies
create policy "Users can update costs for their clients" on public.operational_costs
    for update using (
        exists (
            select 1 from public.clients
            where clients.id = operational_costs.client_id
            and clients.user_id = auth.uid()
        )
    );

-- Delete policies
create policy "Users can delete costs for their clients" on public.operational_costs
    for delete using (
        exists (
            select 1 from public.clients
            where clients.id = operational_costs.client_id
            and clients.user_id = auth.uid()
        )
    );
