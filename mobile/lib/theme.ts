// Central theme: light + dark palettes and shared spacing / radius tokens.
// The app reacts to the system color scheme (useColorScheme) so it feels native
// on both iOS and Android and respects the user's OS-level dark mode.

import { useColorScheme } from "react-native";

export interface Theme {
  dark: boolean;
  bg: string;
  bgElevated: string;
  card: string;
  cardPressed: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  tabBar: string;
  tabBarBorder: string;
  danger: string;
  success: string;
}

const dark: Theme = {
  dark: true,
  bg: "#0B1220",
  bgElevated: "#0F172A",
  card: "#141C2E",
  cardPressed: "#1B2540",
  border: "#1E293B",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textFaint: "#64748B",
  accent: "#38BDF8",
  accentSoft: "rgba(56,189,248,0.14)",
  tabBar: "#0B1220",
  tabBarBorder: "#1E293B",
  danger: "#F87171",
  success: "#34D399",
};

const light: Theme = {
  dark: false,
  bg: "#F5F7FB",
  bgElevated: "#FFFFFF",
  card: "#FFFFFF",
  cardPressed: "#EEF2F8",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  accent: "#0284C7",
  accentSoft: "rgba(2,132,199,0.10)",
  tabBar: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  danger: "#DC2626",
  success: "#059669",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "light" ? light : dark;
}

export { dark as darkTheme, light as lightTheme };
