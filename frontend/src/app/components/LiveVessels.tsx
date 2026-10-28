"use client";

import { useT } from "./I18nProvider";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import type * as Leaflet from "leaflet";
import { vesselIsRecent, vesselReport, type VesselFeed } from "@/lib/live-vessels";
import { transportSvg } from "@/lib/transport-icons";

const unavailable: VesselFeed = { status: "unavailable", vessels: [], fetched_at: null, message: "Live boat tracking is unavailable. Your journey planner is still available." };

export default function LiveVessels({ mapRef, leafletRef, mapVersion }: {
  mapRef: RefObject<Leaflet.Map | null>; leafletRef: RefObject<typeof Leaflet | null>; mapVersion: number;
}) {
  const t = useT();
  const [enabled, setEnabled] = useState(true);
  const [feed, setFeed] = useState<VesselFeed | null>(null);
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const lastGood = useRef<VesselFeed | null>(null);
  const markers = useRef(new Map<string, Leaflet.Marker>());

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let loading = false;
    async function load() {
      if (loading || document.visibilityState !== "visible") return;
      loading = true;
      try {
        const response = await fetch("/api/live-vessels", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data: VesselFeed = await response.json();
        if (!Array.isArray(data.vessels)) throw new Error();
        lastGood.current = data;
        setFeed(data);
      } catch {
        if (!controller.signal.aborted) setFeed(lastGood.current ? { ...lastGood.current, status: "unavailable", message: "Tracking refresh failed. Saved positions may be out of date.", vessels: lastGood.current.vessels.map(v => ({ ...v, freshness: "stale" })) } : unavailable);
      } finally { loading = false; }
    }
    void load();
    const interval = setInterval(() => void load(), 65000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [enabled]);

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const now = clock;
  const vessels = useMemo(() => (feed?.vessels ?? []).filter(() => !feed?.fetched_at || now - Date.parse(feed.fetched_at) < 3600000).filter(v => v.name.toLowerCase().includes(query.trim().toLowerCase())), [feed, now, query]);
  useEffect(() => {
    const map = mapRef.current, L = leafletRef.current;
    if (!enabled || !mapVersion || !map || !L) return;
    const layer = L.layerGroup().addTo(map);
    const entries = new Map<string, Leaflet.Marker>();
    vessels.forEach(vessel => {
      const recent = vesselIsRecent(vessel, now);
      const content = document.createElement("div");
      const heading = document.createElement("strong"); heading.textContent = vessel.name;
      const report = document.createElement("p"); report.textContent = `FollowMe · ${vesselReport(vessel, now)}`;
      const note = document.createElement("p"); note.textContent = "Public tracking only. This boat is not linked to a bookable sailing.";
      content.append(heading, report, note);
      const marker = L.marker([vessel.latitude, vessel.longitude], {
        title: `FollowMe boat: ${vessel.name}`, keyboard: true, zIndexOffset: 500,
        icon: L.divIcon({ className: "", html: `<span style="display:grid;place-items:center;width:36px;height:36px;border:3px ${recent ? "solid" : "dashed"} white;border-radius:50%;background:${recent ? "#1E3A8A" : "#64748B"};color:white;box-shadow:0 0 0 2px #1E3A8A">${transportSvg("ferry")}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
      }).bindPopup(content).addTo(layer);
      entries.set(vessel.id, marker);
    });
    markers.current = entries;
    return () => { entries.clear(); layer.remove(); };
  }, [enabled, mapVersion, mapRef, leafletRef, vessels, now]);

  return <section className="border-t border-ocean/10 px-5 py-4 text-sm" aria-label="FollowMe boat tracking">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />{t("Show boat positions")}</label>
      <a href="https://followme.mv/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-lagoon underline"><Image src="/followme-logo.png" width={80} height={64} alt="FollowMe Tracking Service" className="h-auto w-20" unoptimized />{t("Tracking source ↗")}</a>
    </div>
    {enabled && <>
      <p className="mt-2" role="status">{feed?.message ?? "Checking FollowMe connection…"}</p>
      {!!feed?.vessels.length && <>
        <label className="mt-3 block">{t("Find a boat")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Boat name" className="mt-1 block w-full rounded-xl border border-ocean/20 bg-white px-3 py-2" /></label>
        <details className="mt-3"><summary className="cursor-pointer text-lagoon">{vessels.length} boat positions · view list</summary><ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">{vessels.map(vessel => <li key={vessel.id}><button type="button" className="w-full rounded-xl border border-sea/20 p-3 text-left" onClick={() => { const marker = markers.current.get(vessel.id); if (marker && mapRef.current) { mapRef.current.setView(marker.getLatLng(), 12); marker.openPopup(); } }}><span className="font-semibold">{vessel.name}</span><span className="mt-1 block text-xs">{vesselReport(vessel, now)}</span></button></li>)}</ul></details>
      </>}
      {feed?.fetched_at && <p className="mt-2 text-xs text-ocean/70">Feed retrieved {new Date(feed.fetched_at).toLocaleString("en-GB", { timeZone: "Indian/Maldives", dateStyle: "medium", timeStyle: "short" })} Maldives time.</p>}
      <p className="mt-2 text-xs text-ocean/70">{t("Boat icons show reported positions; route lines illustrate your plan. Grey dashed icons have old or unknown report times. Checks run about once a minute. Tracking does not confirm bookings, cargo space or arrival times.")}</p>
    </>}
  </section>;
}
