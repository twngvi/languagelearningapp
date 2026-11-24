create table if not exists public.app_records (
  user_id uuid references auth.users(id) on delete cascade,
  store_name text not null,
  record_id text not null,
  record jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (store_name, record_id)
);

alter table public.app_records
  add column if not exists deleted_at timestamptz;

alter table public.app_records
  alter column user_id drop not null;

delete from public.app_records as old_record
where exists (
  select 1
  from public.app_records as newer_record
  where newer_record.store_name = old_record.store_name
    and newer_record.record_id = old_record.record_id
    and newer_record.updated_at > old_record.updated_at
);

alter table public.app_records
  drop constraint if exists app_records_pkey;

alter table public.app_records
  add primary key (store_name, record_id);

alter table public.app_records enable row level security;

grant select, insert, update, delete on table public.app_records to authenticated, anon;

drop policy if exists "Users can read their own app records" on public.app_records;
drop policy if exists "Authenticated users can read shared app records" on public.app_records;
drop policy if exists "Anyone can read shared app records" on public.app_records;
create policy "Anyone can read shared app records"
  on public.app_records for select
  using (true);

drop policy if exists "Users can insert their own app records" on public.app_records;
drop policy if exists "Authenticated users can insert shared app records" on public.app_records;
drop policy if exists "Anyone can insert shared app records" on public.app_records;
create policy "Anyone can insert shared app records"
  on public.app_records for insert
  with check (true);

drop policy if exists "Users can update their own app records" on public.app_records;
drop policy if exists "Authenticated users can update shared app records" on public.app_records;
drop policy if exists "Anyone can update shared app records" on public.app_records;
create policy "Anyone can update shared app records"
  on public.app_records for update
  using (true)
  with check (true);

drop policy if exists "Users can delete their own app records" on public.app_records;
drop policy if exists "Authenticated users can delete shared app records" on public.app_records;
drop policy if exists "Anyone can delete shared app records" on public.app_records;
create policy "Anyone can delete shared app records"
  on public.app_records for delete
  using (true);
