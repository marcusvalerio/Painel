-- Pauta: esquema multiempresa. Toda tabela de negócio tem tenant_id.
create extension if not exists pgcrypto;

create table if not exists plans (
  id text primary key,
  name text not null,
  price_cents int not null,
  max_users int,
  max_clients int,
  features jsonb not null default '{}',
  status text not null default 'teste'
);

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan_id text references plans(id),
  subscription_status text not null default 'pendente',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'equipe',
  primary key (tenant_id, user_id)
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  contact_name text, email text, phone text, instagram text,
  color text default '#AECBE6',
  monthly_fee_cents int default 0,
  status text not null default 'ativo',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists clients_tenant on clients(tenant_id);

create table if not exists demands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  assignee_id uuid references users(id) on delete set null,
  title text not null,
  description text,
  format text not null default 'post',
  stage text not null default 'ideias',
  due_date date,
  progress int not null default 0,
  caption text,
  scheduled_at timestamptz,
  position int not null default 0,
  approval_token text unique default encode(gen_random_bytes(16),'hex'),
  approval_status text,
  created_at timestamptz not null default now()
);
create index if not exists demands_tenant on demands(tenant_id, stage);

create table if not exists demand_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  demand_id uuid not null references demands(id) on delete cascade,
  author_name text not null,
  is_client boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null, value_cents int not null default 0,
  starts_on date, ends_on date, status text not null default 'vigente'
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  kind text not null,
  description text not null, amount_cents int not null,
  due_on date, paid_on date
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null, contact text, source text,
  stage text not null default 'novo',
  value_cents int default 0, notes text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null, starts_at timestamptz not null, client_id uuid references clients(id) on delete set null
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  body text not null, created_at timestamptz not null default now()
);

insert into plans (id,name,price_cents,max_users,max_clients,status) values
 ('solo','Solo',9700,1,5,'teste'),
 ('agencia','Agência',19700,5,20,'teste'),
 ('estudio','Estúdio',39700,null,null,'teste')
on conflict (id) do nothing;

alter table users add column if not exists must_change_password boolean not null default false;
