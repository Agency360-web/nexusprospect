-- Create tasks table
create table if not exists public.tasks (
    id uuid primary key default uuid_generate_v4(),
    client_id uuid references public.clients(id) on delete cascade not null,
    title text not null,
    description text,
    start_date timestamptz,
    due_date timestamptz,
    status text check (status in ('pending', 'completed')) default 'pending',
    checklist jsonb default '[]'::jsonb, -- Array of { text: string, completed: boolean }
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Policy (Open for dev, user should restrict later)
create policy "Allow all access for public" on public.tasks for all using (true);

-- Indexes
create index idx_tasks_client on public.tasks(client_id);
create index idx_tasks_status on public.tasks(status);
