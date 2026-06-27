import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — FreshCart` },
      { name: "description", content: `Buy ${params.slug.replace(/-/g, " ")} online at best prices.` },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { qtyOf, upsert } = useCart();

  const { data: p } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,unit,description,price_cents,mrp_cents,image_url,stock,category:categories(name,slug)")
        .eq("slug", slug).single();
      if (error) throw error;
      return data;
    },
  });

  if (!p) return <SiteShell><div className="mx-auto max-w-7xl px-4 py-10">Loading…</div></SiteShell>;
  const qty = qtyOf(p.id);
  const discount = p.mrp_cents && p.mrp_cents > p.price_cents
    ? Math.round(((p.mrp_cents - p.price_cents) / p.mrp_cents) * 100) : 0;

  const change = (q: number) => {
    if (!user) { nav({ to: "/auth", search: { redirect: window.location.pathname } }); return; }
    if (q > p.stock) { toast.error("Out of stock"); return; }
    upsert.mutate({ productId: p.id, quantity: q });
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>{" / "}
          {p.category && <Link to="/c/$slug" params={{ slug: p.category.slug }} className="hover:text-foreground">{p.category.name}</Link>}
          {" / "}<span className="text-foreground">{p.name}</span>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border bg-secondary/30">
            {p.image_url && <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" />}
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{p.unit}</div>
            <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{p.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <div className="text-3xl font-extrabold">{formatINR(p.price_cents)}</div>
              {p.mrp_cents && p.mrp_cents > p.price_cents && (
                <>
                  <div className="text-lg text-muted-foreground line-through">{formatINR(p.mrp_cents)}</div>
                  <div className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">{discount}% OFF</div>
                </>
              )}
            </div>
            <p className="mt-4 text-muted-foreground">{p.description || "Fresh and high-quality. Delivered fast."}</p>

            <div className="mt-6 flex items-center gap-3">
              {p.stock <= 0 ? (
                <Button disabled size="lg">Out of stock</Button>
              ) : qty === 0 ? (
                <Button size="lg" onClick={() => change(1)} className="gap-2"><ShoppingCart className="h-4 w-4"/>Add to cart</Button>
              ) : (
                <div className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground">
                  <button className="grid h-11 w-11 place-items-center" onClick={() => change(qty - 1)}><Minus className="h-4 w-4"/></button>
                  <span className="min-w-[2.5rem] text-center font-bold">{qty}</span>
                  <button className="grid h-11 w-11 place-items-center" onClick={() => change(qty + 1)}><Plus className="h-4 w-4"/></button>
                </div>
              )}
              <Button asChild variant="outline" size="lg"><Link to="/cart">Go to cart</Link></Button>
            </div>

            <div className="mt-6 rounded-xl border bg-secondary/40 p-4 text-sm">
              <div className="font-semibold">Why FreshCart?</div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Delivered in minutes</li>
                <li>• 100% return guarantee on quality issues</li>
                <li>• Secure checkout</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
