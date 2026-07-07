// Thin wrapper around expo-haptics that is a no-op on web / unsupported devices.

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function tapLight() {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

export function tapMedium() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
