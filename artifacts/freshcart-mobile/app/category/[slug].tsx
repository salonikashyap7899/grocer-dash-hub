import React from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").eq("slug", slug).single();
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["category_products", slug],
    enabled: !!category?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock")
        .eq("active", true)
        .eq("category_id", category!.id)
        .order("sort_order");
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
        <Text style={[styles.title, { color: colors.foreground }]}>{category?.name ?? "Category"}</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (products ?? []).length === 0 ? (
        <View style={styles.loading}>
          <Feather name="package" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 }]}
          columnWrapperStyle={styles.row}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.cell}><ProductCard product={item} /></View>
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
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  grid: { padding: 16, gap: 12 },
  row: { gap: 12 },
  cell: { flex: 1 },
});
