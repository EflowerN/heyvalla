# Dhathuru App integrated passenger and cargo implementation plan

## Product outcome

Help people plan and arrange a complete journey: exact pickup → taxi → ferry/private launch → flight → taxi → exact destination. Also support cargo routes from sender pickup to consignee delivery. Aggregate provider information, visualize connections, explain prices and booking status, and preserve a record of provider updates and customer acknowledgements.

Passenger luggage and commercial cargo are distinct products. Start with passenger journeys and a simple cargo-request flow, rather than assuming flight baggage allowance or passenger seats represent freight capacity.

## Current foundation

Implemented: Maldives island/airport map, resort markers, fictional ferry-to-Thimarafushi connection search and seat bookings, guest booking history, Thimarafushi taxi request/quote/acceptance, a local demo operator dashboard, Greater Malé reference fares, and an unintegrated RTL timetable snapshot. Flight selection is currently manual. Existing data does not provide verified future flights, live boat positions, or operational cargo capacity.

## Phase 1 — provider accounts and controlled publishing

Replace the shared demo operator login with individual provider accounts, organization membership, and owner/dispatcher roles. Add platform reviewer access for profile verification and disputes. Enforce organization ownership in Laravel policies for every route, vessel, sailing, cargo request and location update.

Providers create a profile, contacts, supported islands/harbours, vehicles/vessels and service coverage. Let launch owners choose separately:

- Publish route and schedule information.
- Allow passenger ticket bookings: disabled, request-to-book, or instant confirmation against managed inventory.
- Accept cargo enquiries/bookings.
- Share live location: off, public during active trips, or confirmed passengers only.
- Enable notifications and configure last-call lead time.

Default booking and live sharing to off. Show provider-verification scope/date; do not display an unqualified trust badge. Keep verification documents private. Provide mobile-friendly forms, draft/preview/publish, recurring schedule templates, dated sailings and CSV import with validation. Providers can place a harbour/map pin, draw an illustrative route, or submit a verified track; label each geometry's meaning.

Acceptance: one provider cannot change another provider's records; unverified profiles cannot impersonate verified providers; customers see only published information and enabled booking features. Switching off new bookings preserves existing commitments and history.

## Phase 2 — prices, bookings and a communication record

Generalize the existing request/quote pattern across taxis, private launches and cargo. Preserve ferry atomic capacity checks and retry protection. Separate quote, accepted offer, confirmed booking, payment, fulfilment and cancellation statuses.

Every offer shows MVR currency, price basis (per seat, whole vehicle/vessel, kg, parcel or volume), quantities, itemized surcharges, total, inclusions/exclusions, expiry and cancellation terms. Unknown prices remain unknown and are excluded from any claim of a complete journey total. Keep an immutable accepted price/terms snapshot. Estimate and operator quote must be distinguishable. Quote acceptance does not imply payment or physical vehicle assignment.

Create a booking-specific message/update timeline: sender, timestamp, changed fields, reason, old/new values and delivery/acknowledgement status. Customers receive a request reference and confirmation, and can acknowledge important changes. A delivered notification is not proof the customer read or accepted a change. Add dispute/reporting and cancellation reasons. Define review eligibility and verification semantics before launching public ratings.

Acceptance: concurrent seat requests cannot oversell; expired/stale quotes cannot be accepted; totals reconcile to line items; a provider change never silently rewrites accepted terms.

## Phase 3 — exact locations and journeys with multiple legs

Add parent journeys and ordered legs referencing service-specific bookings. Locations include islands, harbours, airport terminals and exact customer-selected pins/address instructions. Let customers confirm ambiguous geocoding results; keep exact private addresses visible only to relevant booked providers. Use available mapping coverage and explicit estimates for road journeys; straight map lines are not driving or marine navigation paths.

Build a Laravel planner using a time-dependent graph: stops/transfer locations as nodes, dated services and transfer legs as edges. Begin with bounded templates (taxi–ferry–flight–taxi), then add transfers. Include disembarkation, walking/driving, terminal transfer, check-in and safety allowances. Account for service calendars, exceptions, time zones and journeys crossing midnight. Rank feasible alternatives by arrival time, transfers and known cost; disclose missing legs/prices and uncertainty.

Obtain a verified future flight timetable/feed or provider-approved schedule input. MACL's anonymized historical package is not sufficient. Keep manual flight entry as a labelled fallback. Confirm RTL weekdays/validity before generating real dated sailings. Do not auto-book a live flight until an authorized ticketing integration exists.

Acceptance: a full journey shows every leg, transfer assumption, selected destination, price and booking status. Mark it partially arranged until each required leg is confirmed. Failed booking of a later leg must preserve explicit status of earlier reservations; use holds/expiry and compensating cancellation workflows, not a fictional cross-provider atomic transaction.

## Phase 4 — provider service updates and location sharing

Publish route changes, delays, cancellations, boarding, departure and last-call notices against a specific dated sailing. Require a reason for significant changes. Identify affected passenger/cargo bookings and downstream legs; recalculate connections and show alternative requests. Obtain explicit acceptance when a change affects a booking. Never silently move a passenger or taxi to another service.

Start notifications in-app, then add opt-in push/email with Laravel queues, an outbox, delivery retry/deduplication and failure visibility. Use templates rather than free-text-only critical notices. Last-call notices use the latest scheduled departure, trip state, configured lead time and provider override. Cancel/reschedule obsolete jobs after timing changes. Alerts provide context, not a guarantee of boarding or a live departure.

Implement mobile provider trip controls and GPS opt-in with an explicit start/stop. Authenticate location submissions; store timestamp and accuracy. Apply visibility rules server-side, show last-updated/stale/offline state, and stop public sharing when a trip ends or consent is withdrawn. Simulated/replayed positions remain visibly labelled. Never expose the provider's off-duty location.

Acceptance: disabled sharing exposes no coordinates; public and passengers-only scopes are distinct; stale GPS is not shown as live; each critical update has a timeline event; rescheduled last-call jobs cannot send obsolete notices.

## Phase 5 — cargo requests and handover tracking

Provider publishes whether a sailing accepts cargo, available weight/volume limits, dimensions, allowed goods categories, cut-off times and handling conditions. Separate passenger capacity from cargo capacity, while accounting for any provider-defined shared vessel load constraint. Do not infer payload limits from the current ferry demo seat count.

Customer enters sender/recipient contact, pickup/drop-off, goods category, parcel count, declared weight/dimensions, handling needs and desired arrival. Begin with non-specialized general cargo; specialized/perishable/restricted goods require explicit provider capability and rules. Operator reviews capacity and issues a quote. Confirm only after acceptance and operator availability confirmation.

Track requested → quoted → accepted/pending provider → confirmed → received → loaded → in transit → ready for collection → delivered, with rejection/cancellation exceptions. Record who handed over/received each consignment and when. Add reference/QR and one-time collection confirmation; keep contact details and proof-of-delivery private. Multi-leg cargo includes custody transfer and cut-off checks at each stage; do not promise aviation cargo booking without a carrier integration.

Acceptance: no double-allocation of defined capacity; cargo cannot be accepted after its cut-off; each custody change is recorded; only authorized recipients/providers can view private delivery details.

## Suggested data model

- Organizations, provider profiles, users/memberships, verification records and service capabilities.
- Locations, harbours/terminals, routes, route versions, vessels/vehicles, schedule templates, dated sailings and calendars.
- Journeys and ordered journey legs, passengers, cargo consignments and transfer/custody legs.
- Requests, immutable quote versions/line items, bookings, capacity reservations/holds and accepted terms.
- Trip status events, service updates, booking messages, acknowledgements, notification subscriptions/outbox and delivery attempts.
- Time-limited location-sharing sessions, location samples, audit events, disputes and proof of delivery.

Use integer minor units for prices, explicit capacity units and UTC instants with Maldives-time display. Keep public catalogue fields separate from private contacts, precise addresses and verification documents. Version provider edits and accepted quotes. Define retention and permissions before storing location history or delivery evidence.

## Stack and delivery approach

Keep one repository, Next.js screens and Laravel APIs/services, policies, queues and scheduler. Target MySQL for shared deployment and validate concurrency there. Start with normal queries and GeoJSON geometries; add database spatial indexes when location-search volume justifies them. Use authenticated polling first for trip updates, then WebSockets if required. Avoid adding a separate backend or optimizer service before the bounded planner needs one.

Seed distinct fictional providers and deterministic passenger/cargo scenarios. Separate official static facts, historical datasets, provider claims and simulated live data in storage and UI. Existing public-source rules and organizer exceptions still apply. Do not push without the user's explicit request.

## Recommended next sprint

Build provider onboarding/ownership and per-vessel controls first. Deliver one small end-to-end story: provider publishes a sailing, chooses request-to-book and cargo enquiries, passenger requests a seat, operator confirms, then publishes a delay and last-call notice visible in the booking timeline. Add cargo enquiry/quote next. Extend to exact-destination journeys after provider data and events are reliable.

## Verification and success measures

Test cross-provider isolation, public/private location scope, quote expiry/versioning, capacity races, duplicate submissions, notification deduplication, last-call rescheduling, midnight/calendars, downstream missed connections, cargo cut-offs/custody and partial booking failures. Verify mobile publishing, customer acknowledgement and stale/offline states in the browser.

Measure planning completion, confirmed versus partial journeys, quote response time, notification delivery/acknowledgement, and unresolved booking changes. Establish baselines through pilot testing; do not invent target performance claims from synthetic MTCC demand figures.

## Implementation progress — 24 October 2026

First provider-publishing slice is implemented locally:

- `/providers`: individual owner account registration/sign-in, private profile editing, declared coverage, vessel capacity and future request-to-book/cargo preferences.
- Database-backed eight-hour sessions, hashed credentials/tokens, server-side ownership checks, login rate limits and version checks on vessel/publishing changes.
- Private dated sailing drafts, preview, explicit publication and withdrawal. Departure/arrival input uses Maldives time and storage uses UTC.
- `/sailings`: passenger catalogue of future published demo sailings, with MVR per-seat fares or an explicit unknown price, unverified-provider labels and no private account contact fields.

This is a publishing stage. Booking preferences do not activate reservations yet; location sharing remains off. The existing shared taxi demo login remains separate. Dispatcher memberships, reviewer verification, password recovery, email verification, route/map geometry and CSV imports remain unfinished Phase 1 work. Draft content editing is not yet available; drafts can currently be reviewed and published/withdrawn. No new official/public transport data was used for this feature.

Next delivery: provider sailing seat requests and operator approval, followed by booking-specific delay/last-call events and passenger acknowledgements. Integrate these separately from the existing fictional ferry inventory and RTL reference snapshots, preserving atomic capacity checks and accepted terms.

### Provider booking progress — 24 October 2026

Seat requests and operator approval are now implemented for future provider-published demo sailings with known MVR fares. Passengers explicitly accept the displayed journey/total and demo terms. Requests retain an immutable price/journey snapshot; the operator confirms or declines with a reason. Passenger cancellation releases confirmed capacity. Both views show a private request timeline, protected by provider ownership or guest-browser ownership. Confirmations use an atomic capacity guard; retries use submission UUIDs and status versions. New-booking opt-out preserves existing requests and confirmations. Sailings with active commitments cannot be withdrawn to private drafts.

This supersedes the earlier note that request-to-book preferences do not activate requests. Cargo preferences still do not activate cargo enquiries. Next: sailing delay/cancellation/last-call events, passenger acknowledgements and connection-impact warnings, followed by cargo requests/quotes. No new public data sources were used.


### Follow-up: reliable demo and unified itinerary (24 October 2026)

Implemented the first integrated Thimarafushi slice: canonical provider endpoints; published provider sailing search against a manual flight deadline; provider approval; one linked airport taxi quote/acceptance; a shared guest itinerary with ordered legs, statuses, MVR subtotal and unknown flight cost. A partial-party taxi remains incomplete. Source schedules and transfer durations are explicitly fictional/provider demo assumptions.

The same slice adds local repeatable seeded providers, request expiry, draft edits, vessel overlap checks, ferry/taxi cancellation, old-booking compatibility and visible-page polling. The README contains the rehearsal/reset commands. Delay recovery, multi-airport routing, bus/flight booking, cargo, private charter, location sharing, notifications and production readiness remain separate deliverables, as detailed in the audit follow-up.
