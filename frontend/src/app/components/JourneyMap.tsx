"use client";

import { useT } from "./I18nProvider";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { transportColors } from "@/lib/transport-colors";
import type { Directory, JourneyLeg, Place } from "@/lib/journey-plan";
import "leaflet/dist/leaflet.css";
import { addIslandBasemap } from "@/lib/island-basemap";
import TransportIcon from "./TransportIcon";
import LiveVessels from "./LiveVessels";
import { transportKind, transportColor, transportForeground, transportLabels, transportSvg, type TransportKind } from "@/lib/transport-icons";

export default function JourneyMap({ directory, origin, destination, legs, selectedLeg, onLegSelect, onOriginSelect, onDestinationSelect }: {
  directory: Directory; origin: Place | null; destination: Place | null; legs: JourneyLeg[]; selectedLeg: string;
  onLegSelect: (id: string) => void; onOriginSelect: (place: Place) => void; onDestinationSelect: (place: Place) => void;
}) {
  const t = useT();
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<Leaflet.Map | null>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [outlineError, setOutlineError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [fit, setFit] = useState(0);
  const [pick, setPick] = useState<"origin" | "destination">("origin");
  const [showPlaces, setShowPlaces] = useState(true);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    import("leaflet").then(L => {
      if (disposed || !element.current) return;
      leaflet.current = L;
      const map = L.map(element.current, { scrollWheelZoom: false, minZoom: 4, maxZoom: 18 }).setView([3.5, 73.1], 7);
      instance.current = map;
      setOutlineError(false);
      addIslandBasemap(L, map, controller.signal).catch(() => { if (!disposed) setOutlineError(true); });
      const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(element.current);
      map.on("unload", () => observer.disconnect());
      setReady(true);
    }).catch(() => { if (!disposed) setError("The map could not load. Your itinerary is still available below."); });
    return () => { disposed = true; controller.abort(); instance.current?.remove(); instance.current = null; };
  }, [retry]);

  useEffect(() => {
    const map = instance.current, L = leaflet.current;
    if (!ready || !map || !L) return;
    const layer = L.layerGroup().addTo(map);
    const label = (text: string) => { const span = document.createElement("span"); span.textContent = text; return span; };
    const places: { marker: Leaflet.CircleMarker; place: Place }[] = [];
    if (showPlaces) [...directory.islands, ...directory.airports].forEach(place => {
      const color = place.iata ? transportColors.flight : place.category === "resort" ? "#F28C78" : "#087F8C";
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius: 5, color: "#FFFFFF", fillColor: color, fillOpacity: 1, weight: 1.5,
      }).on("click", () => { if (pick === "destination") onDestinationSelect(place); else if (!place.iata) onOriginSelect(place); }).addTo(layer);
      places.push({ marker, place });
    });
    const refreshLabels = () => {
      const zoom = map.getZoom();
      places.forEach(({ marker, place }) => {
        const kind = place.iata ? "Airport" : place.category === "resort" ? "Tourism/resort island" : "Inhabited island";
        marker.setRadius(zoom >= 11 ? 6 : zoom >= 8 ? 5 : 3.5);
        marker.unbindTooltip().bindTooltip(label(`${place.name} · ${place.iata ?? place.atoll} · ${kind}`), {
          permanent: zoom >= 12 && map.getBounds().contains(marker.getLatLng()) && place.id !== origin?.id && place.id !== destination?.id,
          direction: place.iata ? "top" : "bottom", offset: place.iata ? [0, -10] : [0, 10], className: "island-map-label",
        });
      });
    };
    refreshLabels();
    map.on("moveend", refreshLabels);
    legs.forEach((leg, index) => {
      if (leg.points.length < 2) return;
      L.polyline(leg.points.map(place => [place.latitude, place.longitude]), {
        color: transportColors[leg.mode], weight: selectedLeg === leg.id ? 7 : 4,
        opacity: selectedLeg && selectedLeg !== leg.id ? 0.5 : 1, dashArray: leg.mode === "flight" || leg.mode === "sea" ? "10 8" : undefined,
      }).bindTooltip(label(`${index + 1}. ${leg.title} · Illustrative connection`)).on("click", () => onLegSelect(leg.id)).addTo(layer);
      const start = leg.points[0], end = leg.points[leg.points.length - 1];
      // Mid-line symbols describe transport, not a live vehicle location.
      const markerPosition: [number, number] = [(start.latitude + end.latitude) / 2, (start.longitude + end.longitude) / 2];
      const kind = transportKind(leg.mode, leg.title);
      L.marker(markerPosition, {
        title: `${index + 1}. ${leg.title}`, keyboard: true,
        icon: L.divIcon({ className: "", html: `<span style="position:relative;display:grid;place-items:center;width:36px;height:36px;border:2px solid white;border-radius:50%;background:${transportColor(kind)};color:${transportForeground(kind)};box-shadow:0 1px 5px #12343b55">${transportSvg(kind)}<span style="position:absolute;right:-6px;top:-6px;display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:white;color:#12343B;font-size:10px;font-weight:bold">${index + 1}</span></span>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
      }).bindTooltip(label(`${leg.title} · ${leg.status}`)).on("click", () => onLegSelect(leg.id)).addTo(layer);
    });
    [origin, destination].forEach((place, index) => {
      if (!place) return;
      L.circleMarker([place.latitude, place.longitude], { radius: 9, color: "#12343B", fillColor: index ? "#F28C78" : "#087F8C", fillOpacity: 1, weight: 3 })
        .bindTooltip(label(`${index ? "Destination" : "Start"}: ${place.name}`), { permanent: true, direction: "right", offset: [12, 0] }).addTo(layer);
    });
    return () => { map.off("moveend", refreshLabels); layer.remove(); };
  }, [ready, directory, origin, destination, legs, selectedLeg, onLegSelect, onOriginSelect, onDestinationSelect, showPlaces, pick]);

  useEffect(() => {
    const map = instance.current, L = leaflet.current;
    if (!ready || !map || !L) return;
    const selected = legs.find(leg => leg.id === selectedLeg);
    const points = selected?.points.length ? selected.points : [...legs.flatMap(leg => leg.points), ...[origin, destination].filter((place): place is Place => !!place)];
    if (points.length) map.fitBounds(L.latLngBounds(points.map(place => [place.latitude, place.longitude])), { padding: [40, 40], maxZoom: selectedLeg ? 14 : 10 });
  }, [ready, legs, selectedLeg, origin, destination, fit]);

  return <section id="map" className="tile flex h-full scroll-mt-4 flex-col overflow-hidden" aria-label="Whole journey map">
    <header className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h2 className="text-xl font-semibold">{t("The whole route")}</h2><p className="mt-1 text-xs text-ocean/65">{t("Select a leg to focus the map.")}</p></div><button type="button" onClick={() => { onLegSelect(""); setFit(value => value + 1); }} className="rounded-full border border-lagoon/30 px-4 py-2 text-sm text-lagoon">{t("Fit whole journey")}</button></header>
    <div className="flex flex-wrap items-center gap-3 px-5 pb-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={showPlaces} onChange={event => setShowPlaces(event.target.checked)} />{t("Show island & airport markers")}</label>{showPlaces && <label>{t("Click a marker to set")} <select value={pick} onChange={event => setPick(event.target.value as "origin" | "destination")} className="rounded-lg border p-2"><option value="origin">{t("starting island")}</option><option value="destination">{t("destination")}</option></select></label>}</div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 pb-4 text-xs text-ocean/75" aria-label="Island marker legend"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-lagoon" />{t("Inhabited island")}</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-coral" />{t("Resort island")}</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-flight" />{t("Airport")}</span><span className="flex items-center gap-2"><span className="h-2.5 w-4 rounded border border-[#51A8AA] bg-[#80C9BE]/50" />{t("Natural reefs & lagoons")}</span><span>{t("Hover for names · zoom in for island detail")}</span></div>
    {error && <p role="alert" className="p-4 text-rose-800">{error} <button className="underline" onClick={() => { setError(""); setReady(false); setRetry(value => value + 1); }}>{t("Retry map")}</button></p>}
    <div ref={element} className="relative z-0 min-h-[360px] flex-1 sm:min-h-[420px]" style={{ backgroundColor: "#E4F2F3" }} aria-label="Map with illustrative ferry, flight and taxi connections" />
    <LiveVessels mapRef={instance} leafletRef={leaflet} mapVersion={ready ? retry + 1 : 0} />
    {outlineError && <p role="status" className="px-5 pt-4 text-sm">{t("Some island, reef or lagoon outlines could not load. Island markers and route lines are still available.")}</p>}
    <div className="space-y-3 p-5 text-xs leading-5 text-ocean/70"><ul className="flex flex-wrap gap-4" aria-label="Transport legend">{(["ferry", "launch", "flight", "taxi", "bus"] satisfies TransportKind[]).map(kind => <li key={kind} className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full" style={{ backgroundColor: transportColor(kind), color: transportForeground(kind) }}><TransportIcon kind={kind} className="h-4 w-4" /></span>{transportLabels[kind]}</li>)}</ul><p>Only the legs in your itinerary are drawn; a legend icon does not mean that service is available. Route lines are illustrative straight connections, not navigation paths. FollowMe boat icons, when connected, are a separate tracking layer. Harbour and destination markers use island reference points. An address note does not geocode your home. Island, reef and lagoon outlines: OneMap; airports: Maldives CAA (July 2025). Reef and lagoon shading shows natural geography, not safe sailing areas or water depths. Island outlines include uninhabited islands; selectable markers follow the island directory.</p></div>
  </section>;
}
