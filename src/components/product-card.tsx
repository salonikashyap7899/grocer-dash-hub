import { Link } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export type ProductCardProduct = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  price_cents: number;
  mrp_cents: number | null;
  image_url: string | null;
  stock: number;
};

export function ProductCard({ p }: { p: ProductCardProduct }) {
  const { qtyOf, upsert } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const qty = qtyOf(p.id);
  const discount = p.mrp_cents && p.mrp_cents > p.price_cents
    ? Math.round(((p.mrp_cents - p.price_cents) / p.mrp_cents) * 100)
    : 0;

  const onAdd = (q: number) => {
    if (!user) {
      toast("Please sign in to add to cart");
      nav({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    if (q > p.stock) {
      toast.error("Out of stock");
      return;
    }
    upsert.mutate({ productId: p.id, quantity: q, product: p });
  };

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card p-3 transition hover:shadow-md">
      {discount > 0 && (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          {discount}% OFF
        </div>
      )}
      <Link to="/p/$slug" params={{ slug: p.slug }} className="block">
        <div className="aspect-square overflow-hidden rounded-lg bg-secondary/40">
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>
          )}
        </div>
      </Link>
      <div className="mt-2 flex-1">
        <div className="text-xs text-muted-foreground">{p.unit}</div>
        <Link to="/p/$slug" params={{ slug: p.slug }} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {p.name}
        </Link>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold">{formatINR(p.price_cents)}</div>
          {p.mrp_cents && p.mrp_cents > p.price_cents && (
            <div className="text-xs text-muted-foreground line-through">{formatINR(p.mrp_cents)}</div>
          )}
        </div>
        {p.stock <= 0 ? (
          <Button size="sm" variant="outline" disabled>Out</Button>
        ) : qty === 0 ? (
          <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => onAdd(1)}>
            ADD
          </Button>
        ) : (
          <div className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground">
            <button className="grid h-8 w-7 place-items-center" onClick={() => onAdd(qty - 1)}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[1.5rem] text-center text-sm font-bold">{qty}</span>
            <button className="grid h-8 w-7 place-items-center" onClick={() => onAdd(qty + 1)}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
