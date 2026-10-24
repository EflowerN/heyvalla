# Dhathuru App demo plan

## Problem and pilot

Passengers travelling from islands in Thaa Atoll to Thimarafushi Airport can struggle to find sea transport aligned with flight check-in. Unsuitable timings and cancellations can cause missed connections; private alternatives can be costly. This is the team's working problem hypothesis, to validate with passengers and operators.

Build a working demonstration for a small set of departure islands and one airport destination. There is no operator partner yet. All demonstration operators, prices, capacity, bookings, delays, and cancellations must be labelled. Actual schedules may be referenced from RTL after verification; they must remain distinct from simulated booking inventory.

## Demonstration story

1. Passenger selects departure island, flight date/time, and check-in buffer.
2. App compares sailings using ferry arrival, harbour-to-airport transfer allowance, and safety margin.
3. Passenger books seats against demo inventory and receives a reference.
4. Operator delays or cancels that specific sailing with a reason.
5. Passenger sees the affected booking and selects an available alternative.

No money is collected and no real ticket is issued.

## Scope

Passenger: search, connection explanations, sailing details, demo seat booking, My bookings, in-app service updates, and alternative selection.

Operator: protected dashboard, sailing creation/editing, capacity and price management, passenger lists, and delay/cancellation notices. Laravel enforces ownership and role permissions; hiding controls in Next.js is insufficient.

Later: shared-vessel requests with operator quotes, real integrations, payments, live tracking, automatic flight feeds, email/push notifications, and more complex transfers.

## Stack and responsibilities

- Next.js App Router with TypeScript and Tailwind: passenger and operator interfaces.
- Laravel JSON API: authentication, authorization, validation, journey calculations, booking capacity, and disruptions.
- SQLite for initial local setup; MySQL planned for shared/deployed use.
- Laravel Sanctum cookie-based authentication planned; configure first-party domains, CSRF, and CORS when implementing login.
- Maldives service timezone: `Indian/Maldives`. Store instants in UTC and display local time explicitly. Do not use the developer computer's timezone for transport calculations.
- Keep business logic in Laravel services, thin controllers, validation in Form Requests, and policies for operator ownership.

## Connection calculation

Airport arrival target = flight departure minus passenger-entered check-in buffer.

Estimated airport arrival = ferry arrival plus harbour-to-airport transfer allowance.

Connection buffer = airport arrival target minus estimated airport arrival.

Negative buffer: too late. Nonnegative but below configurable safety margin: tight connection. At or above margin: meets planning target. Show all assumptions. These are estimates, not guarantees. No airline-specific deadline or transfer duration is verified yet.

## Proposed records

Users (passenger/operator roles), islands, harbours, operators, vessels, dated sailings, bookings and passenger/seat counts, flight connections, and service updates. Add schedule source, external reference, validity dates, verification time, and data freshness metadata. Record money as integer minor units plus currency (MVR), never floating point.

Keep recurring schedule templates separate from dated sailings. Keep sailing status (scheduled/delayed/cancelled/completed) separate from booking status (confirmed/cancelled/rebooked). A cancelled sailing preserves booking history and cannot accept new bookings. Track replacement links when rebooking; never silently move a passenger.

Capacity checks and reservation writes must happen together in a database transaction using appropriate locking. Repeat submissions must not create duplicate bookings. Verify concurrency against MySQL, since SQLite locking differs.

## Milestones and acceptance

1. Foundation: runnable applications, documented setup, health connection, ignored secrets, lockfiles.
2. Search: seeded demonstration journeys, date-aware search, check-in calculation, clear source labels and empty results. First product milestone.
3. Booking: demo confirmations/references, capacity validation, passenger booking ownership, duplicate-submission handling.
4. Operator: role-protected sailing management, passenger lists, delay/cancellation workflow.
5. Recovery: recompute suitability after delays, show affected bookings, recheck capacity for selected alternatives.
6. Presentation: deterministic resettable dataset and walkthrough, accessible/mobile screens, clear demo labels.

## Verification priorities

Capacity races; role and operator ownership; cancelled/full sailings; delayed connections; check-in boundary conditions; midnight/date handling; Maldives timezone; duplicate submissions; cancellation/rebooking history; stale and missing source data.

## Open decisions

Confirm pilot islands, current route coverage, schedule availability/reuse, transfer assumptions, safety margin, flight input fields, and eventual operator workflow. Do not invent official RTL times or infer booking capability from published schedules.

## Submission rehearsal: complete booking demo

1. Planner → **Fill Thaa → Hulhumalé demo**. This supplies tomorrow’s fictional 14:00–14:50 flight. Search; choose a suitable ferry; review and book with sample passenger details.
2. Open **My itineraries**, find that journey and choose **Book remaining journey services · Demo**. Select taxi or bus, review prices and confirm with no payment. The reference and simulated leg states persist after refresh. Bus R4 is the Phase 1 example; its timetable remains an explicitly dated reference, not live service assurance.
3. Alternatively select a checked Maldivian flight and use its in-app demo booking button. Taxi fares and RTL buses also have independent demo checkout. Standalone service reservations appear in My itineraries but are not automatically combined with a separate ferry journey.
4. **Boat owners** → sign in with an existing demo provider. Enable request-to-book on a vessel, publish a sailing and approve a passenger request. Under a published sailing open **Cargo, last call & location sharing**, post a loading window or fully-loaded message and publish. Refresh Sailings or the passenger activity timeline to show the ping. Optional sample coordinates demonstrate owner consent; no live tracking is claimed.
5. Explain what follows the demo: approved airline/seaplane inventory and ticketing, Avas Ride dispatch, RTL ticketing and owner-authorized FollowMe-style vessel tracking. Current demo does not issue real tickets, dispatch vehicles, take money or send external notifications.

Use `php artisan migrate --force` and the existing `php artisan heyvalla:demo --days=7` command before rehearsal. This preserves existing seed records; do not use `--reset` unless intentionally replacing seeded providers.

### Flightless travel

Planner → **Ferries & launches · no flight** → **Fill Kinbidhoo → Gan demo** → **Find sea journeys**. Select the 10:00–10:05 Kinbidhoo–Veymandoo ferry and 10:30–12:00 Veymandoo–Laamu Gan connection, review the 25-minute wait, then book both demo legs together. The date field is **Travel date**; no flight input is required. The receipt is saved in My itineraries. A direct Vilufushi–Malé launch example is also provided. All four repeating fixture sailings and their prices are fictional; the user's example supplied the two-leg timing.

Published owner sailings are also searched, with owner booking controls, remaining capacity and departed state respected. These require individual seat requests and approval; a connection involving providers is not an automatically confirmed through-ticket. The current search supports direct or one-change trips departing on the same date, with 15–240 minutes between legs and a shared-island-harbour assumption.


### Visible planning prices

Every passenger journey component now displays a planning amount, preserving listed/quoted values where present. Missing prices use explicitly labelled display-only assumptions: sea MVR 150 per passenger; flight MVR 1,464 per passenger (or a selected reference fare multiplied for a simulated party estimate); harbour taxi MVR 80 per four-seat vehicle; other taxi MVR 90 per four-seat vehicle when no matrix reference is available; bus MVR 10 per passenger; an unverified onward connection MVR 100 per passenger as an allowance only. Matrix taxi references are multiplied by the assumed vehicle count. These allowances do not create routes, alter capacity, enable unavailable bookings, change saved operator quotes or charge money. Planner and My itineraries show a planning total covering every displayed leg, while actual recorded demo/operator subtotals remain distinct. Maldivian outbound checkout/availability buttons have been removed from the passenger flight cards; flight reference provenance remains visible.
