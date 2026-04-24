create or replace function public.admin_update_user_plan(target_id uuid, new_plan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p_check
    where p_check.id = (select auth.uid())
    and p_check.plan = 'god'
  ) then
    raise exception 'unauthorized';
  end if;

  if new_plan not in ('free', 'pro', 'god') then
    raise exception 'invalid plan';
  end if;

  update public.profiles set plan = new_plan where id = target_id;
end;
$$;
