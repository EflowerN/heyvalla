export type LiveVessel = {
  id: string; name: string; latitude: number; longitude: number;
  reported_at: string | null; freshness: "recent" | "stale" | "unknown";
};
export type VesselFeed = { status: "ok" | "unavailable" | "not_configured"; message: string; fetched_at: string | null; vessels: LiveVessel[] };

export function vesselReport(vessel: LiveVessel, now = Date.now()) {
  const reported = vessel.reported_at ? Date.parse(vessel.reported_at) : NaN;
  if (!Number.isFinite(reported) || reported > now + 60000) return "Report time unavailable";
  const time = new Date(reported).toLocaleString("en-GB", { timeZone: "Indian/Maldives", dateStyle: "medium", timeStyle: "short" });
  return `${vessel.freshness === "recent" && now - reported <= 600000 ? "Recently reported" : "Last known position"} · ${time} Maldives time`;
}

export function vesselIsRecent(vessel: LiveVessel, now = Date.now()) {
  const reported = vessel.reported_at ? Date.parse(vessel.reported_at) : NaN;
  return vessel.freshness === "recent" && Number.isFinite(reported) && reported <= now + 60000 && now - reported <= 600000;
}

export type VesselTracking = {
  source: "FollowMe"; source_url: string; linked_by: "owner"; verified: false;
  status: "ok" | "unavailable" | "not_configured" | "not_yet"; message: string;
  position: { latitude: number; longitude: number; reported_at: string | null; freshness: LiveVessel["freshness"] } | null;
};

/** One honest line for a sailing card: never implies a live position the feed did not report. */
export function trackingSummary(tracking: VesselTracking, now = Date.now()) {
  if (!tracking.position) return { tone: "idle" as const, text: tracking.message || "No FollowMe position available.", position: null };
  const vessel: LiveVessel = { id: "", name: "", latitude: tracking.position.latitude, longitude: tracking.position.longitude, reported_at: tracking.position.reported_at, freshness: tracking.position.freshness };
  return { tone: vesselIsRecent(vessel, now) && tracking.status === "ok" ? ("recent" as const) : ("stale" as const), text: vesselReport(vessel, now), position: tracking.position };
}
