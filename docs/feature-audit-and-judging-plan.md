# Dhathuru App feature audit and judging plan

## Follow-up implementation — 24 October 2026

The remainder of this document preserves the original audit baseline, including its historical test counts and findings. This follow-up supersedes the “not implemented” statements for the bounded features below; it does not mark the entire roadmap complete.

- Fixed reproduced pending-request expiry, same-place provider endpoints and past-flight searches. Added regression coverage. Selected-map bounds now refit on endpoint changes and repeated fit clicks.
- Added editable private drafts with version checks, same-vessel overlap/turnaround validation, reasoned sailing cancellation cascading to bookings/taxis, and an operator ferry-arrival action.
- Added repeatable local/testing-only `heyvalla:demo` setup: two marked fictional providers, future relative dates and a README rehearsal. `--reset` replaces only these providers and dependent records, preserving unrelated data.
- Published provider sailings now enter the flight-fit search using canonical island IDs. Provider requests and original HV bookings share `/journeys`, with ferry, airport taxi and passenger-entered flight target. Taxi approval/acceptance, MVR subtotals, incomplete prices and partial-party states are explicit. Flights remain external/unbooked.
- Added legacy ferry cancellation, taxi cancellation/retry, visible polling, reload-persistent submission retry keys, and compatibility for old bookings lacking a complete check-in snapshot.
- Updated README/development instructions. Existing dataset references are preserved; no new public dataset was imported.

Verification: **52 backend tests / 4,489 assertions passed**, frontend lint and TypeScript passed, and the production build passed. Browser rehearsal verified seeded provider search → seat request → owner approval → taxi request → quote → acceptance, producing MVR 450 for two ferry seats plus one taxi and an external/unbooked flight. The browser check found and prompted regression coverage for an older incomplete flight snapshot. These checks do not establish production readiness.

Still open: delay/reschedule/recovery and passenger acknowledgement, full multi-airport/multi-mode routing, real service calendars/transfer verification, public RTL ferry planner integration, cargo, private charter, GPS, last-call delivery, passenger recovery/team roles, production proxy/rate-limit hardening, pagination, MySQL concurrency tests and automated browser CI. Vessel conflict checks do not verify geographic repositioning or real navigability. The repeatable scenario is a fictional test story, not measured real-world impact.

See [README](../README.md#repeatable-local-demonstration) for the demonstration and [development notes](development.md#unified-itineraries-and-audit-fixes--24-october-2026) for implementation boundaries.

## Original audit baseline


Audited 24 October 2026 against the local working tree and the requests in this chat. Last pushed commit: `f84bc3d`. Provider publishing and seat-request work is local and uncommitted; it is included in this audit. No push performed.

## Verdict

**Not all requested features are implemented.** Dhathuru App has working, persistent demo workflows for flight-aware ferry selection, ferry seats, an airport taxi add-on, provider publishing and provider seat approval. It also has a national location directory, an interactive map, bus references and a Greater Malé fare estimator. It does not yet deliver one complete passenger/cargo journey across those services.

The strongest next improvement is a coherent Thaa airport-connection journey with an operator disruption and a passenger recovery decision. More disconnected pages would add less value to that story.

## Evidence and limits of this audit

- Read application routes, controllers, services, database migrations, passenger/operator components, source metadata, tests and planning documents.
- Re-ran the repository backend suite: **39 tests, 4,345 assertions, all passing**. Many assertions validate directory records; this is not a measure of exhaustive behavioural coverage.
- Frontend ESLint and TypeScript checks passed. The production build passed during the immediately preceding feature implementation; it was not rebuilt for this read-only audit.
- Fresh desktop browser checks: Thaa island search, Vilufushi flight-fit results, Malé–Velana MVR fare and Laamu airport bus filtering. Inspected catalogue/availability through code and local data. Earlier browser checks demonstrated provider request → approval → cancellation, and the suite rechecks those transitions now.
- Three additional isolated, in-memory diagnostic tests reproduced the edge cases listed below. They assert the current problematic behaviour; their passing does **not** mean those problems were fixed. Diagnostics are in the task work directory, outside the application repository.
- This is an application/feature audit, not an independent penetration test, national-data completeness certification, load test or production readiness sign-off. Mobile devices, assistive technology, real operator workflows, real payment systems and MySQL concurrency were not independently validated here.
- Runtime application code was not changed by this audit. Documentation records the findings; one incorrect source-register stop count was corrected.

## Requested feature coverage

“Working demo” means the bounded simulated flow exists. It does not mean a real service can be purchased.

| Requested capability | State | What exists / what remains |
| --- | --- | --- |
| Next.js + Laravel repository, docs and presentation folder | Implemented | Both apps, migrations, plans and source register exist. `presentation/` contains only `.gitkeep`; no presentation deck is built. |
| All inhabited islands, resort islands and airports | Snapshot implemented | 189 residential + 342 tourism/resort island records and 20 land airports. This is source-directory coverage, not proof of every currently operating island/resort/airport. Seaplane platforms are excluded. |
| Island/atoll search | Working demo | Name/atoll matching, accent/apostrophe normalization, duplicate-name distinction and selection. Fresh browser search for Thaa returned 23 residential/tourism entries. |
| GIS / interactive map | Partial | Location layers, clickable origin/airport selection and three illustrative ferry lines. No real marine routing, road routing, bus geometries, provider-drawn routes or live tracking. |
| Ferry-to-flight suitability | Working narrow demo | Vilufushi, Veymandoo and Guraidhoo in Thaa → Thimarafushi. Eight fictional schedule templates, including a cancellation and an overnight journey. |
| Ferry seat booking | Working demo | HV-series direct demo confirmation with 12 seats per dated service, guest history and duplicate/capacity guards. No price, cancellation or fulfilment flow for these older bookings. |
| RTL ferry schedules | Retrieved, not integrated | 27 route cards / 238 time-island entries in `rtl-schedules.json`. No passenger RTL ferry timetable screen or planner integration. |
| RTL Greater Malé and atoll buses | Reference feature implemented | 28 routes: 15 Greater Malé + 13 in seven atoll areas. Search, area/airport filters, stops, published fares and captured origin departures. No calendar-aware routing, live bus feed or booking. |
| Thimarafushi taxi add-on | Working demo | Request → operator quote/decline → passenger acceptance; 30-minute quote expiry and airport timing validation. One car, maximum four people/four bags. |
| Greater Malé taxi fare estimator | Working reference feature | Avas six-zone MVR matrix. Same-zone selection is blocked in UI/API. It does not book a taxi or predict duration. |
| Taxi operator dashboard | Working limited demo | `/operator` uses a shared local demo credential; it is not connected to individual provider accounts. |
| Individual providers and vessel controls | Partial | Owner accounts, hashed passwords/sessions, private profile, declared coverage, vessels, request-to-book/off settings. No team roles, reviewer verification, recovery or email verification. |
| Provider schedules | Working limited demo | Dated drafts, preview, publish/withdraw, optional per-seat MVR price. No draft-content edit, recurrence/calendar, CSV import or schedule-change workflow. |
| Provider seat requests and approval | Working demo | Explicit terms/price acceptance, request → confirm/decline, passenger cancellation before departure, immutable journey/price snapshot, capacity guard and private timeline. |
| Optional ticket bookings for launch owners | Partial | Request-to-book can be enabled/disabled. Existing requests survive opt-out. Provider instant booking is not available. |
| Full private-vessel hire | Not implemented | Publishing a scheduled per-seat sailing is not whole-vessel chartering. Request/quote, whole-vessel price, requested arrival and actual vessel assignment are missing. |
| Cargo availability and booking | Not implemented | A saved “interested in cargo enquiries” checkbox exists. No cargo capacity, customer enquiry, quote, booking, cut-off or custody tracking. |
| Taxi → ferry → flight → taxi → exact destination | Not implemented | No parent journey/leg model, itinerary builder, exact-location pickup/drop-off or cross-service booking state. Flight time/check-in allowance are manual. |
| Route aggregation / visualisation / price comparison | Partial | Separate catalogues and an illustrative map. No unified graph, all-leg price total or complete-route alternatives. |
| Sudden changes, delays and cancellations | Not implemented as provider workflow | One fixed cancelled ferry fixture exists. Operators cannot publish disruption events or recalculate downstream connections. |
| Last-call / boarding notices and notifications | Not implemented | No notification outbox, delivery tracking, scheduled last-call, in-app alerts or push/email sending. |
| Provider location sharing | Not implemented | Always off. No GPS capture, consent sessions, public/passenger scopes or stale-location handling. |
| Verified trust and accountability | Partial | Unverified labels, ownership checks and booking transition timestamps. No verification process, named dispatcher audit, dispute handling, acknowledged changes or proof of service. |
| Transparent prices | Partial | Provider per-seat totals, taxi quotes and Avas references are in MVR. No all-leg total, itemised surcharges, cargo/charter quote or fare on original HV bookings. |
| App and transport colour scheme | Implemented | Teal/sand/white/ocean/coral palette; light-blue flight, dark-blue sea, orange land, black taxi, green bus with text labels. |
| Public-data references | Implemented with limitations | Register and UI attribution exist. Organizer-source exemption is recorded. Source eligibility, licensing and freshness still require source-specific judgment. |

## How the existing flows work

### 1. Airport ferry planning and booking

The user chooses an island, airport, flight date/time and check-in allowance. Laravel calculates:

- Check-in target = flight departure − selected check-in allowance.
- Estimated airport arrival = fictional ferry harbour arrival + 20-minute transfer.
- Margin = check-in target − estimated airport arrival.
- Negative margin: too late. 0–29 minutes: tight. At least 30 minutes: meets target. Cancelled services override these labels.

For Vilufushi, a 14:00 flight and 60-minute check-in allowance produce a 13:00 target. HV101 reaches the airport at 09:20 (220 minutes before target); HV102 at 12:40 (20 minutes, tight); HV103 at 13:20 (20 minutes late); HV104 is a fixed cancellation fixture. Only future, suitable, non-full services can be booked. The algorithm also includes previous-evening departures that arrive on the flight date. It does not search arrivals one or more days before the flight.

The booking creates a dated capacity record and a browser-owned reservation. A transaction plus conditional seat update prevents normal over-allocation; the same submission identifier returns the existing booking. It sends no ticket/email and charges nothing. The original flow has no cancellation, price or operational status transitions.

### 2. Airport taxi add-on

The passenger adds a taxi to an HV ferry booking. Earliest pickup is harbour arrival + five minutes; drive time is 15 minutes. The operator supplies a pickup and MVR quote, or declines. The backend checks that the proposed journey preserves the 30-minute airport margin. A quote expires after 30 minutes and acceptance checks its version and expiry.

It is restricted to one request per ferry booking. A declined request cannot currently restart; a confirmed taxi cannot be cancelled or reassigned. Parties over four are not handled as multiple cars. The Avas estimator does not supply these Thimarafushi prices or durations.

### 3. Provider publishing and seat requests

An individual owner signs in to an eight-hour session, adds a vessel, creates a future dated sailing, reviews it and publishes it. The sailing snapshots the vessel capacity. Public records show unverified/demo status and omit private account credentials/contact fields.

With request-to-book enabled and a known fare, a passenger accepts the displayed journey/total and submits a request. Requests do not reserve seats. Operator confirmation atomically increments the dated sailing's confirmed seats; passenger cancellation releases them. Duplicate request/action retries and stale versions are checked. Declines require a reason. The request preserves agreed fare, dates, names and terms instead of reading changing profile values later.

Existing requests survive turning new bookings off. Withdrawal to draft is blocked while requested/confirmed bookings exist. This protection is useful, but a real cancellation/rescheduling path is still needed. The timeline currently contains only requested/confirmed/declined/cancelled transitions; it is not a delivered notification or customer acknowledgement.

These sailings never enter the flight-fit search and cannot receive the existing taxi add-on. Their origins/destinations are free text, rather than linked harbour IDs. This is the main integration barrier.

### 4. Data and geographic reference screens

The map uses directory coordinates and three dashed illustrative connections. A selected marker updates the form. The original fixture planner uses three origins; a national directory does not imply national schedule coverage.

The bus catalogue contains **602 ordered stop occurrences** (184 Greater Malé + 418 atoll) and 476 displayed origin departure times. These are occurrences in route lists, not 602 distinct physical stops. Seven routes have no captured origin departures, and four have no published fare. None has a verified operating-day/calendar definition in the import. It is honest reference material, not a timetable guaranteed for a selected date.

The Avas estimator returns the supplied matrix value for two different zones. Malé → Velana displays 70 MVR. It is an historical/reference source value with unknown validity dates, not a live quote. RTL ferry data is currently a file/document resource only.

## Findings to address

### High priority before presenting the complete product

1. **The workflow is fragmented.** `/` searches only `demo_ferries`; `/sailings` reads provider sailings; `/buses` is reference-only; `/greater-male-taxi` is an estimator. The taxi add-on only accepts legacy HV bookings. Add canonical harbour/location IDs, a shared service adapter and one itinerary/booking view before claiming end-to-end travel planning. Evidence: `DemoFerrySearch.php`, `FerrySearchController.php`, `DemoTaxiController.php:31` and `ProviderPublishingController.php:41`.

2. **No operational disruption path.** A provider with confirmed passengers cannot cancel/delay a sailing through the application. Blocking withdrawal protects history but leaves no recovery workflow. Add explicit sailing status events, reasons, affected-booking notices, downstream margin recalculation and passenger decisions. Keep original accepted terms intact. Evidence: `ProviderPublishingController.php:59` and `ProviderBookingController.php:74`.

3. **Pending requests get stuck after departure. Reproduced.** Create a request, allow the sailing departure to pass, then try decline, passenger cancellation or withdrawal. All three return conflicts; the request remains `requested`. Introduce expiry, completion/no-show and administrative resolution transitions, preserving the timeline. Evidence: `ProviderBookingController.php:109` and the active-request withdrawal guard. Diagnostic reproduced in an isolated database.

4. **No repeatable populated provider demo.** The audited local database has zero provider accounts/vessels/sailings/seat requests because temporary browser fixtures were cleaned up. A fresh clone similarly has no provider story ready to demonstrate. Add a dedicated, local-only, idempotent demo seeder with relative dates, two distinct providers and prepared request/approval/disruption scenarios. Keep test data visibly fictional and separate from operational records.

5. **Real-data contribution to the core claim is weak.** The main missed-flight decision uses fictional ferry times and fixed transfer allowances. RTL calendars are missing; the useful Avas integration sits in a separate Greater Malé screen. Make the evidence/assumption boundary visible and use verified Thaa timetables or operator inputs before making factual claims about real missed connections.

### Medium priority correctness and usability

6. **Same physical origin/destination can pass provider validation. Reproduced.** `Vilufushi` → `vilufushi` is accepted as a sailing because only literal string inequality is checked. Replace free-text endpoints with canonical location IDs and reject equal IDs; retain separate harbour instructions. Evidence: `ProviderPublishingController.php:41`.

7. **Past searches still show “meets arrival target”. Reproduced.** The old date is accepted and a ferry is classified recommended, although `bookable=false`. The page's suitable-connection count includes it. Restrict normal planning to future instants or mark the entire result historical and count only usable departures. Evidence: `FerrySearchRequest.php`, `DemoFerrySearch.php`, `frontend/src/app/page.tsx`.

8. **Selected-journey map view may stay at the old location. Code-reviewed.** After entering selection view, changing either endpoint preserves the old viewport; clicking Selected journey again sets the same state and cannot force recentering. Preserve the viewport for layer changes but refit on endpoint changes or an explicit fit action. Evidence: `TransportMap.tsx:78`.

9. **Updates require manual refresh.** Passenger/operator lists fetch on initial load and explicit actions; no background polling or alert delivery is implemented. Add a modest authenticated polling interval with visible last-refresh status for the demo, then an outbox and optional push/email later. Do not label an event “read” merely because it was fetched.

10. **Booking lifecycle differs between screens.** Provider seats support passenger cancellation; HV ferry seats and confirmed taxi requests do not. A declined taxi request cannot be restarted. Add consistent cancellation/change handling and a unified “My journeys” screen so passengers do not need to understand which database flow they used.

11. **Guest access has no recovery.** A browser cookie controls passenger history; clearing it or using another device loses access. The cookie lifetime is not a database retention/deletion policy. Add a passenger account or secure recovery flow before real use, plus explicit retention and contact handling.

12. **Capacity is not physical fleet availability.** Seat allocation is protected per sailing, but the same vessel can be scheduled on overlapping trips. Capacity is copied at draft creation and future vessel edits do not update older sailings. Add vessel conflict/turnaround checks and visible dated-capacity management before claiming operator readiness.

### Readiness and maintenance

- Individual owner accounts coexist with the shared taxi demo credential; neither team membership nor dispatcher/reviewer roles exist. Account recovery, email verification and an evidence-based verification workflow remain missing.
- Rate limits currently depend largely on backend-observed IP, while Next proxies requests from the same host. The legacy login counter is keyed by Host and stored in process memory. Validate per-account/client limit behaviour behind the actual proxy before deployment; avoid trusting arbitrary forwarded headers.
- Provider catalogue is capped at 200 rows without pagination; provider/guest request histories are unbounded. Add pagination, relevant indexes, filtering and bounded histories as data grows.
- No automated browser suite or CI workflow was found. Existing capacity tests exercise sequential contention/guards, not simultaneous MySQL transactions. Add browser regression tests and target-database concurrent booking tests.
- Provider timestamps/transition actors are useful, but JSON event arrays are not a tamper-evident audit log and do not name dispatchers. Introduce structured events as roles and notifications expand.
- A booking request UUID lives in client memory. Retry after a reload can become a fresh submission; move ambiguous-outcome recovery into a durable pending-request mechanism for deployment.
- README still says authentication/operator dashboard are planned, despite subsequent implementation. Planning documents contain older sections followed by superseding notes. Consolidate current status into a single feature checklist before handing the repo to teammates.
- Public-data register previously said 437 atoll stop entries. Actual stored count is 418; corrected during this audit. No runtime dataset values were changed.
- Background tiles require external connectivity. Add a rehearsed degraded-mode demo; don't assume offline map tiles are already available or may be bulk downloaded under the current provider arrangement.

## Marking criteria and what would strengthen the entry

Weights below are readable from the supplied screenshot and sum to 100%. Each criterion is scored 1–5; weighted contribution = weight × score ÷ 5. Technical execution, impact and scalability together account for 50%. No judge score is predicted here.

The screenshot's right column is cropped. Its full wording on eligible data and other conditions cannot be confirmed. The user's organizer-source citation exemption does not itself establish competition eligibility for every external source. Obtain the complete data rules before deciding whether RTL/OneMap/CAA material qualifies; retaining references and clearly labelling synthetic data remains useful regardless.

| Criterion | Weight | Current evidence | Best next evidence/feature |
| --- | --- | --- | --- |
| Relevance to theme | 10% | Specific Maldives island–airport access problem, Thaa/Thimarafushi pilot | One documented passenger/operator problem story and a focused Thaa scenario. |
| Data utilization | 15% | Avas matrix, directory/map, RTL references and source register | A route-level data-quality panel and reproducible import validation; verified timetable mapping into a meaningful decision. |
| Innovation | 10% | Deterministic connection margins are a useful start; most current screens are standard CRUD/catalogues | Explainable disruption recovery: which connection becomes infeasible, why, what alternative is still viable and what needs operator approval. |
| Technical execution | 20% | Persistent demo flows, ownership checks, capacity/retry guards and 39 passing tests | One live end-to-end demo; close lifecycle bugs; seeded scenarios; automated UI tests and concurrency evidence. |
| Impact | 15% | Plausible passenger/provider benefit, not yet measured | Measure time to plan, steps/apps needed, understanding of booking state and communication acknowledgment in small usability trials. Report observed samples, not assumed savings. |
| Scalability and implementation readiness | 15% | Next/Laravel split, migrations, source records, per-provider ownership | Canonical services/locations, operator import/review, roles, reliable updates and an explicit pilot plan with support/ownership. |
| Clarity of presentation | 5% | Consistent colour language and honest demo labels | One journey timeline, a simple architecture/data diagram, short scenario narrative and a limitations slide. |
| Teamwork | 10% | Cannot be established by code or this chat alone | Contribution log, review/pairing evidence, shared Q&A preparation and each teammate explaining their part of the same story. |

## Recommended feature order

### First: make the demonstration reliable

Fix the stuck-request and same-place problems, distinguish past searches, add a populated demo reset/seed command, and reconcile docs. Add regression checks for the exact failure cases. This strengthens the highest-weight technical criterion and makes rehearsals repeatable.

### Next: one flight-aware itinerary

Use a parent journey with ordered legs, canonical island/harbour/airport IDs and a service adapter for fictional/provider sailings. Reuse the flight-fit calculation for published provider sailings. Attach the taxi request to either service source. Show each leg as planned/requested/confirmed, its timing, source freshness and known/unknown price. Keep bus and flight references explicitly unbooked until their integrations exist. Flight input remains manual unless a suitable verified future feed is obtained.

Acceptance: a provider-published Thaa sailing appears in the same connection search, can be requested, can receive an airport taxi, and is shown as only partially arranged until required legs are confirmed. Unknown prices are shown, not treated as zero.

### Then: disruption and recovery — the strongest differentiating demo

Operator publishes a delay/cancellation with a reason. The passenger sees the prior/current schedule, recalculated check-in margin, affected taxi and a clear action. Passenger acknowledges or requests a change; operator confirms any replacement. Add manual last-call/boarding messages first, then scheduled notices with cancellation/rescheduling rules.

A hypothetical rehearsal: a connection initially has exactly the 30-minute safety margin; a 20-minute boat delay reduces it to 10 minutes. The app explains the change and proposes a feasible alternative request without silently confirming it. This is a scenario calculation, not a learned real-world probability of missing a flight.

### Add data-quality and explainability to the journey

For each leg show “official reference / provider-entered / historical / simulated”, retrieval/verification time, calendar validity, capacity source and transfer assumptions. Display the timing formula and why an option is recommended or rejected. A small completeness summary helps demonstrate the transformation from source records to decisions.

Where definitions and coverage can be validated, an optional Greater Malé extension could estimate historical taxi duration ranges from eligible completed Avas trips, grouped by reviewed zones/time periods with sample counts and uncertainty. Do not transfer those estimates to Thimarafushi. Do not infer waiting time from a trip-duration field without its definition.

### Extend commercial coverage after that story works

- **Private charter:** desired arrival time, party/bags, whole-vessel quote, expiry, terms, vessel availability confirmation. Clearly distinguish it from scheduled per-seat ferry booking.
- **Cargo:** cargo-enabled sailing with weight/volume/cut-off; passenger-independent enquiry → quote → acceptance → confirmation; handover and collection events. Do not use passenger seats as cargo capacity.
- **Provider map sharing:** harbour pin and illustrative route first; then opt-in trip-scoped location with timestamps and visibility controls. No live label for simulated/stale coordinates.

These remain requested deliverables, even if the judged demo focuses on the airport-connection story first.

## Data-use choices for the presentation

- **Avas Ride:** the fare matrix is genuinely used in a decision screen. Currency is MVR by project-owner confirmation; validity and zone boundaries remain unknown. Trip records may support aggregate research only after checking definitions and authenticity.
- **MTCC organizer workbook:** passenger counts are described as randomly generated. Use for clearly labelled test/synthetic analytics, not evidence of actual demand, real cancellation rates or measured social impact. It does not provide Thaa timetable data.
- **MACL organizer package:** historical anonymous route/carrier codes and actual movement fields do not identify a passenger's future flight or establish delay against scheduled departure. Don't force it into a live flight lookup. Only add historical aggregate analysis if it supports a specific question after cleaning and mapping.
- **RTL:** public reference snapshots help demonstrate aggregation, but missing calendars/validity prevent generating real dated connections. Add a reviewed mapping/import path and seek operator confirmation for the pilot.
- **Directory/OSM:** useful geographic context and selection; three straight demo lines are not evidence of navigable marine routes or real vessel movement.

Using every supplied dataset is not a goal. Showing why a dataset is appropriate, how it was cleaned, what it contributes and what it cannot answer is more defensible.

## Presentation and code-Q&A preparation

Suggested demo narrative: passenger enters flight → app explains a viable connection → passenger requests seats and taxi → operator confirms → operator introduces a delay → app explains the consequence and offers a recovery request. The disruption steps are future work and must not be presented as currently implemented.

Prepare short explanations for:

1. Why Laravel owns validation, money, permissions and booking transactions while Next handles views and the same-origin API proxy.
2. The check-in-margin equation, UTC storage/Maldives display, overnight handling and missing service-calendar limitations.
3. Why a request is not a reservation, how the conditional seat update works, and what has/hasn't been tested concurrently.
4. What an idempotency key and status version prevent, including their limitations after client state is lost.
5. Why fares use integer minor units and accepted journeys/prices are snapshotted.
6. How guest ownership/provider ownership are checked and why raw private account fields are excluded from the public catalogue.
7. What is real reference data, historical, provider-entered or simulated.
8. Which requested features are unfinished and the next concrete acceptance test for each.

For teamwork, assign ownership of data/validation, passenger/map experience, backend/provider workflow, and evaluation/presentation as appropriate to the actual team. Review each other's work; do not invent contribution claims or assign speaking roles without agreement. A small honest pilot with measured task results is stronger impact evidence than an unvalidated claim that the application saves a particular amount of money or prevents a certain percentage of missed flights.
