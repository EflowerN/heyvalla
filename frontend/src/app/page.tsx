"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import TransportLegend from "./components/TransportLegend";
import BookingDesk, { type BookingChoice } from "./components/BookingDesk";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const TransportMap = dynamic(() => import("./components/TransportMap"), { ssr: false, loading: () => <p className="py-6">Loading interactive map…</p> });

type Sailing = { available_seats: number; bookable: boolean; id: string; service: string; operator: string; departure_at: string; harbour_arrival_at: string; airport_arrival_at: string; connection_buffer_minutes: number; classification: "recommended" | "tight" | "too_late" | "cancelled" };
type Result = { search: Record<string, string | number>; destination: string; destination_code: string; schedule_coverage: boolean; coverage_message: string | null; origin: string; flight_at: string; check_in_deadline_at: string; transfer_minutes: number | null; safety_minutes: number; sailings: Sailing[] };
const labels = { recommended: "Meets arrival target", tight: "Tight connection", too_late: "Too late for check-in", cancelled: "Cancelled · unavailable" };
const colors = { recommended: "bg-lagoon/10 text-ocean", tight: "bg-coral/20 text-ocean", too_late: "bg-rose-100 text-rose-900", cancelled: "bg-ocean/10 text-ocean" };
function localTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Indian/Maldives", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

export default function Home() {
  const [islands, setIslands] = useState<{ id: string; name: string; atoll: string; category: string }[]>([]);
  const [airports, setAirports] = useState<{ id: string; name: string; iata: string }[]>([]);
  const [island, setIsland] = useState("ld0205");
  const [islandFilter, setIslandFilter] = useState("");
  const [airport, setAirport] = useState("VRNT");
  const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’‘.]/g, "").trim();
  const searchTerms = normalizeSearch(islandFilter).split(/\s+/).filter(Boolean);
  const exactAtoll = islands.some(item => normalizeSearch(item.atoll) === normalizeSearch(islandFilter));
  const filteredIslands = islands.filter(item => exactAtoll ? normalizeSearch(item.atoll) === normalizeSearch(islandFilter) : searchTerms.every(term => normalizeSearch(`${item.name} ${item.atoll} ${item.atoll === "MLE" ? "Male City" : "Atoll"} ${item.category === "resort" ? "resort tourism" : "inhabited"}`).includes(term)));
  const visibleIslands = islands;
  const [bookingChoice, setBookingChoice] = useState<BookingChoice | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [islandError, setIslandError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/islands", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Could not load islands. Reload this page to try again.");
      const data = await response.json(); setIslands(data.islands); setAirports(data.airports);
    }).catch(error => { if (!controller.signal.aborted) setIslandError(error.message); });
    return () => controller.abort();
  }, []);

  const selectIsland = useCallback((id: string) => {
    setIsland(id); setIslandFilter(""); setResult(null); setBookingChoice(null); setError("");
  }, [setResult, setBookingChoice]);
  const selectAirport = useCallback((id: string) => {
    setAirport(id); setResult(null); setBookingChoice(null); setError("");
  }, [setResult, setBookingChoice]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    data.forEach((value, key) => query.set(key, String(value)));
    setLoading(true); setError(""); setResult(null); setBookingChoice(null);
    try {
      const response = await fetch(`/api/ferry-search?${query}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.errors ? Object.values(body.errors).flat().join(" ") : body.message);
      setResult(body);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not search. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-ocean/15 pb-6">
        <span className="text-xl font-bold tracking-tight text-ocean">heyvalla<span className="text-coral">.</span></span>
        <Link href="/greater-male-taxi" className="text-sm font-medium text-lagoon underline">Greater Malé taxi fares</Link>
        <Link href="/buses" className="rounded-full bg-bus px-3 py-1 text-sm font-medium text-white">RTL buses</Link>
        <Link href="/operator" className="text-sm font-medium text-lagoon underline">Operator dashboard</Link>
        <span className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-semibold text-ocean">Maldives · Demo</span>
      </header>
      <div className="mb-9 max-w-2xl"><p className="text-sm font-semibold uppercase tracking-widest text-lagoon">From your island to your flight</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Find a ferry that fits your flight.</h1>
        <p className="mt-4 leading-7 text-ocean/80">Choose from inhabited islands, resort islands, and land airports across the Maldives. Demo ferry connections currently serve Thimarafushi Airport.</p>
      </div>
      <aside className="mb-8 rounded-xl border border-coral/50 bg-coral/10 p-4 text-sm leading-6 text-ocean">Demonstration only. All sailings, durations, cancellations, and transfer allowances are fictional. They repeat daily for testing and are not RTL schedules. No real tickets are available.</aside>
      <TransportLegend />
      <TransportMap island={island} airport={airport} onIslandSelect={selectIsland} onAirportSelect={selectAirport} />
      <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
        <form onSubmit={search} className="rounded-2xl border border-ocean/15 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">Plan your connection</h2>
          <p aria-live="polite" className="mb-4 text-sm text-lagoon">Selected: {islands.find(item => item.id === island)?.name ?? "Loading…"} → {airports.find(item => item.id === airport)?.name ?? "Loading…"}</p>
          <label className="mb-4 block text-sm font-medium">Find an island or atoll
            <input type="search" value={islandFilter} onChange={event => setIslandFilter(event.target.value)} placeholder="e.g. Guraidhoo or Thaa" autoComplete="off" aria-describedby="island-search-help" className="mt-2 block w-full rounded-lg border border-ocean/25 p-3" />
          </label>
          <div id="island-search-help" className="mb-4">
            {islandFilter.trim() ? <>
              <p role="status" className="mb-2 text-sm text-ocean/80">{filteredIslands.length} matching islands. Select one below.</p>
              {filteredIslands.length ? <ul aria-label="Matching islands" className="max-h-64 overflow-y-auto rounded-lg border border-ocean/15 bg-white">{filteredIslands.map(item => <li key={item.id}><button type="button" disabled={loading} onClick={() => selectIsland(item.id)} className="block w-full border-b border-ocean/10 px-3 py-3 text-left text-sm hover:bg-lagoon/10 focus:bg-lagoon/10"><span className="font-semibold">{item.name}</span><span className="ml-2 text-ocean/70">{item.atoll === "MLE" ? "Malé City" : `${item.atoll} Atoll`}{item.category === "resort" ? " · Resort island" : " · Inhabited island"}</span></button></li>)}</ul> : <p className="text-sm text-ocean/70">No islands found. Try a shorter name or an atoll name.</p>}
            </> : <p className="text-xs text-ocean/70">Type a name, then select a matching island. You can also choose from the full list below.</p>}
          </div>
          <label className="mb-4 block text-sm font-medium">Departure island
            <select name="island" value={island} onChange={event => selectIsland(event.target.value)} required disabled={!islands.length || loading} className="mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3">
              {!islands.length && <option value="">Loading islands…</option>}
              {[...new Set(visibleIslands.map(item => item.atoll))].sort().map(atoll => <optgroup key={atoll} label={atoll === "MLE" ? "Malé City" : `${atoll} Atoll`}>{visibleIslands.filter(item => item.atoll === atoll).map(item => <option key={item.id} value={item.id}>{item.name} · {item.atoll}{item.category === "resort" ? " · Resort island" : ""}</option>)}</optgroup>)}
            </select>
          </label>
          {islandError && <p role="alert" className="mb-4 text-sm text-rose-800">{islandError}</p>}
          <label className="mb-4 block text-sm font-medium">Destination airport
            <select name="airport" value={airport} onChange={event => selectAirport(event.target.value)} required disabled={!airports.length || loading} className="mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3">
              {!airports.length && <option value="">Loading airports…</option>}
              {airports.map(item => <option key={item.id} value={item.id}>{item.name} ({item.iata})</option>)}
            </select>
          </label>
          <label className="mb-4 block text-sm font-medium">Flight date<input name="flight_date" type="date" required disabled={loading} className="mt-2 block w-full rounded-lg border border-ocean/25 p-3" /></label>
          <label className="mb-4 block text-sm font-medium">Flight departure time<input name="flight_time" type="time" defaultValue="14:00" required disabled={loading} className="mt-2 block w-full rounded-lg border border-ocean/25 p-3" /></label>
          <label className="mb-4 block text-sm font-medium">Check-in before departure<select name="check_in_minutes" defaultValue="60" disabled={loading} className="mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3"><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label>
          <span className="mb-2 inline-block rounded-full bg-land px-2 py-1 text-xs font-semibold text-ocean">Land transfer</span>
          <p className="mb-5 text-xs leading-5 text-ocean/70">All dates and times use Maldives time (UTC+5). Check-in is your chosen allowance, not a verified airline deadline. Demo assumptions: 20-minute airport transfer for Thimarafushi + 30-minute safety margin. Other airports do not yet have transfer assumptions.</p>
          <button disabled={loading || !islands.length || !airports.length} className="w-full rounded-lg bg-lagoon px-4 py-3 font-semibold text-white hover:bg-lagoon/90 disabled:opacity-50">{loading ? "Finding connections…" : "Find ferries"}</button>
        </form>
        <section aria-live="polite" aria-busy={loading}>
          <BookingDesk choice={bookingChoice} onClose={() => setBookingChoice(null)} onBooked={() => {
            if (result) fetch(`/api/ferry-search?${new URLSearchParams(Object.entries(result.search).map(([key, value]) => [key, String(value)]))}`).then(response => response.ok ? response.json() : null).then(data => { if (data) setResult(data); }).catch(() => {});
          }} />
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">{error}</p>}
          {!result && !error && <div className="rounded-2xl border border-dashed border-ocean/25 p-10 text-center"><h2 className="text-xl font-semibold">Your journey starts here</h2><p className="mt-3 leading-7 text-ocean/70">Choose a flight date and search to compare demo ferries. Try Vilufushi (Thaa) to Thimarafushi with a 14:00 flight to see suitable, tight, late, and cancelled options.</p></div>}
          {result && <>
            <div className="mb-6"><h2 className="text-2xl font-semibold">{result.origin} → {result.destination} ({result.destination_code})</h2><p className="mt-2 text-sm leading-6 text-ocean/80"><span className="rounded-full bg-flight px-2 py-1 text-xs font-semibold text-ocean">Flight</span> {localTime(result.flight_at)} · Check-in target: {localTime(result.check_in_deadline_at)}<br />{result.schedule_coverage ? `${result.sailings.filter(s => s.classification === "recommended").length} ferry connections meet the target with the ${result.safety_minutes}-minute safety margin.` : "Schedule coverage is not available for this route yet."}</p></div>
            {!result.sailings.length && <p className="rounded-xl bg-white p-6">{result.coverage_message ?? "No demo sailings arrive on this flight date. Try another island or date."}</p>}
            {!!result.sailings.length && !result.sailings.some(s => s.classification === "recommended") && <p className="mb-5 rounded-xl bg-coral/10 p-4 text-ocean">No ferry meets the recommended arrival target. Consider travelling earlier or arranging another service; this demo does not provide a confirmed alternative.</p>}
            <div className="space-y-4">{result.sailings.map(sailing => <article key={sailing.id} className="rounded-2xl border border-ocean/15 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{sailing.service} <span className="font-normal text-ocean/70">· <span className="rounded-full bg-sea px-2 py-1 text-xs text-white">Sea · Demo ferry</span></span></h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[sailing.classification]}`}>{labels[sailing.classification]}</span></div>
              <dl className="my-5 grid gap-4 text-sm sm:grid-cols-3">{[["Departs island", sailing.departure_at], ["Arrives harbour", sailing.harbour_arrival_at], ["Reaches airport", sailing.airport_arrival_at]].map(([label, value]) => <div key={label}><dt className="text-ocean/70">{label}</dt><dd className="mt-1 font-semibold">{localTime(value)}</dd></div>)}</dl>
              <p className="border-t border-ocean/10 pt-3 text-sm text-ocean/80">{sailing.classification === "cancelled" ? "This simulated sailing is cancelled and cannot be used." : sailing.connection_buffer_minutes < 0 ? `Arrives ${Math.abs(sailing.connection_buffer_minutes)} minutes after your check-in target.` : `${sailing.connection_buffer_minutes} minutes before your check-in target.${sailing.classification === "tight" ? " Below the recommended safety margin." : " Includes the recommended safety margin."}`}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-ocean/80">{sailing.available_seats} demo seats remaining</span><button type="button" disabled={!sailing.bookable} onClick={() => setBookingChoice({ sailing_id: sailing.id, service: sailing.service, available_seats: sailing.available_seats, search: result.search })} className="rounded-lg bg-lagoon px-4 py-2 text-sm font-semibold text-white disabled:bg-ocean/10 disabled:text-ocean/80">{sailing.bookable ? "Book demo seats" : sailing.available_seats === 0 && sailing.classification !== "cancelled" ? "Sold out" : "Not bookable for this flight"}</button></div>
            </article>)}</div>
            <p className="mt-5 text-xs leading-6 text-ocean/70">Planning estimates only, not guaranteed connections. Search includes sailings arriving on the flight date, including departures the previous evening. Earlier-day arrival options are outside this demo search.</p>
          </>}
        </section>
      </div>
      <footer className="mt-10 border-t border-ocean/15 pt-5 text-xs leading-6 text-ocean/70">
        Directory: {islands.filter(item => item.category === "residential").length || "…"} residential islands, {islands.filter(item => item.category === "resort").length || "…"} tourism/resort islands and {airports.length || "…"} land airports. Island names and categories: <a href="https://readme.onemap.mv/" className="underline">Geomatics Department, Ministry of Infrastructure, Housing and Urban Development (OneMap)</a>, under its <a href="https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf" className="underline">Data Usage License</a>. Airports: <a href="https://caa.gov.mv/attachments/RkSqFC1muGxI4GakQ992lPnwqT5gjTxwiat2m7af.pdf" className="underline">Maldives CAA land-aerodrome list (July 2025)</a>. Directory retrieved 24 October 2026; inclusion does not confirm current operations or ferry service. Seaplane platforms are outside this land-airport directory. No official endorsement.
      </footer>
    </main>
  );
}
