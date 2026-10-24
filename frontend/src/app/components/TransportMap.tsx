"use client";

import { useEffect, useRef, useState } from "react";
import { transportColors } from "@/lib/transport-colors";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

type Place = { id: string; name: string; atoll?: string; category?: string; iata?: string; latitude: number; longitude: number };
type Directory = { islands: Place[]; airports: Place[]; routes: { origin_id: string; airport_id: string }[] };

export default function TransportMap({ island, airport, onIslandSelect, onAirportSelect }: { island: string; airport: string; onIslandSelect: (id: string) => void; onAirportSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [showIslands, setShowIslands] = useState(true);
  const [showResorts, setShowResorts] = useState(true);
  const viewport = useRef<{ center: Leaflet.LatLng; zoom: number } | null>(null);
  const lastView = useRef<string | null>(null);
  const [showAirports, setShowAirports] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [view, setView] = useState<"country" | "selection">("country");
  const [fitVersion, setFitVersion] = useState(0);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/islands", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Location data is unavailable.");
      setDirectory(await response.json()); setError("");
    }).catch(() => { if (!controller.signal.aborted) setError("Could not load the map directory. Try again."); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!directory || !container.current) return;
    let disposed = false;
    import("leaflet").then(L => {
      if (disposed || !container.current) return;
      const instance = L.map(container.current, { scrollWheelZoom: false, minZoom: 5, maxZoom: 18 });
      map.current = instance;
      setTilesUnavailable(false);
      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).on("tileerror", () => { if (!disposed) setTilesUnavailable(true); }).addTo(instance);
      const popup = (place: Place, kind: string) => {
        const content = document.createElement("div");
        const heading = document.createElement("strong"); heading.textContent = place.name;
        const description = document.createElement("p"); description.textContent = `${kind} · ${place.atoll ?? place.iata ?? "Maldives"}`;
        content.append(heading, description); return content;
      };
      const selectedIsland = directory.islands.find(item => item.id === island);
      const selectedAirport = directory.airports.find(item => item.id === airport);
      if (showRoutes) directory.routes.forEach(route => {
        const origin = directory.islands.find(item => item.id === route.origin_id);
        const destination = directory.airports.find(item => item.id === route.airport_id);
        if (!origin || !destination) return;
        const selected = origin.id === island && destination.id === airport;
        const content = document.createElement("div");
        content.textContent = `${origin.name} → ${destination.name}. Fictional demo connection. Straight line only; not a navigable sailing path.`;
        L.polyline([[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]], {
          color: transportColors.sea, weight: selected ? 5 : 3, dashArray: "8 8",
        }).bindPopup(content).addTo(instance);
      });
      directory.islands.filter(place => place.category === "resort" ? showResorts : showIslands).forEach(place => {
        L.circleMarker([place.latitude, place.longitude], {
          radius: place.id === island ? 8 : 4, color: place.id === island ? "#12343B" : place.category === "resort" ? "#F28C78" : "#087F8C", fillOpacity: 0.8, weight: 2,
        }).bindPopup(popup(place, place.category === "resort" ? "Tourism/resort island" : "Residential island"))
          .on("click", () => onIslandSelect(place.id)).addTo(instance);
      });
      if (showAirports) directory.airports.forEach(place => {
        L.marker([place.latitude, place.longitude], {
          title: `${place.name} (${place.iata})`, alt: `${place.name} airport marker`,
          icon: L.divIcon({ className: "", html: `<span style="display:block;background:${transportColors.flight};border:2px solid white;border-radius:4px;color:#12343B;text-align:center;font-size:16px;width:26px;height:26px;box-shadow:0 1px 5px #334155">✈</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
        }).bindPopup(popup(place, "Land airport")).on("click", () => onAirportSelect(place.id)).addTo(instance);
      });
      const places = view === "selection" ? [selectedIsland, selectedAirport].filter((item): item is Place => !!item) : [...directory.islands, ...directory.airports];
      const fitKey = `${view}:${fitVersion}:${view === "selection" ? `${island}:${airport}` : ""}`;
      if (viewport.current && lastView.current === fitKey) {
        instance.setView(viewport.current.center, viewport.current.zoom);
      } else {
        instance.fitBounds(L.latLngBounds(places.map(item => [item.latitude, item.longitude])), { padding: [35, 35], maxZoom: 11 });
      }
      lastView.current = fitKey;
      const observer = new ResizeObserver(() => instance.invalidateSize()); observer.observe(container.current);
      instance.on("unload", () => observer.disconnect());
    }).catch(() => { if (!disposed) setError("The map could not start. Try again."); });
    return () => { disposed = true; if (map.current) { viewport.current = { center: map.current.getCenter(), zoom: map.current.getZoom() }; map.current.remove(); } map.current = null; };
  }, [directory, island, airport, showIslands, showAirports, showRoutes, showResorts, view, fitVersion, retry, onIslandSelect, onAirportSelect]);

  return <section className="my-8 overflow-hidden rounded-2xl border border-ocean/15 bg-white" aria-label="Interactive Maldives transport map">
    <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="text-xl font-semibold">Explore the connections</h2><p className="mt-1 text-sm text-ocean/70">{directory ? `${directory.islands.filter(item => item.category !== "resort").length} inhabited · ${directory.islands.filter(item => item.category === "resort").length} resort islands · ${directory.airports.length} airports` : "Loading locations…"}</p></div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label><input type="checkbox" checked={showIslands} onChange={e => setShowIslands(e.target.checked)} /> Islands</label>
        <label><input type="checkbox" checked={showResorts} onChange={e => setShowResorts(e.target.checked)} /> Resorts</label>
        <label><input type="checkbox" checked={showAirports} onChange={e => setShowAirports(e.target.checked)} /> Airports</label>
        <label><input type="checkbox" checked={showRoutes} onChange={e => setShowRoutes(e.target.checked)} /> Demo routes</label>
        <button type="button" onClick={() => { setView("country"); setFitVersion(v => v + 1); }} className="font-medium text-lagoon underline">All Maldives</button>
        <button type="button" onClick={() => { setView("selection"); setFitVersion(v => v + 1); }} className="font-medium text-lagoon underline">Selected journey</button>
      </div>
    </div>
    {error && <p role="alert" className="p-5 text-rose-800">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {!directory && !error && <p role="status" className="px-5 pb-5">Loading map…</p>}
    <div ref={container} className="relative z-0 h-[460px] bg-flight/10" aria-label="Pan and zoom map of Maldives islands, airports and illustrative ferry routes" />
    {tilesUnavailable && <p role="status" className="px-5 pt-3 text-sm text-ocean">Some background map tiles could not load. Location markers remain available.</p>}
    <p className="p-5 text-xs leading-6 text-ocean/80">Teal dots: residential islands. Coral dots: tourism/resort islands (not verified operating resorts). Light-blue planes: airports. Dark-blue dashed lines: sea connections. Dashed lines: fictional ferry connections; not navigation paths or live vessel positions. A larger deep-ocean dot marks the selected origin; thicker sea lines mark the selected connection. Island coordinates: OneMap, Geomatics Department. Airport coordinates: Maldives CAA (July 2025). Click any island dot to set your departure island, or an airport marker to set your destination in the form below. Resort labels use geographic island names, not necessarily resort brand names. Background map requires internet access.</p>
  </section>;
}
