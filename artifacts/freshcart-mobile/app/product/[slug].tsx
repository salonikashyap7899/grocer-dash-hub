import React from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/cart";

function fmt(cents: number) { return `₹${(cents / 100).toFixed(0)}`; }

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, addItem, updateQty } = useCart();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock,description")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const cartItem = product ? items.find((i) => i.product_id === product.id) : null;
  const qty = cartItem?.quantity ?? 0;
  const discount = product && product.mrp_cents > product.price_cents
    ? Math.round((1 - product.price_cents / product.mrp_cents) * 100) : 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Product not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.imgContainer, { backgroundColor: colors.muted }]}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.img} resizeMode="contain" />
          ) : (
            <Feather name="image" size={60} color={colors.mutedForeground} />
          )}
          {discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.discountText, { color: colors.primaryForeground }]}>{discount}% off</Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
          <Text style={[styles.unit, { color: colors.mutedForeground }]}>{product.unit}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>{fmt(product.price_cents)}</Text>
            {product.mrp_cents > product.price_cents && (
              <>
                <Text style={[styles.mrp, { color: colors.mutedForeground }]}>{fmt(product.mrp_cents)}</Text>
                <View style={[styles.saveBadge, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.saveText, { color: colors.primary }]}>Save {fmt(product.mrp_cents - product.price_cents)}</Text>
                </View>
              </>
            )}
          </View>

          {product.stock === 0 && (
            <View style={[styles.outBadge, { backgroundColor: colors.destructive + "18" }]}>
              <Text style={[styles.outText, { color: colors.destructive }]}>Out of stock</Text>
            </View>
          )}

          {(product as any).description && (
            <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.descTitle, { color: colors.foreground }]}>About this product</Text>
              <Text style={[styles.descText, { color: colors.mutedForeground }]}>{(product as any).description}</Text>
            </View>
          )}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {product.stock > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad + 16 }]}>
          {qty === 0 ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                addItem({ product_id: product.id, name: product.name, price_cents: product.price_cents, mrp_cents: product.mrp_cents, image_url: product.image_url, unit: product.unit });
              }}
              style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="shopping-cart" size={20} color={colors.primaryForeground} />
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Add to cart · {fmt(product.price_cents)}</Text>
            </Pressable>
          ) : (
            <View style={styles.qtyFooter}>
              <View style={[styles.qtyControl, { borderColor: colors.primary }]}>
                <Pressable onPress={() => updateQty(product.id, qty - 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="minus" size={16} color={colors.primaryForeground} />
                </Pressable>
                <Text style={[styles.qtyNum, { color: colors.primary }]}>{qty}</Text>
                <Pressable onPress={() => updateQty(product.id, qty + 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="plus" size={16} color={colors.primaryForeground} />
                </Pressable>
              </View>
              <Pressable onPress={() => router.push("/cart")} style={[styles.viewCart, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.viewCartText, { color: colors.primary }]}>View cart</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { position: "absolute" as const, top: 0, left: 16, zIndex: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  imgContainer: { height: 300, alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  discountBadge: { position: "absolute" as const, top: 12, right: 12, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  discountText: { fontSize: 12, fontWeight: "700" as const },
  details: { padding: 20, gap: 8 },
  productName: { fontSize: 22, fontWeight: "700" as const },
  unit: { fontSize: 14 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
  price: { fontSize: 26, fontWeight: "800" as const },
  mrp: { fontSize: 16, textDecorationLine: "line-through" as const },
  saveBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  saveText: { fontSize: 12, fontWeight: "600" as const },
  outBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" as const },
  outText: { fontSize: 13, fontWeight: "600" as const },
  descCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  descTitle: { fontSize: 14, fontWeight: "600" as const },
  descText: { fontSize: 14, lineHeight: 20 },
  footer: { borderTopWidth: 1, padding: 16 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16 },
  addBtnText: { fontSize: 16, fontWeight: "700" as const },
  qtyFooter: { flexDirection: "row", gap: 12 },
  qtyControl: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 2, overflow: "hidden" },
  qtyBtn: { padding: 12 },
  qtyNum: { paddingHorizontal: 20, fontSize: 16, fontWeight: "700" as const },
  viewCart: { flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  viewCartText: { fontSize: 15, fontWeight: "700" as const },
});
