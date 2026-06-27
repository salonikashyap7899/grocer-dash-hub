import React from "react";
import { ActivityIndicator, FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", confirmed: "#3b82f6", out_for_delivery: "#8b5cf6", delivered: "#22c55e", cancelled: "#ef4444",
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id!).single(),
        supabase.from("order_items").select("id,name,unit,quantity,price_cents,image_url").eq("order_id", id!),
      ]);
      return { order: orderRes.data, items: itemsRes.data ?? [] };
    },
  });

  const { order, items } = data ?? {};

  if (isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{order?.order_number ?? "Order"}</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i: any) => i.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }}
        ListHeaderComponent={order ? (
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Status</Text>
                <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] ?? colors.foreground }]}>
                  {order.status.replace(/_/g, " ")}
                </Text>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Date</Text>
                <Text style={[styles.val, { color: colors.foreground }]}>
                  {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment</Text>
                <Text style={[styles.val, { color: colors.foreground }]}>{order.payment_method?.toUpperCase()}</Text>
              </View>
            </View>
            {order.delivery_address && (
              <View style={[styles.addrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="map-pin" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  {order.delivery_name && <Text style={[styles.val, { color: colors.foreground }]}>{order.delivery_name}</Text>}
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>{order.delivery_address}</Text>
                </View>
              </View>
            )}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Items</Text>
          </View>
        ) : null}
        renderItem={({ item }: { item: any }) => (
          <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.itemImg, { backgroundColor: colors.muted }]}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Feather name="image" size={16} color={colors.mutedForeground} />}
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.itemUnit, { color: colors.mutedForeground }]}>{item.unit} × {item.quantity}</Text>
            </View>
            <Text style={[styles.itemTotal, { color: colors.foreground }]}>₹{(item.price_cents * item.quantity / 100).toFixed(0)}</Text>
          </View>
        )}
        ListFooterComponent={order ? (
          <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
            <Row label="Subtotal" value={`₹${(order.subtotal_cents / 100).toFixed(0)}`} colors={colors} />
            <Row label="Delivery" value={order.delivery_cents === 0 ? "FREE" : `₹${(order.delivery_cents / 100).toFixed(0)}`} colors={colors} />
            {order.discount_amount > 0 && <Row label="Discount" value={`-₹${Number(order.discount_amount).toFixed(0)}`} colors={colors} />}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>₹{(order.total_cents / 100).toFixed(0)}</Text>
            </View>
          </View>
        ) : null}
      />
    </View>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.val, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  back: { padding: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: "700" as const, textAlign: "center" as const },
  statusCard: { flexDirection: "row", justifyContent: "space-between", borderRadius: 14, borderWidth: 1, padding: 16 },
  addrCard: { flexDirection: "row", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  statusText: { fontSize: 15, fontWeight: "700" as const, textTransform: "capitalize" as const },
  label: { fontSize: 12 },
  val: { fontSize: 13, fontWeight: "500" as const },
  sectionLabel: { fontSize: 16, fontWeight: "700" as const },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  itemImg: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: "500" as const },
  itemUnit: { fontSize: 12 },
  itemTotal: { fontSize: 14, fontWeight: "700" as const },
  totalCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  divider: { height: 1 },
  totalLabel: { fontSize: 15, fontWeight: "700" as const },
  totalValue: { fontSize: 17, fontWeight: "800" as const },
});
