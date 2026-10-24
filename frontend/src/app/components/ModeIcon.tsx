import TransportIcon from "./TransportIcon";
import { transportColor, transportForeground, transportKind, type TransportMode } from "@/lib/transport-icons";

/** Round mode chip built on the shared transport icons, so it matches the journey timeline and map markers. */
export default function ModeIcon({ mode, label }: { mode: TransportMode; label?: string }) {
  const kind = transportKind(mode, label ?? "");
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
      style={{ backgroundColor: transportColor(kind), color: transportForeground(kind) }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <TransportIcon kind={kind} />
    </span>
  );
}
