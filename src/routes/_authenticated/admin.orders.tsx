import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatINR, statusLabel } from "@/lib/format";
import { toast } from "sonner";

const STATUSES = ["placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"] as const;

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as "placed" | "confirmed" | "packed" | "out_for_delivery" | "delivered" | "cancelled");
      return (await q).data ?? [];
    },
  });

  const { data: detail } = useQuery({
    queryKey: ["admin-order-detail", openId],
    enabled: !!openId,
    queryFn: async () => {
      const { data: order } = await supabase.from("orders").select("*").eq("id", openId!).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", openId!);
      return { order, items: items ?? [] };
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as "placed" | "confirmed" | "packed" | "out_for_delivery" | "delivered" | "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-order-detail"] });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <h1 className="text-2xl font-extrabold">Orders</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Status</th><th></th></tr>
          </thead>
          <tbody className="divide-y">
            {orders?.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-2 font-medium">#{o.order_number}</td>
                <td className="px-3 py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">{formatINR(o.total_cents)}</td>
                <td className="px-3 py-2">{o.payment_status}</td>
                <td className="px-3 py-2"><Badge variant="secondary">{statusLabel(o.status)}</Badge></td>
                <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => setOpenId(o.id)}>View</Button></td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No orders</td></tr>}
          </tbody>
        </table>
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          {detail?.order && (
            <>
              <SheetHeader><SheetTitle>Order #{detail.order.order_number}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Update status</div>
                  <Select value={detail.order!.status} onValueChange={(v) => updateStatus(detail.order!.id, v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-semibold">Customer</div>
                  {detail.order.address && (
                    <div className="mt-1 text-muted-foreground">
                      <div className="text-foreground">{(detail.order.address as { full_name: string }).full_name}</div>
                      <div>{(detail.order.address as { phone: string }).phone}</div>
                      <div>{(detail.order.address as { line1: string }).line1}, {(detail.order.address as { city: string }).city}, {(detail.order.address as { state: string }).state} {(detail.order.address as { pincode: string }).pincode}</div>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-semibold">Items</div>
                  <div className="mt-2 space-y-1">
                    {detail.items.map((i) => (
                      <div key={i.id} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>{formatINR(i.price_cents * i.quantity)}</span></div>
                    ))}
                  </div>
                  <div className="mt-2 border-t pt-2 space-y-1">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatINR(detail.order.subtotal_cents)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{formatINR(detail.order.delivery_cents)}</span></div>
                    <div className="flex justify-between font-bold"><span>Total</span><span>{formatINR(detail.order.total_cents)}</span></div>
                    <div className="text-xs text-muted-foreground">Payment: {detail.order.payment_status}{detail.order.razorpay_payment_id ? ` (${detail.order.razorpay_payment_id})` : ""}</div>
                  </div>
                </div>
                {detail.order.notes && (
                  <div className="rounded-lg border p-3"><div className="font-semibold">Notes</div><div className="mt-1 text-muted-foreground">{detail.order.notes}</div></div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
