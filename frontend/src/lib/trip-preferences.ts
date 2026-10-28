export type Caution = "cautious" | "balanced" | "relaxed";
export type When = "leave" | "arrive";
export type TravelMode = "ferry" | "speedboat" | "seaplane" | "flight" | "bus" | "taxi" | "resort";
export type TripPreferences = { when: When; time: string; budgetMvr: number | null; modes: TravelMode[]; caution: Caution; maxChanges: number | null };
export type TripParams = TripPreferences & { from: string; to: string; date: string; passengers: number };

export const MODES: { value: TravelMode; label: string }[] = [
  { value: "ferry", label: "Ferry" }, { value: "speedboat", label: "Speedboat" }, { value: "seaplane", label: "Seaplane" },
  { value: "flight", label: "Domestic flight" }, { value: "bus", label: "Bus" }, { value: "taxi", label: "Taxi" }, { value: "resort", label: "Resort transfer" },
];
const MODE_VALUES = new Set<string>(MODES.map(mode => mode.value));

// Minutes between boats. Below `min` the hand-over is flagged tight; at or above `comfortable` it is comfortable.
export const CAUTION: Record<Caution, { min: number; comfortable: number; label: string; hint: string }> = {
  cautious: { min: 45, comfortable: 60, label: "Cautious", hint: "Longest buffers" },
  balanced: { min: 25, comfortable: 40, label: "Balanced", hint: "Comfortable buffers" },
  relaxed: { min: 15, comfortable: 30, label: "Relaxed", hint: "Shorter buffers; a delay can cost a connection" },
};
export type BufferRating = "comfortable" | "adequate" | "tight";

export function bufferRating(minutes: number, caution: Caution): BufferRating {
  const rule = CAUTION[caution];
  return minutes >= rule.comfortable ? "comfortable" : minutes >= rule.min ? "adequate" : "tight";
}

const clean = (value: string | null | undefined) => (value ?? "").trim();
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Reads and validates the landing-page search, ignoring anything malformed rather than trusting the URL. */
export function parseTripParams(search: URLSearchParams | Record<string, string | undefined>): TripParams | null {
  const get = (key: string) => clean(search instanceof URLSearchParams ? search.get(key) : search[key]);
  const from = get("from"), to = get("to"), date = get("date");
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(from) || !/^[A-Za-z0-9_-]{1,40}$/.test(to) || from === to || !isDate(date)) return null;
  const time = get("time");
  const budget = Number(get("budget"));
  const changes = get("changes") === "" ? NaN : Number(get("changes"));
  const caution = get("caution");
  const modes = get("modes").split(",").filter((mode): mode is TravelMode => MODE_VALUES.has(mode));
  const passengers = Math.round(Number(get("pax")));
  return {
    from, to, date, passengers: passengers >= 1 && passengers <= 6 ? passengers : 1,
    when: get("when") === "arrive" ? "arrive" : "leave", time: isTime(time) ? time : "09:00",
    budgetMvr: Number.isFinite(budget) && budget > 0 && budget <= 1_000_000 ? Math.round(budget) : null,
    modes: [...new Set(modes)], caution: caution === "cautious" || caution === "relaxed" ? caution : "balanced",
    maxChanges: Number.isInteger(changes) && changes >= 0 && changes <= 3 ? changes : null,
  };
}

export function tripSearchParams(trip: TripParams): URLSearchParams {
  const params = new URLSearchParams({ from: trip.from, to: trip.to, date: trip.date, time: trip.time, pax: String(trip.passengers), when: trip.when, caution: trip.caution });
  if (trip.budgetMvr) params.set("budget", String(trip.budgetMvr));
  if (trip.modes.length) params.set("modes", trip.modes.join(","));
  if (trip.maxChanges !== null) params.set("changes", String(trip.maxChanges));
  return params;
}

export type SeaOption = { id: string; departure_at: string; arrival_at: string; transfer_minutes: number; total_minor: number; legs: unknown[] };

/** Minutes after midnight in Maldives time (UTC+5, no daylight saving). */
export function maldivesMinutes(iso: string) {
  const at = new Date(Date.parse(iso) + 5 * 3600000);
  return at.getUTCHours() * 60 + at.getUTCMinutes();
}
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export type Filtered<T> = { shown: T[]; hidden: { time: number; budget: number; changes: number }; seaDisallowed: boolean };

/** Applies the hard filters. Fragile hand-overs are never hidden here; they are flagged by `bufferRating`. */
export function filterSeaOptions<T extends SeaOption>(options: T[], prefs: TripPreferences): Filtered<T> {
  const seaDisallowed = prefs.modes.length > 0 && !prefs.modes.includes("ferry") && !prefs.modes.includes("speedboat");
  const hidden = { time: 0, budget: 0, changes: 0 };
  if (seaDisallowed) return { shown: [], hidden, seaDisallowed };
  const limit = minutesOf(prefs.time);
  const shown = options.filter(option => {
    const changes = option.legs.length - 1;
    if (prefs.maxChanges !== null && changes > prefs.maxChanges) { hidden.changes++; return false; }
    if (prefs.budgetMvr !== null && option.total_minor > prefs.budgetMvr * 100) { hidden.budget++; return false; }
    const departs = maldivesMinutes(option.departure_at), arrives = maldivesMinutes(option.arrival_at);
    if (prefs.when === "leave" ? departs < limit : arrives > limit) { hidden.time++; return false; }
    return true;
  });
  return { shown, hidden, seaDisallowed };
}
