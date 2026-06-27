import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { salesReport } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/format";
import { Download, IndianRupee, ShoppingBag, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function toLocalDateInput(d: Date) { return d.toISOString().slice(0, 10); }

function AdminReports() {
  const [from, setFrom] = useState(toLocalDateInput(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(toLocalDateInput(new Date()));

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["sales_report", from, to],
    queryFn: () => salesReport(new Date(from).toISOString(), new Date(`${to}T23:59:59`).toISOString()),
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Order #", "Date", "Status", "Payment", "Coupon", "Subtotal", "Delivery", "Discount", "Total"],
      ...data.orders.map((o: any) => [
        o.order_number, new Date(o.created_at).toISOString(), o.status, o.payment_status,
        o.coupon_code ?? "", (o.subtotal_cents / 100).toFixed(2), (o.delivery_cents / 100).toFixed(2),
        Number(o.discount_amount).toFixed(2), (o.total_cents / 100).toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sales-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const maxRev = Math.max(1, ...(data?.byDay.map((d: any) => d.revenueCents) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Sales reports</h1>
          <p className="text-sm text-muted-foreground">Revenue, orders, top products with CSV export.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Loading…" : "Refresh"}</Button>
          <Button variant="secondary" onClick={exportCsv} disabled={!data}><Download className="mr-2 h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<IndianRupee className="h-5 w-5" />} label="Revenue" value={data ? formatINR(data.revenueCents) : "—"} />
        <Stat icon={<ShoppingBag className="h-5 w-5" />} label="Orders" value={data ? String(data.orderCount) : "—"} />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="Avg order" value={data ? formatINR(data.avgOrderCents) : "—"} />
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Revenue by day</div>
        <div className="flex h-48 items-end gap-1">
          {(data?.byDay ?? []).map((d: any) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date} • ${formatINR(d.revenueCents)} • ${d.orders} orders`}>
              <div className="w-full rounded-t bg-primary/80 transition-all" style={{ height: `${(d.revenueCents / maxRev) * 100}%` }} />
              <div className="hidden text-[10px] text-muted-foreground sm:block">{d.date.slice(5)}</div>
            </div>
          ))}
          {data && data.byDay.length === 0 && <div className="grid w-full place-items-center text-sm text-muted-foreground">No sales in this range</div>}
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-4 text-sm font-semibold">Top products</div>
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Product</th><th>Units</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {data?.topProducts.map((p: any) => (
              <tr key={p.name} className="border-t"><td className="p-3">{p.name}</td><td>{p.qty}</td><td>{formatINR(p.revenueCents)}</td></tr>
            ))}
            {data && data.topProducts.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No data</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-extrabold">{value}</div></div>
    </div>
  );
}
