"use client";
import { useEffect, useRef, useState } from "react";
import { flightTime, type FlightOption } from "@/lib/flights";
import FlightReference from "./FlightReference";

type SearchResult = { same_day: FlightOption[]; nearby: FlightOption[]; coverage: string; checked_at: string; message: string };
export default function FlightSearch({ from, to, date, passengers, selected, onSelect, onClear }: {
  from: string; to: string; date: string; passengers: number; selected: FlightOption | null;
  onSelect: (flight: FlightOption) => void; onClear: () => void;
}) {
  const [profile, setProfile] = useState("maldivian_adult");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search() {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setResult(null); setError("");
    if (!date || !from || !to) { setError("Choose a flight date and both airports first."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/flights?${new URLSearchParams({ from, to, date, fare_profile: profile })}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.errors ? Object.values(body.errors).flat().join(" ") : body.message);
      if (!controller.signal.aborted) setResult(body);
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load flights."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function options(items: FlightOption[]) {
    return <ul className="mt-3 grid gap-3 sm:grid-cols-2">{items.map(offer => <li key={offer.id} className="rounded-xl border border-ocean/15 bg-white p-4">
      <p className="font-semibold">{offer.flight_number} · {flightTime(offer.departure_at)}</p>
      <p className="mt-1 text-sm">{offer.from_iata} → {offer.to_iata} · arrives {flightTime(offer.arrival_at)}</p>
      {!!offer.day_offset && <p className="mt-1 text-xs text-ocean/70">{Math.abs(offer.day_offset)} day(s) {offer.day_offset > 0 ? "after" : "before"} your requested date</p>}
      <p className="mt-3 font-semibold">{(offer.fare_minor / 100).toFixed(2)} {offer.currency} / adult</p>
      <p className="mt-1 text-xs">{offer.fare_name} · taxes included · Maldives nationality</p>
      <p className="mt-2 text-xs leading-5">{offer.stale ? "Older reference—recheck with airline." : "Checked website fare, not live availability."}{offer.observed_seats !== null ? ` The website showed ${offer.observed_seats} seat(s) at this fare when checked; current seats are unknown.` : ""}</p>
      <button type="button" onClick={() => onSelect(offer)} className="mt-3 rounded-lg border border-lagoon px-4 py-2 text-sm font-semibold text-lagoon">Use this flight in my journey</button>
    </li>)}</ul>;
  }
  return <section className="mt-5 rounded-xl border border-flight bg-flight/10 p-4" aria-label="Maldivian flight options">
    <h2 className="text-lg font-semibold">Choose a flight</h2>
    <p className="mt-2 text-sm leading-6">Choose a checked Maldivian flight for your date, or a nearby date within 14 days. Selecting it fills the flight times; then use Find my journey to check ferry connections.</p>
    <p className="mt-2 text-xs leading-5">Limited website snapshot, not a live search. In-app checkout is simulated. Real travel and final availability must be confirmed with Maldivian.</p>
    {selected && <div className="mt-4"><FlightReference offer={selected} /><button type="button" onClick={onClear} className="mt-2 text-sm text-lagoon underline">Use manual flight details instead</button></div>}
    <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm">Reference fare category<select value={profile} onChange={event => { request.current?.abort(); setBusy(false); setResult(null); setError(""); setProfile(event.target.value); onClear(); }} className="mt-1 block rounded-lg border border-ocean/25 bg-white p-2"><option value="maldivian_adult">Maldivian adult</option><option value="other">Other traveller / mixed party</option></select></label><button type="button" disabled={busy} onClick={() => void search()} className="rounded-lg bg-lagoon px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Loading checked flights…" : "Find flights & nearby dates"}</button></div>
    {passengers > 1 && <p className="mt-3 text-xs leading-5">These fares were checked for one adult, not your {passengers}-person party. They are not multiplied into the trip total. Maldivian must price and confirm your whole party.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    {result && <div aria-live="polite" className="mt-4">
      <p className="text-xs leading-5">{result.coverage} Checked {flightTime(result.checked_at)} (UTC+5).</p>
      <h3 className="mt-4 font-semibold">Your selected date</h3>
      {result.same_day.length ? options(result.same_day) : <p className="mt-2 text-sm">No checked flight option for this date and fare category. This does not establish that there are no flights.</p>}
      <h3 className="mt-4 font-semibold">Closest checked dates</h3>
      {result.nearby.length ? options(result.nearby) : <p className="mt-2 text-sm">No checked alternatives within 14 days. Check Maldivian for its current calendar, or enter a flight you already know.</p>}
    </div>}
    <a href="https://maldivian.aero/" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-lagoon underline">Search current availability on Maldivian ↗</a>
  </section>;
}
