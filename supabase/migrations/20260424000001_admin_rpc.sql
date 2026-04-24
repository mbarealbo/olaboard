create or replace function public.admin_get_users()
returns table (
  id         uuid,
  email      text,
  plan       text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  last_active_at  timestamptz,
  storage_bytes   bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Hard gate: only god-tier users may call this function.
  if not exists (
    select 1 from public.profiles p_check
    where p_check.id = (select auth.uid())
    and p_check.plan = 'god'
  ) then
    raise exception 'unauthorized';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.plan,
    u.created_at,
    u.last_sign_in_at,
    p.last_active_at,
    coalesce(
      sum(nullif(o.metadata->>'size', '')::bigint),
      0
    ) as storage_bytes
  from auth.users u
  join public.profiles p on p.id = u.id
  left join storage.objects o
    on o.bucket_id = 'images'
    and (storage.foldername(o.name))[1] = u.id::text
  group by u.id, u.email, p.plan, u.created_at, u.last_sign_in_at, p.last_active_at
  order by p.last_active_at desc nulls last;
end;
$$;
