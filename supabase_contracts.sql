-- Create contract_templates table
create table public.contract_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create contracts table
create table public.contracts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  template_id uuid references public.contract_templates,
  client_name text not null,
  status text check (status in ('draft', 'generated', 'signed')) default 'draft',
  variables jsonb default '{}'::jsonb,
  content_snapshot text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;

-- Policies for contract_templates
create policy "Users can view their own templates"
  on public.contract_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert their own templates"
  on public.contract_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own templates"
  on public.contract_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own templates"
  on public.contract_templates for delete
  using (auth.uid() = user_id);

-- Policies for contracts
create policy "Users can view their own contracts"
  on public.contracts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own contracts"
  on public.contracts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own contracts"
  on public.contracts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own contracts"
  on public.contracts for delete
  using (auth.uid() = user_id);

-- Insert a default template
insert into public.contract_templates (user_id, name, content)
select 
  auth.uid(),
  'Contrato de Prestação de Serviços Padrão',
  'CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{razao_social}}, inscrita no CNPJ sob o nº {{cnpj}}, com sede em {{endereco}}, neste ato representada por {{responsavel}}.

CONTRATADA: [SUA EMPRESA], ...

1. DO OBJETO
1.1. O presente contrato tem por objeto a prestação dos serviços de {{servicos}}.

2. DO PRAZO
2.1. O contrato terá vigência de {{prazo}} meses, iniciando-se na data de assinatura deste.

3. DO PREÇO E FORMA DE PAGAMENTO
3.1. Pelo serviço prestado, a CONTRATANTE pagará à CONTRATADA o valor total de {{valor_total}}.
3.2. Forma de pagamento: {{forma_pagamento}}.
3.3. Condições: {{condicoes_pagamento}}.

E por estarem justos e contratados, assinam o presente instrumento.

__________________________, _____ de ___________________ de 20__.

_____________________________________________
CONTRATANTE: {{razao_social}}
e-mail: {{email}}

_____________________________________________
CONTRATADA
'
from auth.users where auth.uid() is not null limit 1; 
-- Note: The insert above might fail if run directly without an active auth session in SQL editor, 
-- but it serves as a template for what should be inserted. 
-- In practice, we might want to handle seeding in the app if the user has no templates.
