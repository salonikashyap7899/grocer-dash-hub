import React from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth";

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  out_for_delivery: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,status,total_cents,created_at,payment_method")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>My Orders</Text>
        <View style={{ width: 38 }} />
      </View>

      {!user ? (
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.foreground }]}>Sign in to view orders</Text>
          <Pressable onPress={() => router.push("/auth")} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Sign in</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (orders ?? []).length === 0 ? (
        <View style={styles.center}>
          <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.foreground }]}>No orders yet</Text>
          <Pressable onPress={() => router.push("/")} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Start shopping</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o: any) => o.id}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}
          renderItem={({ item }: { item: any }) => (
            <Pressable
              onPress={() => router.push(`/orders/${item.id}`)}
              style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.orderNum, { color: colors.foreground }]}>{item.order_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? "#6b7280") + "20" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? "#6b7280" }]}>
                    {item.status.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
                <Text style={[styles.total, { color: colors.foreground }]}>₹{(item.total_cents / 100).toFixed(0)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  back: { padding: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: "700" as const, textAlign: "center" as const },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 17, fontWeight: "600" as const },
  btn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { fontSize: 15, fontWeight: "700" as const },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNum: { fontSize: 15, fontWeight: "700" as const },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600" as const, textTransform: "capitalize" as const },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  date: { fontSize: 13 },
  total: { fontSize: 15, fontWeight: "700" as const },
});
