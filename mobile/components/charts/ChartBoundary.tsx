import React from "react";
import { View } from "react-native";
import { Text } from "../ui/Text";

interface State {
  failed: boolean;
}

/**
 * Isolates chart rendering failures (e.g. CanvasKit not loaded on web) so a
 * broken chart degrades to a hint instead of taking down the whole screen.
 */
export class ChartBoundary extends React.Component<
  { children: React.ReactNode; height?: number },
  State
> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Chart failed to render", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View
        style={{
          height: this.props.height ?? 120,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text variant="subhead" tone="muted">
          Diagramm konnte nicht angezeigt werden.
        </Text>
      </View>
    );
  }
}
