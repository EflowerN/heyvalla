export type Island = { id: string; name: string; atoll: string; category: string };
export type Airport = { id: string; name: string; iata: string };

export type Classification = "recommended" | "tight" | "too_late" | "cancelled";

export type Sailing = {
  available_seats: number;
  bookable: boolean;
  id: string;
  service: string;
  operator: string;
  departure_at: string;
  harbour_arrival_at: string;
  airport_arrival_at: string;
  connection_buffer_minutes: number;
  classification: Classification;
};

export type Result = {
  search: Record<string, string | number>;
  destination: string;
  destination_code: string;
  schedule_coverage: boolean;
  coverage_message: string | null;
  origin: string;
  flight_at: string;
  check_in_deadline_at: string;
  transfer_minutes: number | null;
  safety_minutes: number;
  sailings: Sailing[];
};

export const labels: Record<Classification, string> = {
  recommended: "Meets arrival target",
  tight: "Tight connection",
  too_late: "Too late for check-in",
  cancelled: "Cancelled · unavailable",
};

// A symbol accompanies every status so it never depends on colour alone.
export const symbols: Record<Classification, string> = {
  recommended: "✓",
  tight: "!",
  too_late: "✕",
  cancelled: "–",
};

// Status styling (separate from transport-mode colours, per docs/design-system.md).
export const pillStyles: Record<Classification, string> = {
  recommended: "bg-lagoon/10 text-ocean",
  tight: "bg-coral/20 text-ocean",
  too_late: "bg-rose-100 text-rose-900",
  cancelled: "bg-ocean/10 text-ocean",
};

const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Indian/Maldives", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Indian/Maldives", day: "2-digit", month: "short" });

export function localTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Indian/Maldives", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value));
}
export const localClock = (value: string) => clockFormat.format(new Date(value));
export const localDay = (value: string) => dayFormat.format(new Date(value));

export function minutesBetween(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
}

export function formatDuration(totalMinutes: number) {
  const minutes = Math.abs(totalMinutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
