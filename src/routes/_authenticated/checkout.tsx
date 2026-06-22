import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder, verifyPayment, clearCartAfterCOD } from "@/lib/checkout.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Checkout — FreshCart" }] }),
  component: Checkout,
});

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }
}

function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const nav = useNavigate();
  const placeFn = useServerFn(placeOrder);
  const verifyFn = useServerFn(verifyPayment);
  const codFn = useServerFn(clearCartAfterCOD);

  const free = settings ? subtotal >= settings.free_delivery_threshold_cents : false;
  const delivery = items.length === 0 ? 0 : free ? 0 : settings?.delivery_fee_cents ?? 0;
  const total = subtotal + delivery;

  const [addressId, setAddressId] = useState<string>("");
  const [pay, setPay] = useState<"cod" | "razorpay">("razorpay");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [na, setNa] = useState({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });

  const { data: addresses, refetch } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (addresses && addresses.length && !addressId) setAddressId(addresses[0].id);
    if (addresses && addresses.length === 0) setShowNew(true);
  }, [addresses, addressId]);

  const addAddress = async () => {
    if (!user) return;
    if (!na.full_name || !na.phone || !na.line1 || !na.city || !na.state || !na.pincode) {
      return toast.error("Fill all address fields");
    }
    const { data, error } = await supabase.from("addresses").insert({
      user_id: user.id, ...na, is_default: (addresses?.length ?? 0) === 0,
    }).select().single();
    if (error) return toast.error(error.message);
    setAddressId(data!.id);
    setShowNew(false);
    setNa({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    refetch();
  };

  const checkout = async () => {
    if (!addressId) return toast.error("Add a delivery address");
    if (items.length === 0) return toast.error("Your cart is empty");
    setLoading(true);
    try {
      const res = await placeFn({ data: { addressId, paymentMethod: pay, notes } });
      if (pay === "cod") {
        await codFn({ data: { orderId: res.orderId } });
        clear.mutate();
        qc.invalidateQueries({ queryKey: ["orders"] });
        toast.success("Order placed!");
        nav({ to: "/orders/$id", params: { id: res.orderId } });
        return;
      }
      // Razorpay
      if (!res.razorpay) throw new Error("Payment init failed");
      if (!window.Razorpay) throw new Error("Razorpay script not loaded");
      const rzp = new window.Razorpay({
        key: res.razorpay.keyId,
        amount: res.razorpay.amount,
        currency: "INR",
        name: settings?.store_name ?? "FreshCart",
        description: `Order ${res.orderNumber}`,
        order_id: res.razorpay.orderId,
        prefill: { email: user?.email },
        theme: { color: "#16a34a" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyFn({ data: {
              orderId: res.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }});
            qc.invalidateQueries();
            toast.success("Payment successful!");
            nav({ to: "/orders/$id", params: { id: res.orderId } });
          } catch (e) {
            toast.error((e as Error).message);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-extrabold">Checkout</h1>

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Delivery address</h2>
                {addresses && addresses.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setShowNew((v) => !v)}>
                    {showNew ? "Cancel" : "+ Add new"}
                  </Button>
                )}
              </div>

              {addresses && addresses.length > 0 && (
                <RadioGroup value={addressId} onValueChange={setAddressId} className="mt-3 space-y-2">
                  {addresses.map((a) => (
                    <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${addressId === a.id ? "border-primary bg-primary/5" : ""}`}>
                      <RadioGroupItem value={a.id} className="mt-1" />
                      <div className="text-sm">
                        <div className="font-semibold">{a.label} • {a.full_name}</div>
                        <div className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</div>
                        <div className="text-muted-foreground">Phone: {a.phone}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {showNew && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <FieldRow label="Full name" v={na.full_name} on={(v) => setNa({ ...na, full_name: v })} />
                  <FieldRow label="Phone" v={na.phone} on={(v) => setNa({ ...na, phone: v })} />
                  <FieldRow className="sm:col-span-2" label="Address line 1" v={na.line1} on={(v) => setNa({ ...na, line1: v })} />
                  <FieldRow className="sm:col-span-2" label="Address line 2 (optional)" v={na.line2} on={(v) => setNa({ ...na, line2: v })} />
                  <FieldRow label="City" v={na.city} on={(v) => setNa({ ...na, city: v })} />
                  <FieldRow label="State" v={na.state} on={(v) => setNa({ ...na, state: v })} />
                  <FieldRow label="Pincode" v={na.pincode} on={(v) => setNa({ ...na, pincode: v })} />
                  <div className="sm:col-span-2">
                    <Button onClick={addAddress}>Save address</Button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-semibold">Payment method</h2>
              <RadioGroup value={pay} onValueChange={(v) => setPay(v as "cod" | "razorpay")} className="mt-3 space-y-2">
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${pay === "razorpay" ? "border-primary bg-primary/5" : ""}`}>
                  <RadioGroupItem value="razorpay" />
                  <div>
                    <div className="text-sm font-semibold">Pay online (Razorpay)</div>
                    <div className="text-xs text-muted-foreground">UPI, cards, netbanking, wallets</div>
                  </div>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${pay === "cod" ? "border-primary bg-primary/5" : ""}`}>
                  <RadioGroupItem value="cod" />
                  <div>
                    <div className="text-sm font-semibold">Cash on Delivery</div>
                    <div className="text-xs text-muted-foreground">Pay when you receive your order</div>
                  </div>
                </label>
              </RadioGroup>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-semibold">Delivery instructions (optional)</h2>
              <Textarea className="mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="E.g. ring the bell twice" />
            </section>
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-semibold">Order summary</div>
              <div className="mt-2 max-h-48 space-y-1 overflow-auto pr-1 text-xs">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between"><span className="line-clamp-1">{i.product.name} × {i.quantity}</span><span>{formatINR(i.product.price_cents * i.quantity)}</span></div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{delivery === 0 ? "FREE" : formatINR(delivery)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatINR(total)}</span></div>
              </div>
            </div>
            <Button size="lg" className="w-full" disabled={loading || items.length === 0} onClick={checkout}>
              {loading ? "Processing…" : `Place order • ${formatINR(total)}`}
            </Button>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}

function FieldRow({ label, v, on, className }: { label: string; v: string; on: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
