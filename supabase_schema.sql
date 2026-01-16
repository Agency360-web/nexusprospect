-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients Table
create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    status text check (status in ('active', 'inactive')) default 'active',
    created_at timestamptz default now(),
    email text unique
);

-- Goals Table
create table if not exists public.goals (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    month int not null,
    year int not null,
    channel text check (channel in ('email', 'whatsapp')) not null,
    monthly_target int default 0,
    annual_target int default 0,
    weekly_targets jsonb default '[0,0,0,0]'::jsonb, -- Storing as JSON array for simplicity
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(client_id, month, year, channel)
);

-- Leads Table
create table if not exists public.leads (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    name text not null,
    phone text,
    email text,
    tags text[], -- Array of strings for tags
    custom_fields jsonb default '{}'::jsonb,
    status text check (status in ('valid', 'invalid', 'pending')) default 'pending',
    created_at timestamptz default now()
);

-- Transmissions Table (for tracking actuals)
create table if not exists public.transmissions (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    channel text check (channel in ('email', 'whatsapp')) not null,
    status text check (status in ('sent', 'delivered', 'read', 'failed')) default 'sent',
    recipient text,
    created_at timestamptz default now()
);

-- RLS Policies (Basic)
alter table public.clients enable row level security;
alter table public.goals enable row level security;
alter table public.leads enable row level security;
alter table public.transmissions enable row level security;

-- Open access for development (User should restrict this later)
create policy "Allow all access for public" on public.clients for all using (true);
create policy "Allow all access for public" on public.goals for all using (true);
create policy "Allow all access for public" on public.leads for all using (true);
create policy "Allow all access for public" on public.transmissions for all using (true);

-- Indexes
create index idx_goals_client on public.goals(client_id);
create index idx_leads_client on public.leads(client_id);
create index idx_transmissions_client_channel on public.transmissions(client_id, channel);

-- Email Senders Table
create table if not exists public.email_senders (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade,
    email text not null,
    provider text not null, -- 'smtp', 'sendgrid', 'aws_ses', etc.
    from_name text,
    status text check (status in ('active', 'inactive', 'unverified')) default 'active',
    daily_limit int default 500,
    sent_today int default 0,
    config jsonb default '{}'::jsonb, -- Store API keys or SMTP settings (encrypted ideally, but simple here)
    created_at timestamptz default now()
);

alter table public.email_senders enable row level security;
create policy "Allow all access for public" on public.email_senders for all using (true);
