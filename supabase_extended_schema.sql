-- Create Tags Table
create table if not exists public.tags (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    name text not null,
    color text default 'bg-slate-100 text-slate-600',
    created_at timestamptz default now()
);

-- Create WhatsApp Numbers Table
create table if not exists public.whatsapp_numbers (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    nickname text,
    phone text not null,
    status text check (status in ('active', 'inactive', 'blocked')) default 'active',
    daily_limit int default 1000,
    sent_today int default 0,
    created_at timestamptz default now()
);

-- Create Webhook Configs Table
create table if not exists public.webhook_configs (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    name text not null,
    url text not null,
    type text check (type in ('inbound', 'outbound', 'status')) default 'status',
    active boolean default true,
    method text default 'POST',
    headers jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.tags enable row level security;
alter table public.whatsapp_numbers enable row level security;
alter table public.webhook_configs enable row level security;

-- Open access policies for development
create policy "Allow all access for public" on public.tags for all using (true);
create policy "Allow all access for public" on public.whatsapp_numbers for all using (true);
create policy "Allow all access for public" on public.webhook_configs for all using (true);

-- Indexes
create index idx_tags_client on public.tags(client_id);
create index idx_numbers_client on public.whatsapp_numbers(client_id);
create index idx_webhooks_client on public.webhook_configs(client_id);
