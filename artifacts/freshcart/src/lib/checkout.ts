import { supabase } from "@/integrations/supabase/client";

export type PlaceOrderInput = {
  addressId: string;
  paymentMethod: "cod" | "razorpay";
  notes?: string;
  couponCode?: string | null;
  pincode: string;
  phone: string;
};

export async function placeOrder(input: PlaceOrderInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in");

  const { data: cart, error: cartErr } = await supabase
    .from("cart_items")
    .select("product_id, quantity, product:products(id,name,unit,price_cents,image_url,stock,active)")
    .eq("user_id", user.id);
  if (cartErr) throw new Error(cartErr.message);
  if (!cart || cart.length === 0) throw new Error("Cart is empty");

  // @ts-ignore
  const items = cart.map((c: any) => {
    if (!c.product || !c.product.active) throw new Error("A product in your cart is unavailable");
    if (c.quantity > c.product.stock) throw new Error(`${c.product.name} is out of stock`);
    return {
      product_id: c.product_id,
      name: c.product.name,
      unit: c.product.unit,
      image_url: c.product.image_url,
      price_cents: c.product.price_cents,
      quantity: c.quantity,
    };
  });

  const { data: addr, error: addrErr } = await supabase
    .from("addresses").select("*").eq("id", input.addressId).eq("user_id", user.id).single();
  if (addrErr || !addr) throw new Error("Invalid address");

  const { data: area } = await supabase
    .from("delivery_areas")
    .select("pincode,area_name,delivery_fee,eta_minutes,is_active")
    .eq("pincode", input.pincode).maybeSingle();
  if (!area || !area.is_active) throw new Error("Sorry, we don't deliver to this pincode yet.");

  const { data: settings } = await supabase
    .from("settings").select("free_delivery_threshold_cents").eq("id", 1).single();

  const subtotal = items.reduce((s: number, i: any) => s + i.price_cents * i.quantity, 0);
  const free = settings ? subtotal >= settings.free_delivery_threshold_cents : false;
  const areaFeeCents = Math.round(Number(area.delivery_fee) * 100);
  const delivery = free ? 0 : areaFeeCents;

  let discountCents = 0;
  let couponCode: string | null = null;
  if (input.couponCode) {
    const { data: coupon } = await supabase
      .from("coupons").select("*").eq("code", input.couponCode.toUpperCase()).maybeSingle();
    if (!coupon) throw new Error("Invalid coupon code");
    if (!coupon.is_active) throw new Error("This coupon is no longer active");
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("This coupon has expired");
    if (subtotal < Math.round(Number(coupon.min_order_amount) * 100)) {
      throw new Error(`Add items worth ₹${Number(coupon.min_order_amount).toFixed(0)} to use this coupon`);
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
    couponCode = coupon.code;
  }

  const total = Math.max(0, subtotal + delivery - discountCents);

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      subtotal_cents: subtotal,
      delivery_cents: delivery,
      total_cents: total,
      discount_amount: discountCents / 100,
      coupon_code: couponCode,
      pincode: input.pincode,
      customer_phone: input.phone,
      address: addr,
      notes: input.notes ?? null,
      payment_status: "pending",
    })
    .select("id, order_number, total_cents")
    .single();
  if (orderErr || !order) throw new Error(orderErr?.message ?? "Could not create order");

  await supabase.from("order_items").insert(
    items.map((i: any) => ({
      order_id: order.id,
      product_id: i.product_id,
      name: i.name,
      unit: i.unit,
      image_url: i.image_url,
      price_cents: i.price_cents,
      quantity: i.quantity,
    })),
  );

  return { orderId: order.id, orderNumber: order.order_number, total };
}

export async function clearCartAfterOrder(userId: string) {
  await supabase.from("cart_items").delete().eq("user_id", userId);
}

export async function validateCoupon(code: string, subtotalCents: number) {
  const { data: coupon } = await supabase
    .from("coupons").select("*").eq("code", code.toUpperCase()).maybeSingle();
  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.is_active) throw new Error("This coupon is no longer active");
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Coupon expired");
  if (subtotalCents < Math.round(Number(coupon.min_order_amount) * 100)) {
    throw new Error(`Add items worth ₹${Number(coupon.min_order_amount).toFixed(0)} to use this coupon`);
  }

  let discountCents = 0;
  if (coupon.type === "flat") discountCents = Math.round(Number(coupon.value) * 100);
  else {
    discountCents = Math.round((subtotalCents * Number(coupon.value)) / 100);
    if (coupon.max_discount) discountCents = Math.min(discountCents, Math.round(Number(coupon.max_discount) * 100));
  }
  discountCents = Math.min(discountCents, subtotalCents);
  return { code: coupon.code, description: coupon.description, discountCents };
}
