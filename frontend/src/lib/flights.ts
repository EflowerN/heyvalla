export type FlightOption = {
  id: string; airline: string; flight_number: string; from: string; to: string;
  from_iata: string; to_iata: string; departure_at: string; arrival_at: string;
  fare_name: string; fare_profile: "maldivian_adult"; fare_minor: number; currency: "MVR";
  price_basis: string; observed_seats: number | null; checked_at: string;
  source_url: string; booking_url: string; source: string; day_offset?: number; stale?: boolean;
};
export function matchingFlight(offer: FlightOption | null, from: string, to: string, departure: string, arrival: string) {
  return offer && offer.from === from && offer.to === to && Date.parse(offer.departure_at) === Date.parse(departure)
    && Date.parse(offer.arrival_at) === Date.parse(arrival) ? offer : null;
}
export function flightTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Indian/Maldives", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
