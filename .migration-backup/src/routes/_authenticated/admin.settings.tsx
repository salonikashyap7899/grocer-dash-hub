import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });

  const [form, setForm] = useState({ store_name: "", delivery_fee_cents: 0, free_delivery_threshold_cents: 0, delivery_eta: "" });
  useEffect(() => {
    if (data) setForm({ store_name: data.store_name, delivery_fee_cents: data.delivery_fee_cents, free_delivery_threshold_cents: data.free_delivery_threshold_cents, delivery_eta: data.delivery_eta });
  }, [data]);

  const save = async () => {
    const { error } = await supabase.from("settings").update(form).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-extrabold">Store settings</h1>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Row label="Store name" v={form.store_name} on={(v) => setForm({ ...form, store_name: v })} />
        <Row label="Estimated delivery (e.g. 10–15 min)" v={form.delivery_eta} on={(v) => setForm({ ...form, delivery_eta: v })} />
        <NumRow label="Delivery fee (paise — ₹1 = 100)" v={form.delivery_fee_cents} on={(v) => setForm({ ...form, delivery_fee_cents: v })} />
        <NumRow label="Free delivery above (paise)" v={form.free_delivery_threshold_cents} on={(v) => setForm({ ...form, free_delivery_threshold_cents: v })} />
        <Button onClick={save}>Save settings</Button>
      </div>
    </div>
  );
}

function Row({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><Input className="mt-1" value={v} onChange={(e) => on(e.target.value)} /></div>;
}
function NumRow({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return <div><Label className="text-xs">{label}</Label><Input type="number" className="mt-1" value={v} onChange={(e) => on(Number(e.target.value))} /><div className="mt-1 text-xs text-muted-foreground">= ₹{(v / 100).toFixed(0)}</div></div>;
}
