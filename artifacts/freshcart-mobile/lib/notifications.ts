import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const perms = await Notifications.getPermissionsAsync() as unknown as {
    status: string;
    canAskAgain: boolean;
  };

  let granted = perms.status === "granted";

  if (!granted && perms.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync() as unknown as {
      status: string;
    };
    granted = req.status === "granted";
  }

  if (!granted) {
    console.log("Push notification permission denied");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (err) {
    console.warn("Could not get Expo push token:", err);
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { user_id: userId, token, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );
  if (error) {
    console.warn("Failed to save push token:", error.message);
  }
}

export async function removePushToken(userId: string, token: string) {
  await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("token", token);
}
