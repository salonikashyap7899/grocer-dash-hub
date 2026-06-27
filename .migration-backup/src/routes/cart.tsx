import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — FreshCart" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, upsert } = useCart();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const nav = useNavigate();
  const free = settings ? subtotal >= settings.free_delivery_threshold_cents : false;
  const delivery = items.length === 0 ? 0 : free ? 0 : settings?.delivery_fee_cents ?? 0;
  const total = subtotal + delivery;

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-extrabold">Your cart</h1>

        {!user ? (
          <div className="mt-6 rounded-xl border bg-card p-8 text-center">
            <p>Please sign in to view your cart.</p>
            <Button asChild className="mt-3"><Link to="/auth" search={{ redirect: "/cart" }}>Sign in</Link></Button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-xl border bg-card p-10 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-4"><Link to="/">Browse products</Link></Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-secondary/40">
                    {i.product.image_url && <img src={i.product.image_url} alt={i.product.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-medium">{i.product.name}</div>
                    <div className="text-xs text-muted-foreground">{i.product.unit}</div>
                    <div className="mt-1 text-sm font-bold">{formatINR(i.product.price_cents)}</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-md bg-primary text-primary-foreground">
                    <button className="grid h-8 w-7 place-items-center" onClick={() => upsert.mutate({ productId: i.product_id, quantity: i.quantity - 1 })}><Minus className="h-3.5 w-3.5"/></button>
                    <span className="min-w-[1.5rem] text-center text-sm font-bold">{i.quantity}</span>
                    <button className="grid h-8 w-7 place-items-center" onClick={() => upsert.mutate({ productId: i.product_id, quantity: i.quantity + 1 })}><Plus className="h-3.5 w-3.5"/></button>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive" onClick={() => upsert.mutate({ productId: i.product_id, quantity: 0 })}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <aside className="space-y-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="text-sm font-semibold">Bill details</div>
                <Row label="Subtotal" value={formatINR(subtotal)} />
                <Row label={free ? "Delivery (free)" : "Delivery"} value={delivery === 0 ? "FREE" : formatINR(delivery)} />
                <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                  <span>Total</span><span>{formatINR(total)}</span>
                </div>
                {!free && settings && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add {formatINR(settings.free_delivery_threshold_cents - subtotal)} more for free delivery.
                  </p>
                )}
              </div>
              <Button size="lg" className="w-full" onClick={() => nav({ to: "/checkout" })}>Proceed to checkout</Button>
            </aside>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
