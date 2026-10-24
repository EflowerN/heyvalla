import { transportPaths, type TransportKind } from "@/lib/transport-icons";

export default function TransportIcon({ kind, className = "h-5 w-5" }: { kind: TransportKind; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={transportPaths[kind]} /></svg>;
}
