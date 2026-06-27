import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Zap, ChevronRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/use-settings";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreshCart — Groceries in 10 minutes" },
      { name: "description", content: "Shop fresh groceries, dairy, snacks and essentials. Delivered in 10 minutes." },
    ],
  }),
  component: Home,
});

// Blinkit-style category colors
const CAT_COLORS = [
  "bg-[#fef3c7]", "bg-[#dcfce7]", "bg-[#dbeafe]", "bg-[#fce7f3]",
  "bg-[#f3e8ff]", "bg-[#ffedd5]", "bg-[#e0f2fe]", "bg-[#fef9c3]",
];

// Promo banners
const BANNERS = [
  {
    title: "Groceries in 10 minutes",
    subtitle: "Fresh produce at best prices",
    cta: "Order now",
    bg: "from-[#0c831f] to-[#16a34a]",
    emoji: "🥦",
    slug: "fruits-vegetables",
  },
  {
    title: "Fresh dairy daily",
    subtitle: "Milk, curd, paneer & more",
    cta: "Shop dairy",
    bg: "from-[#1d4ed8] to-[#3b82f6]",
    emoji: "🥛",
    slug: "dairy-eggs",
  },
  {
    title: "Snacks & drinks",
    subtitle: "Your favourites, delivered fast",
    cta: "Explore",
    bg: "from-[#9333ea] to-[#c084fc]",
    emoji: "🍿",
    slug: "snacks-beverages",
  },
];

function Home() {
  const { data: settings } = useSettings();
  const { count } = useCart();

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
        .eq("active", true).eq("featured", true).limit(18);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allCats } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug").eq("active", true).order("sort_order").limit(20);
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      {/* ─── HERO BANNERS ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-5 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BANNERS.map((b) => (
            <Link
              key={b.slug}
              to="/c/$slug"
              params={{ slug: b.slug }}
              className={`relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r ${b.bg} p-5 text-white transition hover:opacity-95 hover:shadow-lg`}
            >
              <div>
                <div className="text-lg font-extrabold leading-snug">{b.title}</div>
                <div className="mt-1 text-sm text-white/80">{b.subtitle}</div>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  {b.cta} <ChevronRight className="h-3 w-3" />
                </div>
              </div>
              <div className="text-5xl select-none">{b.emoji}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── CATEGORY PILLS ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900">Shop by category</h2>
          <Link to="/search" search={{ q: "" }} className="text-sm text-[#0c831f] font-semibold hover:underline">
            See all →
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
          {!categories
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                  <div className="aspect-square w-full rounded-2xl bg-gray-100" />
                  <div className="h-3 w-3/4 rounded bg-gray-100" />
                </div>
              ))
            : categories.map((c, i) => (
                <Link
                  key={c.id}
                  to="/c/$slug"
                  params={{ slug: c.slug }}
                  preload="intent"
                  className="group flex flex-col items-center gap-2"
                >
                  <div className={`aspect-square w-full overflow-hidden rounded-2xl ${CAT_COLORS[i % CAT_COLORS.length]} transition group-hover:scale-105 group-hover:shadow-md`}>
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-2xl">🛒</div>
                    )}
                  </div>
                  <div className="text-center text-[11px] font-semibold text-gray-700 leading-tight">{c.name}</div>
                </Link>
              ))}
        </div>
      </section>

      {/* ─── DELIVERY PROMISE STRIP ───────────────────────────── */}
      <section className="bg-[#0c831f] py-4 my-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-white text-sm font-semibold">
            <span className="flex items-center gap-2">⚡ {settings?.delivery_eta ?? "10 min"} delivery</span>
            <span className="flex items-center gap-2">🌿 5000+ fresh products</span>
            <span className="flex items-center gap-2">🚚 Free delivery above ₹{((settings?.free_delivery_threshold_cents ?? 49900) / 100).toFixed(0)}</span>
            <span className="flex items-center gap-2">💯 Best prices guaranteed</span>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY BROWSING STRIPS ─────────────────────────── */}
      {(allCats ?? []).slice(0, 4).map((cat, ci) => (
        <FeaturedByCategory key={cat.id} catId={cat.id} catName={cat.name} catSlug={cat.slug} colorIdx={ci} />
      ))}

      {/* ─── FEATURED TODAY ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900">Featured today</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {!featured
            ? Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)
            : featured.map((p) => (
                <div key={p.id} className="animate-fade-in">
                  <ProductCard p={p} />
                </div>
              ))}
        </div>
      </section>

      {/* ─── STICKY CART BAR ──────────────────────────────────── */}
      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-[#0c831f] text-white px-4 py-3 shadow-2xl md:hidden">
          <Link to="/cart" className="flex items-center justify-between">
            <span className="text-sm font-bold">{count} item{count > 1 ? "s" : ""} in cart</span>
            <span className="flex items-center gap-1 text-sm font-bold">View cart →</span>
          </Link>
        </div>
      )}
    </SiteShell>
  );
}

function FeaturedByCategory({ catId, catName, catSlug, colorIdx }: { catId: string; catName: string; catSlug: string; colorIdx: number }) {
  const { data: products } = useQuery({
    queryKey: ["cat-preview", catId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock")
        .eq("active", true)
        .eq("category_id", catId)
        .order("sort_order")
        .limit(6);
      return data ?? [];
    },
  });

  if (!products || products.length === 0) return null;

  const bannerColors = ["bg-amber-50 border-amber-100", "bg-blue-50 border-blue-100", "bg-purple-50 border-purple-100", "bg-rose-50 border-rose-100"];

  return (
    <section className={`mx-4 mb-6 rounded-2xl border p-4 ${bannerColors[colorIdx % bannerColors.length]}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900">{catName}</h2>
        <Link
          to="/c/$slug"
          params={{ slug: catSlug }}
          className="flex items-center gap-1 rounded-full border border-[#0c831f] px-3 py-1 text-xs font-semibold text-[#0c831f] hover:bg-[#0c831f] hover:text-white transition"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 animate-pulse">
      <div className="aspect-square w-full rounded-xl bg-gray-100" />
      <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
      <div className="mt-1 h-4 w-3/4 rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
    </div>
  );
}
