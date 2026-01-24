-- Create departments table
create table if not exists departments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create operational_processes table
create table if not exists operational_processes (
  id uuid default uuid_generate_v4() primary key,
  department_id uuid references departments(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  checklist jsonb default '[]'::jsonb,
  priority text default 'medium',
  estimated_duration text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table departments enable row level security;
alter table operational_processes enable row level security;

-- Policies for departments
create policy "Users can view their own departments"
  on departments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own departments"
  on departments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own departments"
  on departments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own departments"
  on departments for delete
  using (auth.uid() = user_id);

-- Policies for operational_processes
create policy "Users can view their own processes"
  on operational_processes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own processes"
  on operational_processes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own processes"
  on operational_processes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own processes"
  on operational_processes for delete
  using (auth.uid() = user_id);
