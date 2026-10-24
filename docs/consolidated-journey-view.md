# Consolidated journey view and saved itinerary

Implemented locally on 24 October 2026. This page supersedes the homepage's ferry-only layout; that view is still available at `/ferry-planner`.

## Passenger flow

1. Search **Where are you?** by island/atoll, and **Where are you going?** by island, atoll, airport name or IATA code. Select an actual match; free text alone cannot submit an endpoint. Arrow keys and Enter select suggestions; Escape dismisses them. Islands, resorts and airports reuse the existing directory.
2. Enter a future flight date/time and party size. Expand flight details to change airports, check-in allowance, optional flight arrival date/time, Hulhumalé phase and address note. The demo-fill button selects tomorrow, Vilufushi → Hulhumalé and an illustrative 14:00 flight target; it does not invent an airline service or arrival time.
3. Search the existing Laravel ferry endpoint. Choose a dated provider sailing or a built-in demo sailing. Capacity is checked against the whole party in the preview; backend validation remains authoritative at booking time. Cancelled sailings cannot be selected.
4. Read ferry → Thimarafushi airport taxi → manually entered flight → onward connection on one timeline. Click a leg or map line to highlight/focus it; Fit whole journey resets the view. Enable map location selection to change the starting island or destination. Changing any search field clears stale results and aborts pending requests.
5. Review each service before booking. Legacy demo bookings and provider requests use the existing guest/session/idempotency paths, with party size prefilled. Their saved itinerary includes the full passenger-entered flight, final destination, address note and reference onward taxi estimate, alongside the existing Thimarafushi taxi request workflow. Flight and onward taxi are not booked here. Saving currently happens with a ferry booking/request; standalone unbooked draft saving is not implemented.

## What the preview does and does not establish

- Ferry search currently supports arrivals at Thimarafushi. Other departure-airport searches show the API's no-coverage result without fabricating a connected itinerary.
- Flights are explicitly passenger-entered plans. No airline route, future schedule, price, ticket or operational availability is inferred from two airport coordinates.
- The airport transfer retains the backend's 20-minute allowance and 30-minute safety margin. Check-in is the passenger's selected allowance, not an airline-verified deadline. A single demo taxi handles at most four passengers; larger parties are warned that additional transport is required.
- Onward taxi geometry/estimates are limited to Velana → Malé or Hulhumalé. Other islands get a missing-connection leg with no invented road line or price. An airport destination ends at that airport without a same-place taxi leg.
- The Avas matrix request uses **domestic-terminal** as pickup and the explicit Malé / Hulhumalé phase as drop-off. It is a per-vehicle reference value with unknown capacity, validity and surcharges, not a driver quote. Thimarafushi never uses this matrix. Failure to load a fare leaves it unknown and does not discard the ferry results.
- Ferry prices are multiplied by the party size. Unknown fares remain unknown. The subtotal is explicitly partial and excludes flights/unquoted legs; it is never presented as a complete trip price.
- All lines are illustrative, not marine/road routing or aircraft/vessel tracking. The harbour marker is the canonical Thimarafushi island reference point, not a surveyed harbour entrance. Home/hotel address text is a saved passenger note; no geocoding occurs and the map ends at the island coordinate.
- Search results are an availability snapshot. Booking can still be rejected if inventory, terms or schedule change. Booking refreshes the search; no automatic reservation is made by choosing a ferry.
- Booking/request creation and the full journey snapshot are committed in one database transaction. The passenger’s My itineraries view includes the arrival airport and optional arrival time, canonical final destination, address and onward leg. Existing itineraries with a flight target can add these details; active future flights can edit them. Address/arrival fields can be cleared. Updates are versioned and retries do not overwrite newer edits. Flight departure targets and ferry terms remain unchanged by onward-detail edits.
- Full details live only in `travel_journeys`, not provider booking snapshots or operator lists. Guest-cookie ownership is required to read or edit them. These are server-persisted records, but access still depends on the browser cookie. No address is sent to a ferry provider.
- The server validates location IDs, airport/arrival chronology, destination and taxi zone; it obtains reference fares from its own Avas data and does not accept client-supplied quotes or booking statuses. Reference prices are snapshotted with a save time and kept outside the quoted/confirmed subtotal. An unarranged onward leg prevents a fully arranged ground-transport status.
- Full journey saving uses the existing ferry booking/request submission. There is no standalone unbooked draft save yet, and no through-ticket or confirmed door-to-door service.

## Data provenance

No new external dataset was introduced. Locations and attribution are reused from `backend/resources/data/locations.json` and the existing footer (OneMap / Geomatics Department and Maldives CAA July 2025); references and usage limitations remain in `docs/data-sources.md`. The map retains OpenStreetMap tile attribution. Onward estimates use `backend/resources/data/greater-male-fares.json`, the organizer-provided Avas Ride fare matrix. Backend ferry data remains distinguished as fictional built-in or provider-entered demo data. The explicit Greater Malé endpoint mapping uses existing canonical island IDs and matrix zone IDs; it does not establish new route geometry or address boundaries.

## Validation

Apply the additive `add_full_journey_details_to_travel_journeys` migration before serving the updated API. Existing bookings remain intact; their new detail columns start empty.

- `cd backend && php artisan migrate --no-interaction`
- `cd backend && php artisan test --compact`

- `cd frontend && npm run lint`
- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && node --test tests/journey-plan.test.mjs` (Node with native TypeScript stripping, tested on Node 25)

The planning regressions cover ordered legs, canonical endpoints, party fares/capacity, unsupported islands, region-separated taxi estimates, missing prices, phase selection, airport-only destinations, chronological/overnight times, same-place validation, future dates and accent-insensitive search.

For local preview, if another application owns port 8000, start the API using `php artisan serve --host=127.0.0.1 --port=8001 --no-reload` from `backend`, and start the frontend with `LARAVEL_API_URL=http://127.0.0.1:8001 npm run start -- --hostname 127.0.0.1 --port 3000` after building. The process override avoids editing shared environment files.

## Next extension

Add standalone unbooked draft saving, then attach separately confirmed taxi services to both ends. The full plan attached to a ferry booking/request is now persisted; exact destination pins remain future work. Add address lookup/road routing only with an appropriate provider, source attribution and coverage validation. Bus/private vessel alternatives should enter a shared route adapter once usable operating calendars and provider availability exist. Keep an explicit incomplete state until every required leg is arranged.

Full-journey regression coverage includes legacy/provider atomic saves, invalid-input rollback, retry payload mismatches, safe editing after original booking retries, guest ownership, operator address privacy, version conflicts, optional-field removal, unsupported transfers, airport-only destinations, historical compatibility, cancellation and the distinction between a reference fare and a confirmed service.
