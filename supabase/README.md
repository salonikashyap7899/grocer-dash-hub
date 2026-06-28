# Supabase Setup

This directory contains the database migrations and Edge Functions for FreshCart.

## Deploy the Push Notification Edge Function

### 1. Install Supabase CLI and link your project
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

### 2. Generate a dedicated webhook secret
This is a random token used **only** to authenticate the DB trigger → Edge Function call.
It is **not** the service role key — if leaked, it can only trigger push notifications.

```bash
openssl rand -hex 32
# Example output: a3f9b2c1d4e5...
```

### 3. Run the SQL migration
In the Supabase dashboard → SQL Editor, run the following **before** pasting the migration:

```sql
-- Set your project URL (no trailing slash)
ALTER DATABASE postgres SET app.supabase_url = 'https://<your-project-ref>.supabase.co';

-- Set the dedicated webhook secret (generated above — NOT the service_role_key)
ALTER DATABASE postgres SET app.notify_secret = '<random-token-from-step-2>';
```

Then paste and run the full contents of `migrations/20260627_push_notifications.sql`.

This creates:
- `push_tokens` table — stores Expo push tokens per user with RLS
- `notify_order_status_change()` function — fires via pg_net on order status changes
- `trg_notify_order_status` trigger — watches `orders.status` for updates

### 4. Set the same webhook secret as an Edge Function secret
```bash
supabase secrets set WEBHOOK_SECRET=<same-random-token-from-step-2>
```

The Supabase runtime **automatically** injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
into every Edge Function — you do **not** store those in database settings.

### 5. Deploy the Edge Function
```bash
supabase functions deploy notify-order-status
```

### 6. Enable pg_net extension (if not already enabled)
In Supabase dashboard → Database → Extensions, enable **pg_net**.

---

## Alternative: Supabase Database Webhooks (no pg_net required)

If you prefer a UI-based approach instead of pg_net:

1. Go to Supabase dashboard → Database → Webhooks → Create a new webhook
2. Table: `public.orders`, Event: `UPDATE`
3. URL: `https://<project-ref>.functions.supabase.co/notify-order-status`
4. Add header: `Authorization: Bearer <your-WEBHOOK_SECRET>`
5. Skip the trigger portion of the SQL migration (still run the `push_tokens` table creation)

---

## How It Works

```
Customer signs in on mobile
  → expo-notifications requests push permission
  → Expo Push Token saved to push_tokens table in Supabase

Admin updates order status in web panel
  → orders.status UPDATE fires DB trigger
  → trigger calls notify-order-status Edge Function via pg_net
      (using dedicated webhook secret for auth)
  → Edge Function reads push_tokens for the order's user_id
  → Edge Function POSTs to Expo Push API
  → Notification appears on customer's device
      Title: "FreshCart — Out for Delivery"
      Body:  "Your order #FC-1234 is now: Out for Delivery"
```

## Mobile App Environment Variables
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```
