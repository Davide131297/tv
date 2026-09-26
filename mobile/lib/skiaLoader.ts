// Native platforms ship Skia as a native module – nothing to load.
// The web implementation lives in skiaLoader.web.ts (resolved by Metro only
// for web bundles, so canvaskit-wasm never ends up in iOS/Android builds).
export function loadSkia(): Promise<void> {
  return Promise.resolve();
}
