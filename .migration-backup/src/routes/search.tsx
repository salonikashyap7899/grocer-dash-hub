import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Search — FreshCart" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data } = useQuery({
    queryKey: ["search", q],
    enabled: !!q,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock")
        .ilike("name", `%${q}%`).eq("active", true).limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-xl font-bold">Search results for "{q}"</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? 0} products</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data?.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </SiteShell>
  );
}
