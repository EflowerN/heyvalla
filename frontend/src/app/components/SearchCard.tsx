import type { FormEvent } from "react";
import type { Airport, Island } from "../ferry";

type Props = {
  islands: Island[];
  airports: Airport[];
  island: string;
  airport: string;
  islandFilter: string;
  onIslandFilter: (value: string) => void;
  onIslandChange: (id: string) => void;
  onAirportChange: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  islandError: string;
};

const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’‘.]/g, "").trim();
const field = "tap mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3 text-base";

export default function SearchCard({ islands, airports, island, airport, islandFilter, onIslandFilter, onIslandChange, onAirportChange, onSubmit, loading, islandError }: Props) {
  const searchTerms = normalizeSearch(islandFilter).split(/\s+/).filter(Boolean);
  const exactAtoll = islands.some(item => normalizeSearch(item.atoll) === normalizeSearch(islandFilter));
  const filteredIslands = islands.filter(item => exactAtoll
    ? normalizeSearch(item.atoll) === normalizeSearch(islandFilter)
    : searchTerms.every(term => normalizeSearch(`${item.name} ${item.atoll} ${item.atoll === "MLE" ? "Male City" : "Atoll"} ${item.category === "resort" ? "resort tourism" : "inhabited"}`).includes(term)));
  const visibleIslands = islands;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-ocean/15 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-semibold">Plan your connection</h2>
      <p aria-live="polite" className="mb-4 text-sm text-lagoon">Selected: {islands.find(item => item.id === island)?.name ?? "Loading…"} → {airports.find(item => item.id === airport)?.name ?? "Loading…"}</p>
      <label className="mb-4 block text-sm font-medium">Find an island or atoll
        <input type="search" value={islandFilter} onChange={event => onIslandFilter(event.target.value)} placeholder="e.g. Guraidhoo or Thaa" autoComplete="off" aria-describedby="island-search-help" className={field} />
      </label>
      <div id="island-search-help" className="mb-4">
        {islandFilter.trim() ? <>
          <p role="status" className="mb-2 text-sm text-ocean/80">{filteredIslands.length} matching islands. Select one below.</p>
          {filteredIslands.length
            ? <ul aria-label="Matching islands" className="max-h-64 overflow-y-auto rounded-lg border border-ocean/15 bg-white">{filteredIslands.map(item => <li key={item.id}><button type="button" disabled={loading} onClick={() => onIslandChange(item.id)} className="tap block w-full border-b border-ocean/10 px-3 py-3 text-left text-sm hover:bg-lagoon/10 focus:bg-lagoon/10"><span className="font-semibold">{item.name}</span><span className="ml-2 text-ocean/70">{item.atoll === "MLE" ? "Malé City" : `${item.atoll} Atoll`}{item.category === "resort" ? " · Resort island" : " · Inhabited island"}</span></button></li>)}</ul>
            : <p className="text-sm text-ocean/70">No islands found. Try a shorter name or an atoll name.</p>}
        </> : <p className="text-xs text-ocean/70">Type a name, then select a matching island. You can also choose from the full list below.</p>}
      </div>
      <label className="mb-4 block text-sm font-medium">Departure island
        <select name="island" value={island} onChange={event => onIslandChange(event.target.value)} required disabled={!islands.length || loading} className={field}>
          {!islands.length && <option value="">Loading islands…</option>}
          {[...new Set(visibleIslands.map(item => item.atoll))].sort().map(atoll => <optgroup key={atoll} label={atoll === "MLE" ? "Malé City" : `${atoll} Atoll`}>{visibleIslands.filter(item => item.atoll === atoll).map(item => <option key={item.id} value={item.id}>{item.name} · {item.atoll}{item.category === "resort" ? " · Resort island" : ""}</option>)}</optgroup>)}
        </select>
      </label>
      {islandError && <p role="alert" className="mb-4 text-sm text-rose-800">{islandError}</p>}
      <label className="mb-4 block text-sm font-medium">Destination airport
        <select name="airport" value={airport} onChange={event => onAirportChange(event.target.value)} required disabled={!airports.length || loading} className={field}>
          {!airports.length && <option value="">Loading airports…</option>}
          {airports.map(item => <option key={item.id} value={item.id}>{item.name} ({item.iata})</option>)}
        </select>
      </label>
      <label className="mb-4 block text-sm font-medium">Flight date<input name="flight_date" type="date" required disabled={loading} className={field} /></label>
      <label className="mb-4 block text-sm font-medium">Flight departure time<input name="flight_time" type="time" defaultValue="14:00" required disabled={loading} className={field} /></label>
      <label className="mb-4 block text-sm font-medium">Check-in before departure<select name="check_in_minutes" defaultValue="60" disabled={loading} className={field}><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label>
      <span className="mb-2 inline-block rounded-full bg-land px-2 py-1 text-xs font-semibold text-ocean">Land transfer</span>
      <p className="mb-5 text-xs leading-5 text-ocean/70">All dates and times use Maldives time (UTC+5). Check-in is your chosen allowance, not a verified airline deadline. Demo assumptions: 20-minute airport transfer for Thimarafushi + 30-minute safety margin. Other airports do not yet have transfer assumptions.</p>
      <button disabled={loading || !islands.length || !airports.length} className="tap w-full rounded-lg bg-lagoon px-4 py-3 font-semibold text-white hover:bg-lagoon/90 disabled:opacity-50">{loading ? "Finding connections…" : "Find ferries"}</button>
    </form>
  );
}
