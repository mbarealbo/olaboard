-- Olaboard Database Schema v2
-- Run this in your Supabase SQL editor

-- BOARDS (root level canvases)
create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'La mia lavagna',
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- CANVASES (boards + nested folders)
create table if not exists canvases (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade not null,
  parent_id uuid references canvases(id) on delete cascade,
  name text not null default 'Cartella',
  groups jsonb not null default '[]',
  labels jsonb not null default '[]',
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- CARDS
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  title text not null default 'Nuova idea',
  body text not null default '',
  x float not null default 0,
  y float not null default 0,
  is_folder boolean not null default false,
  is_label boolean not null default false,
  color text not null default 'yellow',
  url text,
  width float,
  height float,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONNECTIONS
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  from_card_id text not null,
  to_card_id text not null,
  label text not null default '',
  from_anchor text not null default 'right',
  to_anchor text not null default 'left',
  created_at timestamptz default now()
);

-- RLS
alter table boards enable row level security;
alter table canvases enable row level security;
alter table cards enable row level security;
alter table connections enable row level security;

-- BOARDS policies
create policy "Users can read own boards"
  on boards for select using (auth.uid() = user_id);
create policy "Users can insert own boards"
  on boards for insert with check (auth.uid() = user_id);
create policy "Users can update own boards"
  on boards for update using (auth.uid() = user_id);
create policy "Users can delete own boards"
  on boards for delete using (auth.uid() = user_id);

-- CANVASES policies
create policy "Users can read own canvases"
  on canvases for select using (auth.uid() = user_id);
create policy "Users can insert own canvases"
  on canvases for insert with check (auth.uid() = user_id);
create policy "Users can update own canvases"
  on canvases for update using (auth.uid() = user_id);
create policy "Users can delete own canvases"
  on canvases for delete using (auth.uid() = user_id);

-- CARDS policies
create policy "Users can read own cards"
  on cards for select using (
    exists (select 1 from canvases where canvases.id = cards.canvas_id and canvases.user_id = auth.uid())
  );
create policy "Users can insert own cards"
  on cards for insert with check (
    exists (select 1 from canvases where canvases.id = cards.canvas_id and canvases.user_id = auth.uid())
  );
create policy "Users can update own cards"
  on cards for update using (
    exists (select 1 from canvases where canvases.id = cards.canvas_id and canvases.user_id = auth.uid())
  );
create policy "Users can delete own cards"
  on cards for delete using (
    exists (select 1 from canvases where canvases.id = cards.canvas_id and canvases.user_id = auth.uid())
  );

-- CONNECTIONS policies
create policy "Users can read own connections"
  on connections for select using (
    exists (select 1 from canvases where canvases.id = connections.canvas_id and canvases.user_id = auth.uid())
  );
create policy "Users can insert own connections"
  on connections for insert with check (
    exists (select 1 from canvases where canvases.id = connections.canvas_id and canvases.user_id = auth.uid())
  );
create policy "Users can update own connections"
  on connections for update using (
    exists (select 1 from canvases where canvases.id = connections.canvas_id and canvases.user_id = auth.uid())
  );
create policy "Users can delete own connections"
  on connections for delete using (
    exists (select 1 from canvases where canvases.id = connections.canvas_id and canvases.user_id = auth.uid())
  );