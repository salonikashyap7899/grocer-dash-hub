import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

type CatForm = { id?: string; name: string; slug: string; image_url: string; sort_order: number; active: boolean };
const empty: CatForm = { name: "", slug: "", image_url: "", sort_order: 0, active: true };

function AdminCategories() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CatForm>(empty);

  const { data } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const save = async () => {
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload = { ...form, slug };
    if (!payload.name) return toast.error("Name required");
    let err;
    if (form.id) ({ error: err } = await supabase.from("categories").update(payload).eq("id", form.id));
    else ({ error: err } = await supabase.from("categories").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Saved");
    setOpen(false); setForm(empty);
    qc.invalidateQueries({ queryKey: ["admin-cats"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-cats"] });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <h1 className="text-2xl font-extrabold">Categories</h1>
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />Add</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary/40">{c.image_url && <img src={c.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">/{c.slug} • {c.active ? "Active" : "Hidden"}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setForm({ id: c.id, name: c.name, slug: c.slug, image_url: c.image_url ?? "", sort_order: c.sort_order, active: c.active }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit category" : "Add category"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Inp label="Name" v={form.name} on={(v) => setForm({ ...form, name: v })} />
            <Inp label="Slug (auto if empty)" v={form.slug} on={(v) => setForm({ ...form, slug: v })} />
            <Inp label="Image URL" v={form.image_url} on={(v) => setForm({ ...form, image_url: v })} />
            <div><Label className="text-xs">Sort order</Label><Input type="number" className="mt-1" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><span className="text-sm">Active</span></div>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Inp({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><Input className="mt-1" value={v} onChange={(e) => on(e.target.value)} /></div>;
}
