import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, statusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My orders — FreshCart" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,status,payment_status,total_cents,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-extrabold">My orders</h1>
        <div className="mt-4 space-y-3">
          {data?.length === 0 && <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No orders yet.</div>}
          {data?.map((o) => (
            <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block rounded-xl border bg-card p-4 hover:border-primary">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Order #{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatINR(o.total_cents)}</div>
                  <Badge variant="secondary" className="mt-1">{statusLabel(o.status)}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
