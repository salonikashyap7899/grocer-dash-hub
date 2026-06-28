import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STATUS_LABELS: Record<string, string> = {
  placed:           "Order Placed",
  confirmed:        "Order Confirmed",
  packed:           "Order Packed",
  out_for_delivery: "Out for Delivery",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
};

interface OrderStatusPayload {
  order_id: string;
  order_number: string;
  user_id: string;
  new_status: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Strict Bearer token authentication using a dedicated webhook secret.
  // WEBHOOK_SECRET is a randomly-generated token used only to authenticate
  // this edge function. It is NOT the Supabase service_role_key.
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("WEBHOOK_SECRET environment variable is not set");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const prefix = "Bearer ";
  if (
    !authHeader.startsWith(prefix) ||
    authHeader.slice(prefix.length) !== webhookSecret
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: OrderStatusPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request: invalid JSON", { status: 400 });
  }

  const { order_id, order_number, user_id, new_status } = payload;
  if (!order_id || !user_id || !new_status || !order_number) {
    return new Response("Bad request: missing required fields", { status: 400 });
  }

  // The Supabase service-role key is injected automatically by the Supabase
  // Edge Function runtime — it is NEVER stored in database settings.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data: tokenRows, error: tokenError } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", user_id);

  if (tokenError) {
    console.error("Error fetching push tokens:", tokenError.message);
    return new Response(JSON.stringify({ error: tokenError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!tokenRows || tokenRows.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const statusLabel = STATUS_LABELS[new_status] ?? new_status;

  const messages = tokenRows.map((row: { token: string }) => ({
    to: row.token,
    sound: "default",
    title: `FreshCart — ${statusLabel}`,
    body: `Your order #${order_number} is now: ${statusLabel}`,
    data: { order_id, order_number, status: new_status },
  }));

  const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "Accept":          "application/json",
      "Accept-encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  const expoBody = await expoRes.json();
  console.log("Expo push response:", JSON.stringify(expoBody));

  return new Response(
    JSON.stringify({ sent: messages.length, expo: expoBody }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
