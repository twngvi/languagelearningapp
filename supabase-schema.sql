create table if not exists public.app_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null,
  record_id text not null,
  record jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, store_name, record_id)
);

alter table public.app_records enable row level security;

create policy "Users can read their own app records"
  on public.app_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own app records"
  on public.app_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own app records"
  on public.app_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own app records"
  on public.app_records for delete
  using (auth.uid() = user_id);
