import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const placeOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(["cod", "razorpay"]),
  notes: z.string().max(500).optional(),
  couponCode: z.string().trim().toUpperCase().max(40).optional().nullable(),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit phone"),
});

type LineItem = {
  product_id: string;
  name: string;
  unit: string | null;
  image_url: string | null;
  price_cents: number;
  quantity: number;
};

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof placeOrderSchema>) => placeOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: cart, error: cartErr } = await supabase
      .from("cart_items")
      .select("product_id, quantity, product:products(id,name,unit,price_cents,image_url,stock,active)")
      .eq("user_id", userId);
    if (cartErr) throw new Error(cartErr.message);
    if (!cart || cart.length === 0) throw new Error("Cart is empty");

    const items: LineItem[] = [];
    for (const c of cart as Array<{ product_id: string; quantity: number; product: { id: string; name: string; unit: string | null; price_cents: number; image_url: string | null; stock: number; active: boolean } }>) {
      if (!c.product || !c.product.active) throw new Error("A product in your cart is unavailable");
      if (c.quantity > c.product.stock) throw new Error(`${c.product.name} is out of stock`);
      items.push({
        product_id: c.product_id,
        name: c.product.name,
        unit: c.product.unit,
        image_url: c.product.image_url,
        price_cents: c.product.price_cents,
        quantity: c.quantity,
      });
    }

    const { data: addr, error: addrErr } = await supabase
      .from("addresses").select("*").eq("id", data.addressId).eq("user_id", userId).single();
    if (addrErr || !addr) throw new Error("Invalid address");

    // Validate pincode against delivery_areas
    const { data: area } = await supabase
      .from("delivery_areas")
      .select("pincode, area_name, delivery_fee, eta_minutes, is_active")
      .eq("pincode", data.pincode).maybeSingle();
    if (!area || !area.is_active) throw new Error("Sorry, we don't deliver to this pincode yet.");

    const { data: settings } = await supabase
      .from("settings").select("free_delivery_threshold_cents").eq("id", 1).single();

    const subtotal = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);
    const free = settings ? subtotal >= settings.free_delivery_threshold_cents : false;
    const areaFeeCents = Math.round(Number(area.delivery_fee) * 100);
    const delivery = free ? 0 : areaFeeCents;

    // Coupon validation (server-side)
    let discountCents = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    if (data.couponCode) {
      const code = data.couponCode;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: coupon } = await supabaseAdmin
        .from("coupons").select("*").eq("code", code).maybeSingle();
      if (!coupon) throw new Error("Invalid coupon code");
      if (!coupon.is_active) throw new Error("This coupon is no longer active");
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("This coupon has expired");
      if (subtotal < Math.round(Number(coupon.min_order_amount) * 100)) {
        throw new Error(`Add items worth ₹${Number(coupon.min_order_amount).toFixed(0)} to use this coupon`);
      }
      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        throw new Error("This coupon's usage limit has been reached");
      }
      // per-user limit
      const { count: userUsed } = await supabaseAdmin
        .from("coupon_redemptions").select("*", { count: "exact", head: true })
        .eq("coupon_id", coupon.id).eq("user_id", userId);
      if ((userUsed ?? 0) >= coupon.per_user_limit) {
        throw new Error("You've already used this coupon");
      }

      if (coupon.type === "flat") {
        discountCents = Math.round(Number(coupon.value) * 100);
      } else {
        discountCents = Math.round((subtotal * Number(coupon.value)) / 100);
        if (coupon.max_discount) {
          discountCents = Math.min(discountCents, Math.round(Number(coupon.max_discount) * 100));
        }
      }
      discountCents = Math.min(discountCents, subtotal);
      couponId = coupon.id;
      couponCode = coupon.code;
    }

    const total = Math.max(0, subtotal + delivery - discountCents);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal_cents: subtotal,
        delivery_cents: delivery,
        total_cents: total,
        discount_amount: discountCents / 100,
        coupon_code: couponCode,
        pincode: data.pincode,
        customer_phone: data.phone,
        address: addr,
        notes: data.notes ?? null,
        payment_status: "pending",
      })
      .select("id, order_number, total_cents")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Could not create order");

    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        name: i.name,
        unit: i.unit,
        image_url: i.image_url,
        price_cents: i.price_cents,
        quantity: i.quantity,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    // Record coupon redemption + bump usage counter (admin client to update counter)
    if (couponId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("coupon_redemptions").insert({
        coupon_id: couponId, user_id: userId, order_id: order.id,
        discount_amount: discountCents / 100,
      });
      await supabaseAdmin.rpc;
      // increment times_used
      const { data: cur } = await supabaseAdmin.from("coupons").select("times_used").eq("id", couponId).single();
      await supabaseAdmin.from("coupons").update({ times_used: (cur?.times_used ?? 0) + 1 }).eq("id", couponId);
    }

    let razorpay: { keyId: string; orderId: string; amount: number } | null = null;
    if (data.paymentMethod === "razorpay") {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        throw new Error("Online payment is not configured yet. Please choose Cash on Delivery.");
      }
      const auth = btoa(`${keyId}:${keySecret}`);
      const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          currency: "INR",
          receipt: order.order_number,
          notes: { order_id: order.id, user_id: userId },
        }),
      });
      if (!rpRes.ok) throw new Error("Failed to create Razorpay order");
      const rpJson = (await rpRes.json()) as { id: string; amount: number };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("orders").update({ razorpay_order_id: rpJson.id }).eq("id", order.id);
      razorpay = { keyId, orderId: rpJson.id, amount: rpJson.amount };
    }

    return { orderId: order.id, orderNumber: order.order_number, total, razorpay };
  });

const verifySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof verifySchema>) => verifySchema.parse(d))
  .handler(async ({ data, context }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Server not configured");

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(keySecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${data.razorpayOrderId}|${data.razorpayPaymentId}`));
    const computed = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (computed !== data.razorpaySignature) throw new Error("Invalid payment signature");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", status: "confirmed", razorpay_payment_id: data.razorpayPaymentId })
      .eq("id", data.orderId).eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    await context.supabase.from("cart_items").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const clearCartAfterCOD = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").update({ status: "confirmed" }).eq("id", data.orderId).eq("user_id", context.userId);
    await context.supabase.from("cart_items").delete().eq("user_id", context.userId);
    return { ok: true };
  });

// Validate coupon for live preview during checkout
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; subtotalCents: number }) =>
    z.object({ code: z.string().trim().toUpperCase().min(1).max(40), subtotalCents: z.number().int().nonnegative() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: coupon } = await supabaseAdmin
      .from("coupons").select("*").eq("code", data.code).maybeSingle();
    if (!coupon) throw new Error("Invalid coupon code");
    if (!coupon.is_active) throw new Error("This coupon is no longer active");
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Coupon expired");
    if (data.subtotalCents < Math.round(Number(coupon.min_order_amount) * 100)) {
      throw new Error(`Add items worth ₹${Number(coupon.min_order_amount).toFixed(0)} to use this coupon`);
    }
    const { count: userUsed } = await supabaseAdmin
      .from("coupon_redemptions").select("*", { count: "exact", head: true })
      .eq("coupon_id", coupon.id).eq("user_id", context.userId);
    if ((userUsed ?? 0) >= coupon.per_user_limit) throw new Error("You've already used this coupon");


    let discountCents = 0;
    if (coupon.type === "flat") discountCents = Math.round(Number(coupon.value) * 100);
    else {
      discountCents = Math.round((data.subtotalCents * Number(coupon.value)) / 100);
      if (coupon.max_discount) discountCents = Math.min(discountCents, Math.round(Number(coupon.max_discount) * 100));
    }
    discountCents = Math.min(discountCents, data.subtotalCents);
    return { code: coupon.code, description: coupon.description, discountCents };
  });
