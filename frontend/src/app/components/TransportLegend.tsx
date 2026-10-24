import { transportColors } from "@/lib/transport-colors";
export default function TransportLegend() {
  return <div className="my-5 flex flex-wrap gap-3 text-xs" aria-label="Transport colour legend">{Object.entries(transportColors).map(([mode, color]) => <span key={mode} className="inline-flex items-center gap-2 rounded-full border border-ocean/15 bg-white px-3 py-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{mode === "sea" ? "Sea / ferry" : mode[0].toUpperCase() + mode.slice(1)}</span>)}</div>;
}
