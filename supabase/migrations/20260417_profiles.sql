-- Profiles table: stores plan per user
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  plan text not null default 'free' check (plan in ('free', 'pro', 'god')),
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- Auto-create a free profile when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, plan) values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS: users can only read their own profile
alter table profiles enable row level security;

drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- To upgrade a user, run from the Supabase dashboard (SQL editor):
-- update profiles set plan = 'god' where id = '<user-uuid>';
-- update profiles set plan = 'pro'  where id = '<user-uuid>';
