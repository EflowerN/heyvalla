# Development notes

The foundation uses Next.js 16.4.3, React 19.3.0, and Laravel 13 (exact versions are recorded in package-lock.json and composer.lock). PHP 8.4 and Node 24 were used during setup.

Next.js uses Webpack for local development and production builds, with Tailwind's PostCSS integration. The default Turbopack build could not start its CSS worker process in the setup environment. No remote fonts are needed to build the app.

The health endpoint is intentionally public and returns only application metadata. The initial Laravel `/api/health` route lives in `routes/web.php`; future product API routes should be registered separately with versioning, authentication, and authorization as appropriate. Next.js calls the endpoint server-side through `/api/backend-health`; no CORS configuration is needed for this check. The backend URL is a server-only environment variable.

Individual provider owner accounts and the shared demo taxi dashboard are implemented. Laravel's default welcome route and migrations remain available. Laravel's Vite files are starter assets; the product UI is in Next.js, so backend npm installation is not needed for this setup.

Local `.env` files, application keys, installed dependencies, build outputs, and the SQLite database are ignored by Git. Never commit these files. Use the environment examples and lockfiles to reproduce the setup.

## Location directory

`backend/resources/data/locations.json` is a committed source snapshot retrieved on 24 October 2026. It contains all 189 records classified as `Residential Island` by the public OneMap Island layer (`island_20240509`), and 20 land airports from the Maldives CAA list updated July 2025. The catalogue does not include seaplane platforms. Source metadata and links are included in the data file and UI. It is a directory snapshot, not proof of current airport operations or transport availability.

Island data is attributed to the Geomatics Department, Ministry of Infrastructure, Housing and Urban Development, under its Data Usage License: https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf . Official API documentation: https://readme.onemap.mv/ . Residential records were queried with `where=category='Residential Island'`, `outFields=FCODE,atoll,islandName,category`, `orderByFields=FCODE`, `returnGeometry=false`, `f=json`; the complete response contained 189 records and no transfer-limit flag. Stable source FCODE identifiers distinguish islands sharing a name. Official spellings are retained, including `Veymandoo` for the existing Thaa demo origin; `MLE` is OneMap's Malé City grouping.

Airport names and IATA/ICAO identifiers come from https://caa.gov.mv/attachments/RkSqFC1muGxI4GakQ992lPnwqT5gjTxwiat2m7af.pdf . Identifiers follow that snapshot (for example Maavarulu is VRQM there, while the CAA certification page shows VROM); reconcile against current aeronautical publications before any operational integration. No certification or active-service claim is made.

Refresh the snapshot by retrieving the residential query, confirming it is not truncated, checking duplicate IDs and category changes, and reviewing CAA's current list for additions/renames. Update attribution and retrieval metadata alongside changes. Tests check directory counts and unique identifiers; revise reviewed counts when the official source changes.

`GET /api/v1/islands` returns both island and airport options. Ferry search now requires `airport` in addition to the origin and flight inputs. Demo schedules cover only Thaa Vilufushi (LD0205), Veymandoo (LD0694), and Guraidhoo (LD1163) to Thimarafushi (VRNT). Other valid pairs return an empty result with `schedule_coverage=false` and no transfer allowance. They do not reuse Thimarafushi's travel times or fabricate ferry routes.

## Interactive map

The embedded Leaflet map displays all directory islands and airports, plus three fictional origin-to-Thimarafushi connections. Coordinates use the official OneMap longitude/latitude fields converted from DMS to decimal degrees, and airport reference coordinates from the CAA July 2025 list. Island markers represent reference locations, not verified harbour boarding points. Airport reference points are not terminal entrances. The route lines are straight illustrations between reference points, not navigation tracks or verified RTL routes.

Layer toggles control islands, airports, and demo lines. Country and selected-journey controls fit the map bounds; the form's origin and airport drive the selected-journey view. Existing text search/results remain available outside the map. Popups use text nodes for source names. Map data comes from the Laravel directory endpoint; Leaflet loads only in the browser.

OpenStreetMap background tiles load directly in the browser with visible attribution and normal browser caching. No offline tile prefetch is implemented. `NEXT_PUBLIC_MAP_TILE_URL` can select a compatible tile endpoint at build time; the current attribution is for OpenStreetMap, so update it if changing provider. Review tile-provider usage terms and capacity before public deployment. The map reports tile failures while retaining reference markers.

## Resort islands and map selection

The directory also includes all 342 records classified `Tourism Island` in the same OneMap layer, retrieved with the documented residential query parameters but `where=category='Tourism Island'`. The response was not truncated. They are stored with `category=resort`; the 189 residential records use `category=residential`. Tourism designation does not establish that a resort is currently operating, nor provide its commercial brand name. Geographic names and coordinates are retained, with source attribution unchanged.

Coral map dots and a separate Resorts layer distinguish these entries. All 531 island records are valid departure options. A click on an island sets the form origin and clears the island text filter; an airport click sets the destination. Either change clears previous search results and errors. Dates and check-in settings stay intact. The map retains its current view when selecting a marker or toggling a layer. Resort destinations do not receive invented transport schedules.

## Demo seat bookings

Run `php artisan migrate` after updating. Two local tables hold per-dated-sailing capacity and bookings. Demo capacity defaults to 12; passengers may reserve 1–6 seats per submission. Only future sailings classified as meeting the recommended arrival target are eligible. Laravel recomputes eligibility, validates passenger inputs, and performs a conditional atomic seat increment inside the same transaction as the booking insert. Capacity is shared across browsers and separated by sailing date. Cancelled, tight, late, full, and departed sailings cannot be booked in this demo.

Next.js `/api/demo-bookings` proxies GET/POST to Laravel `/api/v1/demo-bookings`, using a random HTTP-only, SameSite guest cookie (30 days). The backend stores only the hash of the guest capability and returns that guest's latest 50 bookings. These are guest capabilities, not authenticated accounts. Clearing cookies loses access; a booking reference alone cannot retrieve passenger information. The POST proxy requires a same-origin Origin header, and Laravel API routes are stateless, validated, and throttled. No public guest token or internal database IDs are returned in JSON.

Every submission carries a UUID request identifier. Unchanged retries reuse it and return the same confirmation without decrementing capacity again; reuse for changed details returns a conflict. Database uniqueness handles duplicate requests; failed transactions roll back seat updates. Tests cover persistence, capacity exhaustion, duplicate retries, guest isolation, validation, and sailing eligibility. Real multi-worker MySQL concurrency/load validation remains required before deployment.

Booking details are demo data: name, sample email, seats, journey snapshot, and reference. No email or payment integration is present. The form asks for sample details, confirms the demo status, and refreshes search availability after success. My demo bookings persists across page reloads for the same guest cookie. Existing confirmations survive schedule changes as snapshots; operator cancellation and passenger rebooking are future work.

## Taxi add-on and demo operator dashboard

The expansion plan is saved in `docs/transport-expansion-plan.md`. Run migrations to add `demo_taxi_requests`. Each taxi links to one guest-owned demo ferry booking; repeat submissions with identical party details return the existing request. Conflicting party details are rejected. Coverage is limited to Thimarafushi harbour → airport. Demo vehicle capacity is four passengers/four bags; taxi passengers cannot exceed ferry seats.

Status flow: requested → quoted → confirmed, or requested/quoted → declined. Operator proposals expire after 30 minutes and require passenger acceptance; changed/expired quotes and stale operator submissions cannot silently overwrite state. Laravel checks operator tokens, guest ownership, party limits, proposed pickup, and a 30-minute check-in safety margin where recorded. Pickup is at least five minutes after harbour arrival and the demo drive is 15 minutes. New ferry snapshots now preserve harbour arrival and check-in target. Older snapshots use the previous demo transfer allowance to reconstruct harbour arrival and explicitly flag the missing check-in target.

Passenger: open My demo bookings, request airport taxi, refresh bookings/quotes, and accept a valid operator quote. Operator: visit `/operator`, sign in, refresh the queue, quote a pickup/price or decline. The list shows the latest 100 requests. No payments, emails, actual drivers or physical vehicle scheduling are involved. Operator assignment, cancellations/re-request, fleet availability, audit history, and actual operator accounts are future work.

Local operator setup: configure a matching randomly generated `DEMO_OPERATOR_TOKEN` of at least 32 characters in backend `.env` and frontend `.env.local`; configure a separate `DEMO_OPERATOR_PASSWORD` in frontend `.env.local`. These server-only variables are never returned in browser JSON. This workspace is configured with the local demo password `heyvalla-demo`. Do not use this demonstration password for a deployed service. Restart Next.js when changing env values.

Next.js uses an HTTP-only signed eight-hour operator session, validates request origins, and forwards the server-only token to Laravel. Login attempts are limited in-process for this local demo; deployment needs durable rate limiting, real operator accounts and scoped permissions. The backend denies operator calls when the token is missing or invalid. Guest credentials cannot access the operator API. Signing out removes the operator session cookie.

Tests cover authorization, ownership, limits, idempotent requests, quoting/acceptance, stale versions, expired quotes, and timing boundaries. Browser verification completed the passenger request → operator quote → passenger acceptance flow using sample data.

## Greater Malé taxi fare estimator

The separate `/greater-male-taxi` page reads `/api/v1/greater-male-fares` through a Next.js proxy. The organizer-provided Avas Ride matrix is stored in `backend/resources/data/greater-male-fares.json`, with six zones and all 36 directional entries. Source decimal values are converted to integer minor units. The user confirmed currency as MVR on 24 October 2026; this confirmation is recorded separately from source metadata. Validity dates remain unknown.

This is a reference estimator only: no booking, waiting-time/duration prediction, surcharges, seat availability or operator acceptance is inferred. Same-zone matrix values are preserved, not replaced with zero. The estimator does not read or modify Thimarafushi taxi configuration, quotes or booking tables. Its zone allow-list rejects Thimarafushi and other unsupported locations. Changing a zone clears the old estimate; swapping zones requires a new calculation.

## Updated estimator validation and roadmap

Pickup and drop-off zones must now differ, enforced by both disabled UI choices and Laravel validation. The original source matrix keeps its same-zone entries for provenance, but the current zone-only product cannot establish distinct addresses within a zone and therefore does not quote such trips. A future exact-address estimator can revisit within-zone journeys using distinct verified pickup/drop-off locations. This supersedes the earlier note about offering same-zone estimates. See `docs/integrated-mobility-implementation-plan.md` for the passenger/cargo and provider-publishing roadmap.

## Transport theme and RTL buses

App/transport palettes are recorded in `docs/design-system.md`. `/buses` displays the verified Greater Malé RTL route snapshot through `/api/v1/rtl-buses`, with route/stop search, airport-only filter, fares, ordered stops and expandable origin departure lists. Route data is sourced separately from the synthetic organizer MTCC demand workbook. No bus booking or bus-to-flight feasibility calculation is implied by these reference screens. Fare-date/service-calendar gaps are exposed in the interface. Atoll routes were added subsequently as described below; verified route geometries remain unavailable.

### Atoll buses

`/buses` now includes 13 atoll routes alongside the 15 Greater Malé routes. Select an area, search route/stop/area text, or filter airport connections. All seven areas listed in RTL's atoll selector were checked. Cards preserve ordered stops and the available origin departure snapshot. Unknown fares remain null and render as unavailable. No operating days or future travel-date guarantees are inferred. See `docs/data-sources.md` for coverage and limitations.

### Provider publishing workspace

Run `cd backend && php artisan migrate` after pulling this change. No new environment values or dependencies are required. Open `/providers` and create an individual demo owner account (password at least 12 characters); this is separate from the existing `/operator` taxi demo. Account passwords and session tokens are hashed in Laravel; Next stores the bearer token in an HttpOnly, SameSite=Strict cookie for eight hours. Logout revokes the current session server-side.

Add vessels, create future dated sailing drafts in Maldives time, review, then publish to `/sailings`. Providers can only read/change their own profile, vessels and drafts. Published records are explicitly unverified demo information. Passenger catalogue responses exclude account email and credentials. Request-to-book is implemented with operator seat approval; cargo remains a saved future preference and GPS is off. Draft creation is not idempotent: after a connection failure, refresh before retrying to check whether the draft was saved.

`php artisan test --compact --filter=ProviderPublishingTest` covers isolation, hashed/revoked/expired sessions, private drafts, public-field boundaries, version conflicts, timing validation and unknown fares. Demo accounts have no email verification, password recovery or team membership yet; do not use real business credentials in this local prototype.

### Provider seat requests and approval

This supersedes the earlier publishing-only booking limitation. Run `php artisan migrate` in `backend` to add per-sailing capacity and seat requests. A vessel set to request-to-book enables requests on future published sailings with a known fare. Passengers use `/sailings`; providers confirm or decline from the bottom of `/providers`.

Requests snapshot the accepted MVR price, route, dates, provider/vessel names and demo terms. They do not hold seats. Operator confirmation allocates seats through a conditional database update in a transaction; cancellation returns confirmed seats. A sailing's capacity is copied from the vessel when its draft is created. Later vessel-capacity changes apply to new sailings. Pending requests can exceed remaining capacity, but confirmations cannot. Turning bookings off preserves existing requests and allows their approval. Withdrawal is blocked while pending/confirmed requests exist; it must not silently erase commitments.

Passengers use the existing HttpOnly guest cookie; booking history is private to that browser, not recoverable across devices. Submission UUIDs protect retries, and version checks protect status changes. Confirmation/cancellation retries do not allocate/release capacity twice. Declines require reasons. The timeline records request, confirmation, decline and passenger cancellation, with Maldives-time display. No real ticket, payment, notification delivery or seat assignment is implied. Booking changes are limited to before departure; fulfilment and post-departure handling remain future work.

`ProviderBookingTest` verifies allocation limits, duplicate submissions, cancellation, private histories, organization isolation, immutable accepted snapshots, stale fares/versions and unavailable sailings. Concurrency on MySQL still needs deployment-level verification; local tests use SQLite. Cargo enquiries and live location remain unavailable. Delay/last-call updates and customer acknowledgements are the next timeline extension.

## Unified itineraries and audit fixes — 24 October 2026

`travel_journeys` links exactly one legacy or provider ferry booking to an optional flight plan. `demo_taxi_requests` now supports either parent via nullable unique foreign keys; requests cannot be made until the ferry is confirmed. Legacy bookings are backfilled into itineraries by the migration. Older snapshots without complete check-in/harbour fields remain readable and can attach a fresh future flight target. No deadline is fabricated from incomplete history.

`GET/POST /api/v1/journeys` lists the guest's latest 100 itineraries and attaches a validated future flight target. The Next proxy uses the same HttpOnly guest cookie as existing bookings. `/journeys` shows ordered ferry/taxi/flight legs, approval status, MVR prices and unknown prices, the check-in margin and cancellation. A flight is always external/unbooked. A taxi for fewer people than the ferry party cannot make the whole connection confirmed or its ground price complete.

Published provider sailings with canonical origin island and Thimarafushi destination island IDs join `/api/v1/ferry-search`. Only future departures arriving on the flight date are searched, with the same 20-minute demo transfer and 30-minute safety margin. Provider booking mode, fare, remaining seats and version are revalidated at submission. The legacy booking endpoint explicitly refuses provider services so it cannot bypass provider approval. The selected flight target is snapshotted with the provider request; catalogue requests may attach one later. Airports other than Thimarafushi do not inherit these transfer assumptions.

Provider drafts can be edited with version checks and canonical island selectors. Drafts with booking history cannot be rewritten. Publication checks for overlapping trips on the same vessel, including a 15-minute demo turnaround allowance. This does not validate repositioning, crew, seaworthiness or real travel time. Sailing cancellation requires a reason and atomically updates active requests and linked taxis. Pending requests expire after departure with one timeline event; providers may record arrival for confirmed seats after arrival time. Taxi handling remains available for an already-arranged, upcoming pickup after ferry arrival.

Original HV bookings now support cancellation and release their dated seat allocation once. Passengers and the taxi operator can cancel taxis; declined/cancelled taxis may request a fresh quote with a version check, before harbour arrival. New requests remain limited to one taxi, four people/four bags. Quote acceptance remains guarded by expiry and pickup timing. Cancellation has no financial refund meaning in this demo.

Provider/passenger seat lists, itineraries and the taxi dashboard poll every 15 seconds while visible. This is not delivery/read tracking or push notification. Request retry keys are kept in sessionStorage under a SHA-256 payload fingerprint, so a same-tab reload retains an ambiguous submission's identity without storing raw passenger details there. Clearing storage, changing browsers or intentionally changing the payload still requires review of existing bookings.

Selected-journey map bounds refit when endpoints change or the user explicitly requests a fit. Layer toggles preserve the view. In-flight search responses are aborted when a map endpoint changes. Past flight searches are rejected and the usable count includes only bookable services.

Use the [README rehearsal](../README.md#repeatable-local-demonstration) for the demo command and scenario. No external data was imported in this follow-up; existing source-register references remain applicable. SQLite regression tests exercise state/authorization/capacity guards; they do not prove concurrent MySQL execution. Provider GPS lines, calendar-aware RTL integration, delay/reschedule recovery, cargo/charter workflows, multi-car transfers, roles/account recovery, production rate limiting, pagination and automated browser CI remain open.

## Hosted demo deployment

The frontend and the Laravel API run as two Vercel projects from this repo, with Supabase Postgres as the database. Supabase cannot run PHP itself. Vercel functions cannot keep SQLite writes, so the hosted backend uses `DB_CONNECTION=pgsql`. The suite passes against Postgres 17.

Backend (Vercel, root directory `backend`): `backend/vercel.json` routes every request through `api/index.php` on the community `vercel-php@0.8.0` runtime (PHP 8.4). It sets production defaults and writes the framework caches to `/tmp`. Cache and rate limits use the database store, so throttles hold across instances. Set `APP_KEY`, `DEMO_OPERATOR_TOKEN` (at least 32 characters) and the Supabase session pooler details: `DB_HOST`, `DB_PORT=5432`, `DB_DATABASE=postgres`, `DB_USERNAME` (`postgres.<project-ref>`) and `DB_PASSWORD`. Don't use the transaction pooler (port 6543), because PDO's prepared statements fail through it.

Migrations do not run on deploy. Run them from a workstation with the same `DB_*` values: `php artisan migrate --force`. Then run `php artisan heyvalla:demo` to load the fictional providers. Their password, `heyvalla-demo-2026`, is published, so anyone can sign in as them. Use that seed only for the datathon demo. `HEYVALLA_ALLOW_DEMO_SEED=true` permits the seed outside local/testing, and the Docker image (`backend/Dockerfile`, for container hosts with a `/data` volume) runs it on boot.

The serverless backend has no per-minute scheduler. Pending provider requests still expire whenever journeys are read (`ProviderLifecycle::expirePending`).

Frontend (Vercel, root directory `frontend`): set `LARAVEL_API_URL` to the backend's Vercel URL without a trailing slash, the same `DEMO_OPERATOR_TOKEN`, and a new `DEMO_OPERATOR_PASSWORD` (not the local `heyvalla-demo`). Redeploy after changing environment variables. The operator login attempt limit is in-process, so it does not hold across serverless instances.
