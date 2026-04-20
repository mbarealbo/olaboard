-- Allow users to insert their own profile (client-side fallback if trigger fails)
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);
