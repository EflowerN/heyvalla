"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { taxiTime, type Taxi } from "../components/TaxiAddon";
type OperatorTaxi = Taxi & { passenger_name: string; booking_reference: string };
function localInput(value: string) { const date = new Date(value); return new Date(date.getTime() + 5 * 3600000).toISOString().slice(0,16); }
export default function OperatorDashboard() {
  const [authenticated, setAuthenticated] = useState(false); const [checked, setChecked] = useState(false);
  const [requests, setRequests] = useState<OperatorTaxi[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch("/api/operator/taxis", { cache: "no-store" }); const data = await response.json();
    if (response.status === 401) setAuthenticated(false);
    if (!response.ok) throw new Error(data.message ?? "Could not load requests."); setRequests(data.requests);
  }
  useEffect(() => { fetch("/api/operator/session", { cache: "no-store" }).then(async response => {
    const data = await response.json(); setAuthenticated(data.authenticated); setChecked(true); if (data.authenticated) await load();
  }).catch(() => { setChecked(true); setError("Could not connect to the operator dashboard."); }); }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setBusy(true); setError("");
    try { const response = await fetch("/api/operator/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: fields.get("password") }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setAuthenticated(true); await load(); } catch(error) { setError(error instanceof Error ? error.message : "Login failed."); } finally { setBusy(false); }
  }
  async function update(event: FormEvent<HTMLFormElement>, taxi: OperatorTaxi) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement; const action = submitter.value;
    setBusy(true); setError(""); setMessage("");
    try {
      const price = Number(fields.get("price"));
      const response = await fetch("/api/operator/taxis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: taxi.reference, version: taxi.version, action, pickup_at: action === "quote" ? fields.get("pickup_at") : null, price_minor: action === "quote" ? Math.round(price * 100) : null, operator_note: fields.get("operator_note") }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(" ") : data.message); await load(); setMessage(action === "quote" ? "Quote sent. Passenger acceptance is required." : "Request declined.");
    } catch(error) { setError(error instanceof Error ? error.message : "Could not update request."); } finally { setBusy(false); }
  }
  async function logout() { try { await fetch("/api/operator/session", { method: "DELETE" }); setAuthenticated(false); setRequests([]); } catch { setError("Could not log out. Please retry."); } }
  return <main className="mx-auto max-w-5xl px-5 py-12"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><Link href="/" className="font-semibold text-teal-800 underline">← Passenger app</Link><span className="rounded-full bg-amber-100 px-3 py-1 text-sm">Demo operator · Thimarafushi</span></header><h1 className="text-3xl font-semibold">Taxi request dashboard</h1><p className="my-4 leading-7 text-slate-600">Review harbour-to-airport transfers, propose a pickup and demo price, or decline. All requests and confirmations are simulated; no drivers or payments are involved.</p>
    {error && <p role="alert" className="my-4 rounded-xl bg-rose-50 p-4 text-rose-900">{error}</p>}{message && <p role="status" className="my-4 rounded-xl bg-teal-50 p-4">{message}</p>}
    {!checked ? <p>Checking operator session…</p> : !authenticated ? <form onSubmit={login} className="max-w-md rounded-xl border bg-white p-6"><label className="block font-medium">Demo operator password<input name="password" type="password" required disabled={busy} className="my-3 block w-full rounded-lg border p-3" autoComplete="current-password" /></label><button disabled={busy} className="rounded-lg bg-teal-800 px-4 py-3 text-white">{busy ? "Signing in…" : "Sign in"}</button><p className="mt-3 text-xs text-slate-500">Use the password configured for this local demo.</p></form> : <><div className="my-6 flex flex-wrap gap-4"><button disabled={busy} onClick={() => { setMessage(""); setError(""); load().catch(error => setError(error.message)); }} className="rounded-lg border bg-white px-4 py-2">Refresh requests</button><button onClick={logout} className="underline">Sign out</button><span className="self-center text-sm text-slate-500">{requests.filter(item=>item.status === "requested").length} awaiting quote · {requests.filter(item=>item.status === "quoted").length} quoted · {requests.filter(item=>item.status === "confirmed").length} confirmed</span></div>
    {!requests.length && <p className="rounded-xl border border-dashed p-8">No taxi requests yet. Add a taxi from a ferry booking in the passenger app.</p>}
    <div className="space-y-5">{requests.map(taxi => <article key={`${taxi.reference}-${taxi.version}`} className="rounded-xl border bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{taxi.reference}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{taxi.status}</span></div><p className="mt-3">{taxi.passenger_name} · Ferry {taxi.booking_reference}</p><p className="mt-2 text-sm text-slate-600">Thimarafushi harbour → airport · {taxi.passengers} passengers · {taxi.bags} bags<br />Pickup: {taxiTime(taxi.pickup_at)} Maldives time<br />{taxi.check_in_deadline_at ? `Check-in target: ${taxiTime(taxi.check_in_deadline_at)}` : "Legacy booking: check-in target not recorded; verify timing separately."}</p>
    {taxi.price_minor !== null && <p className="mt-2 font-medium">Quote: {(taxi.price_minor/100).toFixed(2)} MVR</p>}{taxi.operator_note && <p className="mt-2 text-sm">{taxi.operator_note}</p>}
    {['requested','quoted'].includes(taxi.status) && <form onSubmit={event => update(event,taxi)} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Pickup (Maldives time)<input name="pickup_at" type="datetime-local" defaultValue={localInput(taxi.pickup_at)} required disabled={busy} className="mt-2 block w-full rounded-lg border p-3" /></label><label className="text-sm font-medium">Demo price (MVR)<input name="price" type="number" min="0.01" max="10000" step="0.01" defaultValue={taxi.price_minor === null ? "150" : taxi.price_minor / 100} required disabled={busy} className="mt-2 block w-full rounded-lg border p-3" /></label><label className="text-sm font-medium sm:col-span-2">Operator note<input name="operator_note" maxLength={500} defaultValue={taxi.operator_note ?? ""} disabled={busy} className="mt-2 block w-full rounded-lg border p-3" /></label><div className="flex gap-4 sm:col-span-2"><button name="action" value="quote" disabled={busy} className="rounded-lg bg-teal-800 px-4 py-2 text-white">Send demo quote</button><button name="action" value="decline" formNoValidate disabled={busy} className="rounded-lg border px-4 py-2 text-rose-800">Decline request</button></div><p className="text-xs text-slate-500 sm:col-span-2">Quotes expire after 30 minutes. Pickup must allow disembarkation, a 15-minute drive, and the 30-minute check-in safety margin.</p></form>}
    </article>)}</div></>}
  </main>;
}
