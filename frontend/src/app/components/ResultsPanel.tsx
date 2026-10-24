import { SeatRequestForm } from "./ProviderSeatRequests";
import type { BookingChoice } from "./BookingDesk";
import {
  formatDuration, labels, localClock, localDay, localTime, minutesBetween, pillStyles, symbols,
  type Classification, type Result, type Sailing,
} from "../ferry";

// Status (left edge and buffer meter) is separate from transport-mode colour (timeline legs).
const meterFill: Record<Classification, string> = {
  recommended: "bg-lagoon",
  tight: "bg-coral",
  too_late: "bg-rose-600",
  cancelled: "bg-ocean/30",
};

function Timeline({ sailing, result }: { sailing: Sailing; result: Result }) {
  const cancelled = sailing.classification === "cancelled";
  const mute = "bg-ocean/30";
  // Each stop is coloured by the transport mode of the leg that starts there.
  const stops = [
    { label: "Departs island", at: sailing.departure_at, leg: `${formatDuration(minutesBetween(sailing.departure_at, sailing.harbour_arrival_at))} by ferry`, color: cancelled ? mute : "bg-sea" },
    { label: "Arrives harbour", at: sailing.harbour_arrival_at, leg: `${formatDuration(minutesBetween(sailing.harbour_arrival_at, sailing.airport_arrival_at))} land transfer`, color: cancelled ? mute : "bg-land" },
    { label: "Reaches airport", at: sailing.airport_arrival_at, leg: "", color: cancelled ? mute : "bg-flight" },
    { label: "Check-in target", at: result.check_in_deadline_at, leg: "", color: "bg-flight" },
  ];
  return (
    <ol className="my-5 grid sm:grid-cols-4">
      {stops.map((stop, index) => (
        <li key={stop.label} className="relative flex gap-3 pb-5 last:pb-0 sm:block sm:pb-0 sm:pr-3 sm:pt-6">
          {index < stops.length - 1 && <span aria-hidden="true" className={`absolute left-[7px] top-4 h-full w-1 rounded-full sm:left-4 sm:top-[6px] sm:h-1 sm:w-full ${stop.color}`} />}
          <span aria-hidden="true" className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full ring-4 ring-coconut sm:absolute sm:left-0 sm:top-0 sm:mt-0 ${stop.color}`} />
          <div>
            <p className="text-xs text-ocean/70">{stop.label}</p>
            <p className={`text-lg font-semibold tabular-nums ${cancelled && index < 3 ? "text-ocean/50 line-through" : ""}`}>{localClock(stop.at)}</p>
            <p className="text-xs text-ocean/70">{localDay(stop.at)}{stop.leg && !cancelled ? ` · ${stop.leg}` : ""}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function BufferMeter({ sailing, safety }: { sailing: Sailing; safety: number }) {
  const buffer = sailing.connection_buffer_minutes;
  const scale = Math.max(safety * 2, 1);
  const fill = Math.max(0, Math.min(buffer, scale)) / scale * 100;
  return (
    <div className="border-t border-ocean/10 pt-4">
      <div aria-hidden="true" className="relative h-2 rounded-full bg-ocean/10">
        <div className={`meter-fill h-2 rounded-full ${meterFill[sailing.classification]}`} style={{ width: `${fill}%` }} />
        <span className="absolute -top-1 left-1/2 h-4 w-0.5 bg-ocean/60" />
      </div>
      <div className="mt-2 flex items-start justify-between gap-3 text-xs text-ocean/70">
        <span className="text-sm text-ocean/80">
          {buffer < 0
            ? `Arrives ${Math.abs(buffer)} minutes after your check-in target.`
            : `${buffer} minutes before your check-in target.${sailing.classification === "tight" ? " Below the recommended safety margin." : " Includes the recommended safety margin."}`}
        </span>
        <span className="shrink-0 pt-0.5">Safety margin {safety} min</span>
      </div>
    </div>
  );
}

export default function ResultsPanel({ result, error, loading, onBook }: { result: Result | null; error: string; loading: boolean; onBook: (choice: BookingChoice) => void }) {
  const meetsTarget = result ? result.sailings.filter(s => s.bookable).length : 0;

  return (
    <section aria-live="polite" aria-busy={loading}>
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">{error}</p>}

      {!result && !error && (
        <div className="rounded-2xl border border-dashed border-ocean/25 p-8 text-center sm:p-10">
          <h2 className="text-xl font-semibold">Your journey starts here</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-ocean/70">
            Choose a flight date and search to compare demo ferries. Try Vilufushi (Thaa) to Thimarafushi with a 14:00 flight to see suitable, tight, late, and cancelled options.
          </p>
        </div>
      )}

      {result && <>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold tracking-tight">{result.origin} → {result.destination} ({result.destination_code})</h2>
          <p className="mt-2 text-sm leading-6 text-ocean/80">
            <span className="rounded-full bg-flight px-2 py-1 text-xs font-semibold text-ocean">Flight</span> {localTime(result.flight_at)} · Check-in target: {localTime(result.check_in_deadline_at)}<br />
            {result.schedule_coverage
              ? `${meetsTarget} ferry ${meetsTarget === 1 ? "connection meets" : "connections meet"} the target and ${meetsTarget === 1 ? "is" : "are"} accepting demo bookings with the ${result.safety_minutes}-minute safety margin.`
              : "Schedule coverage is not available for this route yet."}
          </p>
        </div>

        {!result.sailings.length && <p className="card p-6">{result.coverage_message ?? "No demo sailings arrive on this flight date. Try another island or date."}</p>}
        {!!result.sailings.length && !meetsTarget && (
          <p className="mb-5 rounded-2xl bg-coral/10 p-4 text-ocean">No bookable ferry meets the recommended arrival target. Consider travelling earlier or arranging another service; this demo does not provide a confirmed alternative.</p>
        )}

        <div className="space-y-4">
          {result.sailings.map(sailing => (
            <article key={sailing.id} className={`tile p-5 ${sailing.classification === "cancelled" ? "opacity-80" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">{sailing.service}<span className="whitespace-nowrap rounded-full bg-sea px-2 py-1 text-xs font-normal text-white">Sea · Demo ferry</span></h3>
                <span className={`pill ${pillStyles[sailing.classification]}`}><span aria-hidden="true">{symbols[sailing.classification]}</span>{labels[sailing.classification]}</span>
              </div>

              <Timeline sailing={sailing} result={result} />

              {sailing.classification === "cancelled"
                ? <p className="border-t border-ocean/10 pt-4 text-sm text-ocean/80">This simulated sailing is cancelled and cannot be used.</p>
                : <BufferMeter sailing={sailing} safety={result.safety_minutes} />}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-ocean/80">{sailing.available_seats} demo seats remaining · {sailing.source === "provider" ? "Provider approval required" : "Built-in demo"}</span>
                {sailing.source !== "provider" && <button
                  type="button"
                  disabled={!sailing.bookable}
                  onClick={() => onBook({ sailing_id: sailing.id, service: sailing.service, available_seats: sailing.available_seats, search: result.search })}
                  className="tap rounded-xl bg-lagoon px-4 py-2 text-sm font-semibold text-white hover:bg-lagoon/90 disabled:bg-ocean/10 disabled:text-ocean/80"
                >
                  {sailing.bookable ? "Book demo seats" : sailing.available_seats === 0 && sailing.classification !== "cancelled" ? "Sold out" : "Not bookable for this flight"}
                </button>}
              </div>
              {sailing.source === "provider" && <>
                <p className="mt-3 text-sm">{sailing.operator} · {sailing.fare_minor == null ? "Fare unavailable" : `${(sailing.fare_minor / 100).toFixed(2)} MVR per seat`} · Unverified demo provider</p>
                {sailing.bookable
                  ? <SeatRequestForm sailing={{ id: sailing.provider_sailing_id!, version: sailing.version!, fare_minor: sailing.fare_minor ?? null, remaining_seats: sailing.available_seats }} flightContext={result.search} onSaved={() => {}} />
                  : <p className="mt-2 text-sm">Not accepting requests for this flight connection.</p>}
              </>}
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs leading-6 text-ocean/70">Planning estimates only, not guaranteed connections. Search includes sailings arriving on the flight date, including departures the previous evening. Earlier-day arrival options are outside this demo search.</p>
      </>}
    </section>
  );
}
