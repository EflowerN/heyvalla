"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { journeyDetailsInput, buildJourney, canBookForParty, taxiDestinationZone, validatePlan, type Directory, type FareEstimate, type Place, type PlanInput } from "@/lib/journey-plan";
import SeaJourneyPlanner from "./SeaJourneyPlanner";
import IntegrationRoadmap from "./IntegrationRoadmap";
import FlightSearch from "./FlightSearch";
import FlightReference from "./FlightReference";
import { matchingFlight, type FlightOption } from "@/lib/flights";
import JourneyStep from "./JourneyStep";
import ModeIcon from "./ModeIcon";
import { transportColors } from "@/lib/transport-colors";
import { labels, localTime, type Result } from "../ferry";
import BookingDesk, { type BookingChoice } from "./BookingDesk";
import { SeatRequestForm } from "./ProviderSeatRequests";
import LocationSearch from "./LocationSearch";
import MobileNav from "./MobileNav";
import Footer from "./Footer";

const JourneyMap = dynamic(() => import("./JourneyMap"), { ssr: false, loading: () => <div className="tile h-96 p-6">Loading journey map…</div> });
const emptyDirectory: Directory = { islands: [], airports: [] };
const field = "mt-2 block w-full rounded-xl border border-ocean/15 bg-white p-3 text-base shadow-sm";
const money = (minor: number) => `${(minor / 100).toFixed(2)} MVR`;

export default function JourneyPlanner() {
  const [travelMode,setTravelMode] = useState<"flight"|"sea">("flight");
  const [directory, setDirectory] = useState<Directory>(emptyDirectory);
  const [directoryError, setDirectoryError] = useState("");
  const [retry, setRetry] = useState(0);
  const [originId, setOriginId] = useState("ld0205");
  const [destinationId, setDestinationId] = useState("ld0591");
  const [originText, setOriginText] = useState("Vilufushi");
  const [destinationText, setDestinationText] = useState("Hulhumalé");
  const [departureAirportId, setDepartureAirportId] = useState("VRNT");
  const [arrivalAirportId, setArrivalAirportId] = useState("VRMM");
  const [date, setDate] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [time, setTime] = useState("14:00");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [checkIn, setCheckIn] = useState("60");
  const [passengers, setPassengers] = useState(1);
  const [address, setAddress] = useState("");
  const [taxiZone, setTaxiZone] = useState("hulhumale-phase-1");
  const [result, setResult] = useState<Result | null>(null);
  const [plan, setPlan] = useState<PlanInput | null>(null);
  const [fare, setFare] = useState<FareEstimate | null>(null);
  const [fareMessage, setFareMessage] = useState("");
  const [sailingId, setSailingId] = useState("");
  const [selectedLeg, setSelectedLeg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<BookingChoice | null>(null);
  const [review, setReview] = useState(false);
  const request = useRef<AbortController | null>(null);
  const activePlan = useRef<PlanInput | null>(null);
  const reviewPanel = useRef<HTMLDivElement>(null);
  const origin = directory.islands.find(place => place.id === originId) ?? null;
  const destinations = useMemo(() => [...directory.islands, ...directory.airports], [directory]);
  const destination = destinations.find(place => place.id === destinationId) ?? null;
  const activeFlight = matchingFlight(selectedFlight, departureAirportId, destination?.iata ? destination.id : arrivalAirportId,
    `${date}T${time}:00+05:00`, arrivalDate && arrivalTime ? `${arrivalDate}T${arrivalTime}:00+05:00` : "");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/islands", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Location data could not load. Please retry.");
      setDirectory(await response.json()); setDirectoryError("");
    }).catch(error => { if (!controller.signal.aborted) setDirectoryError(error.message); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (review) reviewPanel.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [review]);

  const invalidate = useCallback(() => {
    activePlan.current = null;
    request.current?.abort(); setLoading(false); setResult(null); setPlan(null); setFare(null); setFareMessage(""); setError(""); setChoice(null); setReview(false); setSelectedLeg("");
  }, []);
  const pickOrigin = useCallback((place: Place) => { invalidate(); setOriginId(place.id); setOriginText(place.name); }, [invalidate]);
  const pickDestination = useCallback((place: Place) => { invalidate(); setDestinationId(place.id); setDestinationText(place.name); setAddress(""); if (place.iata) setArrivalAirportId(place.id); }, [invalidate]);

  async function fetchConnections(query: URLSearchParams, input: PlanInput, refresh = false) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    const zone = taxiDestinationZone(input.destination, input.arrivalAirport, input.taxiZone);
    try {
      const [ferryResponse, fareResult] = await Promise.all([
        fetch(`/api/ferry-search?${query}`, { signal: controller.signal, cache: "no-store" }),
        zone ? fetch(`/api/greater-male-fares?${new URLSearchParams({ from: "domestic-terminal", to: zone })}`, { signal: controller.signal, cache: "no-store" }).then(async response => response.ok ? (await response.json()).estimate as FareEstimate : null).catch(() => null) : Promise.resolve(null),
      ]);
      const body = await ferryResponse.json();
      if (!ferryResponse.ok) throw new Error(body.errors ? Object.values(body.errors).flat().join(" ") : body.message ?? "Could not search for connections.");
      if (controller.signal.aborted) return;
      const next = body as Result;
      activePlan.current = input;
      setResult(next); setPlan(input); setFare(fareResult); setFareMessage(zone && !fareResult ? "The onward taxi estimate is unavailable. Retry the journey search; the ferry results are still usable." : "");
      if (!refresh) setSailingId((next.sailings.find(s => canBookForParty(s, input.passengers)) ?? next.sailings.find(s => s.classification !== "cancelled"))?.id ?? "");
    } catch (error) { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : "Could not search. Please retry."); if (refresh) { setResult(null); setReview(false); setChoice(null); } } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); invalidate();
    const departureAirport = directory.airports.find(place => place.id === departureAirportId);
    const arrivalAirport = destination?.iata ? destination : directory.airports.find(place => place.id === arrivalAirportId);
    if (!origin || !destination || !departureAirport || !arrivalAirport) { setError("Select a matching start and destination, and both flight airports."); return; }
    if (!!arrivalDate !== !!arrivalTime) { setError("Enter both arrival date and time, or leave both blank."); return; }
    const input: PlanInput = { origin, destination, departureAirport, arrivalAirport, flightArrival: arrivalDate && arrivalTime ? `${arrivalDate}T${arrivalTime}:00+05:00` : "", address: address.trim(), passengers, taxiZone, selectedFlight: activeFlight };
    const validation = validatePlan(input, `${date}T${time}:00+05:00`);
    if (validation) { setError(validation); return; }
    void fetchConnections(new URLSearchParams({ island: origin.id, airport: departureAirport.id, flight_date: date, flight_time: time, check_in_minutes: checkIn }), input);
  }
  // A booking may finish after the passenger changes the search. Its old callback
  // must not restore the previous journey over the new input/results.
  function refresh() { if (result && plan && activePlan.current === plan) void fetchConnections(new URLSearchParams(Object.entries(result.search).map(([key, value]) => [key, String(value)])), plan, true); }
  function chooseFlight(offer: FlightOption) {
    invalidate(); setSelectedFlight(offer); setDepartureAirportId(offer.from); setArrivalAirportId(offer.to);
    setDate(offer.departure_at.slice(0, 10)); setTime(offer.departure_at.slice(11, 16));
    setArrivalDate(offer.arrival_at.slice(0, 10)); setArrivalTime(offer.arrival_at.slice(11, 16));
  }
  function demo() {
    setSelectedFlight(null);
    invalidate(); setOriginId("ld0205"); setOriginText("Vilufushi"); setDestinationId("ld0591"); setDestinationText("Hulhumalé"); setDepartureAirportId("VRNT"); setArrivalAirportId("VRMM");
    const tomorrow = new Date(Date.now() + 86400000 + 5 * 3600000).toISOString().slice(0, 10);
    setDate(tomorrow); setTime("14:00"); setArrivalDate(tomorrow); setArrivalTime("14:50"); setPassengers(1); setAddress(""); setCheckIn("60"); setTaxiZone("hulhumale-phase-1");
  }
  const sailing = result?.sailings.find(item => item.id === sailingId) ?? null;
  const legs = useMemo(() => plan && result && sailing ? buildJourney(plan, result, sailing, directory, fare) : [], [plan, result, sailing, directory, fare]);
  const bookable = !!(sailing && plan && canBookForParty(sailing, plan.passengers));
  const knownPrices = legs.filter(leg => leg.price !== null);
  const subtotal = knownPrices.reduce((sum, leg) => sum + (leg.price ?? 0), 0);
  const hasOnwardGap = legs.some(leg => leg.id === "destination" && !leg.points.length);

  const modeSwitch = <div className="mb-6 flex flex-wrap gap-3" aria-label="Journey type">{([['flight','Journey with a flight'],['sea','Ferries & launches · no flight']] as const).map(([mode,label])=><button key={mode} type="button" aria-pressed={travelMode===mode} onClick={()=>{invalidate();setTravelMode(mode);}} className={`rounded-full px-5 py-3 font-semibold ${travelMode===mode?"bg-lagoon text-white":"bg-white border border-lagoon/30 text-lagoon"}`}>{label}</button>)}</div>;
  if(travelMode==='sea')return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{modeSwitch}<SeaJourneyPlanner directory={directory} directoryError={directoryError}/></main>;
  return <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8 md:pb-16">
    {modeSwitch}
    <p className="text-sm font-semibold uppercase tracking-widest text-lagoon">From your island to your doorstep</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Your whole journey, in one place.</h1>
    <p className="mt-4 max-w-3xl leading-7 text-ocean/75">Connect your ferry, airport transfer, flight and onward ride. Start with two places, then add your flight details.</p>
    <aside className="my-6 rounded-2xl bg-coral/10 p-4 text-sm leading-6">Demo planning only. Ferry search currently connects to Thimarafushi. Flights can use checked Maldivian website references or your own details; book flights, taxis and buses through our in-app demo checkout. Onward taxis are estimates. HeyValla does not issue real tickets or collect payments. <Link className="font-medium text-lagoon underline" href="/ferry-planner">Only need a ferry to the airport?</Link></aside>
    <form id="search" onSubmit={search} onChange={invalidate} className="tile scroll-mt-4 p-5 sm:p-7">
      <div className="grid gap-6 md:grid-cols-2">
        <LocationSearch id="journey-origin" label="Where are you?" places={directory.islands} value={originText} selected={origin} onChange={value => { invalidate(); setOriginText(value); setOriginId(""); }} onSelect={pickOrigin} disabled={!directory.islands.length} />
        <LocationSearch id="journey-destination" label="Where are you going?" places={destinations} value={destinationText} selected={destination} onChange={value => { invalidate(); setDestinationText(value); setDestinationId(""); }} onSelect={pickDestination} disabled={!destinations.length} />
      </div>
      {directoryError && <p role="alert" className="mt-4 text-rose-800">{directoryError} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Retry locations</button></p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">Flight date<input type="date" required value={date} onChange={event => setDate(event.target.value)} className={field} /></label>
        <label className="text-sm font-medium">Flight departure · Maldives time<input type="time" required value={time} onChange={event => setTime(event.target.value)} className={field} /></label>
        <label className="text-sm font-medium">Passengers<input type="number" required min={1} max={6} value={passengers} onChange={event => setPassengers(Number(event.target.value))} className={field} /></label>
      </div>
      <details className="mt-5 rounded-2xl bg-sand p-4">
        <summary className="cursor-pointer font-medium">Flight details · {directory.airports.find(place => place.id === departureAirportId)?.iata ?? "…"} → {destination?.iata ?? directory.airports.find(place => place.id === arrivalAirportId)?.iata ?? "…"} · address & arrival time</summary>
        <p className="mt-2 text-xs leading-5 text-ocean/65">Choose the flight airports here, then search the checked flight options below. Manual edits to airports or times remove the selected airline reference. All times are Maldives time (UTC+5). Leave arrival blank if unknown.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">Flight from<select value={departureAirportId} onChange={event => setDepartureAirportId(event.target.value)} className={field}>{directory.airports.map(place => <option value={place.id} key={place.id}>{place.name} ({place.iata})</option>)}</select></label>
          <label className="text-sm">Flight to<select value={destination?.iata ? destination.id : arrivalAirportId} disabled={!!destination?.iata} onChange={event => setArrivalAirportId(event.target.value)} className={field}>{directory.airports.map(place => <option value={place.id} key={place.id}>{place.name} ({place.iata})</option>)}</select></label>
          <label className="text-sm">Check-in before departure<select value={checkIn} onChange={event => setCheckIn(event.target.value)} className={field}>{[30,60,90,120].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
          <label className="text-sm">Flight arrival date (optional)<input type="date" value={arrivalDate} onChange={event => setArrivalDate(event.target.value)} className={field} /></label>
          <label className="text-sm">Flight arrival time (optional)<input type="time" value={arrivalTime} onChange={event => setArrivalTime(event.target.value)} className={field} /></label>
          {destination?.id === "ld0591" && <label className="text-sm">Hulhumalé drop-off zone<select value={taxiZone} onChange={event => setTaxiZone(event.target.value)} className={field}><option value="hulhumale-phase-1">Phase 1</option><option value="hulhumale-phase-2">Phase 2</option></select></label>}
          {!destination?.iata && <label className="text-sm sm:col-span-2">Home, hotel or address note (optional)<input value={address} onChange={event => setAddress(event.target.value)} maxLength={160} placeholder="e.g. My home, Orchid Magu" className={field} /><span className="mt-1 block text-xs text-ocean/65">Saved privately in My itineraries when you book or request the ferry. No address lookup; the map uses the island location.</span></label>}
        </div>
      </details>
      <FlightSearch key={`${departureAirportId}:${destination?.iata ? destination.id : arrivalAirportId}:${date}`} from={departureAirportId} to={destination?.iata ? destination.id : arrivalAirportId} date={date} passengers={passengers} selected={activeFlight} onSelect={chooseFlight} onClear={() => { invalidate(); setSelectedFlight(null); }} />
      <div className="mt-5 flex flex-wrap items-center gap-4"><button disabled={loading || !directory.islands.length || !origin || !destination} className="rounded-xl bg-lagoon px-6 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Finding connections…" : "Find my journey"}</button><button type="button" onClick={demo} className="text-sm font-medium text-lagoon underline">Fill Thaa → Hulhumalé demo</button><span className="text-xs text-ocean/65">Demo flight time is illustrative; confirm your actual flight.</span></div>
    </form>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-5 text-rose-900">{error}</p>}
    <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[380px_1fr]">
      <section id="results" aria-busy={loading} aria-label="Full itinerary" className="tile flex scroll-mt-4 flex-col p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">Your journey</h2>
        {loading && <p role="status" className="mt-4">Checking ferry availability and onward fare…</p>}
        {!result && !loading && <div className="mt-5 flex flex-1 flex-col gap-4 text-sm leading-7 text-ocean/70"><p>Search to see every connection here, alongside its route on the map.</p><ol className="mt-2"><li key="sea" className="flex gap-4"><span className="flex flex-col items-center"><ModeIcon mode="sea" /><span aria-hidden="true" className="my-1 w-0 flex-1 border-l-2 border-dashed border-ocean/20" /></span><span className="pb-14 text-ocean"><span className="block font-semibold">Ferry to Thimarafushi</span><span className="block text-xs text-ocean/65">Choose a sailing that fits your flight</span></span></li><li key="taxi" className="flex gap-4"><span className="flex flex-col items-center"><ModeIcon mode="taxi" /><span aria-hidden="true" className="my-1 w-0 flex-1 border-l-2 border-dashed border-ocean/20" /></span><span className="pb-14 text-ocean"><span className="block font-semibold">Taxi to the airport</span><span className="block text-xs text-ocean/65">Harbour to airport, quoted per vehicle</span></span></li><li key="flight" className="flex gap-4"><span className="flex flex-col items-center"><ModeIcon mode="flight" /><span aria-hidden="true" className="my-1 w-0 flex-1 border-l-2 border-dashed border-ocean/20" /></span><span className="pb-14 text-ocean"><span className="block font-semibold">Your flight</span><span className="block text-xs text-ocean/65">Enter your own flight details</span></span></li><li key="land" className="flex gap-4"><span className="flex flex-col items-center"><ModeIcon mode="land" /></span><span className="text-ocean"><span className="block font-semibold">Onward ride</span><span className="block text-xs text-ocean/65">To your final destination</span></span></li></ol><p className="mt-auto rounded-2xl bg-sand p-4 text-xs leading-6">Try Vilufushi → Hulhumalé with a future 14:00 flight.</p></div>}
        {result && <>
          <p className="mt-2 text-sm leading-6">{plan?.origin.name} → {plan?.destination.name} · {plan?.passengers} passenger(s)</p>
          {!result.sailings.length ? <p role="status" className="mt-5 rounded-2xl bg-sand p-4 text-sm leading-6">{result.coverage_message ?? "No future sailings match this flight date. Try a different date or island."} No complete route has been generated.</p> : <label className="mt-5 block text-sm font-medium">Choose your ferry<select value={sailingId} onChange={event => { setSailingId(event.target.value); setSelectedLeg(""); setReview(false); setChoice(null); }} className={field}><option value="" disabled>Select a sailing</option>{result.sailings.map(item => <option value={item.id} disabled={item.classification === "cancelled"} key={item.id}>{item.service} · {localTime(item.departure_at)} · {item.classification === "cancelled" ? "Cancelled" : canBookForParty(item, plan?.passengers ?? 1) ? "Available" : "Not bookable"}</option>)}</select></label>}
          {sailing && <>
            <p className={`mt-4 rounded-2xl p-3 text-sm ${bookable ? "bg-lagoon/10" : "bg-coral/20"}`}>{labels[sailing.classification]} · {sailing.available_seats} seats left.{plan && sailing.available_seats < plan.passengers ? " Not enough seats for your party." : ""}</p>
            <ol className="my-5">{legs.map((leg, index) => <JourneyStep key={leg.id} mode={leg.mode} label={leg.title} last={index === legs.length - 1}>
              <button type="button" aria-pressed={selectedLeg === leg.id} onClick={() => setSelectedLeg(current => current === leg.id ? "" : leg.id)} className={`w-full rounded-2xl p-3 text-left transition-colors ${selectedLeg === leg.id ? "bg-lagoon/10 ring-2 ring-lagoon" : "hover:bg-sand"}`}>
                <span className="text-xs font-semibold uppercase" style={{ color: leg.mode === "flight" || leg.mode === "land" ? "#12343B" : transportColors[leg.mode] }}>{index + 1}. {leg.mode === "sea" ? "Ferry" : leg.mode === "land" ? "Transfer" : leg.mode}</span>
                <span className="mt-1 block font-semibold">{leg.title}</span><span className="mt-2 block text-sm">{leg.from} → {leg.to}</span>
                <span className="mt-2 block text-xs leading-6">{leg.departure ? localTime(leg.departure) : "Pickup time not arranged"}{leg.arrival ? ` → ${localTime(leg.arrival)}` : ""}</span>
                {leg.mode === "flight" && !leg.arrival && <span className="block text-xs leading-6">Flight arrival time still needed</span>}
                <span className="mt-2 block text-xs font-medium">{leg.status}</span><span className="mt-2 inline-block rounded-full bg-sand px-3 py-1 text-sm font-semibold">{leg.price === null ? (leg.mode === "flight" && plan?.selectedFlight ? "Confirm final fare with Maldivian" : "Price not available") : `${money(leg.price)}${leg.mode === "taxi" ? " / vehicle · reference" : " for your party"}`}</span>
                {selectedLeg === leg.id && <span className="mt-3 block text-xs leading-6 text-ocean/75">{leg.detail}</span>}
              </button>
              {leg.mode === "flight" && plan?.selectedFlight && <div className="mt-3"><FlightReference offer={plan.selectedFlight} /></div>}
              {leg.id === "airport-taxi" && <p className="my-3 rounded-2xl bg-coral/10 p-3 text-xs leading-6">Check-in target: {localTime(result.check_in_deadline_at)}.<br />{sailing.connection_buffer_minutes >= 0 ? `${sailing.connection_buffer_minutes} minutes before check-in` : `${Math.abs(sailing.connection_buffer_minutes)} minutes late for check-in`}. Target safety margin: {result.safety_minutes} minutes. Planning estimate only.</p>}
            </JourneyStep>)}</ol>
            {hasOnwardGap && <p role="status" className="mb-4 rounded-lg bg-coral/20 p-3 text-sm">The final connection is missing. This is an incomplete journey, not a through-bookable route.</p>}
            {fareMessage && <p role="status" className="mb-4 text-sm text-rose-800">{fareMessage}</p>}
            <div className="rounded-2xl bg-sand p-4"><p className="font-semibold">{knownPrices.length ? `Known price subtotal: ${money(subtotal)}` : "Total price not available yet"}</p><p className="mt-2 text-xs leading-6">{knownPrices.length ? "Includes only priced legs shown above. " : ""}Flight and unquoted transfers are excluded. Taxi matrix prices are per vehicle with unknown capacity and validity; this is not a complete trip quote.</p></div>
            <button type="button" disabled={loading} onClick={() => setReview(true)} className="mt-4 w-full rounded-xl bg-lagoon p-3 font-semibold text-white disabled:opacity-50">Review journey & booking options</button>
          </>}
          {!!result.sailings.length && !sailing && <p className="mt-4 text-sm">No usable sailing selected. Cancelled sailings cannot be added to a journey.</p>}
        </>}
      </section>
      <div className="order-first flex min-w-0 flex-col lg:order-last"><JourneyMap directory={directory} origin={origin} destination={destination} legs={legs} selectedLeg={selectedLeg} onLegSelect={setSelectedLeg} onOriginSelect={pickOrigin} onDestinationSelect={pickDestination} /></div>
    </div>
    {review && result && sailing && plan && <div ref={reviewPanel} className="tile mt-8 scroll-mt-5 p-5 sm:p-7">
      <h2 className="text-2xl font-semibold">Review your connections</h2><p className="mt-3 leading-7">{plan.origin.name} → Thimarafushi → {plan.arrivalAirport.name} → {plan.destination.name}</p>
      <p className="my-4 text-sm leading-7">Each service needs its own confirmation. Booking below saves the ferry, flight details, final destination and address to <Link href="/journeys" className="text-lagoon underline">My itineraries</Link>, where you can book the flight, Thimarafushi transfer and onward taxi or bus in one demo checkout. You can review and edit the onward details there. They are private to your browser session and are not sent to ferry providers. After saving, open My itineraries and choose Book remaining journey services.</p>
      <ul className="mb-5 list-inside list-disc space-y-2 text-sm"><li>Flight: select a checked reference or use a fictional demo fare for your entered flight.</li><li>Onward ride: choose a taxi or an RTL bus in the demo checkout.</li><li>Harbour transfer: an instant simulated taxi is available in the journey checkout.</li>{plan.passengers > 4 && <li className="text-rose-800">Your party exceeds the single demo taxi’s four-person limit. Additional transport is required.</li>}{hasOnwardGap && <li className="text-rose-800">No service currently connects the arrival airport to your final island in this planner.</li>}</ul>
      {!bookable ? <p role="status" className="rounded-lg bg-coral/20 p-4">This ferry cannot be booked for the selected party and flight. Choose another ferry or change your search.</p> : sailing.source === "provider" ? <SeatRequestForm key={sailing.id} journeyDetails={journeyDetailsInput(plan)} initialSeats={plan.passengers} sailing={{ id: sailing.provider_sailing_id!, version: sailing.version!, fare_minor: sailing.fare_minor ?? null, remaining_seats: sailing.available_seats }} flightContext={result.search} onSaved={refresh} /> : <button type="button" onClick={() => setChoice({ sailing_id: sailing.id, service: sailing.service, available_seats: sailing.available_seats, search: result.search, initial_seats: plan.passengers, journey_details: journeyDetailsInput(plan) })} className="rounded-xl bg-lagoon px-5 py-3 font-semibold text-white">Book demo ferry & save full journey</button>}
      <div className="mt-5"><BookingDesk choice={choice} onClose={() => setChoice(null)} onBooked={refresh} /></div>
    </div>}
    <IntegrationRoadmap/>
    <footer className="mt-8 text-xs leading-6 text-ocean/65">Data already in HeyValla: OneMap/CAA locations, fictional and provider-entered ferry schedules, organizer-provided Avas Ride matrix. Checked Maldivian fare references are available; there is no live airline feed, geocoding or road routing. <Link href="/journeys" className="text-lagoon underline">View saved booking itineraries</Link>.</footer>
    <Footer residential={directory.islands.filter(place => place.category === "residential").length} resorts={directory.islands.filter(place => place.category === "resort").length} airports={directory.airports.length} />
    <MobileNav resultCount={result ? result.sailings.filter(item => canBookForParty(item, plan?.passengers ?? 1)).length : null} />
  </main>;
}
