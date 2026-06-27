import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/c/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — FreshCart` },
      { name: "description", content: `Shop ${params.slug.replace(/-/g, " ")} online. Fresh, affordable, delivered fast.` },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();

  const { data } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data: cat } = await supabase.from("categories").select("id,name,slug,image_url").eq("slug", slug).single();
      const { data: products } = await supabase
        .from("products")
        .select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock")
        .eq("active", true)
        .eq("category_id", cat?.id ?? "")
        .order("featured", { ascending: false });
      const { data: allCats } = await supabase.from("categories").select("id,name,slug").eq("active", true).order("sort_order");
      return { cat, products: products ?? [], allCats: allCats ?? [] };
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> / {data?.cat?.name}
        </div>

        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <div className="sticky top-20 rounded-xl border bg-card p-2">
              {data?.allCats.map((c) => (
                <Link
                  key={c.id}
                  to="/c/$slug"
                  params={{ slug: c.slug }}
                  className={`block rounded-md px-3 py-2 text-sm hover:bg-secondary ${c.slug === slug ? "bg-secondary font-semibold text-primary" : ""}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </aside>
          <div>
            <h1 className="text-2xl font-extrabold">{data?.cat?.name ?? "Category"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data?.products.length ?? 0} products</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data?.products.map((p) => <ProductCard key={p.id} p={p} />)}
              {data?.products.length === 0 && (
                <div className="col-span-full rounded-xl border bg-card p-8 text-center text-muted-foreground">
                  No products yet in this category.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
