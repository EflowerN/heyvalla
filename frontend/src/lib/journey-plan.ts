import type { FlightOption } from "./flights";
import type { Result, Sailing } from "../app/ferry";

export type Place = { id: string; name: string; latitude: number; longitude: number; atoll?: string; category?: string; iata?: string };
export type Directory = { islands: Place[]; airports: Place[] };
export type PlanInput = { selectedFlight?: FlightOption | null; origin: Place; destination: Place; departureAirport: Place; arrivalAirport: Place; flightArrival: string; address: string; passengers: number; taxiZone: string };
export type PlanningPrice = { amount: number; basis: string };
export type JourneyLeg = { id: string; mode: "sea" | "taxi" | "flight" | "land"; title: string; from: string; to: string; status: string; detail: string; departure: string | null; arrival: string | null; price: number | null; priceEstimate?: PlanningPrice; points: Place[] };
export type FareEstimate = { amount_minor: number; currency: string; from: string; to: string };
export type JourneyDetailsInput = { arrival_airport_id: string; destination_id: string; flight_arrival_at: string | null; address: string | null; taxi_zone: string | null; flight_offer_id?: string };

// Display-only planning allowances. Never submit these as an operator quote or charge.
export function planningPrice({ mode, passengers = 1, listed, reference, flightFare, airportTransfer = false }: { mode: "sea" | "taxi" | "flight" | "land" | "bus"; passengers?: number; listed?: number | null; reference?: number | null; flightFare?: number | null; airportTransfer?: boolean }): PlanningPrice {
  if (listed != null) return { amount: listed, basis: "Listed / demo price" };
  if (mode === "taxi") {
    const vehicles = Math.ceil(passengers / 4);
    return { amount: (reference ?? (airportTransfer ? 8000 : 9000)) * vehicles, basis: `${reference != null ? "Reference" : "Assumed demo"} estimate · ${vehicles} vehicle(s), four seats each` };
  }
  if (mode === "flight") return { amount: (flightFare ?? 146400) * passengers, basis: flightFare != null ? "Reference-based demo estimate · per-person fare × party" : "Assumed demo estimate · MVR 1,464 per passenger" };
  const perPerson = mode === "sea" ? 15000 : mode === "bus" ? 1000 : 10000;
  return { amount: perPerson * passengers, basis: `Assumed demo estimate · MVR ${perPerson / 100} per passenger${mode === "land" ? " · connection unverified" : ""}` };
}

export function journeyDetailsInput(plan: PlanInput): JourneyDetailsInput {
  return { ...(plan.selectedFlight ? { flight_offer_id: plan.selectedFlight.id } : {}), arrival_airport_id: plan.arrivalAirport.id, destination_id: plan.destination.id,
    flight_arrival_at: plan.flightArrival || null, address: plan.address.trim() || null,
    taxi_zone: taxiDestinationZone(plan.destination, plan.arrivalAirport, plan.taxiZone) };
}

export function normalizeLocation(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’‘.]/g, "").trim();
}

export function matchesLocation(place: Place, query: string) {
  const text = normalizeLocation(`${place.name} ${place.atoll ?? ""} ${place.iata ?? ""} ${place.category === "resort" ? "resort" : ""} ${place.iata ? "airport" : "island"}`);
  return normalizeLocation(query).split(/\s+/).every(term => text.includes(term));
}

// Explicit reviewed coverage, not a nearest-airport/straight-line road assumption.
export function taxiDestinationZone(destination: Place, arrivalAirport: Place, phase: string) {
  if (arrivalAirport.id !== "VRMM" || destination.iata) return null;
  if (destination.id === "ld0442") return "male";
  if (destination.id === "ld0591") return phase === "hulhumale-phase-2" ? phase : "hulhumale-phase-1";
  return null;
}

export function validatePlan(input: PlanInput, departure: string) {
  if (input.origin.id === input.destination.id) return "Choose different starting and destination locations.";
  if (input.departureAirport.id === input.arrivalAirport.id) return "Choose different airports for your flight. For a ferry to the airport only, use the ferry connection planner.";
  if (!Number.isInteger(input.passengers) || input.passengers < 1 || input.passengers > 6) return "Choose between 1 and 6 passengers.";
  if (!Number.isFinite(Date.parse(departure))) return "Enter your flight departure date and time.";
  if (Date.parse(departure) <= Date.now()) return "Choose a future flight departure.";
  if (input.flightArrival && (!Number.isFinite(Date.parse(input.flightArrival)) || Date.parse(input.flightArrival) <= Date.parse(departure))) return "Flight arrival must be after departure. Check the arrival date for an overnight flight.";
  return null;
}

export function canBookForParty(sailing: Sailing, passengers: number) {
  return sailing.bookable && sailing.classification === "recommended" && sailing.available_seats >= passengers;
}

export function buildJourney(input: PlanInput, result: Result, sailing: Sailing, directory: Directory, fare: FareEstimate | null): JourneyLeg[] {
  const harbour = directory.islands.find(place => place.id === "ld0082");
  const legs: JourneyLeg[] = [{
    id: "ferry", mode: "sea", title: "Ferry to Thimarafushi", from: input.origin.name, to: "Thimarafushi harbour",
    status: canBookForParty(sailing, input.passengers) ? (sailing.source === "provider" ? "Request available · approval needed" : "Demo booking available") : "Not bookable for this party / flight",
    detail: `${sailing.operator} · ${sailing.service}. ${sailing.source === "provider" ? "Provider-entered, unverified demo sailing." : "Fictional repeating demo schedule."} Harbour marker uses the island reference point.`,
    departure: sailing.departure_at, arrival: sailing.harbour_arrival_at,
    price: sailing.fare_minor == null ? null : sailing.fare_minor * input.passengers,
    points: harbour ? [input.origin, harbour] : [],
  }, {
    id: "airport-taxi", mode: "taxi", title: "Harbour → airport taxi", from: "Thimarafushi harbour", to: input.departureAirport.name,
    status: "Request separately after ferry booking",
    detail: `${result.transfer_minutes ?? 20}-minute demo transfer allowance, including disembarking. Price and driver must be confirmed. ${input.passengers > 4 ? "One demo taxi supports at most four people; this party needs additional transport." : "Taxi pickup is arranged in My itineraries after booking."}`,
    departure: sailing.harbour_arrival_at, arrival: sailing.airport_arrival_at, price: null,
    points: harbour ? [harbour, input.departureAirport] : [],
  }, {
    id: "flight", mode: "flight", title: input.selectedFlight ? `${input.selectedFlight.airline} ${input.selectedFlight.flight_number}` : "Your flight", from: input.departureAirport.name, to: input.arrivalAirport.name,
    status: input.selectedFlight ? "Selected reference · demo booking available" : "Entered flight · demo booking available",
    detail: `${input.selectedFlight ? "Selected from a checked airline website snapshot. Not live availability. " : ""}Confirm the route and times with your airline. Check-in allowance and ${result.safety_minutes}-minute safety margin are planning assumptions. ${input.flightArrival ? "Arrival time entered by you; not verified." : "Arrival time is still needed to arrange your onward pickup."}`,
    departure: result.flight_at, arrival: input.flightArrival || null, price: null,
    points: [input.departureAirport, input.arrivalAirport],
  }];
  if (input.destination.id !== input.arrivalAirport.id) {
    const zone = taxiDestinationZone(input.destination, input.arrivalAirport, input.taxiZone);
    const usableFare = zone && fare?.from === "domestic-terminal" && fare.to === zone && fare.currency === "MVR" ? fare : null;
    legs.push({ id: "destination", mode: zone ? "taxi" : "land", title: zone ? "Taxi to your destination" : "Onward connection needed",
      from: input.arrivalAirport.name, to: input.address ? `${input.address}, ${input.destination.name}` : input.destination.name,
      status: zone ? "Reference estimate · taxi or bus demo checkout" : "No connected service in this demo",
      detail: zone ? "Avas Ride matrix: domestic terminal to selected zone, per vehicle; validity, capacity and surcharges unknown. No driver is booked. Address is a note; map ends at the island reference point, not your doorstep. Pickup time needs flight arrival, baggage collection and a driver quote." : "We cannot assume a road or ferry connection to this island. Arrange and verify this leg separately. The assumed planning allowance does not establish a service or a route.",
      departure: null, arrival: null, price: usableFare?.amount_minor ?? null,
      points: zone ? [input.arrivalAirport, input.destination] : [],
    });
  }
  return legs.map(leg => ({ ...leg, priceEstimate: planningPrice({ mode: leg.mode, passengers: input.passengers,
    listed: leg.mode === "taxi" && leg.id === "destination" ? null : leg.price,
    reference: leg.id === "destination" ? leg.price : null,
    flightFare: input.selectedFlight?.fare_minor, airportTransfer: leg.id === "airport-taxi" }) }));
}
