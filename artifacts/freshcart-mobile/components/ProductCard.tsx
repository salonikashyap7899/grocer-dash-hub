import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCart } from "@/context/cart";
import { useColors } from "@/hooks/useColors";

export interface Product {
  id: string;
  name: string;
  slug: string;
  unit: string;
  price_cents: number;
  mrp_cents: number;
  image_url: string | null;
  stock: number;
}

export function ProductCard({ product }: { product: Product }) {
  const colors = useColors();
  const { items, addItem, updateQty } = useCart();
  const cartItem = items.find((i) => i.product_id === product.id);
  const qty = cartItem?.quantity ?? 0;
  const discount = product.mrp_cents > product.price_cents
    ? Math.round((1 - product.price_cents / product.mrp_cents) * 100)
    : 0;

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      product_id: product.id,
      name: product.name,
      price_cents: product.price_cents,
      mrp_cents: product.mrp_cents,
      image_url: product.image_url,
      unit: product.unit,
    });
  };

  return (
    <Pressable
      onPress={() => router.push(`/product/${product.slug}`)}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1 }]}
    >
      <View style={[styles.imgWrap, { backgroundColor: colors.muted }]}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.img} resizeMode="cover" />
        ) : (
          <Feather name="image" size={28} color={colors.mutedForeground} />
        )}
        {discount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{discount}% off</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{product.name}</Text>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>{product.unit}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.foreground }]}>₹{(product.price_cents / 100).toFixed(0)}</Text>
          {product.mrp_cents > product.price_cents && (
            <Text style={[styles.mrp, { color: colors.mutedForeground }]}>₹{(product.mrp_cents / 100).toFixed(0)}</Text>
          )}
        </View>
      </View>
      {product.stock > 0 ? (
        qty === 0 ? (
          <Pressable onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={16} color={colors.primaryForeground} />
          </Pressable>
        ) : (
          <View style={[styles.qtyRow, { borderColor: colors.primary }]}>
            <Pressable onPress={() => updateQty(product.id, qty - 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}>
              <Feather name="minus" size={12} color={colors.primaryForeground} />
            </Pressable>
            <Text style={[styles.qtyText, { color: colors.primary }]}>{qty}</Text>
            <Pressable onPress={() => updateQty(product.id, qty + 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={12} color={colors.primaryForeground} />
            </Pressable>
          </View>
        )
      ) : (
        <Text style={[styles.outOfStock, { color: colors.mutedForeground }]}>Out of stock</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 6 },
  imgWrap: { borderRadius: 8, aspectRatio: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 6, left: 6, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: "700" as const },
  info: { gap: 2 },
  name: { fontSize: 13, fontWeight: "600" as const, lineHeight: 17 },
  unit: { fontSize: 11 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  price: { fontSize: 14, fontWeight: "700" as const },
  mrp: { fontSize: 11, textDecorationLine: "line-through" as const },
  addBtn: { borderRadius: 8, padding: 8, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  qtyRow: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1.5, overflow: "hidden", alignSelf: "flex-end" },
  qtyBtn: { padding: 6 },
  qtyText: { paddingHorizontal: 10, fontSize: 13, fontWeight: "700" as const },
  outOfStock: { fontSize: 11, alignSelf: "flex-end" },
});
