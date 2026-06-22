import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const placeOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(["cod", "razorpay"]),
  notes: z.string().max(500).optional(),
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

    // Load cart items
    const { data: cart, error: cartErr } = await supabase
      .from("cart_items")
      .select("product_id, quantity, product:products(id,name,unit,price_cents,image_url,stock,active)")
      .eq("user_id", userId);
    if (cartErr) throw new Error(cartErr.message);
    if (!cart || cart.length === 0) throw new Error("Cart is empty");

    // Validate stock
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

    // Load address (must belong to user)
    const { data: addr, error: addrErr } = await supabase
      .from("addresses").select("*").eq("id", data.addressId).eq("user_id", userId).single();
    if (addrErr || !addr) throw new Error("Invalid address");

    // Settings
    const { data: settings } = await supabase
      .from("settings").select("delivery_fee_cents,free_delivery_threshold_cents").eq("id", 1).single();

    const subtotal = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);
    const free = settings ? subtotal >= settings.free_delivery_threshold_cents : false;
    const delivery = free ? 0 : settings?.delivery_fee_cents ?? 0;
    const total = subtotal + delivery;

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal_cents: subtotal,
        delivery_cents: delivery,
        total_cents: total,
        address: addr,
        notes: data.notes ?? null,
        payment_status: data.paymentMethod === "cod" ? "pending" : "pending",
      })
      .select("id, order_number, total_cents")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Could not create order");

    // Insert order items
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

    // For Razorpay: create a Razorpay order via REST
    let razorpay: { keyId: string; orderId: string; amount: number } | null = null;
    if (data.paymentMethod === "razorpay") {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        // mark order so admin sees it, but bubble a clear error
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

    // Clear cart
    await context.supabase.from("cart_items").delete().eq("user_id", context.userId);

    return { ok: true };
  });

export const clearCartAfterCOD = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("orders").update({ status: "confirmed" }).eq("id", data.orderId).eq("user_id", context.userId);
    await context.supabase.from("cart_items").delete().eq("user_id", context.userId);
    return { ok: true };
  });
