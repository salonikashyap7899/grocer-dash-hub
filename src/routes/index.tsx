import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Truck, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreshCart — Groceries delivered in minutes" },
      { name: "description", content: "Shop fresh groceries, dairy, snacks and essentials. Delivered in minutes." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: settings } = useSettings();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,image_url")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock")
        .eq("active", true).eq("featured", true).limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <section className="bg-gradient-to-br from-brand/40 via-primary/10 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Clock className="h-3 w-3" /> Delivered in {settings?.delivery_eta ?? "10–15 min"}
              </div>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">
                Fresh groceries, <span className="text-primary">at your door</span>.
              </h1>
              <p className="mt-3 text-muted-foreground md:text-lg">
                Over 5,000 products. Best prices guaranteed. Free delivery on orders above ₹{((settings?.free_delivery_threshold_cents ?? 49900)/100).toFixed(0)}.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/c/$slug" params={{ slug: "fruits-vegetables" }} className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Shop fruits & veg
                </Link>
                <Link to="/c/$slug" params={{ slug: "grocery-essentials" }} className="rounded-md border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-secondary">
                  Grocery essentials
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary"/> Fast delivery</div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/> Secure pay</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/> 24/7 service</div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=900"
                alt="Fresh groceries"
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl font-bold md:text-2xl">Shop by category</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {!categories
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-3">
                  <div className="aspect-square w-full animate-pulse rounded-lg bg-secondary/60" />
                  <div className="mx-auto mt-2 h-3 w-3/4 animate-pulse rounded bg-secondary/60" />
                </div>
              ))
            : categories.map((c) => (
                <Link
                  key={c.id}
                  to="/c/$slug"
                  params={{ slug: c.slug }}
                  preload="intent"
                  className="group flex flex-col items-center rounded-xl border bg-card p-3 text-center transition hover:border-primary hover:shadow-md animate-fade-in"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-secondary/40">
                    {c.image_url && (
                      <img src={c.image_url} alt={c.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    )}
                  </div>
                  <div className="mt-2 text-xs font-medium leading-tight md:text-sm">{c.name}</div>
                </Link>
              ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="text-xl font-bold md:text-2xl">Featured today</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {!featured
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-3">
                  <div className="aspect-square w-full animate-pulse rounded-lg bg-secondary/60" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-secondary/60" />
                  <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-secondary/60" />
                </div>
              ))
            : featured.map((p) => <div key={p.id} className="animate-fade-in"><ProductCard p={p} /></div>)}
        </div>
      </section>
    </SiteShell>
  );
}
