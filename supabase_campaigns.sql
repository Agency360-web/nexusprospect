-- Create Campaigns Table
create table if not exists public.campaigns (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    name text not null,
    message text,
    status text check (status in ('draft', 'sending', 'completed', 'failed')) default 'draft',
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.campaigns enable row level security;

-- Open access policy for development (User should restrict this later)
create policy "Allow all access for public" on public.campaigns for all using (true);

-- Index for faster queries
create index idx_campaigns_client on public.campaigns(client_id);
