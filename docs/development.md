# Development notes

The foundation uses Next.js 16.4.3, React 19.3.0, and Laravel 13 (exact versions are recorded in package-lock.json and composer.lock). PHP 8.4 and Node 24 were used during setup.

Next.js uses Webpack for local development and production builds, with Tailwind's PostCSS integration. The default Turbopack build could not start its CSS worker process in the setup environment. No remote fonts are needed to build the app.

The health endpoint is intentionally public and returns only application metadata. The initial Laravel `/api/health` route lives in `routes/web.php`; future product API routes should be registered separately with versioning, authentication, and authorization as appropriate. Next.js calls the endpoint server-side through `/api/backend-health`; no CORS configuration is needed for this check. The backend URL is a server-only environment variable.

Authentication and the operator dashboard are not scaffolded yet. Laravel's default welcome route and migrations remain available. Laravel's Vite files are starter assets; the product UI is in Next.js, so backend npm installation is not needed for this setup.

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

Purple map dots and a separate Resorts layer distinguish these entries. All 531 island records are valid departure options. A click on an island sets the form origin and clears the island text filter; an airport click sets the destination. Either change clears previous search results and errors. Dates and check-in settings stay intact. The map retains its current view when selecting a marker or toggling a layer. Resort destinations do not receive invented transport schedules.

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

App/transport palettes are recorded in `docs/design-system.md`. `/buses` displays the verified Greater Malé RTL route snapshot through `/api/v1/rtl-buses`, with route/stop search, airport-only filter, fares, ordered stops and expandable origin departure lists. Route data is sourced separately from the synthetic organizer MTCC demand workbook. No bus booking or bus-to-flight feasibility calculation is implied by these reference screens. Fare-date/service-calendar gaps are exposed in the interface. Atoll bus routes and verified map geometries remain outside this first bus catalogue.

### Atoll buses

`/buses` now includes 13 atoll routes alongside the 15 Greater Malé routes. Select an area, search route/stop/area text, or filter airport connections. All seven areas listed in RTL's atoll selector were checked. Cards preserve ordered stops and the available origin departure snapshot. Unknown fares remain null and render as unavailable. No operating days or future travel-date guarantees are inferred. See `docs/data-sources.md` for coverage and limitations.
