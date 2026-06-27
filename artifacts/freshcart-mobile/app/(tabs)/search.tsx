import React, { useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,unit,price_cents,mrp_cents,image_url,stock")
        .eq("active", true)
        .ilike("name", `%${query}%`)
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder='Search "milk", "bread"...'
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {query.length < 2 ? (
        <View style={styles.empty}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Search products</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Type at least 2 characters to search</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (data ?? []).length === 0 ? (
        <View style={styles.empty}>
          <Feather name="package" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 80 }]}
          columnWrapperStyle={styles.row}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.cell}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 15 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const },
  emptyText: { fontSize: 14 },
  grid: { padding: 16, gap: 12 },
  row: { gap: 12 },
  cell: { flex: 1 },
});
