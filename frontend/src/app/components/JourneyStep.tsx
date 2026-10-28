import type { ReactNode } from "react";
import { transportColor, transportForeground, transportKind, type TransportMode } from "@/lib/transport-icons";
import TransportIcon from "./TransportIcon";

export default function JourneyStep({ mode, label, last, children }: { mode: TransportMode; label: string; last: boolean; children: ReactNode }) {
  const kind = transportKind(mode, label);
  const color = transportColor(kind);
  return <li className="relative min-w-0 pb-4 ps-12 last:pb-0">
    {!last && <span aria-hidden="true" className="pointer-events-none absolute bottom-0 start-[17px] top-9 border-l-2" style={{ borderColor: color, borderStyle: mode === "land" ? "dashed" : "solid" }} />}
    <span aria-hidden="true" className="absolute start-0 top-0 grid h-9 w-9 place-items-center rounded-xl border-2 border-white shadow-sm" style={{ backgroundColor: color, color: transportForeground(kind) }}><TransportIcon kind={kind} /></span>
    {children}
  </li>;
}
