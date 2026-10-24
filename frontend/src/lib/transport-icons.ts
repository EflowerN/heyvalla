import { transportColors } from "./transport-colors";

export type TransportKind = "ferry" | "launch" | "flight" | "taxi" | "bus" | "land";
export type TransportMode = keyof typeof transportColors;

// Shared paths keep React timeline icons and Leaflet markers identical.
export const transportPaths: Record<TransportKind, string> = {
  ferry: "M5 13V7h14v6M9 7V4h6v3M8 10h2m4 0h2M3 14l9-3 9 3-3 5H6l-3-5Zm9-3v8M3 22c2 0 2-2 4-2s3 2 5 2 3-2 5-2 2 2 4 2",
  launch: "M3 14h18l-5 5H7l-4-5Zm5 0 2-6h4l4 6M10 8V5M3 22c2 0 2-2 4-2s3 2 5 2 3-2 5-2 2 2 4 2",
  flight: "M12 2c-1 0-2 1-2 3v4l-7 5v2l7-2v4l-3 2v2l5-1 5 1v-2l-3-2v-4l7 2v-2l-7-5V5c0-2-1-3-2-3Z",
  taxi: "M5 10l2-5h10l2 5M9 5V2h6v3M4 10h16v9H4v-9Zm3 4h2m6 0h2M6 19v3m12-3v3",
  bus: "M5 18V5c0-2 14-2 14 0v13H5ZM5 7h14M5 13h14M8 16h1m6 0h1M7 18v3m10-3v3M9 5h6",
  land: "M4 12h16m-6-6 6 6-6 6",
};
export const transportLabels: Record<TransportKind, string> = { ferry: "Ferry", launch: "Launch", flight: "Flight", taxi: "Taxi", bus: "Bus", land: "Taxi to destination" };
export function transportKind(mode: TransportMode, label = ""): TransportKind {
  // Only use the launch icon when the service itself is explicitly labelled launch.
  return mode === "sea" ? (/\blaunch\b/i.test(label) ? "launch" : "ferry") : mode;
}
export function transportColor(kind: TransportKind) {
  return transportColors[kind === "ferry" || kind === "launch" ? "sea" : kind];
}
export function transportForeground(kind: TransportKind) {
  return kind === "flight" || kind === "land" ? "#12343B" : "#FFFFFF";
}
export function transportSvg(kind: TransportKind) {
  // Static, trusted icon definitions only; no passenger or provider HTML.
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${transportPaths[kind]}"/></svg>`;
}
