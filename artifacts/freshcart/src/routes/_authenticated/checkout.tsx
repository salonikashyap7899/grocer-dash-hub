import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder, clearCartAfterOrder, validateCoupon } from "@/lib/checkout";
import { toast } from "sonner";
import { Tag, X, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: Checkout,
});

function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const nav = useNavigate();

  const [addressId, setAddressId] = useState<string>("");
  const [pay, setPay] = useState<"cod">("cod");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountCents: number } | null>(null);
  const [na, setNa] = useState({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });

  const { data: addresses, refetch } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: areas } = useQuery({
    queryKey: ["delivery_areas"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_areas").select("pincode,area_name,delivery_fee,eta_minutes,is_active").eq("is_active", true);
      return (data ?? []) as any[];
    },
  });

  const selectedAddress = addresses?.find((a) => a.id === addressId);
  const matchedArea = selectedAddress ? areas?.find((a) => a.pincode === selectedAddress.pincode) : undefined;
  const free = settings ? subtotal >= settings.free_delivery_threshold_cents : false;
  const areaFeeCents = matchedArea ? Math.round(Number(matchedArea.delivery_fee) * 100) : (settings?.delivery_fee_cents ?? 0);
  const delivery = items.length === 0 ? 0 : free ? 0 : areaFeeCents;
  const discount = applied?.discountCents ?? 0;
  const total = Math.max(0, subtotal + delivery - discount);

  useEffect(() => {
    if (addresses && addresses.length && !addressId) setAddressId(addresses[0].id);
    if (addresses && addresses.length === 0) setShowNew(true);
  }, [addresses, addressId]);

  useEffect(() => {
    if (selectedAddress?.phone && !phone) setPhone(selectedAddress.phone);
  }, [selectedAddress, phone]);

  useEffect(() => {
    if (!applied) return;
    validateCoupon(applied.code, subtotal)
      .then((r) => setApplied({ code: r.code, discountCents: r.discountCents }))
      .catch(() => setApplied(null));
  }, [subtotal]); // eslint-disable-line

  const addAddress = async () => {
    if (!user) return;
    if (!na.full_name || !na.phone || !na.line1 || !na.city || !na.state || !na.pincode) {
      return toast.error("Fill all address fields");
    }
    const { data, error } = await supabase.from("addresses").insert({
      user_id: user.id, ...na, is_default: (addresses?.length ?? 0) === 0,
    }).select().single();
    if (error) return toast.error(error.message);
    setAddressId((data as any).id);
    setShowNew(false);
    setNa({ full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
    refetch();
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const r = await validateCoupon(code, subtotal);
      setApplied({ code: r.code, discountCents: r.discountCents });
      toast.success(`Coupon ${r.code} applied — you saved ${formatINR(r.discountCents)}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const checkout = async () => {
    if (!addressId) return toast.error("Add a delivery address");
    if (!selectedAddress) return toast.error("Select an address");
    if (!matchedArea) return toast.error(`We don't deliver to pincode ${selectedAddress.pincode} yet`);
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit phone");
    if (items.length === 0) return toast.error("Your cart is empty");
    setLoading(true);
    try {
      const res = await placeOrder({
        addressId,
        paymentMethod: pay,
        notes,
        couponCode: applied?.code ?? null,
        pincode: selectedAddress.pincode,
        phone,
      });
      if (user) await clearCartAfterOrder(user.id);
      clear.mutate();
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed!");
      nav({ to: "/orders/$id", params: { id: res.orderId } });
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
                  {addresses.map((a) => {
                    const area = areas?.find((x) => x.pincode === a.pincode);
                    return (
                      <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${addressId === a.id ? "border-primary bg-primary/5" : ""}`}>
                        <RadioGroupItem value={a.id} className="mt-1" />
                        <div className="flex-1 text-sm">
                          <div className="flex flex-wrap items-center gap-2 font-semibold">
                            {a.label} • {a.full_name}
                            {area
                              ? <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {area.eta_minutes} min • {area.area_name}</Badge>
                              : <Badge variant="destructive">Not in delivery zone</Badge>}
                          </div>
                          <div className="text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</div>
                          <div className="text-muted-foreground">Phone: {a.phone}</div>
                        </div>
                      </label>
                    );
                  })}
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
                    {areas && areas.length > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        We deliver to: {areas.map((a) => `${a.pincode} (${a.area_name})`).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-semibold">Contact number for delivery</h2>
              <Input className="mt-3 max-w-xs" inputMode="numeric" maxLength={10} placeholder="10-digit mobile"
                value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
            </section>

            <section className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 font-semibold"><Tag className="h-4 w-4" /> Apply coupon</div>
              {applied ? (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <div>
                    <div className="text-sm font-bold text-primary">{applied.code} applied</div>
                    <div className="text-xs text-muted-foreground">You saved {formatINR(applied.discountCents)}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setApplied(null)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input placeholder="Enter coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} className="max-w-xs" />
                  <Button onClick={applyCoupon} variant="secondary">Apply</Button>
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-semibold">Payment method</h2>
              <div className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                <div>
                  <div className="text-sm font-semibold">Cash on Delivery</div>
                  <div className="text-xs text-muted-foreground">Pay when you receive your order</div>
                </div>
              </div>
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
                  <div key={i.id} className="flex justify-between">
                    <span className="line-clamp-1">{i.product.name} × {i.quantity}</span>
                    <span>{formatINR(i.product.price_cents * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{delivery === 0 ? "FREE" : formatINR(delivery)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-primary"><span>Coupon ({applied?.code})</span><span>-{formatINR(discount)}</span></div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatINR(total)}</span></div>
              </div>
              {matchedArea && (
                <div className="mt-3 rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">
                  Estimated delivery in <b>{matchedArea.eta_minutes} minutes</b> to {matchedArea.area_name}.
                </div>
              )}
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
