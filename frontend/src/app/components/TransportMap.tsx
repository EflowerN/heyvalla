"use client";

import { useEffect, useRef, useState } from "react";
import { transportColors } from "@/lib/transport-colors";
import SlideSwitch from "./SlideSwitch";
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
      if (viewport.current && lastView.current === view) {
        instance.setView(viewport.current.center, viewport.current.zoom);
      } else {
        instance.fitBounds(L.latLngBounds(places.map(item => [item.latitude, item.longitude])), { padding: [35, 35], maxZoom: 11 });
      }
      lastView.current = view;
      const observer = new ResizeObserver(() => instance.invalidateSize()); observer.observe(container.current);
      instance.on("unload", () => observer.disconnect());
    }).catch(() => { if (!disposed) setError("The map could not start. Try again."); });
    return () => { disposed = true; if (map.current) { viewport.current = { center: map.current.getCenter(), zoom: map.current.getZoom() }; map.current.remove(); } map.current = null; };
  }, [directory, island, airport, showIslands, showAirports, showRoutes, showResorts, view, retry, onIslandSelect, onAirportSelect]);

  const inhabited = directory ? directory.islands.filter(item => item.category !== "resort").length : 0;
  const resorts = directory ? directory.islands.filter(item => item.category === "resort").length : 0;
  const airportCount = directory ? directory.airports.length : 0;
  const toggle = (on: boolean) => `wipe tap inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? "border-lagoon text-ocean" : "border-ocean/20 text-ocean/60"}`;

  return <section className="mb-6 overflow-hidden rounded-2xl border border-ocean/15 bg-white shadow-sm" aria-label="Interactive Maldives transport map">
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Explore the connections</h2>
          <p className="mt-1 text-sm text-ocean/70">{directory ? `${inhabited} inhabited ${inhabited === 1 ? "island" : "islands"} · ${resorts} resort ${resorts === 1 ? "island" : "islands"} · ${airportCount} ${airportCount === 1 ? "airport" : "airports"}` : "Loading locations…"}</p></div>
        <SlideSwitch label="Map view" value={view} onChange={next => setView(next as "country" | "selection")} options={[{ value: "country", label: "All Maldives" }, { value: "selection", label: "Selected journey" }]} />
      </div>
      <div role="group" aria-label="Map layers" className="mt-4 flex flex-wrap gap-2">
        <button type="button" aria-pressed={showIslands} onClick={() => setShowIslands(value => !value)} className={toggle(showIslands)}><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-lagoon" />Islands</button>
        <button type="button" aria-pressed={showResorts} onClick={() => setShowResorts(value => !value)} className={toggle(showResorts)}><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-coral" />Resorts</button>
        <button type="button" aria-pressed={showAirports} onClick={() => setShowAirports(value => !value)} className={toggle(showAirports)}><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-flight" />Airports</button>
        <button type="button" aria-pressed={showRoutes} onClick={() => setShowRoutes(value => !value)} className={toggle(showRoutes)}><span aria-hidden="true" className="h-0.5 w-4 border-t-2 border-dashed border-sea" />Demo routes</button>
      </div>
    </div>
    {error && <p role="alert" className="px-5 pb-5 text-rose-800">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {!directory && !error && <div role="status" aria-label="Loading map" className="mx-5 mb-5 h-[340px] animate-pulse rounded-xl bg-flight/20 sm:h-[460px] lg:h-[560px]" />}
    <div ref={container} className={`relative z-0 h-[340px] bg-flight/10 sm:h-[460px] lg:h-[560px] ${directory ? "" : "hidden"}`} aria-label="Pan and zoom map of Maldives islands, airports and illustrative ferry routes" />
    {tilesUnavailable && <p role="status" className="px-5 pt-3 text-sm text-ocean">Some background map tiles could not load. Location markers remain available.</p>}
    <div className="p-5">
      <ul aria-label="Map legend" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ocean/80">
        <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-lagoon" />Residential island</li>
        <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-coral" />Resort island</li>
        <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="inline-block h-4 w-4 rounded-sm bg-flight text-center text-[10px] leading-4 text-ocean">✈</span>Airport</li>
        <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="inline-block w-5 border-t-2 border-dashed border-sea" />Fictional sea connection</li>
        <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border-2 border-ocean bg-ocean/40" />Selected departure (larger dot, thicker line)</li>
      </ul>
      <p className="mt-3 text-xs leading-5 text-ocean/70">Tap a dot to choose your departure island, or a plane to choose the airport. Coordinates: OneMap (Geomatics Department) and Maldives CAA (July 2025).</p>
      <details className="mt-2 text-xs leading-5 text-ocean/70">
        <summary className="inline-block rounded font-medium text-lagoon">About this map</summary>
        <p className="mt-2">Resort islands are not verified operating resorts, and labels use geographic island names, not necessarily resort brand names. Dashed lines are fictional ferry connections; they are not navigation paths or live vessel positions. Click any island dot to set your departure island, or an airport marker to set your destination in the form below. Island coordinates: OneMap, Geomatics Department. Airport coordinates: Maldives CAA (July 2025). The background map requires internet access.</p>
      </details>
    </div>
  </section>;
}
