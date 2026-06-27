import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/delivery-areas")({
  component: AdminAreas,
});

function AdminAreas() {
  const { data, refetch } = useQuery({
    queryKey: ["admin_areas"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_areas").select("*").order("pincode");
      return data ?? [];
    },
  });

  const [pincode, setPincode] = useState("");
  const [area_name, setName] = useState("");
  const [fee, setFee] = useState("25");
  const [eta, setEta] = useState("15");

  const add = async () => {
    if (!/^\d{6}$/.test(pincode)) return toast.error("Pincode must be 6 digits");
    if (!area_name) return toast.error("Area name required");
    const { error } = await supabase.from("delivery_areas").insert({
      pincode, area_name, delivery_fee: Number(fee) || 0, eta_minutes: Number(eta) || 15,
    });
    if (error) return toast.error(error.message);
    toast.success("Area added");
    setPincode(""); setName(""); setFee("25"); setEta("15");
    refetch();
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from("delivery_areas").update({ is_active }).eq("id", id);
    refetch();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this delivery area?")) return;
    await supabase.from("delivery_areas").delete().eq("id", id);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold">Delivery areas</h1>
        <p className="text-sm text-muted-foreground">Only orders to active pincodes can be placed.</p>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-5">
          <div><Label className="text-xs">Pincode</Label><Input value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={6} /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Area name</Label><Input value={area_name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Fee (₹)</Label><Input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" /></div>
          <div><Label className="text-xs">ETA (min)</Label><Input value={eta} onChange={(e) => setEta(e.target.value)} inputMode="numeric" /></div>
        </div>
        <Button className="mt-3" onClick={add}>Add area</Button>
      </section>

      <section className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Pincode</th><th>Area</th><th>Fee</th><th>ETA</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {data?.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-mono">{a.pincode}</td>
                <td>{a.area_name}</td>
                <td>₹{Number(a.delivery_fee).toFixed(0)}</td>
                <td>{a.eta_minutes} min</td>
                <td><Switch checked={a.is_active} onCheckedChange={(v) => toggle(a.id, v)} /></td>
                <td><Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {data && data.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No delivery areas yet</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
