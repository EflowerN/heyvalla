"use client";

import { useT } from "./I18nProvider";

import Link from "next/link";
import type { JourneyDetailsInput } from "@/lib/journey-plan";
import { validatePassenger, type PassengerErrors } from "@/lib/booking-validation";
import { bookingKey } from "@/lib/booking-key";
import TaxiAddon, { type Taxi } from "./TaxiAddon";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Booking = { taxi: Taxi | null; reference: string; passenger_name: string; seats: number; journey: { origin: string; destination: string; departure_at: string }; status: string };
export type BookingChoice = { journey_details?: JourneyDetailsInput; initial_seats?: number; sailing_id: string; service: string; available_seats: number; search: Record<string, string | number> };
export default function BookingDesk({ choice, onClose, onBooked, inline = false }: { choice: BookingChoice | null; onClose: () => void; onBooked: () => void; inline?: boolean }) {
  const t = useT();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<PassengerErrors>({});
  const [completedChoice, setCompletedChoice] = useState("");
  const choiceKey = choice ? JSON.stringify({ sailing: choice.sailing_id, search: choice.search, details: choice.journey_details, seats: choice.initial_seats }) : "";
  const showForm = choice && completedChoice !== choiceKey;
  useEffect(() => {
    fetch("/api/demo-bookings", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Could not load your demo bookings. Reload to retry.");
      setBookings((await response.json()).bookings); setReady(true);
    }).catch(error => setError(error.message));
  }, []);
  useEffect(() => { if (choice?.sailing_id && !inline) panel.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [choice?.sailing_id, inline]);

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = { ...choice.search, ...(choice.journey_details ? { journey_details: choice.journey_details } : {}), sailing_id: choice.sailing_id, passenger_name: String(fields.get("passenger_name")).trim(), email: String(fields.get("email")).trim(), seats: Number(fields.get("seats")) };

    const errors = validatePassenger(payload.passenger_name, payload.email, payload.seats, Math.min(6, choice.available_seats));
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Please check the passenger details below.");
      (form.elements.namedItem(Object.keys(errors)[0]) as HTMLInputElement)?.focus();
      return;
    }
    setBusy(true); setError(""); setConfirmation(null);
    try {
      const retry = await bookingKey(payload);
      const response = await fetch("/api/demo-bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, request_id: retry.id }) });
      const data = await response.json();
      if (!response.ok) {
        if (data.errors) setFieldErrors(Object.fromEntries(Object.entries(data.errors).map(([field, messages]) => [field, (messages as string[])[0]])));
        throw new Error(data.errors ? Object.values(data.errors).flat().join(" ") : data.message);
      }
      retry.clear();
      setCompletedChoice(choiceKey);
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

  return <div ref={panel} className="mb-6 tile overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ocean/10 bg-lagoon/10 px-5 py-4"><h2 className="text-xl font-semibold">{t("Demo bookings")}</h2><button type="button" onClick={refreshBookings} className="tap rounded-full border border-lagoon/30 bg-white px-4 text-sm font-medium text-lagoon hover:bg-lagoon/10">{t("↻ Refresh bookings & taxi quotes")}</button></div>
    <div className="p-5">
    <p className="text-sm leading-6 text-ocean/80">{t("No payment, real ticket, or email is sent. Use sample passenger details. Bookings are saved for this browser for 30 days; clearing cookies loses access. This is not an account.")}</p>
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    {confirmation && <div role="status" className="mt-4 rounded-xl border-2 border-dashed border-lagoon/40 bg-lagoon/5 p-4"><p className="font-semibold text-lagoon"><span aria-hidden="true">✓ </span>{t("Demo booking confirmed")}</p><p className="mt-2 text-2xl font-bold tracking-wide">{confirmation.reference}</p><p>{confirmation.seats} seat(s) for {confirmation.passenger_name}. No money collected.</p><Link href="/journeys" className="text-lagoon underline">{t("Open my itinerary →")}</Link></div>}
    {showForm && <form aria-label="Passenger booking" noValidate key={choice.sailing_id} onSubmit={book} className="rise mt-5 space-y-4 rounded-2xl bg-sand p-4">
      <h3 className="font-semibold">Book {choice.service} · {choice.available_seats} seats available</h3><p className="text-sm">{t("150.00 MVR per seat · assumed demo estimate. No payment is collected.")}</p>{choice.journey_details && <p className="text-sm leading-6">{t("Your full journey details will be saved with this ferry booking. Next, open My itineraries to book the remaining flight, taxi or bus services in the demo.")}</p>}
      <label className="block text-sm font-medium">{t("Lead passenger name")}<input id={`${formId}-name`} aria-invalid={!!fieldErrors.passenger_name} aria-describedby={fieldErrors.passenger_name ? `${formId}-name-error` : undefined} name="passenger_name" required maxLength={100} disabled={busy} placeholder="Demo Passenger" className="tap mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3 text-base" />{fieldErrors.passenger_name && <span id={`${formId}-name-error`} className="mt-2 block text-rose-800">{fieldErrors.passenger_name}</span>}</label>
      <label className="block text-sm font-medium">{t("Email (demo only)")}<input id={`${formId}-email`} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? `${formId}-email-error` : undefined} name="email" type="email" required maxLength={255} disabled={busy} placeholder="passenger@example.com" className="tap mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3 text-base" />{fieldErrors.email && <span id={`${formId}-email-error`} className="mt-2 block text-rose-800">{fieldErrors.email}</span>}</label>
      <label className="block text-sm font-medium">{t("Seats")}<input id={`${formId}-seats`} aria-invalid={!!fieldErrors.seats} aria-describedby={fieldErrors.seats ? `${formId}-seats-error` : undefined} name="seats" type="number" min={1} max={Math.min(6, choice.available_seats)} defaultValue={choice.initial_seats ?? 1} required disabled={busy} className="tap mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3 text-base" />{fieldErrors.seats && <span id={`${formId}-seats-error`} className="mt-2 block text-rose-800">{fieldErrors.seats}</span>}</label>
      <div className="flex flex-wrap items-center gap-3"><button disabled={busy || !ready} className="tap rounded-lg bg-lagoon px-5 py-3 font-semibold text-white hover:bg-lagoon/90 disabled:opacity-50">{busy ? "Reserving seats…" : "Confirm demo booking"}</button>{!inline && <button type="button" disabled={busy} onClick={onClose} className="tap rounded-lg border border-ocean/25 bg-white px-5 py-3 font-medium hover:bg-ocean/5">{t("Cancel")}</button>}</div>
    </form>}
    <details className="mt-4 rounded-2xl bg-sand p-4"><summary className="cursor-pointer font-medium">My demo bookings ({bookings.length})</summary>{!ready && <p className="mt-3">{error ? "Bookings unavailable." : "Loading…"}</p>}{ready && !bookings.length && <p className="mt-3 text-sm">{t("No bookings yet. Search for a suitable future ferry.")}</p>}{bookings.map(booking => <article key={booking.reference} className="mt-3 rounded-2xl bg-white p-4 text-sm shadow-sm"><p className="font-semibold">{booking.reference} · <span className="rounded-full bg-sea px-2 py-0.5 text-xs text-white">{t("Sea")}</span> {booking.status.replaceAll("_", " ")}</p><p className="mt-2">{booking.journey.origin} → {booking.journey.destination}</p><p>{new Intl.DateTimeFormat("en-GB", { timeZone: "Indian/Maldives", dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.journey.departure_at))} Maldives time</p><p>{booking.seats} seat(s) · {booking.passenger_name}</p><p className="mt-2 font-semibold">{(150 * booking.seats).toFixed(2)} MVR · assumed demo ferry estimate</p><Link href="/journeys" className="my-3 block text-lagoon underline">{t("Open itinerary and cancellation options →")}</Link><TaxiAddon enabled={booking.status === "demo_confirmed"} reference={booking.reference} seats={booking.seats} taxi={booking.taxi} onUpdate={refreshBookings} /></article>)}</details>
    </div>
  </div>;
}
