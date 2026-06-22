import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

async function ensureAdmin(ctx: { supabase: { rpc: (fn: "is_admin") => { single: () => Promise<{ data: boolean | null }> } | Promise<{ data: boolean | null }> } }) {
  const res = await (ctx.supabase.rpc("is_admin") as Promise<{ data: boolean | null }>);
  if (!res.data) throw new Error("Forbidden");
}

export const salesReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof rangeSchema>) => rangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const from = data.from ?? new Date(Date.now() - 30 * 86400000).toISOString();
    const to = data.to ?? new Date().toISOString();

    const { data: orders } = await context.supabase
      .from("orders")
      .select("id, order_number, total_cents, subtotal_cents, delivery_cents, discount_amount, status, payment_status, created_at, coupon_code")
      .gte("created_at", from).lte("created_at", to)
      .order("created_at", { ascending: false });

    const list = orders ?? [];
    const revenueCents = list.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total_cents, 0);
    const orderCount = list.length;
    const avg = orderCount ? Math.round(revenueCents / orderCount) : 0;

    // by day
    const daily: Record<string, { date: string; revenueCents: number; orders: number }> = {};
    for (const o of list) {
      if (o.status === "cancelled") continue;
      const d = o.created_at.slice(0, 10);
      daily[d] ??= { date: d, revenueCents: 0, orders: 0 };
      daily[d].revenueCents += o.total_cents;
      daily[d].orders += 1;
    }
    const byDay = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));

    // top products in window
    const { data: items } = await context.supabase
      .from("order_items")
      .select("name, quantity, price_cents, order:orders!inner(created_at,status)")
      .gte("order.created_at", from).lte("order.created_at", to);
    const prodMap: Record<string, { name: string; qty: number; revenueCents: number }> = {};
    for (const it of (items ?? []) as Array<{ name: string; quantity: number; price_cents: number; order: { status: string } }>) {
      if (it.order.status === "cancelled") continue;
      prodMap[it.name] ??= { name: it.name, qty: 0, revenueCents: 0 };
      prodMap[it.name].qty += it.quantity;
      prodMap[it.name].revenueCents += it.price_cents * it.quantity;
    }
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10);

    return { from, to, revenueCents, orderCount, avgOrderCents: avg, byDay, topProducts, orders: list };
  });
