"use client";

import { useT } from "../components/I18nProvider";

import { SailingUpdate, type Operations } from "../components/SailingOperations";
import VesselTracking from "../components/VesselTracking";
import type { VesselTracking as Tracking } from "@/lib/live-vessels";
import ModeIcon from "../components/ModeIcon";
import ProviderSeatRequests, { SeatRequestForm } from "../components/ProviderSeatRequests";
import { useEffect, useRef, useState } from "react";
import { usePolling } from "@/lib/use-polling";
import { filterSailings, sailingRoute } from "@/lib/sailing-filters";
import { maldivesDate } from "@/lib/travel-date";

type Sailing = { operations: Operations | null; vessel_tracking: Tracking | null; id: number; organization_name: string; description: string | null; coverage: string | null; vessel_name: string; origin: string; destination: string; departure_at: string; arrival_at: string; fare_minor: number | null; passenger_capacity: number; seat_capacity: number; remaining_seats: number; booking_available: boolean; version: number };
const time = (value: string) => new Date(value).toLocaleTimeString("en-GB", { timeZone: "Indian/Maldives", hour: "2-digit", minute: "2-digit" });
const day = (value: string) => new Date(`${value}T12:00:00+05:00`).toLocaleDateString("en-GB", { timeZone: "Indian/Maldives", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const field = "mt-2 block w-full rounded-xl border border-ocean/20 bg-white p-3";

async function fetchCatalogue(signal?: AbortSignal): Promise<Sailing[]> {
  const response = await fetch("/api/providers/catalogue", { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Could not load sailings.");
  return data.sailings;
}

export default function PublishedSailings() {
  const t = useT();
  const [sailings, setSailings] = useState<Sailing[]>([]);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [provider, setProvider] = useState("");
  const [route, setRoute] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const sequence = useRef(0);
  async function load(signal?: AbortSignal) {
    const request = ++sequence.current;
    try {
      const data = await fetchCatalogue(signal);
      if (!signal?.aborted && sequence.current === request) { setSailings(data); setClock(Date.now()); setError(""); }
    } catch (error) {
      if (!signal?.aborted && sequence.current === request) setError(error instanceof Error ? error.message : "Could not load sailings.");
    } finally { if (!signal?.aborted && sequence.current === request) setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    const request = ++sequence.current;
    fetchCatalogue(controller.signal).then(data => {
      if (!controller.signal.aborted && sequence.current === request) { setSailings(data); setClock(Date.now()); setError(""); }
    }).catch(error => {
      if (!controller.signal.aborted && sequence.current === request) setError(error.message);
    }).finally(() => { if (!controller.signal.aborted && sequence.current === request) setLoading(false); });
    return () => controller.abort();
  }, []);
  usePolling(async () => { await load(); });
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const upcoming = filterSailings(sailings, { query: "", date: "", provider: "", route: "" }, clock);
  const results = filterSailings(sailings, { query, date, provider, route }, clock);
  const groups = [...new Set(results.map(sailing => maldivesDate(sailing.departure_at)))];
  async function refresh() { await load(); setRefreshKey(value => value + 1); }

  return <main className="mx-auto max-w-6xl px-5 py-10">
    <p className="text-sm font-semibold text-sea">{t("Sea · Provider demo sailings")}</p>
    <h1 className="mt-3 text-4xl font-semibold">{t("Find your next sailing.")}</h1>
    <p className="my-4 max-w-3xl leading-7">{t("Compare upcoming ferries and launches by day, route and provider. Times are shown in Maldives time. Seat requests need the boat owner’s approval.")}</p>
    <details className="mb-6 rounded-xl bg-sand p-4 text-sm"><summary className="font-medium">{t("About demo fares, provider verification & updates")}</summary><p className="mt-2 leading-6">{t("These are unverified provider entries, separate from RTL schedules and fictional airport ferry fixtures. No real tickets, payments or live tracking feed. Loading and last-call messages are owner reports; shared positions are entered manually. Pending requests do not hold seats.")}</p></details>
    <div className="tile grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Sailing filters">
      <label>{t("Search island or vessel")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} className={field} /></label>
      <label>{t("Travel date")}<input type="date" min={maldivesDate(clock)} value={date} onChange={event => setDate(event.target.value)} className={field} /></label>
      <label>{t("Provider")}<select value={provider} onChange={event => setProvider(event.target.value)} className={field}><option value="">{t("All providers")}</option>{[...new Set(upcoming.map(s => s.organization_name))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
      <label>{t("Route")}<select value={route} onChange={event => setRoute(event.target.value)} className={field}><option value="">{t("All routes")}</option>{[...new Set(upcoming.map(sailingRoute))].sort().map(name => <option key={name}>{name}</option>)}</select></label>
      <div className="flex flex-wrap gap-4 sm:col-span-2 lg:col-span-4"><button type="button" onClick={() => { setQuery(""); setDate(""); setProvider(""); setRoute(""); }} className="rounded-full border border-ocean/20 px-4 py-2">{t("Clear filters")}</button><button type="button" className="px-3 text-lagoon underline" onClick={() => void refresh()}>{t("Refresh sailing updates")}</button><p role="status" className="self-center text-sm">{results.length} upcoming sailing(s)</p></div>
    </div>
    {loading && <p role="status" className="mt-5">{t("Loading sailings…")}</p>}
    {error && <p role="alert" className="mt-5 text-rose-800">{error} <button className="underline" onClick={() => void refresh()}>{t("Retry")}</button></p>}
    {!loading && !error && !results.length && <p className="my-6 rounded-xl border border-dashed border-ocean/25 p-8">{t("No upcoming sailings match these filters. Try another day, route or provider.")}</p>}
    {groups.map(date => <section key={date} className="mt-8" aria-label={day(date)}><h2 className="mb-4 text-2xl font-semibold">{day(date)}</h2><div className="grid gap-5 lg:grid-cols-2">
      {results.filter(s => maldivesDate(s.departure_at) === date).map(s => <article key={s.id} className="tile overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-5"><ModeIcon mode="sea" /><span className="font-medium">{s.organization_name} · {s.vessel_name}</span></div>
        <div className="px-6 pb-6 pt-3"><h3 className="text-xl font-semibold">{s.origin} → {s.destination}</h3><p className="my-3">{time(s.departure_at)} → {time(s.arrival_at)}{maldivesDate(s.departure_at) !== maldivesDate(s.arrival_at) ? ` · arrives ${day(maldivesDate(s.arrival_at))}` : ""} · Maldives time</p>
          <p className="inline-block rounded-full bg-lagoon/10 px-4 py-2 font-semibold">{s.fare_minor === null ? "150.00 MVR per seat · assumed demo estimate" : `${(s.fare_minor / 100).toFixed(2)} MVR per seat`}</p><p className="mt-3 text-sm">{s.remaining_seats} of {s.seat_capacity} seats not yet confirmed</p><div className="seat-bar mt-2" role="presentation"><i style={{ width: `${Math.max(0, Math.min(100, ((s.seat_capacity - s.remaining_seats) / Math.max(1, s.seat_capacity)) * 100))}%` }} /></div>
          {(s.description || s.coverage) && <details className="mt-3 text-sm"><summary>{t("Provider profile & coverage")}</summary>{s.description && <p>{s.description.replace("Fictional provider for the HeyValla demonstration.", "Fictional provider for the Dhathuru App demonstration.")}</p>}{s.coverage && <p>{s.coverage}</p>}</details>}
          <SailingUpdate value={s.operations} />
          <VesselTracking value={s.vessel_tracking} />
          {s.booking_available ? <details className="mt-4"><summary className="font-semibold text-lagoon">{t("Request seats · operator approval required")}</summary><SeatRequestForm sailing={s} onSaved={() => void refresh()} /></details> : <p className="mt-4 text-sm">{t("New seat requests unavailable")}</p>}
        </div>
      </article>)}
    </div></section>)}
    <ProviderSeatRequests refreshKey={refreshKey} onChanged={() => void refresh()} />
  </main>;
}
