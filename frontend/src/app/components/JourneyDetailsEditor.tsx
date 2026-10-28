"use client";

import { useT } from "./I18nProvider";

import type { FlightOption } from "@/lib/flights";
import { useState, type FormEvent } from "react";
import type { Directory } from "@/lib/journey-plan";
import { taxiDestinationZone } from "@/lib/journey-plan";
import { seatApi } from "./ProviderSeatRequests";
import LocationSearch from "./LocationSearch";

export type SavedJourneyDetails = {
  selected_flight?: FlightOption | null;
  arrival_airport: { id: string; name: string; iata: string };
  destination: { id: string; name: string; atoll?: string; iata?: string };
  flight_arrival_at: string | null; address: string; taxi_zone: string | null; saved_at: string;
};
const field = "mt-2 block w-full rounded-lg border border-ocean/25 bg-white p-3";

export default function JourneyDetailsEditor({ reference, version, details, onSaved }: {
  reference: string; version: number; details: SavedJourneyDetails | null; onSaved: () => void | Promise<void>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [airport, setAirport] = useState("VRMM");
  const [destination, setDestination] = useState("");
  const [query, setQuery] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState("hulhumale-phase-1");
  const [editVersion, setEditVersion] = useState(version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function edit() {
    setOpen(true); setError(""); setMessage(""); setEditVersion(version);
    setAirport(details?.arrival_airport.id ?? "VRMM"); setDestination(details?.destination.id ?? ""); setQuery(details?.destination.name ?? ""); setAddress(details?.address ?? ""); setZone(details?.taxi_zone ?? "hulhumale-phase-1");
    const arrival = details?.flight_arrival_at ? new Date(Date.parse(details.flight_arrival_at) + 5 * 3600000).toISOString() : "";
    setArrivalDate(arrival.slice(0, 10)); setArrivalTime(arrival.slice(11, 16));
    if (!directory) {
      setBusy(true);
      try { const response = await fetch("/api/islands", { cache: "no-store" }); if (!response.ok) throw new Error("Could not load locations. Close and reopen the editor to retry."); setDirectory(await response.json()); }
      catch (error) { setError(error instanceof Error ? error.message : "Could not load locations."); }
      finally { setBusy(false); }
    }
  }
  const places = directory ? [...directory.islands, ...directory.airports] : [];
  const selected = places.find(place => place.id === destination) ?? null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const arrivalAirport = directory?.airports.find(place => place.id === airport);
    if (!selected || !arrivalAirport) { setError("Select a destination from the location matches."); return; }
    if (!!arrivalDate !== !!arrivalTime) { setError("Enter both arrival date and time, or leave both empty."); return; }
    setBusy(true);
    try {
      await seatApi("/api/journeys", { reference, details_version: editVersion, journey_details: {
        ...(details?.selected_flight && details.selected_flight.to === airport && Date.parse(details.selected_flight.arrival_at) === Date.parse(`${arrivalDate}T${arrivalTime}:00+05:00`) ? { flight_offer_id: details.selected_flight.id } : {}),
        arrival_airport_id: airport, destination_id: selected.id, address: address.trim() || null,
        flight_arrival_at: arrivalDate && arrivalTime ? `${arrivalDate}T${arrivalTime}:00+05:00` : null,
        taxi_zone: taxiDestinationZone(selected, arrivalAirport, zone),
      } }, "PATCH");
      setOpen(false); setMessage("Full journey details saved. Flight and onward transport remain unbooked."); await onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save the journey."); }
    finally { setBusy(false); }
  }
  return <section className="mt-5 rounded-xl border border-ocean/15 p-4" aria-label="Edit saved journey details">
    {!open ? <button type="button" className="font-semibold text-lagoon underline" onClick={() => void edit()}>{details ? "Edit flight arrival, destination & address" : "Add flight destination & address"}</button> : <form onSubmit={save}>
      <h3 className="font-semibold">{t("Flight arrival and final destination")}</h3><p className="my-3 text-sm leading-6">{t("Saved privately with your itinerary. This does not change your ferry booking, departure flight target or airport taxi. It does not book a flight or onward taxi. Changing the arrival airport or time removes the saved airline flight reference. All times use Maldives time.")}</p>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">{t("Flight arrival airport")}<select value={airport} onChange={event => setAirport(event.target.value)} className={field} required><option value="">{t("Choose airport")}</option>{directory?.airports.filter(place => place.id !== "VRNT").map(place => <option key={place.id} value={place.id}>{place.name} ({place.iata})</option>)}</select></label>
        <LocationSearch id={`destination-${reference}`} label="Final destination" places={places} value={query} selected={selected} onChange={value => { setQuery(value); setDestination(""); }} onSelect={place => { setDestination(place.id); setQuery(place.name); if (place.iata) setAirport(place.id); }} disabled={!directory || busy} />
        <label className="text-sm">{t("Flight arrival date (optional)")}<input type="date" value={arrivalDate} onChange={event => setArrivalDate(event.target.value)} className={field} /></label>
        <label className="text-sm">{t("Flight arrival time (optional)")}<input type="time" value={arrivalTime} onChange={event => setArrivalTime(event.target.value)} className={field} /></label>
        {airport === "VRMM" && destination === "ld0591" && <label className="text-sm">{t("Hulhumalé drop-off zone")}<select value={zone} onChange={event => setZone(event.target.value)} className={field}><option value="hulhumale-phase-1">{t("Phase 1")}</option><option value="hulhumale-phase-2">{t("Phase 2")}</option></select></label>}
        <label className="text-sm sm:col-span-2">{t("Home, hotel or address note")}<input value={address} onChange={event => setAddress(event.target.value)} maxLength={160} className={field} /><span className="mt-1 block text-xs text-ocean/65">{t("You can clear this field to remove the address. No address lookup or exact road routing.")}</span></label>
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-4"><button disabled={busy || !directory || !selected} className="rounded-lg bg-lagoon px-4 py-2 text-white disabled:opacity-50">{busy ? "Please wait…" : "Save journey details"}</button><button type="button" disabled={busy} onClick={() => setOpen(false)} className="text-lagoon underline">{t("Close without saving")}</button></div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    </form>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
