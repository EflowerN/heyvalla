"use client";

import TaxiAddon, { type Taxi } from "./TaxiAddon";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Booking = { taxi: Taxi | null; reference: string; passenger_name: string; seats: number; journey: { origin: string; destination: string; departure_at: string }; status: string };
export type BookingChoice = { sailing_id: string; service: string; available_seats: number; search: Record<string, string | number> };
export default function BookingDesk({ choice, onClose, onBooked }: { choice: BookingChoice | null; onClose: () => void; onBooked: () => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch("/api/demo-bookings", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load your demo bookings. Reload to retry.");
      setBookings((await response.json()).bookings); setReady(true);
    }).catch(error => setError(error.message));
  }, []);
  useEffect(() => { if (choice) panel.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [choice]);

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) return;
    const fields = new FormData(event.currentTarget);
    const payload = { ...choice.search, sailing_id: choice.sailing_id, passenger_name: String(fields.get("passenger_name")).trim(), email: String(fields.get("email")).trim(), seats: Number(fields.get("seats")) };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    setBusy(true); setError(""); setConfirmation(null);
    try {
      const response = await fetch("/api/demo-bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, request_id: request.current!.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(" ") : data.message);
      request.current = null;
      setConfirmation(data.booking);
      setBookings(previous => [data.booking, ...previous.filter(item => item.reference !== data.booking.reference)]);
      onClose(); onBooked();
    } catch (error) { setError(error instanceof Error ? error.message : "Booking failed. Please retry."); }
    finally { setBusy(false); }
  }

  async function refreshBookings() {
    try { const response = await fetch("/api/demo-bookings", { cache: "no-store" }); if (!response.ok) throw new Error("Could not refresh bookings."); setBookings((await response.json()).bookings); setError(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not refresh bookings."); }
  }

  return <div ref={panel} className="mb-6 overflow-hidden rounded-2xl border border-ocean/15 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ocean/10 bg-lagoon/10 px-5 py-4"><h2 className="text-xl font-semibold">Demo bookings</h2><button type="button" onClick={refreshBookings} className="tap rounded-full border border-lagoon/30 bg-white px-4 text-sm font-medium text-lagoon hover:bg-lagoon/10">↻ Refresh bookings & taxi quotes</button></div>
    <div className="p-5">
    <p className="text-sm leading-6 text-ocean/80">No payment, real ticket, or email is sent. Use sample passenger details. Bookings are saved for this browser for 30 days; clearing cookies loses access. This is not an account.</p>
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    {confirmation && <div role="status" className="mt-4 rounded-xl border-2 border-dashed border-lagoon/40 bg-lagoon/5 p-4"><p className="font-semibold text-lagoon"><span aria-hidden="true">✓ </span>Demo booking confirmed</p><p className="mt-2 text-2xl font-bold tracking-wide">{confirmation.reference}</p><p>{confirmation.seats} seat(s) for {confirmation.passenger_name}. No money collected.</p></div>}
    {choice && <form key={choice.sailing_id} onSubmit={book} className="mt-5 space-y-4 rounded-xl border border-ocean/15 bg-sand p-4">
      <h3 className="font-semibold">Book {choice.service} · {choice.available_seats} seats available</h3>
      <label className="block text-sm font-medium">Lead passenger name<input name="passenger_name" required maxLength={100} disabled={busy} placeholder="Demo Passenger" className="tap mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3 text-base" /></label>
      <label className="block text-sm font-medium">Email (demo only)<input name="email" type="email" required maxLength={255} disabled={busy} placeholder="passenger@example.com" className="tap mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3 text-base" /></label>
      <label className="block text-sm font-medium">Seats<input name="seats" type="number" min={1} max={Math.min(6, choice.available_seats)} defaultValue={1} required disabled={busy} className="tap mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3 text-base" /></label>
      <div className="flex flex-wrap items-center gap-3"><button disabled={busy || !ready} className="tap rounded-lg bg-lagoon px-5 py-3 font-semibold text-white hover:bg-lagoon/90 disabled:opacity-50">{busy ? "Reserving seats…" : "Confirm demo booking"}</button><button type="button" disabled={busy} onClick={onClose} className="tap rounded-lg border border-ocean/25 bg-white px-5 py-3 font-medium hover:bg-ocean/5">Cancel</button></div>
    </form>}
    <details className="mt-4 rounded-xl border border-ocean/15 p-4"><summary className="cursor-pointer font-medium">My demo bookings ({bookings.length})</summary>{!ready && <p className="mt-3">{error ? "Bookings unavailable." : "Loading…"}</p>}{ready && !bookings.length && <p className="mt-3 text-sm">No bookings yet. Search for a suitable future ferry.</p>}{bookings.map(booking => <article key={booking.reference} className="mt-3 rounded-xl border border-ocean/15 border-l-4 border-l-sea bg-white p-4 text-sm"><p className="font-semibold">{booking.reference} · <span className="rounded-full bg-sea px-2 py-0.5 text-xs text-white">Sea</span> Demo confirmed</p><p className="mt-2">{booking.journey.origin} → {booking.journey.destination}</p><p>{new Intl.DateTimeFormat("en-GB", { timeZone: "Indian/Maldives", dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.journey.departure_at))} Maldives time</p><p>{booking.seats} seat(s) · {booking.passenger_name}</p><TaxiAddon reference={booking.reference} seats={booking.seats} taxi={booking.taxi} onUpdate={refreshBookings} /></article>)}</details>
    </div>
  </div>;
}
