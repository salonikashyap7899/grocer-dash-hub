import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, statusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, ShoppingBag, Package, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ data: orders }, { count: productCount }, { data: lowStock }] = await Promise.all([
        supabase.from("orders").select("id,order_number,status,total_cents,created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id,name,stock").lt("stock", 10).order("stock").limit(5),
      ]);
      const { data: all } = await supabase.from("orders").select("total_cents,created_at,payment_status");
      const revenue = (all ?? []).filter(o => o.payment_status === "paid").reduce((s, o) => s + o.total_cents, 0);
      const todayOrders = (all ?? []).filter(o => new Date(o.created_at) >= today).length;
      return { recent: orders ?? [], productCount: productCount ?? 0, lowStock: lowStock ?? [], revenue, totalOrders: all?.length ?? 0, todayOrders };
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<IndianRupee className="h-4 w-4" />} label="Revenue (paid)" value={formatINR(data?.revenue ?? 0)} />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Total orders" value={String(data?.totalOrders ?? 0)} />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} label="Today's orders" value={String(data?.todayOrders ?? 0)} />
        <Stat icon={<Package className="h-4 w-4" />} label="Products" value={String(data?.productCount ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Recent orders</h2>
          <div className="mt-3 divide-y text-sm">
            {data?.recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">#{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatINR(o.total_cents)}</div>
                  <Badge variant="secondary" className="text-xs">{statusLabel(o.status)}</Badge>
                </div>
              </div>
            ))}
            {(!data?.recent || data.recent.length === 0) && <div className="py-4 text-center text-muted-foreground">No orders yet</div>}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-brand-foreground" /> Low stock</h2>
          <div className="mt-3 divide-y text-sm">
            {data?.lowStock.map((p) => (
              <div key={p.id} className="flex justify-between py-2">
                <span>{p.name}</span>
                <span className="font-semibold text-destructive">{p.stock} left</span>
              </div>
            ))}
            {(!data?.lowStock || data.lowStock.length === 0) && <div className="py-4 text-center text-muted-foreground">All stocked up</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
