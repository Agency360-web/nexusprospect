create table if not exists lead_folders (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table leads add column if not exists folder_id uuid references lead_folders(id) on delete set null;

create index if not exists idx_lead_folders_client_id on lead_folders(client_id);
create index if not exists idx_leads_folder_id on leads(folder_id);
