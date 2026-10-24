# Taxi and private-vessel expansion plan

## Goal

Support one airport journey with multiple legs: departure island → scheduled ferry or private vessel → arrival harbour → taxi → airport. A confirmed ferry does not make an unconfirmed taxi a fully arranged journey.

## First milestone: taxi add-on and operator dashboard

Start with Thimarafushi harbour-to-airport taxi requests attached to existing demo ferry bookings. Capture passenger count and bags; derive pickup from harbour arrival plus a configurable disembarkation allowance. Initial assumptions: five minutes to disembark, 15 minutes to drive, and a 30-minute airport safety margin. These are fictional demo assumptions, not verified local travel times.

Passenger submits a request, operator quotes pickup and price or declines, and passenger accepts a valid quote before demo confirmation. Initial statuses: requested, quoted, confirmed, declined. Quote expiry: 30 minutes. One taxi request per ferry booking, maximum four passengers and four bags; passengers cannot exceed ferry seats. Split-party/multiple-car support and cancellation/re-request flows are later work. Do not imply a real driver has been allocated or collect payment.

Protect the operator dashboard separately from passenger guest capabilities. Backend authorizes each operator request; UI visibility alone is not access control. Use a local demo credential and server-only operator token now. Production requires real operator accounts, scoped permissions, durable rate limiting, and audit events. Passenger access remains restricted to the owning guest booking.

## Private vessel milestone

Add harbour-to-harbour requests with departure/arrival locations, date, party size, luggage, preferred departure or required arrival time. Operator proposes a vessel, capacity, departure/arrival estimates, total MVR quote, expiry, and cancellation terms. Passenger accepts, then the operator confirms actual vessel availability. Keep requested and quoted journeys distinct from confirmed bookings. No automatic claims of vessel availability based on map locations.

## Shared vessels

Later allow passengers to express interest in a common departure. Operator quotes the shared sailing. Define minimum passenger thresholds, expiry, per-passenger pricing, and failure/refund rules before making this bookable.

## Architecture

Next.js owns passenger and operator screens; Laravel owns validation, ownership, eligibility, quote transitions and persistence. Preserve existing ferry records. Initially link a taxi request to its ferry booking. Later add a parent journey with ordered journey legs, service-specific requests, transfer locations, quotes, vehicles/vessels, operator coverage, and booking event history. Money uses integer minor units and a currency, never floating-point persistence. Version updates prevent stale quotes from silently replacing accepted ones.

## Timing and disruption

Airport estimate = ferry/vessel arrival + disembarkation + taxi waiting + drive. Compare against the passenger's chosen check-in target and safety margin. Times use Indian/Maldives for display and explicit offsets. Older ferry snapshots without a check-in target must disclose that limitation rather than invent one.

A ferry delay/cancellation should later flag the taxi and recalculate suitability. Do not silently reschedule: passengers request a change and operators confirm. Preserve historical quotes and booking events when that milestone is implemented. RTL source timetables remain reference snapshots until service calendars/validity are confirmed; they do not supply live seats, drivers, or boats.

## Delivery sequence

1. Taxi request, operator login, quote/decline, passenger acceptance, persistent status.
2. Operator accounts/coverage and taxi cancellation/change workflow.
3. Private-vessel requests, operator quotes, availability confirmation.
4. Combined journey view, timing and partial-confirmation status.
5. Disruption recovery with explicit passenger/operator approval.
6. Shared-vessel interest groups and confirmed shared departures.

## Verification

Test guest ownership, operator authorization, party/bag limits, duplicate requests, stale versions, quote expiry, price validation, pickup eligibility and timing boundaries, persistence, and safe UI errors. Validate passenger request → operator quote → passenger acceptance in the browser. Keep all current work local until an explicit push request.
