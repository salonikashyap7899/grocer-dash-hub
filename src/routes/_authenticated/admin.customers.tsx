import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const { data } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: orders } = await supabase.from("orders").select("user_id, total_cents");
      const counts = new Map<string, { count: number; spent: number }>();
      (orders ?? []).forEach((o) => {
        const c = counts.get(o.user_id) ?? { count: 0, spent: 0 };
        c.count++; c.spent += o.total_cents;
        counts.set(o.user_id, c);
      });
      return (profiles ?? []).map((p) => ({ ...p, ...(counts.get(p.id) ?? { count: 0, spent: 0 }) }));
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Customers</h1>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">Orders</th><th className="px-3 py-2">Spent (paise)</th></tr>
          </thead>
          <tbody className="divide-y">
            {data?.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2">{c.full_name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.phone ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-3 py-2">{c.count}</td>
                <td className="px-3 py-2">₹{(c.spent / 100).toFixed(0)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No customers yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
