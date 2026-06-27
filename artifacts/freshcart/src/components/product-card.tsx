import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart } from "lucide-react";
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
    if (q > 0 && q > p.stock) {
      toast.error("Out of stock");
      return;
    }
    upsert.mutate({ productId: p.id, quantity: q, product: p });
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Discount badge */}
      {discount > 0 && (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {discount}% OFF
        </div>
      )}

      {/* Delivery time chip */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md bg-[#f0fdf4] px-1.5 py-0.5 text-[9px] font-semibold text-green-700">
        ⚡ 10 min
      </div>

      {/* Image */}
      <Link to="/p/$slug" params={{ slug: p.slug }} className="block">
        <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl">🛒</div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="mt-2 flex-1 min-w-0">
        <div className="text-[11px] text-gray-400 font-medium">{p.unit}</div>
        <Link to="/p/$slug" params={{ slug: p.slug }} className="mt-0.5 block text-sm font-semibold text-gray-800 hover:text-[#0c831f] line-clamp-2 leading-snug">
          {p.name}
        </Link>
      </div>

      {/* Price + Add */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-bold text-gray-900">{formatINR(p.price_cents)}</div>
          {p.mrp_cents && p.mrp_cents > p.price_cents && (
            <div className="text-xs text-gray-400 line-through">{formatINR(p.mrp_cents)}</div>
          )}
        </div>

        {p.stock <= 0 ? (
          <div className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-400 font-medium">
            Sold out
          </div>
        ) : qty === 0 ? (
          <button
            onClick={() => onAdd(1)}
            className="flex items-center gap-1 rounded-xl border-2 border-[#0c831f] bg-white px-3 py-1.5 text-sm font-bold text-[#0c831f] hover:bg-[#0c831f] hover:text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            ADD
          </button>
        ) : (
          <div className="flex items-center rounded-xl bg-[#0c831f] text-white">
            <button
              className="grid h-9 w-9 place-items-center rounded-l-xl hover:bg-green-800 transition-colors"
              onClick={() => onAdd(qty - 1)}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-sm font-bold">{qty}</span>
            <button
              className="grid h-9 w-9 place-items-center rounded-r-xl hover:bg-green-800 transition-colors"
              onClick={() => onAdd(qty + 1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
