import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/auth";

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
        </View>
        <View style={styles.guest}>
          <View style={[styles.guestAvatar, { backgroundColor: colors.muted }]}>
            <Feather name="user" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Sign in to your account</Text>
          <Text style={[styles.guestSub, { color: colors.mutedForeground }]}>View orders, manage address and more</Text>
          <Pressable
            onPress={() => router.push("/auth")}
            style={({ pressed }) => [styles.signInBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.signInText, { color: colors.primaryForeground }]}>Sign in / Sign up</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const menuItems = [
    { icon: "shopping-bag", label: "My Orders", onPress: () => router.push("/orders") },
    { icon: "map-pin", label: "Saved Addresses", onPress: () => {} },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: botPad + 80 }}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, margin: 16 }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.emailText, { color: colors.foreground }]}>{user.email}</Text>
            <Text style={[styles.memberText, { color: colors.mutedForeground }]}>FreshCart member</Text>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
          {menuItems.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.menuItem,
                i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name={item.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutBtn, { borderColor: colors.border, margin: 16, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: "800" as const },
  guest: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  guestAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  guestTitle: { fontSize: 20, fontWeight: "700" as const, textAlign: "center" as const },
  guestSub: { fontSize: 14, textAlign: "center" as const },
  signInBtn: { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  signInText: { fontSize: 16, fontWeight: "700" as const },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "700" as const },
  emailText: { fontSize: 15, fontWeight: "600" as const },
  memberText: { fontSize: 13 },
  menuCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  signOutText: { fontSize: 15, fontWeight: "600" as const },
});
