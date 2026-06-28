import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/cart";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";

function fmt(cents: number) { return `₹${(cents / 100).toFixed(0)}`; }

type AppliedCoupon = { code: string; description: string | null; discountCents: number };

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, totalCents, clearCart } = useCart();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [form, setForm] = useState({ fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
  const [loading, setLoading] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const deliveryCents = totalCents >= 49900 ? 0 : 4900;
  const discountCents = appliedCoupon?.discountCents ?? 0;
  const grandTotal = Math.max(0, totalCents + deliveryCents - discountCents);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    setCouponLoading(true);
    try {
      const { data: coupon } = await supabase
        .from("coupons").select("*").eq("code", code).maybeSingle();
      if (!coupon) throw new Error("Invalid coupon code");
      if (!coupon.is_active) throw new Error("This coupon is no longer active");
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Coupon expired");
      if (totalCents < Math.round(Number(coupon.min_order_amount) * 100)) {
        throw new Error(`Add items worth ₹${Number(coupon.min_order_amount).toFixed(0)} to use this coupon`);
      }
      let discount = 0;
      if (coupon.type === "flat") {
        discount = Math.round(Number(coupon.value) * 100);
      } else {
        discount = Math.round((totalCents * Number(coupon.value)) / 100);
        if (coupon.max_discount) discount = Math.min(discount, Math.round(Number(coupon.max_discount) * 100));
      }
      discount = Math.min(discount, totalCents);
      setAppliedCoupon({ code: coupon.code, description: coupon.description ?? null, discountCents: discount });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setCouponError(e.message || "Failed to apply coupon");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const placeOrder = async () => {
    if (!form.fullName || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      Alert.alert("Missing info", "Please fill in all required fields.");
      return;
    }
    if (!user) { router.push("/auth"); return; }
    setLoading(true);
    try {
      const orderNum = "FC" + Date.now().toString().slice(-8);
      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user.id,
        order_number: orderNum,
        status: "pending",
        payment_status: "pending",
        payment_method: "cod",
        subtotal_cents: totalCents,
        delivery_cents: deliveryCents,
        discount_amount: discountCents / 100,
        coupon_code: appliedCoupon?.code ?? null,
        total_cents: grandTotal,
        delivery_address: `${form.line1}${form.line2 ? ", " + form.line2 : ""}, ${form.city}, ${form.state} - ${form.pincode}`,
        delivery_name: form.fullName,
        delivery_phone: form.phone,
      }).select("id").single();
      if (error) throw error;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        price_cents: i.price_cents,
      }));
      await supabase.from("order_items").insert(orderItems);

      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Order placed!", `Order ${orderNum} confirmed. We'll deliver in 10–15 min.`, [
        { text: "View orders", onPress: () => router.replace("/orders") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Checkout</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: botPad + 100 }}>
          <Section title="Delivery address" colors={colors}>
            {(["fullName", "phone", "line1", "line2", "city", "state", "pincode"] as const).map((k) => (
              <View key={k}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  {({ fullName: "Full name*", phone: "Phone*", line1: "Address line 1*", line2: "Line 2 (optional)", city: "City*", state: "State*", pincode: "PIN code*" })[k]}
                </Text>
                <TextInput
                  value={form[k]}
                  onChangeText={set(k)}
                  keyboardType={k === "phone" || k === "pincode" ? "phone-pad" : "default"}
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                  placeholder={`Enter ${k}`}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
          </Section>

          <Section title="Promo code" colors={colors}>
            {appliedCoupon ? (
              <View style={[styles.appliedRow, { backgroundColor: colors.primary + "12", borderColor: colors.primary }]}>
                <Feather name="tag" size={15} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.appliedCode, { color: colors.primary }]}>{appliedCoupon.code}</Text>
                  {appliedCoupon.description ? (
                    <Text style={[styles.appliedDesc, { color: colors.mutedForeground }]}>{appliedCoupon.description}</Text>
                  ) : null}
                </View>
                <Text style={[styles.appliedDiscount, { color: colors.primary }]}>−{fmt(appliedCoupon.discountCents)}</Text>
                <Pressable onPress={removeCoupon} style={styles.removeBtn} hitSlop={8}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.couponRow}>
                <TextInput
                  value={couponInput}
                  onChangeText={(v) => { setCouponInput(v); setCouponError(null); }}
                  autoCapitalize="characters"
                  placeholder="Enter promo code"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.couponInput, { borderColor: couponError ? "#ef4444" : colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                />
                <Pressable
                  onPress={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  style={({ pressed }) => [styles.applyBtn, { backgroundColor: colors.primary, opacity: pressed || couponLoading || !couponInput.trim() ? 0.6 : 1 }]}
                >
                  {couponLoading
                    ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                    : <Text style={[styles.applyBtnText, { color: colors.primaryForeground }]}>Apply</Text>}
                </Pressable>
              </View>
            )}
            {couponError ? (
              <Text style={styles.couponError}>{couponError}</Text>
            ) : null}
          </Section>

          <Section title="Payment method" colors={colors}>
            <View style={[styles.codRow, { borderColor: colors.primary, backgroundColor: colors.primary + "10" }]}>
              <Feather name="check-circle" size={18} color={colors.primary} />
              <Text style={[styles.codText, { color: colors.foreground }]}>Cash on delivery</Text>
            </View>
          </Section>

          <Section title="Order summary" colors={colors}>
            {items.map((i) => (
              <View key={i.product_id} style={styles.summaryItem}>
                <Text style={[styles.summaryName, { color: colors.foreground }]} numberOfLines={1}>{i.name} × {i.quantity}</Text>
                <Text style={[styles.summaryPrice, { color: colors.foreground }]}>{fmt(i.price_cents * i.quantity)}</Text>
              </View>
            ))}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryName, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.summaryPrice, { color: colors.mutedForeground }]}>{fmt(totalCents)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryName, { color: colors.mutedForeground }]}>Delivery</Text>
              <Text style={[styles.summaryPrice, { color: deliveryCents === 0 ? colors.primary : colors.mutedForeground }]}>
                {deliveryCents === 0 ? "FREE" : fmt(deliveryCents)}
              </Text>
            </View>
            {appliedCoupon ? (
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryName, { color: colors.primary }]}>Discount ({appliedCoupon.code})</Text>
                <Text style={[styles.summaryPrice, { color: colors.primary }]}>−{fmt(appliedCoupon.discountCents)}</Text>
              </View>
            ) : null}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>{fmt(grandTotal)}</Text>
            </View>
          </Section>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad + 16 }]}>
          <Pressable
            onPress={placeOrder}
            disabled={loading}
            style={({ pressed }) => [styles.placeBtn, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 }]}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : (
              <Text style={[styles.placeBtnText, { color: colors.primaryForeground }]}>Place order · {fmt(grandTotal)}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  back: { padding: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: "700" as const, textAlign: "center" as const },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700" as const },
  label: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  couponRow: { flexDirection: "row", gap: 8 },
  couponInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, letterSpacing: 1 },
  applyBtn: { borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", minWidth: 72 },
  applyBtnText: { fontSize: 14, fontWeight: "700" as const },
  couponError: { fontSize: 12, color: "#ef4444", marginTop: -4 },
  appliedRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1.5, padding: 12 },
  appliedCode: { fontSize: 14, fontWeight: "700" as const },
  appliedDesc: { fontSize: 12, marginTop: 1 },
  appliedDiscount: { fontSize: 14, fontWeight: "700" as const },
  removeBtn: { padding: 2 },
  codRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1.5, padding: 12 },
  codText: { fontSize: 14, fontWeight: "500" as const },
  summaryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryName: { flex: 1, fontSize: 13, marginRight: 8 },
  summaryPrice: { fontSize: 13, fontWeight: "600" as const },
  totalLabel: { fontSize: 15, fontWeight: "700" as const },
  totalValue: { fontSize: 17, fontWeight: "800" as const },
  divider: { height: 1, marginVertical: 4 },
  footer: { borderTopWidth: 1, padding: 16 },
  placeBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  placeBtnText: { fontSize: 16, fontWeight: "700" as const },
});
