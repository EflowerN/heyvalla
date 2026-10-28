import { maldivesDate } from "./travel-date.ts";

export type SailingFilter = { query: string; date: string; provider: string; route: string };
export type FilterableSailing = { id: number; origin: string; destination: string; organization_name: string; vessel_name: string; departure_at: string };
export const sailingRoute = (sailing: FilterableSailing) => `${sailing.origin} → ${sailing.destination}`;

export function filterSailings<T extends FilterableSailing>(sailings: T[], filter: SailingFilter, now = Date.now()): T[] {
  const query = filter.query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return sailings.filter(sailing => {
    const text = [sailing.origin, sailing.destination, sailing.organization_name, sailing.vessel_name].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return Date.parse(sailing.departure_at) > now && (!filter.date || maldivesDate(sailing.departure_at) === filter.date)
      && (!filter.provider || sailing.organization_name === filter.provider) && (!filter.route || sailingRoute(sailing) === filter.route)
      && query.split(/\s+/).every(term => text.includes(term));
  }).sort((a, b) => Date.parse(a.departure_at) - Date.parse(b.departure_at) || a.id - b.id);
}
