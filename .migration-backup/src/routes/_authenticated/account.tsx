import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My account — FreshCart" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const { data: addresses } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").order("is_default", { ascending: false })).data ?? [],
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").update({ full_name: fullName || profile?.full_name, phone: phone || profile?.phone }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const [na, setNa] = useState({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
  const addAddress = async () => {
    if (!na.full_name || !na.phone || !na.line1 || !na.city || !na.state || !na.pincode) return toast.error("Fill all fields");
    const { error } = await supabase.from("addresses").insert({ user_id: user!.id, ...na, is_default: (addresses?.length ?? 0) === 0 });
    if (error) return toast.error(error.message);
    setNa({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    qc.invalidateQueries({ queryKey: ["addresses"] });
  };

  const deleteAddr = async (id: string) => {
    await supabase.from("addresses").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["addresses"] });
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-extrabold">My account</h1>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Profile</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><Label className="text-xs">Email</Label><Input value={user?.email ?? ""} disabled className="mt-1" /></div>
            <div><Label className="text-xs">Full name</Label><Input className="mt-1" defaultValue={profile?.full_name ?? ""} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label className="text-xs">Phone</Label><Input className="mt-1" defaultValue={profile?.phone ?? ""} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <Button className="mt-3" onClick={saveProfile}>Save</Button>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Saved addresses</h2>
          <div className="mt-3 space-y-2">
            {addresses?.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-semibold">{a.label} • {a.full_name}</div>
                  <div className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</div>
                  <div className="text-muted-foreground">Phone: {a.phone}</div>
                </div>
                <button onClick={() => deleteAddr(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border p-3">
            <div className="text-sm font-semibold">Add new address</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <In label="Label" v={na.label} on={(v) => setNa({ ...na, label: v })} />
              <In label="Full name" v={na.full_name} on={(v) => setNa({ ...na, full_name: v })} />
              <In label="Phone" v={na.phone} on={(v) => setNa({ ...na, phone: v })} />
              <In label="Pincode" v={na.pincode} on={(v) => setNa({ ...na, pincode: v })} />
              <In className="sm:col-span-2" label="Address line 1" v={na.line1} on={(v) => setNa({ ...na, line1: v })} />
              <In className="sm:col-span-2" label="Address line 2" v={na.line2} on={(v) => setNa({ ...na, line2: v })} />
              <In label="City" v={na.city} on={(v) => setNa({ ...na, city: v })} />
              <In label="State" v={na.state} on={(v) => setNa({ ...na, state: v })} />
            </div>
            <Button className="mt-3" onClick={addAddress}>Add address</Button>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

function In({ label, v, on, className }: { label: string; v: string; on: (v: string) => void; className?: string }) {
  return <div className={className}><Label className="text-xs">{label}</Label><Input className="mt-1" value={v} onChange={(e) => on(e.target.value)} /></div>;
}
