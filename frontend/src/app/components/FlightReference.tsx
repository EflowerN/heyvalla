import { flightTime, type FlightOption } from "@/lib/flights";
import TransportIcon from "./TransportIcon";

export default function FlightReference({ offer }: { offer: FlightOption }) {
  return <div className="rounded-xl border border-flight bg-flight/10 p-4 text-sm">
    <p className="flex items-center gap-2 font-semibold"><TransportIcon kind="flight" />{offer.airline} {offer.flight_number} · {offer.from_iata} → {offer.to_iata}</p>
    <p className="mt-2">{flightTime(offer.departure_at)} → {flightTime(offer.arrival_at)} · Maldives time</p>
    <p className="mt-2 font-semibold">{(offer.fare_minor / 100).toFixed(2)} {offer.currency} / adult · {offer.fare_name}</p>
    <p className="mt-2 text-xs leading-5">Website reference, checked {flightTime(offer.checked_at)} (UTC+5). {offer.price_basis}. Not a live quote or a reserved seat; final price and availability are confirmed by Maldivian.</p>
    <a href="https://maldivian.aero/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg bg-lagoon px-4 py-2 font-semibold text-white">Check fare & book on Maldivian ↗</a>
    <p className="mt-2 text-xs leading-5">Opens the airline in a new tab. Enter {offer.from_iata} → {offer.to_iata}, {offer.departure_at.slice(0, 10)}, your full party and nationality. This does not transfer passenger details, reserve a seat or mark the flight booked in HeyValla.</p>
  </div>;
}
