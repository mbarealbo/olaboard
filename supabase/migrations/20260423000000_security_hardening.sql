-- Security hardening migration
-- 1. Fix auth_rls_initplan: replace auth.uid() with (select auth.uid()) in all policies
-- 2. Fix function_search_path_mutable: add SET search_path on both functions
-- 3. Fix public_bucket_allows_listing: restrict storage SELECT to own files

-- ── BOARDS ────────────────────────────────────────────────────────────────────

drop policy if exists "Users can read own boards" on boards;
drop policy if exists "Users can insert own boards" on boards;
drop policy if exists "Users can update own boards" on boards;
drop policy if exists "Users can delete own boards" on boards;

create policy "Users can read own boards"
  on boards for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own boards"
  on boards for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own boards"
  on boards for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own boards"
  on boards for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── CANVASES ──────────────────────────────────────────────────────────────────

drop policy if exists "Users can read own canvases" on canvases;
drop policy if exists "Users can insert own canvases" on canvases;
drop policy if exists "Users can update own canvases" on canvases;
drop policy if exists "Users can delete own canvases" on canvases;

create policy "Users can read own canvases"
  on canvases for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own canvases"
  on canvases for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own canvases"
  on canvases for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own canvases"
  on canvases for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── CARDS ─────────────────────────────────────────────────────────────────────

drop policy if exists "Users can read own cards" on cards;
drop policy if exists "Users can insert own cards" on cards;
drop policy if exists "Users can update own cards" on cards;
drop policy if exists "Users can delete own cards" on cards;

create policy "Users can read own cards"
  on cards for select to authenticated
  using (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

create policy "Users can insert own cards"
  on cards for insert to authenticated
  with check (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

create policy "Users can update own cards"
  on cards for update to authenticated
  using (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own cards"
  on cards for delete to authenticated
  using (
    exists (
      select 1 from canvases
      where canvases.id = cards.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

-- ── CONNECTIONS ───────────────────────────────────────────────────────────────

drop policy if exists "Users can read own connections" on connections;
drop policy if exists "Users can insert own connections" on connections;
drop policy if exists "Users can update own connections" on connections;
drop policy if exists "Users can delete own connections" on connections;

create policy "Users can read own connections"
  on connections for select to authenticated
  using (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

create policy "Users can insert own connections"
  on connections for insert to authenticated
  with check (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

create policy "Users can update own connections"
  on connections for update to authenticated
  using (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own connections"
  on connections for delete to authenticated
  using (
    exists (
      select 1 from canvases
      where canvases.id = connections.canvas_id
      and canvases.user_id = (select auth.uid())
    )
  );

-- ── PROFILES ──────────────────────────────────────────────────────────────────

drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;

create policy "Users can read own profile"
  on profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on profiles for insert to authenticated
  with check ((select auth.uid()) = id);

-- ── FUNCTIONS: fix mutable search_path ────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, plan) values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.trigger_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://uhkarnjuzglkeyfymsyv.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoa2Fybmp1emdsa2V5Znltc3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0NzM4NiwiZXhwIjoyMDkwODIzMzg2fQ.Q_AgItINy8BDzdU65RIhIrYMHSAAXqwIwwVDrx5Fysc"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(new))
  );
  return new;
exception when others then
  return new;
end;
$$;

-- ── STORAGE: restrict listing to own folder ────────────────────────────────────
-- Public URLs still work (bucket is public, CDN bypasses RLS)
-- This only restricts storage.list() API calls

drop policy if exists "Public read images" on storage.objects;

create policy "Users can read own images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
