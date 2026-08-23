create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.groups enable row level security;
create policy "members see their groups" on public.groups for select using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id and gm.user_id = auth.uid()
  )
);

create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',
  visibility jsonb not null default '{}'::jsonb,
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;
create policy "read own memberships" on public.group_members for select using (auth.uid() = user_id);
create policy "join with invite awareness" on public.group_members for insert with check (auth.uid() = user_id or exists (
  select 1 from public.group_members owner_row
  where owner_row.group_id = group_members.group_id
));
create policy "group members see roster" on public.group_members for select using (
  exists (
    select 1 from public.group_members g2
    where g2.group_id = group_members.group_id and g2.user_id = auth.uid()
  )
);
