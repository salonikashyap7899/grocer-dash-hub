import React from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, Image } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/cart";
import { useAuth } from "@/context/auth";

function fmt(cents: number) { return `₹${(cents / 100).toFixed(0)}`; }

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, updateQty, removeItem, totalItems, totalCents } = useCart();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const FREE_THRESHOLD = 49900;
  const remaining = FREE_THRESHOLD - totalCents;

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Cart</Text>
        </View>
        <View style={styles.empty}>
          <Feather name="shopping-cart" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add items to start shopping</Text>
          <Pressable
            onPress={() => router.push("/")}
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>Browse products</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Cart ({totalItems})</Text>
      </View>

      {remaining > 0 && (
        <View style={[styles.freeShip, { backgroundColor: colors.accent }]}>
          <Feather name="truck" size={14} color={colors.primary} />
          <Text style={[styles.freeShipText, { color: colors.foreground }]}>
            Add {fmt(remaining)} more for free delivery
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.itemImg, { backgroundColor: colors.muted }]}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <Feather name="image" size={20} color={colors.mutedForeground} />
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.itemUnit, { color: colors.mutedForeground }]}>{item.unit}</Text>
              <Text style={[styles.itemPrice, { color: colors.foreground }]}>{fmt(item.price_cents)} each</Text>
            </View>
            <View style={styles.itemRight}>
              <Pressable onPress={() => removeItem(item.product_id)}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
              <View style={[styles.qtyRow, { borderColor: colors.primary }]}>
                <Pressable onPress={() => updateQty(item.product_id, item.quantity - 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="minus" size={12} color={colors.primaryForeground} />
                </Pressable>
                <Text style={[styles.qtyText, { color: colors.primary }]}>{item.quantity}</Text>
                <Pressable onPress={() => updateQty(item.product_id, item.quantity + 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="plus" size={12} color={colors.primaryForeground} />
                </Pressable>
              </View>
              <Text style={[styles.lineTotal, { color: colors.foreground }]}>{fmt(item.price_cents * item.quantity)}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 180 }} />}
      />

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad + 16 }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{fmt(totalCents)}</Text>
        </View>
        {remaining <= 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Delivery</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>FREE</Text>
          </View>
        )}
        <Pressable
          onPress={() => user ? router.push("/checkout") : router.push("/auth")}
          style={({ pressed }) => [styles.checkoutBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.checkoutText, { color: colors.primaryForeground }]}>
            {user ? `Checkout · ${fmt(totalCents)}` : "Sign in to checkout"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: "800" as const },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700" as const },
  emptyText: { fontSize: 14 },
  shopBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  shopBtnText: { fontSize: 15, fontWeight: "700" as const },
  freeShip: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  freeShipText: { fontSize: 13, fontWeight: "500" as const },
  cartItem: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 12, gap: 12, alignItems: "flex-start" },
  itemImg: { width: 64, height: 64, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: "600" as const },
  itemUnit: { fontSize: 12 },
  itemPrice: { fontSize: 12 },
  itemRight: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  qtyRow: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1.5, overflow: "hidden" },
  qtyBtn: { padding: 6 },
  qtyText: { paddingHorizontal: 10, fontSize: 13, fontWeight: "700" as const },
  lineTotal: { fontSize: 14, fontWeight: "700" as const },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" as const },
  checkoutBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  checkoutText: { fontSize: 16, fontWeight: "700" as const },
});
