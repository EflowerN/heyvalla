"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
type Zone = { id: string; name: string };
type Estimate = { from: string; to: string; amount_minor: number; currency: string; same_zone: boolean };
export default function GreaterMaleTaxi() {
  const [zones, setZones] = useState<Zone[]>([]); const [from, setFrom] = useState("male"); const [to, setTo] = useState("velana-airport");
  const [estimate, setEstimate] = useState<Estimate | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/greater-male-fares", { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error("Could not load fare zones. Retry below."); setZones((await response.json()).zones); setError(""); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [retry]);
  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setEstimate(null);
    try { const response = await fetch(`/api/greater-male-fares?${new URLSearchParams({ from, to })}`); const data = await response.json(); if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(" ") : data.message); setEstimate(data.estimate); }
    catch(error) { setError(error instanceof Error ? error.message : "Could not estimate fare."); } finally { setBusy(false); }
  }
  const name = (id: string) => zones.find(zone => zone.id === id)?.name ?? id;
  return <main className="mx-auto max-w-4xl px-5 py-12"><header className="mb-10 flex flex-wrap justify-between gap-3"><Link href="/" className="font-semibold text-teal-800 underline">← Ferry journey planner</Link><span className="rounded-full bg-teal-100 px-3 py-1 text-sm">Greater Malé only</span></header>
    <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Avas Ride fare matrix</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Estimate your airport taxi fare.</h1><p className="mt-4 leading-7 text-slate-600">Compare zone-to-zone fares for Malé, Hulhumalé and Velana airport terminals. This estimator is separate from Thimarafushi taxi requests.</p>
    <aside className="my-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6">Dataset reference estimate, not a live operator quote. Currency is MVR, confirmed by the project owner. The source file has no fare validity dates. Availability, vehicle capacity and any surcharges are not established by this matrix.</aside>
    <div className="grid gap-6 md:grid-cols-2"><form onSubmit={calculate} className="rounded-2xl border bg-white p-6"><h2 className="mb-5 text-xl font-semibold">Choose your zones</h2>
      <label className="mb-5 block text-sm font-medium">Pickup zone<select value={from} onChange={event=>{setFrom(event.target.value);setEstimate(null);}} disabled={busy || !zones.length} className="mt-2 block w-full rounded-lg border bg-white p-3">{!zones.length && <option>Loading zones…</option>}{zones.map(zone=><option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <label className="mb-5 block text-sm font-medium">Drop-off zone<select value={to} onChange={event=>{setTo(event.target.value);setEstimate(null);}} disabled={busy || !zones.length} className="mt-2 block w-full rounded-lg border bg-white p-3">{!zones.length && <option>Loading zones…</option>}{zones.map(zone=><option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <div className="flex flex-wrap gap-4"><button disabled={busy || !zones.length} className="rounded-lg bg-teal-800 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Calculating…" : "Estimate fare"}</button><button type="button" disabled={busy || !zones.length} onClick={()=>{setFrom(to);setTo(from);setEstimate(null);}} className="text-teal-800 underline">Swap zones</button></div>
    </form><section aria-live="polite" aria-busy={busy} className="rounded-2xl border border-teal-200 bg-teal-50 p-6">{error && <p role="alert" className="mb-4 text-rose-800">{error} {!zones.length && <button onClick={()=>setRetry(value=>value+1)} className="underline">Retry</button>}</p>}{estimate ? <><p className="text-sm text-slate-600">{name(estimate.from)} → {name(estimate.to)}</p><h2 className="mt-4 text-4xl font-semibold text-teal-950">{(estimate.amount_minor/100).toFixed(2)} MVR</h2><p className="mt-3 text-sm">Zone-to-zone value from the supplied matrix.</p>{estimate.same_zone && <p className="mt-4 text-sm">Both locations are within the same zone. The matrix lists a same-zone fare; it is not treated as a free trip.</p>}<p className="mt-6 text-sm leading-6 text-slate-600">Confirm the current price with the operator before travelling. This page does not reserve a taxi or change any ferry booking.</p></> : <><h2 className="text-xl font-semibold">Your fare estimate</h2><p className="mt-3 leading-7 text-slate-600">Choose pickup and drop-off zones, then estimate. No distance, duration or waiting-time prediction is included.</p></>}</section></div>
    <footer className="mt-8 text-xs leading-6 text-slate-500">Source: organizer-provided Avas Ride release v1.0, car_fare_matrix.csv. Six zones and 36 directional entries. Currency confirmed by the project owner on 24 October 2026. Geographic labels follow the supplied file; zone boundaries were not supplied.</footer>
  </main>;
}
