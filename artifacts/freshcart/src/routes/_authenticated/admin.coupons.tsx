import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: AdminCoupons,
});

const empty = {
  code: "", description: "", type: "flat" as "flat" | "percent",
  value: "50", min_order_amount: "0", max_discount: "", usage_limit: "", per_user_limit: "1",
  expires_at: "", is_active: true,
};

function AdminCoupons() {
  const { data, refetch } = useQuery({
    queryKey: ["admin_coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [f, setF] = useState(empty);

  const add = async () => {
    const code = f.code.trim().toUpperCase();
    if (!code) return toast.error("Code required");
    const payload = {
      code, description: f.description || null, type: f.type,
      value: Number(f.value) || 0,
      min_order_amount: Number(f.min_order_amount) || 0,
      max_discount: f.max_discount ? Number(f.max_discount) : null,
      usage_limit: f.usage_limit ? Number(f.usage_limit) : null,
      per_user_limit: Number(f.per_user_limit) || 1,
      expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
      is_active: f.is_active,
    };
    const { error } = await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Coupon created");
    setF(empty); refetch();
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("coupons").update({ is_active: v }).eq("id", id);
    refetch();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold">Coupons</h1>
        <p className="text-sm text-muted-foreground">Percent or flat-amount discounts with usage limits and expiry.</p>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label className="text-xs">Code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="WELCOME50" /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as "flat" | "percent" })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="flat">Flat ₹</SelectItem><SelectItem value="percent">Percent %</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Value</Label><Input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
          <div><Label className="text-xs">Min order ₹</Label><Input value={f.min_order_amount} onChange={(e) => setF({ ...f, min_order_amount: e.target.value })} /></div>
          <div><Label className="text-xs">Max discount ₹ (percent only)</Label><Input value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} /></div>
          <div><Label className="text-xs">Total usage limit</Label><Input value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value })} placeholder="unlimited" /></div>
          <div><Label className="text-xs">Per-user limit</Label><Input value={f.per_user_limit} onChange={(e) => setF({ ...f, per_user_limit: e.target.value })} /></div>
          <div><Label className="text-xs">Expires at</Label><Input type="datetime-local" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
          <div className="flex items-end gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /> <span className="text-sm">Active</span></div>
        </div>
        <Button className="mt-3" onClick={add}>Create coupon</Button>
      </section>

      <section className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expires</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3"><div className="font-mono font-bold">{c.code}</div><div className="text-xs text-muted-foreground">{c.description}</div></td>
                <td>{c.type === "flat" ? `₹${Number(c.value).toFixed(0)}` : `${Number(c.value)}% ${c.max_discount ? `(max ₹${Number(c.max_discount).toFixed(0)})` : ""}`}</td>
                <td>₹{Number(c.min_order_amount).toFixed(0)}</td>
                <td>{c.times_used}{c.usage_limit ? `/${c.usage_limit}` : ""}</td>
                <td className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleString() : <Badge variant="secondary">No expiry</Badge>}</td>
                <td><Switch checked={c.is_active} onCheckedChange={(v) => toggle(c.id, v)} /></td>
                <td><Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {data && data.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No coupons yet</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
