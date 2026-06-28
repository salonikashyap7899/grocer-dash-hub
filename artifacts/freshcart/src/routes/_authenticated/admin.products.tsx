import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type ProductForm = {
  id?: string; name: string; slug: string; description: string; unit: string;
  price_cents: number; mrp_cents: number; stock: number; image_url: string;
  category_id: string; active: boolean; featured: boolean;
};

const empty: ProductForm = { name: "", slug: "", description: "", unit: "1 unit", price_cents: 0, mrp_cents: 0, stock: 0, image_url: "", category_id: "", active: true, featured: false };

function AdminProducts() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(empty);

  const { data: products } = useQuery({
    queryKey: ["admin-products", q],
    queryFn: async () => {
      let query = supabase.from("products").select("*, category:categories(name)").order("created_at", { ascending: false });
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query;
      return data ?? [];
    },
  });
  const { data: cats } = useQuery({
    queryKey: ["all-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [],
  });

  const save = async () => {
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload = { ...form, slug };
    if (!payload.name || !payload.category_id) return toast.error("Name and category are required");
    let err;
    if (form.id) ({ error: err } = await supabase.from("products").update(payload).eq("id", form.id));
    else ({ error: err } = await supabase.from("products").insert(payload));
    if (err) return toast.error(err.message);
    toast.success("Saved");
    setOpen(false); setForm(empty);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const edit = (p: {
    id: string; name: string; slug: string; description: string | null; unit: string;
    price_cents: number; mrp_cents: number | null; stock: number; image_url: string | null;
    category_id: string | null; active: boolean; featured: boolean;
  }) => {
    setForm({
      id: p.id, name: p.name, slug: p.slug, description: p.description ?? "", unit: p.unit,
      price_cents: p.price_cents, mrp_cents: p.mrp_cents ?? 0, stock: p.stock, image_url: p.image_url ?? "",
      category_id: p.category_id ?? "", active: p.active, featured: p.featured,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />Add</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-9 bg-card" />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products?.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {p.image_url && <img src={p.image_url} className="h-10 w-10 rounded object-cover" alt="" />}
                    <div className="min-w-0"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.unit}</div></div>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.category?.name ?? "—"}</td>
                <td className="px-3 py-2">{formatINR(p.price_cents)}</td>
                <td className={`px-3 py-2 ${p.stock < 10 ? "text-destructive font-semibold" : ""}`}>{p.stock}</td>
                <td className="px-3 py-2">{p.active ? "Active" : "Hidden"}{p.featured ? " • Featured" : ""}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => edit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Name" v={form.name} on={(v) => setForm({ ...form, name: v })} />
            <F label="Slug (auto if empty)" v={form.slug} on={(v) => setForm({ ...form, slug: v })} />
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Input className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{cats?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <F label="Unit (e.g. 1 kg)" v={form.unit} on={(v) => setForm({ ...form, unit: v })} />
            <FN label="Price (paise/cents)" v={form.price_cents} on={(v) => setForm({ ...form, price_cents: v })} hint={form.price_cents ? formatINR(form.price_cents) : "Enter in paise (₹1 = 100)"} />
            <FN label="MRP (paise)" v={form.mrp_cents} on={(v) => setForm({ ...form, mrp_cents: v })} />
            <FN label="Stock" v={form.stock} on={(v) => setForm({ ...form, stock: v })} />
            <div className="sm:col-span-2"><F label="Image URL" v={form.image_url} on={(v) => setForm({ ...form, image_url: v })} /></div>
            <Toggle label="Active" v={form.active} on={(v) => setForm({ ...form, active: v })} />
            <Toggle label="Featured" v={form.featured} on={(v) => setForm({ ...form, featured: v })} />
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><Input className="mt-1" value={v} onChange={(e) => on(e.target.value)} /></div>;
}
function FN({ label, v, on, hint }: { label: string; v: number; on: (v: number) => void; hint?: string }) {
  return <div><Label className="text-xs">{label}</Label><Input className="mt-1" type="number" value={v} onChange={(e) => on(Number(e.target.value))} />{hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}</div>;
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return <div className="flex items-center gap-2 pt-6"><Switch checked={v} onCheckedChange={on} /><span className="text-sm">{label}</span></div>;
}
