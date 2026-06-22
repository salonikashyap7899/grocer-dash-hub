import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, statusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Order details — FreshCart" }] }),
  component: OrderDetail,
});

const STEPS = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"] as const;

function OrderDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["order", id],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
      const { data: history } = await supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at");
      return { order, items: items ?? [], history: history ?? [] };
    },
  });

  if (!data?.order) return <SiteShell><div className="mx-auto max-w-4xl px-4 py-10">Loading…</div></SiteShell>;
  const o = data.order;
  const cancelled = o.status === "cancelled";
  const currentIdx = cancelled ? -1 : STEPS.indexOf(o.status as typeof STEPS[number]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Order #{o.order_number}</h1>
            <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</p>
          </div>
          <Badge variant={cancelled ? "destructive" : "secondary"}>{statusLabel(o.status)}</Badge>
        </div>

        <section className="mt-6 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Tracking</h2>
          {cancelled ? (
            <div className="mt-3 text-sm text-destructive">This order has been cancelled.</div>
          ) : (
            <ol className="mt-4 space-y-3">
              {STEPS.map((s, i) => {
                const done = i <= currentIdx;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                    </div>
                    <div className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{statusLabel(s)}</div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="mt-4 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Items</h2>
          <div className="mt-3 space-y-2">
            {data.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 text-sm">
                <div className="h-12 w-12 overflow-hidden rounded bg-secondary/40">{i.image_url && <img src={i.image_url} className="h-full w-full object-cover" alt="" />}</div>
                <div className="flex-1"><div className="font-medium">{i.name}</div><div className="text-xs text-muted-foreground">{i.unit} × {i.quantity}</div></div>
                <div className="font-semibold">{formatINR(i.price_cents * i.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t pt-3 text-sm">
            <Row k="Subtotal" v={formatINR(o.subtotal_cents)} />
            <Row k="Delivery" v={o.delivery_cents === 0 ? "FREE" : formatINR(o.delivery_cents)} />
            <Row k="Total" v={formatINR(o.total_cents)} bold />
            <Row k="Payment" v={`${o.payment_status.toUpperCase()}${o.razorpay_payment_id ? " • " + o.razorpay_payment_id : ""}`} />
          </div>
        </section>

        <section className="mt-4 rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-semibold">Delivery to</h2>
          {o.address && (
            <div className="mt-2 text-muted-foreground">
              <div className="text-foreground">{(o.address as { full_name: string }).full_name}</div>
              <div>{(o.address as { line1: string }).line1}</div>
              <div>{(o.address as { city: string; state: string; pincode: string }).city}, {(o.address as { state: string }).state} {(o.address as { pincode: string }).pincode}</div>
              <div>Phone: {(o.address as { phone: string }).phone}</div>
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-bold" : "text-muted-foreground"}`}><span>{k}</span><span>{v}</span></div>;
}
