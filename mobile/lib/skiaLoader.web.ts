// On web, Skia runs on CanvasKit (WASM), which must be loaded before any
// Skia component renders. The .wasm file is self-hosted: `npm install` runs
// `setup-skia-web public` (postinstall), which copies it from canvaskit-wasm
// into public/, and Expo serves public/ at the web root.
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export function loadSkia(): Promise<void> {
  return LoadSkiaWeb({
    locateFile: (file: string) => `/${file}`,
  });
}
