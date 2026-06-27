import React from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl, Platform } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/context/cart";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: categories, isLoading: catLoading, refetch: refetchCat } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug,image_url").eq("active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: featured, isLoading: featLoading, refetch: refetchFeat } = useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock").eq("active", true).eq("featured", true).limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCat(), refetchFeat()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.appName, { color: colors.primary }]}>FreshCart</Text>
          <View style={styles.deliveryRow}>
            <Feather name="clock" size={11} color={colors.mutedForeground} />
            <Text style={[styles.deliveryText, { color: colors.mutedForeground }]}>10–15 min delivery</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/cart")} style={[styles.cartBtn, { backgroundColor: colors.primary }]}>
          <Feather name="shopping-cart" size={18} color={colors.primaryForeground} />
          {totalItems > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primaryForeground }]}>
              <Text style={[styles.cartBadgeText, { color: colors.primary }]}>{totalItems}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Search bar */}
      <Pressable
        onPress={() => router.push("/search")}
        style={[styles.searchBar, { backgroundColor: colors.muted, margin: 16, borderRadius: 12 }]}
      >
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <Text style={[styles.searchText, { color: colors.mutedForeground }]}>Search "milk", "bread"...</Text>
      </Pressable>

      {/* Categories */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shop by category</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {catLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.catSkeleton, { backgroundColor: colors.muted }]} />
            ))
          : (categories ?? []).map((c: any) => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/category/${c.slug}`)}
                style={({ pressed }) => [styles.catCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[styles.catImg, { backgroundColor: colors.muted }]}>
                  {c.image_url ? (
                    <Image source={{ uri: c.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : (
                    <Feather name="grid" size={20} color={colors.mutedForeground} />
                  )}
                </View>
                <Text style={[styles.catName, { color: colors.foreground }]} numberOfLines={2}>{c.name}</Text>
              </Pressable>
            ))}
      </ScrollView>

      {/* Featured */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured today</Text>
      </View>
      <FlatList
        data={featLoading ? Array.from({ length: 6 }).map((_, i) => ({ id: `sk-${i}` })) : (featured ?? [])}
        keyExtractor={(item: any) => item.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.productGrid}
        columnWrapperStyle={styles.productRow}
        renderItem={({ item }: { item: any }) =>
          featLoading ? (
            <View style={[styles.productSkeleton, { backgroundColor: colors.muted }]} />
          ) : (
            <View style={styles.productCell}>
              <ProductCard product={item} />
            </View>
          )
        }
      />
      <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  appName: { fontSize: 22, fontWeight: "800" as const },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  deliveryText: { fontSize: 12 },
  cartBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cartBadge: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { fontSize: 9, fontWeight: "800" as const },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  searchText: { fontSize: 14 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" as const },
  categoryRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  catCard: { width: 90, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 8 },
  catImg: { width: 60, height: 60, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  catName: { fontSize: 11, fontWeight: "500" as const, textAlign: "center" as const },
  catSkeleton: { width: 90, height: 110, borderRadius: 12 },
  productGrid: { paddingHorizontal: 16, gap: 12 },
  productRow: { gap: 12 },
  productCell: { flex: 1 },
  productSkeleton: { flex: 1, height: 200, borderRadius: 12 },
});
