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

delete from public.app_records
where ctid in (
  select ctid
  from (
    select ctid,
      row_number() over (
        partition by store_name, record_id
        order by updated_at desc nulls last, ctid desc
      ) as duplicate_rank
    from public.app_records
  ) ranked
  where duplicate_rank > 1
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
