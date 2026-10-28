import { useT } from "./I18nProvider";
import Image from "next/image";
import { trackingSummary, type VesselTracking as Tracking } from "@/lib/live-vessels";

export default function VesselTracking({ value }: { value: Tracking | null }) {
  const t = useT();
  if (!value) return null;
  const summary = trackingSummary(value);
  const position = summary.position;
  return <aside className="my-4 rounded-xl bg-sea/5 p-4 text-sm" aria-label="Boat position from FollowMe">
    <p className="font-semibold">Boat position {summary.tone === "recent" ? "· recently reported" : summary.tone === "stale" ? "· last known" : ""}</p>
    <p className="mt-2" role="status">{summary.text}</p>
    {position && <p className="mt-2">{position.latitude.toFixed(4)}, {position.longitude.toFixed(4)} · <a className="text-lagoon underline" href={`https://www.openstreetmap.org/?mlat=${position.latitude}&mlon=${position.longitude}#map=12/${position.latitude}/${position.longitude}`} target="_blank" rel="noreferrer">{t("View position ↗")}</a></p>}
    <p className="mt-2 text-xs text-ocean/70">{t("Linked by the boat owner and not verified by Dhathuru App. Positions can be delayed or inaccurate; do not use them for navigation or safety decisions.")}</p>
    <a href={value.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-lagoon underline"><Image src="/followme-logo.png" width={80} height={64} alt="FollowMe Tracking Service" className="h-auto w-16" unoptimized /><span className="text-xs">{t("Data from FollowMe")}</span></a>
  </aside>;
}
