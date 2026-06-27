import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Check, Circle, Package, Truck, CheckCircle2, Clock, ShoppingBag } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { DeliveryMap } from "@/components/DeliveryMap";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, statusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Order details — FreshCart" }] }),
  component: OrderDetail,
});

const STEPS = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"] as const;

const STEP_META: Record<string, { icon: React.FC<{ className?: string }>; label: string; desc: string }> = {
  placed:           { icon: ShoppingBag,    label: "Order placed",      desc: "We've received your order" },
  confirmed:        { icon: Check,          label: "Confirmed",         desc: "Order is confirmed" },
  packed:           { icon: Package,        label: "Packed",            desc: "Your items are packed" },
  out_for_delivery: { icon: Truck,          label: "Out for delivery",  desc: "Rider is heading your way 🛵" },
  delivered:        { icon: CheckCircle2,   label: "Delivered",         desc: "Order delivered successfully 🎉" },
};

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);
      const { data: history } = await supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at");
      return { order, items: items ?? [], history: history ?? [] };
    },
  });

  // ── Supabase Realtime — live order status ──────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["order", id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  if (!data?.order) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-4xl px-4 py-16 flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0c831f] border-t-transparent" />
          <p className="text-sm text-gray-500">Loading your order…</p>
        </div>
      </SiteShell>
    );
  }

  const o = data.order;
  const cancelled = o.status === "cancelled";
  const currentIdx = cancelled ? -1 : STEPS.indexOf(o.status as typeof STEPS[number]);

  const addr = o.address as {
    full_name?: string; line1?: string; city?: string; state?: string; pincode?: string; phone?: string;
  } | null;

  // Build geocodable address string
  const addressString = addr
    ? [addr.line1, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
    : undefined;

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Order #{o.order_number}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{new Date(o.created_at).toLocaleString("en-IN")}</p>
          </div>
          <Badge
            className={
              cancelled
                ? "bg-red-50 text-red-700 border-red-200"
                : o.status === "delivered"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }
          >
            {statusLabel(o.status)}
          </Badge>
        </div>

        {/* ── TRACKING + MAP ──────────────────────────────── */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">Live tracking</h2>

          {cancelled ? (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
              This order has been cancelled.
            </div>
          ) : (
            <>
              {/* Step timeline */}
              <ol className="mb-6 flex gap-0 overflow-x-auto pb-2">
                {STEPS.map((s, i) => {
                  const done = i <= currentIdx;
                  const active = i === currentIdx;
                  const meta = STEP_META[s];
                  const Icon = meta.icon;
                  return (
                    <li key={s} className="flex flex-1 flex-col items-center gap-1 min-w-[72px]">
                      <div className="relative flex w-full items-center justify-center">
                        {i > 0 && (
                          <div className={`absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 ${i <= currentIdx ? "bg-[#0c831f]" : "bg-gray-200"}`} />
                        )}
                        <div className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 transition-all
                          ${active ? "border-[#0c831f] bg-[#0c831f] text-white scale-110 shadow-md shadow-green-200"
                            : done ? "border-[#0c831f] bg-[#0c831f] text-white"
                            : "border-gray-200 bg-gray-50 text-gray-300"}`}>
                          {done ? <Icon className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                        </div>
                      </div>
                      <div className={`text-center text-[10px] leading-tight mt-1 px-0.5 ${done ? "font-semibold text-gray-700" : "text-gray-400"}`}>
                        {meta.label}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Real Leaflet map with animated delivery marker */}
              <DeliveryMap
                status={o.status}
                deliveryAddress={addressString}
                orderNumber={o.order_number}
              />
            </>
          )}
        </section>

        {/* Items */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-3">Items ordered</h2>
          <div className="space-y-3">
            {data.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                  {item.image_url && <img src={item.image_url} className="h-full w-full object-cover" alt="" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.unit} × {item.quantity}</div>
                </div>
                <div className="text-sm font-bold text-gray-900 shrink-0">{formatINR(item.price_cents * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 text-sm">
            <Row k="Subtotal" v={formatINR(o.subtotal_cents)} />
            <Row k="Delivery fee" v={o.delivery_cents === 0 ? "🚚 FREE" : formatINR(o.delivery_cents)} />
            <Row k="Total" v={formatINR(o.total_cents)} bold />
            <Row k="Payment" v={`${o.payment_status.toUpperCase()}${o.razorpay_payment_id ? " · " + o.razorpay_payment_id : ""}`} />
          </div>
        </section>

        {/* Delivery address */}
        {addr && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-sm">
            <h2 className="text-base font-bold text-gray-900 mb-2">Delivery address</h2>
            <div className="text-gray-700 space-y-0.5">
              {addr.full_name && <div className="font-semibold">{addr.full_name}</div>}
              {addr.line1 && <div>{addr.line1}</div>}
              <div>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}</div>
              {addr.phone && <div className="text-gray-500">📞 {addr.phone}</div>}
            </div>
          </section>
        )}

        {/* Status history */}
        {data.history.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">Status history</h2>
            <ol className="space-y-2">
              {data.history.map((h) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0c831f]" />
                  <div>
                    <span className="font-medium">{statusLabel(h.status)}</span>
                    {h.note && <span className="text-gray-500"> · {h.note}</span>}
                    <div className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString("en-IN")}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </SiteShell>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-gray-900" : "text-gray-500"}`}>
      <span>{k}</span>
      <span className={bold ? "text-[#0c831f]" : ""}>{v}</span>
    </div>
  );
}
