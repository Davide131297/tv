// Opens external links (Mediathek, sources). On native an in-app browser sheet
// keeps the user inside the app; web and failures fall back to the system handler.

import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

export function isHttpUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url.trim());
}

export async function openExternal(url: string | null | undefined): Promise<void> {
  if (!isHttpUrl(url)) return;
  if (Platform.OS === "web") {
    await Linking.openURL(url).catch(() => {});
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}
