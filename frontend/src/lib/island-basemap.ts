import type * as Leaflet from "leaflet";
import type { FeatureCollection } from "geojson";

// Natural geography only: no administrative boundaries or invented atoll rings.
export async function addIslandBasemap(L: typeof Leaflet, map: Leaflet.Map, signal: AbortSignal) {
  const attribution = 'Geography &copy; <a href="https://readme.onemap.mv/">OneMap, Geomatics Department</a> · <a href="https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf">License</a>';
  const load = async (file: string, name: string, zIndex: number, style: Leaflet.StyleFunction) => {
    const response = await fetch(`/data/${file}`, { signal });
    if (!response.ok) throw new Error("Geographic outlines are unavailable.");
    const features = await response.json() as FeatureCollection;
    if (signal.aborted) return;
    const pane = map.createPane(name);
    pane.style.zIndex = String(zIndex);
    pane.style.pointerEvents = "none";
    const options: Leaflet.GeoJSONOptions & Leaflet.PathOptions = {
      pane: name, renderer: L.canvas({ pane: name, padding: 0.3 }), interactive: false, attribution, style,
    };
    L.geoJSON(features, options).addTo(map);
  };
  // Independent layers: a failed reef file must not hide usable island outlines.
  const results = await Promise.allSettled([
    load("maldives-reefs-lagoons.geojson", "reef-lagoon-outlines", 330, feature => feature?.properties.kind === "reef"
      ? { color: "#51A8AA", weight: 1, opacity: 0.65, fillColor: "#80C9BE", fillOpacity: 0.45 }
      : { color: "#76BDBF", weight: 1, opacity: 0.5, fillColor: "#B5E3DE", fillOpacity: 0.45 }),
    load("maldives-islands.geojson", "island-outlines", 350,
      () => ({ color: "#087F8C", weight: 1.5, opacity: 0.85, fillColor: "#FAF7F0", fillOpacity: 1 })),
  ]);
  if (results.some(result => result.status === "rejected") && !signal.aborted) {
    throw new Error("Some geographic outlines could not load.");
  }
}
