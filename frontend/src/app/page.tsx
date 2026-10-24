"use client";

import { useEffect, useState, type FormEvent } from "react";

type Sailing = { id: string; service: string; operator: string; departure_at: string; harbour_arrival_at: string; airport_arrival_at: string; connection_buffer_minutes: number; classification: "recommended" | "tight" | "too_late" | "cancelled" };
type Result = { origin: string; flight_at: string; check_in_deadline_at: string; transfer_minutes: number; safety_minutes: number; sailings: Sailing[] };
const labels = { recommended: "Meets arrival target", tight: "Tight connection", too_late: "Too late for check-in", cancelled: "Cancelled · unavailable" };
const colors = { recommended: "bg-teal-100 text-teal-900", tight: "bg-amber-100 text-amber-900", too_late: "bg-rose-100 text-rose-900", cancelled: "bg-slate-200 text-slate-700" };
function localTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Indian/Maldives", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

export default function Home() {
  const [islands, setIslands] = useState<{ id: string; name: string }[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [islandError, setIslandError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/islands", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Could not load islands. Reload this page to try again.");
      const data = await response.json(); setIslands(data.islands);
    }).catch(error => { if (!controller.signal.aborted) setIslandError(error.message); });
    return () => controller.abort();
  }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    data.forEach((value, key) => query.set(key, String(value)));
    setLoading(true); setError(""); setResult(null);
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
      <header className="mb-10 flex items-center justify-between border-b border-slate-200 pb-6">
        <span className="text-xl font-bold tracking-tight text-teal-900">heyvalla<span className="text-teal-500">.</span></span>
        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900">Thaa Atoll · Demo</span>
      </header>
      <div className="mb-9 max-w-2xl"><p className="text-sm font-semibold uppercase tracking-widest text-teal-700">From your island to your flight</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Find a ferry that fits your flight.</h1>
        <p className="mt-4 leading-7 text-slate-600">Compare connections to Thimarafushi Airport, including time to get from the harbour to check-in.</p>
      </div>
      <aside className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Demonstration only. All sailings, durations, cancellations, and transfer allowances are fictional. They repeat daily for testing and are not RTL schedules. No real tickets are available.</aside>
      <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
        <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">Plan your connection</h2>
          <label className="mb-4 block text-sm font-medium">Departure island
            <select name="island" required disabled={!islands.length || loading} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">{!islands.length && <option value="">Loading islands…</option>}{islands.map(island => <option key={island.id} value={island.id}>{island.name}</option>)}</select>
          </label>
          {islandError && <p role="alert" className="mb-4 text-sm text-rose-800">{islandError}</p>}
          <p className="mb-4 text-sm text-slate-500">Destination: Thimarafushi Airport</p>
          <label className="mb-4 block text-sm font-medium">Flight date<input name="flight_date" type="date" required disabled={loading} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></label>
          <label className="mb-4 block text-sm font-medium">Flight departure time<input name="flight_time" type="time" defaultValue="14:00" required disabled={loading} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></label>
          <label className="mb-4 block text-sm font-medium">Check-in before departure<select name="check_in_minutes" defaultValue="60" disabled={loading} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3"><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label>
          <p className="mb-5 text-xs leading-5 text-slate-500">All dates and times use Maldives time (UTC+5). Check-in is your chosen allowance, not a verified airline deadline. Demo assumptions: 20-minute airport transfer + 30-minute safety margin.</p>
          <button disabled={loading || !islands.length} className="w-full rounded-lg bg-teal-800 px-4 py-3 font-semibold text-white hover:bg-teal-900 disabled:opacity-50">{loading ? "Finding connections…" : "Find ferries"}</button>
        </form>
        <section aria-live="polite" aria-busy={loading}>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">{error}</p>}
          {!result && !error && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center"><h2 className="text-xl font-semibold">Your journey starts here</h2><p className="mt-3 leading-7 text-slate-500">Choose a flight date and search to compare demo ferries. Try Vilufushi with a 14:00 flight to see suitable, tight, late, and cancelled options.</p></div>}
          {result && <>
            <div className="mb-6"><h2 className="text-2xl font-semibold">{result.origin} → Thimarafushi</h2><p className="mt-2 text-sm leading-6 text-slate-600">Flight: {localTime(result.flight_at)} · Check-in target: {localTime(result.check_in_deadline_at)}<br />{result.sailings.filter(s => s.classification === "recommended").length} ferries meet the target with the {result.safety_minutes}-minute safety margin.</p></div>
            {!result.sailings.length && <p className="rounded-xl bg-white p-6">No demo sailings arrive on this flight date. Try another island or date.</p>}
            {!!result.sailings.length && !result.sailings.some(s => s.classification === "recommended") && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-amber-950">No ferry meets the recommended arrival target. Consider travelling earlier or arranging another service; this demo does not provide a confirmed alternative.</p>}
            <div className="space-y-4">{result.sailings.map(sailing => <article key={sailing.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{sailing.service} <span className="font-normal text-slate-500">· Demo ferry</span></h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[sailing.classification]}`}>{labels[sailing.classification]}</span></div>
              <dl className="my-5 grid gap-4 text-sm sm:grid-cols-3">{[["Departs island", sailing.departure_at], ["Arrives harbour", sailing.harbour_arrival_at], ["Reaches airport", sailing.airport_arrival_at]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{localTime(value)}</dd></div>)}</dl>
              <p className="border-t border-slate-100 pt-3 text-sm text-slate-600">{sailing.classification === "cancelled" ? "This simulated sailing is cancelled and cannot be used." : sailing.connection_buffer_minutes < 0 ? `Arrives ${Math.abs(sailing.connection_buffer_minutes)} minutes after your check-in target.` : `${sailing.connection_buffer_minutes} minutes before your check-in target.${sailing.classification === "tight" ? " Below the recommended safety margin." : " Includes the recommended safety margin."}`}</p>
            </article>)}</div>
            <p className="mt-5 text-xs leading-6 text-slate-500">Planning estimates only, not guaranteed connections. Search includes sailings arriving on the flight date, including departures the previous evening. Earlier-day arrival options are outside this demo search.</p>
          </>}
        </section>
      </div>
    </main>
  );
}
