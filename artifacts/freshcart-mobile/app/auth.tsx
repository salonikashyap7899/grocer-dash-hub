import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/auth";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError(null);
    const fn = mode === "login" ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    setLoading(false);
    if (err) { setError(err); return; }
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="shopping-cart" size={24} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>FreshCart</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {mode === "login" ? "Sign in to continue shopping" : "Create your account"}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
            {(["login", "signup"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => { setMode(m); setError(null); }}
                style={[styles.toggleBtn, mode === m && { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Text style={[styles.toggleText, { color: mode === m ? colors.foreground : colors.mutedForeground }]}>
                  {m === "login" ? "Login" : "Sign up"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.fields}>
            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {mode === "login" ? "Sign in" : "Create account"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  back: { alignSelf: "flex-start", padding: 8, marginBottom: 20 },
  header: { alignItems: "center", gap: 8, marginBottom: 28 },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800" as const },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 20 },
  toggle: { flexDirection: "row", borderRadius: 10, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: "transparent" },
  toggleText: { fontSize: 14, fontWeight: "600" as const },
  fields: { gap: 14 },
  label: { fontSize: 13, fontWeight: "500" as const, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  error: { fontSize: 13 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitText: { fontSize: 15, fontWeight: "700" as const },
});
