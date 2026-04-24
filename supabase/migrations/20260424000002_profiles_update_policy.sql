-- Allow authenticated users to update their own profile row
create policy "Users can update own profile"
  on profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
