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

const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’‘.]/g, "").trim();

const field = "tap mt-1.5 block w-full rounded-xl border border-ocean/25 bg-coconut px-3.5 py-3 text-base text-ocean placeholder:text-ocean/45";
const labelText = "block text-sm font-medium";

export default function SearchCard({
  islands, airports, island, airport, islandFilter, onIslandFilter, onIslandChange, onAirportChange, onSubmit, loading, islandError,
}: Props) {
  const searchTerms = normalizeSearch(islandFilter).split(/\s+/).filter(Boolean);
  const exactAtoll = islands.some(item => normalizeSearch(item.atoll) === normalizeSearch(islandFilter));
  const filteredIslands = islands.filter(item => exactAtoll
    ? normalizeSearch(item.atoll) === normalizeSearch(islandFilter)
    : searchTerms.every(term => normalizeSearch(`${item.name} ${item.atoll} ${item.atoll === "MLE" ? "Male City" : "Atoll"} ${item.category === "resort" ? "resort tourism" : "inhabited"}`).includes(term)));
  const visibleIslands = islands;
  const selectedIsland = islands.find(item => item.id === island)?.name ?? "Loading…";
  const selectedAirport = airports.find(item => item.id === airport)?.name ?? "Loading…";

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h2 className="text-xl font-semibold tracking-tight">Plan your connection</h2>
      <p aria-live="polite" className="mb-5 mt-1 text-sm text-lagoon">
        {selectedIsland} <span aria-hidden="true">→</span><span className="sr-only">to</span> {selectedAirport}
      </p>

      <label className={`${labelText} mb-2`}>Find an island or atoll
        <input type="search" value={islandFilter} onChange={event => onIslandFilter(event.target.value)} placeholder="e.g. Guraidhoo or Thaa" autoComplete="off" aria-describedby="island-search-help" className={field} />
      </label>
      <div id="island-search-help" className="mb-4">
        {islandFilter.trim() ? <>
          <p role="status" className="mb-2 text-sm text-ocean/70">{filteredIslands.length} matching islands. Select one below.</p>
          {filteredIslands.length
            ? <ul aria-label="Matching islands" className="max-h-64 overflow-y-auto rounded-xl border border-ocean/15 bg-coconut">
                {filteredIslands.map(item => (
                  <li key={item.id}>
                    <button type="button" disabled={loading} onClick={() => onIslandChange(item.id)} className="tap block w-full border-b border-ocean/10 px-3.5 py-3 text-left text-sm hover:bg-lagoon/10 focus:bg-lagoon/10">
                      <span className="font-semibold">{item.name}</span>
                      <span className="ml-2 text-ocean/60">{item.atoll === "MLE" ? "Malé City" : `${item.atoll} Atoll`}{item.category === "resort" ? " · Resort island" : " · Inhabited island"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            : <p className="text-sm text-ocean/65">No islands found. Try a shorter name or an atoll name.</p>}
        </> : <p className="text-xs text-ocean/65">Type a name, then select a matching island. You can also choose from the full list below.</p>}
      </div>

      <label className={`${labelText} mb-4`}>From (departure island)
        <select name="island" value={island} onChange={event => onIslandChange(event.target.value)} required disabled={!islands.length || loading} className={field}>
          {!islands.length && <option value="">Loading islands…</option>}
          {[...new Set(visibleIslands.map(item => item.atoll))].sort().map(atoll => (
            <optgroup key={atoll} label={atoll === "MLE" ? "Malé City" : `${atoll} Atoll`}>
              {visibleIslands.filter(item => item.atoll === atoll).map(item => (
                <option key={item.id} value={item.id}>{item.name} · {item.atoll}{item.category === "resort" ? " · Resort island" : ""}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {islandError && <p role="alert" className="mb-4 text-sm text-rose-800">{islandError}</p>}

      <label className={`${labelText} mb-4`}>To (destination airport)
        <select name="airport" value={airport} onChange={event => onAirportChange(event.target.value)} required disabled={!airports.length || loading} className={field}>
          {!airports.length && <option value="">Loading airports…</option>}
          {airports.map(item => <option key={item.id} value={item.id}>{item.name} ({item.iata})</option>)}
        </select>
      </label>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className={labelText}>Flight date
          <input name="flight_date" type="date" required disabled={loading} className={field} />
        </label>
        <label className={labelText}>Departure time
          <input name="flight_time" type="time" defaultValue="14:00" required disabled={loading} className={field} />
        </label>
      </div>

      <label className={`${labelText} mb-4`}>Check-in before departure
        <select name="check_in_minutes" defaultValue="60" disabled={loading} className={field}>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
          <option value="90">90 minutes</option>
          <option value="120">120 minutes</option>
        </select>
      </label>

      <details className="mb-5 text-xs leading-5 text-ocean/70">
        <summary className="cursor-pointer font-medium text-lagoon"><span className="mr-2 rounded-full bg-land px-2 py-1 text-xs font-semibold text-ocean">Land transfer</span>Times and assumptions</summary>
        <p className="mt-2">
          All dates and times use Maldives time (UTC+5). Check-in is your chosen allowance, not a verified airline deadline.
          Demo assumptions: 20-minute airport transfer for Thimarafushi + 30-minute safety margin. Other airports do not yet have transfer assumptions.
        </p>
      </details>

      <button disabled={loading || !islands.length || !airports.length} className="tap w-full rounded-xl bg-lagoon px-4 py-3.5 text-base font-semibold text-white hover:bg-lagoon/90 disabled:opacity-50">
        {loading ? "Finding connections…" : "Find ferries"}
      </button>
    </form>
  );
}
