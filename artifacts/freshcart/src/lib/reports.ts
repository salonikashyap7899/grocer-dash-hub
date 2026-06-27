import { supabase } from "@/integrations/supabase/client";

export async function salesReport(from?: string, to?: string) {
  const fromDate = from ?? new Date(Date.now() - 30 * 86400000).toISOString();
  const toDate = to ?? new Date().toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_number,total_cents,subtotal_cents,delivery_cents,discount_amount,status,payment_status,created_at,coupon_code")
    .gte("created_at", fromDate).lte("created_at", toDate)
    .order("created_at", { ascending: false });

  const list = (orders ?? []) as any[];
  const revenueCents = list.filter((o) => o.status !== "cancelled").reduce((s: number, o: any) => s + o.total_cents, 0);
  const orderCount = list.length;
  const avg = orderCount ? Math.round(revenueCents / orderCount) : 0;

  const daily: Record<string, { date: string; revenueCents: number; orders: number }> = {};
  for (const o of list) {
    if (o.status === "cancelled") continue;
    const d = o.created_at.slice(0, 10);
    daily[d] ??= { date: d, revenueCents: 0, orders: 0 };
    daily[d].revenueCents += o.total_cents;
    daily[d].orders += 1;
  }
  const byDay = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));

  const { data: items } = await supabase
    .from("order_items")
    .select("name, quantity, price_cents, order:orders!inner(created_at,status)")
    .gte("order.created_at", fromDate).lte("order.created_at", toDate);

  const prodMap: Record<string, { name: string; qty: number; revenueCents: number }> = {};
  for (const it of (items ?? []) as any[]) {
    if (it.order?.status === "cancelled") continue;
    prodMap[it.name] ??= { name: it.name, qty: 0, revenueCents: 0 };
    prodMap[it.name].qty += it.quantity;
    prodMap[it.name].revenueCents += it.price_cents * it.quantity;
  }
  const topProducts = Object.values(prodMap).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10);

  return { from: fromDate, to: toDate, revenueCents, orderCount, avgOrderCents: avg, byDay, topProducts, orders: list };
}
