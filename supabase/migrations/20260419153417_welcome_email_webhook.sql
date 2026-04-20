-- Calls send-welcome-email edge function via pg_net on new user profile insert
create or replace function public.trigger_welcome_email()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://uhkarnjuzglkeyfymsyv.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoa2Fybmp1emdsa2V5Znltc3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0NzM4NiwiZXhwIjoyMDkwODIzMzg2fQ.Q_AgItINy8BDzdU65RIhIrYMHSAAXqwIwwVDrx5Fysc"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(new))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_send_welcome on public.profiles;
create trigger on_profile_created_send_welcome
  after insert on public.profiles
  for each row execute procedure public.trigger_welcome_email();
