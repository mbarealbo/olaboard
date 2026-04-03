-- Olaboard Database Schema
-- Run this in your Supabase SQL editor

-- Enable RLS
create table if not exists canvases (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nuova lavagna',
  parent_id uuid references canvases(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  title text not null default 'Senza titolo',
  body text not null default '',
  x float not null default 0,
  y float not null default 0,
  is_folder boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  from_card_id uuid references cards(id) on delete cascade not null,
  to_card_id uuid references cards(id) on delete cascade not null,
  label text not null default '',
  created_at timestamptz default now()
);

-- Row Level Security
alter table canvases enable row level security;
alter table cards enable row level security;
alter table connections enable row level security;

-- Canvases policies
create policy "Users can read own canvases"
  on canvases for select
  using (auth.uid() = user_id);

create policy "Users can insert own canvases"
  on canvases for insert
  with check (auth.uid() = user_id);

create policy "Users can update own canvases"
  on canvases for update
  using (auth.uid() = user_id);

create policy "Users can delete own canvases"
  on canvases for delete
  using (auth.uid() = user_id);

-- Cards policies (via canvas ownership)
create policy "Users can read own cards"
  on cards for select
  using (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = auth.uid()
    )
  );

create policy "Users can insert own cards"
  on cards for insert
  with check (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = auth.uid()
    )
  );

create policy "Users can update own cards"
  on cards for update
  using (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = auth.uid()
    )
  );

create policy "Users can delete own cards"
  on cards for delete
  using (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = auth.uid()
    )
  );

-- Connections policies (via canvas ownership)
create policy "Users can read own connections"
  on connections for select
  using (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = auth.uid()
    )
  );

create policy "Users can insert own connections"
  on connections for insert
  with check (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = auth.uid()
    )
  );

create policy "Users can update own connections"
  on connections for update
  using (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = auth.uid()
    )
  );

create policy "Users can delete own connections"
  on connections for delete
  using (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = auth.uid()
    )
  );
