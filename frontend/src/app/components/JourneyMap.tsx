"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { transportColors } from "@/lib/transport-colors";
import type { Directory, JourneyLeg, Place } from "@/lib/journey-plan";
import "leaflet/dist/leaflet.css";

export default function JourneyMap({ directory, origin, destination, legs, selectedLeg, onLegSelect, onOriginSelect, onDestinationSelect }: {
  directory: Directory; origin: Place | null; destination: Place | null; legs: JourneyLeg[]; selectedLeg: string;
  onLegSelect: (id: string) => void; onOriginSelect: (place: Place) => void; onDestinationSelect: (place: Place) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<Leaflet.Map | null>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [tileError, setTileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [fit, setFit] = useState(0);
  const [pick, setPick] = useState<"origin" | "destination">("origin");
  const [showPlaces, setShowPlaces] = useState(false);

  useEffect(() => {
    let disposed = false;
    import("leaflet").then(L => {
      if (disposed || !element.current) return;
      leaflet.current = L;
      const map = L.map(element.current, { scrollWheelZoom: false, minZoom: 4, maxZoom: 18 }).setView([3.5, 73.1], 7);
      instance.current = map;
      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19,
      }).on("tileerror", () => { if (!disposed) setTileError(true); }).addTo(map);
      const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(element.current);
      map.on("unload", () => observer.disconnect());
      setReady(true);
    }).catch(() => { if (!disposed) setError("The map could not load. Your itinerary is still available below."); });
    return () => { disposed = true; instance.current?.remove(); instance.current = null; };
  }, [retry]);

  useEffect(() => {
    const map = instance.current, L = leaflet.current;
    if (!ready || !map || !L) return;
    const layer = L.layerGroup().addTo(map);
    const label = (text: string) => { const span = document.createElement("span"); span.textContent = text; return span; };
    if (showPlaces) [...directory.islands, ...directory.airports].forEach(place => {
      L.circleMarker([place.latitude, place.longitude], { radius: 4, color: place.iata ? transportColors.flight : "#087F8C", fillOpacity: 0.7, weight: 1 })
        .bindTooltip(label(`${place.name} · ${place.iata ?? place.atoll}`))
        .on("click", () => { if (pick === "destination") onDestinationSelect(place); else if (!place.iata) onOriginSelect(place); })
        .addTo(layer);
    });
    legs.forEach((leg, index) => {
      if (leg.points.length < 2) return;
      L.polyline(leg.points.map(place => [place.latitude, place.longitude]), {
        color: transportColors[leg.mode], weight: selectedLeg === leg.id ? 7 : 4,
        opacity: selectedLeg && selectedLeg !== leg.id ? 0.5 : 1, dashArray: leg.mode === "flight" || leg.mode === "sea" ? "10 8" : undefined,
      }).bindTooltip(label(`${index + 1}. ${leg.title} · Illustrative connection`)).on("click", () => onLegSelect(leg.id)).addTo(layer);
      const start = leg.points[0];
      L.marker([start.latitude, start.longitude], {
        title: `${index + 1}. ${leg.title}`, keyboard: true,
        icon: L.divIcon({ className: "", html: `<span style="display:grid;place-items:center;width:26px;height:26px;border:2px solid white;border-radius:50%;background:${transportColors[leg.mode]};color:${leg.mode === "flight" ? "#12343B" : "white"};font-weight:bold;box-shadow:0 1px 5px #12343b55">${index + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
      }).bindTooltip(label(`${leg.from} · ${leg.status}`)).on("click", () => onLegSelect(leg.id)).addTo(layer);
    });
    [origin, destination].forEach((place, index) => {
      if (!place) return;
      L.circleMarker([place.latitude, place.longitude], { radius: 9, color: "#12343B", fillColor: index ? "#F28C78" : "#087F8C", fillOpacity: 1, weight: 3 })
        .bindTooltip(label(`${index ? "Destination" : "Start"}: ${place.name}`), { permanent: true, direction: "right", offset: [12, 0] }).addTo(layer);
    });
    return () => { layer.remove(); };
  }, [ready, directory, origin, destination, legs, selectedLeg, onLegSelect, onOriginSelect, onDestinationSelect, showPlaces, pick]);

  useEffect(() => {
    const map = instance.current, L = leaflet.current;
    if (!ready || !map || !L) return;
    const selected = legs.find(leg => leg.id === selectedLeg);
    const points = selected?.points.length ? selected.points : [...legs.flatMap(leg => leg.points), ...[origin, destination].filter((place): place is Place => !!place)];
    if (points.length) map.fitBounds(L.latLngBounds(points.map(place => [place.latitude, place.longitude])), { padding: [40, 40], maxZoom: selectedLeg ? 14 : 10 });
  }, [ready, legs, selectedLeg, origin, destination, fit]);

  return <section id="map" className="scroll-mt-4 overflow-hidden rounded-2xl border border-ocean/15 bg-white" aria-label="Whole journey map">
    <header className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="text-xl font-semibold">The whole route</h2><p className="mt-1 text-xs text-ocean/65">Select a leg to focus the map.</p></div><button type="button" onClick={() => { onLegSelect(""); setFit(value => value + 1); }} className="rounded-full border border-lagoon/30 px-4 py-2 text-sm text-lagoon">Fit whole journey</button></header>
    <div className="flex flex-wrap items-center gap-3 px-5 pb-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={showPlaces} onChange={event => setShowPlaces(event.target.checked)} />Choose locations on map</label>{showPlaces && <label>Set <select value={pick} onChange={event => setPick(event.target.value as "origin" | "destination")} className="rounded-lg border p-2"><option value="origin">starting island</option><option value="destination">destination</option></select></label>}</div>
    {error && <p role="alert" className="p-4 text-rose-800">{error} <button className="underline" onClick={() => { setError(""); setReady(false); setRetry(value => value + 1); }}>Retry map</button></p>}
    <div ref={element} className="relative z-0 h-[360px] bg-flight/10 sm:h-[520px]" aria-label="Map with illustrative ferry, flight and taxi connections" />
    {tileError && <p role="status" className="px-5 pt-4 text-sm">Background tiles are unavailable. Route lines and location markers still work.</p>}
    <div className="space-y-3 p-5 text-xs leading-5 text-ocean/70"><ul className="flex flex-wrap gap-4" aria-label="Transport legend">{(["sea", "flight", "taxi", "land"] as const).map(mode => <li key={mode} className="flex items-center gap-2"><span className="inline-block w-5 border-t-4" style={{ borderColor: transportColors[mode] }} />{({ sea: "Ferry", flight: "Flight", taxi: "Taxi", land: "Unresolved transfer" })[mode]}</li>)}</ul><p>Illustrative straight connections, not navigation paths or live tracking. Harbour and destination markers use island reference points. An address note does not geocode your home. Locations: OneMap and Maldives CAA (July 2025).</p></div>
  </section>;
}
