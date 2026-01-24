-- Create Profiles Table (Syncs with auth.users)
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade not null primary key,
    email text,
    full_name text,
    role text check (role in ('admin', 'operator', 'support', 'user')) default 'user',
    allowed_pages text[] default array[]::text[], -- e.g. ['dashboard', 'reports']
    status text check (status in ('active', 'inactive')) default 'active',
    last_seen_at timestamptz,
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
-- 1. View: Allow authenticated users to view all profiles (for team list)
create policy "Authenticated users can view all profiles"
    on public.profiles for select
    to authenticated
    using (true);

-- 2. Update: Users can update their own profile
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- 3. Insert: Handled by trigger, but allow service role if needed
-- (No public insert policy needed as it's done via trigger)

-- Trigger for New Users
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, role, allowed_pages)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', 'Novo Usuário'),
        coalesce((new.raw_user_meta_data->>'role')::text, 'user'),
         case 
            when (new.raw_user_meta_data->>'role')::text = 'admin' then array['dashboard', 'admin', 'clients', 'reports', 'transmission', 'settings']
            else array['dashboard', 'reports'] -- Default minimal access
        end
    );
    return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on rerun
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Backfill existing users (Optional, helpful if users already exist)
insert into public.profiles (id, email, full_name, role, allowed_pages)
select 
    id, 
    email, 
    coalesce(raw_user_meta_data->>'full_name', 'Admin'), 
    'admin',
    array['dashboard', 'admin', 'clients', 'reports', 'transmission', 'settings']
from auth.users
on conflict (id) do update 
set allowed_pages = array['dashboard', 'admin', 'clients', 'reports', 'transmission', 'settings']
where profiles.role = 'admin';
