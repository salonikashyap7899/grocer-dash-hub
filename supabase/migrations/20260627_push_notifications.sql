-- Push tokens table: stores Expo push tokens per user
create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint push_tokens_user_token_unique unique (user_id, token)
);

alter table public.push_tokens enable row level security;

-- Users can only read/write their own tokens
create policy "Users manage own push tokens"
  on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow the service role (edge functions) to read all tokens
create policy "Service role reads all push tokens"
  on public.push_tokens
  for select
  using (auth.role() = 'service_role');

-- Function: notify_order_status_change
-- Calls the notify-order-status edge function via pg_net whenever
-- an order's status column changes.
--
-- IMPORTANT: Before applying this migration, set the webhook secret:
--   ALTER DATABASE postgres SET app.notify_secret = '<random-token>';
-- Generate the token with: openssl rand -hex 32
-- Set the same value as the WEBHOOK_SECRET Edge Function secret:
--   supabase secrets set WEBHOOK_SECRET=<same-random-token>
--
-- The notify_secret is a DEDICATED token for this webhook only.
-- It is NOT the service_role_key — it only authorises push-notification
-- delivery, so its blast radius is limited to triggering notifications.
create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
as $$
declare
  edge_url    text;
  notify_secret text;
begin
  -- Only fire when status actually changed
  if (OLD.status is not distinct from NEW.status) then
    return NEW;
  end if;

  edge_url      := current_setting('app.supabase_url', true) || '/functions/v1/notify-order-status';
  notify_secret := current_setting('app.notify_secret', true);

  perform net.http_post(
    url     := edge_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || notify_secret
    ),
    body    := jsonb_build_object(
      'order_id',      NEW.id,
      'order_number',  NEW.order_number,
      'user_id',       NEW.user_id,
      'new_status',    NEW.status
    )
  );

  return NEW;
end;
$$;

-- Trigger on orders
drop trigger if exists trg_notify_order_status on public.orders;
create trigger trg_notify_order_status
  after update of status on public.orders
  for each row
  execute function public.notify_order_status_change();
