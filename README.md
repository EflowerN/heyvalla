# Dhathuru App

**Plan your whole journey across the Maldives.**

Dhathuru App brings ferry, launch, flight and ground transport information into one place. Start with **“Where are you?”** and **“Where are you going?”**, compare connections on a map, and keep the selected services in **My itineraries**. Passengers can plan a journey with a flight or travel entirely by sea.

The project began with a Thaa Atoll pilot: helping passengers reach Thimarafushi Airport in time for check-in. It now demonstrates a broader approach to coordinating island travel and giving boat owners a place to publish services and updates that would otherwise be scattered across apps and manual messages.

> **Working demo, not a live booking service.** Confirmations are simulated. Dhathuru App does not collect payments, issue real tickets, dispatch vehicles or reserve supplier inventory. Public reference data, owner-entered information and fictional demo schedules are identified separately. No transport-provider partnership or live API integration is claimed.

## What you can do

| Feature | Current experience |
| --- | --- |
| Journey planner | Select an origin and destination, view ferry → airport transfer → flight → onward taxi/bus legs, and save flight details, destination and an address note. |
| Flight connection checks | Compare covered Thaa sailings against a Thimarafushi flight target, with explicit transfer and check-in margins. |
| Flightless journeys | Search direct ferries/launches or a connection with one ferry change using **Travel date**, without entering flight details. |
| Interactive map | Explore residential islands, tourism/resort islands and land airports, with natural island, reef and lagoon outlines, route lines and transport icons. |
| In-app demo checkout | Review server-calculated prices and simulate flight, taxi, bus or ferry-only bookings. A two-ferry demo connection saves both legs under one reference. |
| My itineraries | Revisit guest-owned journeys and service receipts, see booking states and updates, edit saved journey details, and cancel supported demo bookings. |
| Boat-owner tools | Manage vessels and dated sailings, enable seat requests, approve passengers, cancel sailings with reasons, and post cargo loading windows, fully-loaded/last-call messages and optional manually reported positions. |
| Greater Malé taxi fares | Estimate trips between distinct supported zones using the Avas Ride fare matrix in MVR, with a separate simulated taxi checkout. |
| RTL bus reference | Browse Greater Malé and atoll routes, stops, fares and departure snapshots, with simulated bus checkout. |
| Flight reference | View a limited checked Maldivian fare/departure snapshot, nearby-date options where recorded, and in-app simulated checkout. |

The directory covers more places than the available schedules. Selecting an island does **not** imply a service exists there. Missing coverage returns an empty result rather than an invented route.

## App pages

| Page | Purpose |
| --- | --- |
| `/` | Consolidated planner, including flightless travel |
| `/journeys` | Saved journeys and demo service reservations |
| `/sailings` | Published boat services, seat requests and provider updates |
| `/providers` | Boat-owner sign-in, vessels, sailings and passenger requests |
| `/greater-male-taxi` | Greater Malé taxi booking and fare estimator |
| `/buses` | RTL bus routes and schedule references |
| `/ferry-planner` | Dedicated ferry-to-airport planner |

## Stack and repository

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS and Leaflet.
- **Backend:** Laravel JSON API for search, connection checks, provider authorization, booking validation and persistence.
- **Database:** SQLite for local development; PostgreSQL configuration for the hosted demo.
- **Time and money:** service times use `Indian/Maldives`; prices are stored as integer minor units with currency and displayed in MVR where applicable.

```text
frontend/       Passenger and boat-owner UI, server-side API proxies
backend/        Laravel services, migrations, tests and data snapshots
scripts/        Geographic data import tools
docs/           Product plans, implementation notes and source references
presentation/   Presentation materials
```

Product plans and source references live in [`docs/`](docs/). [`presentation/`](presentation/) is reserved for presentation materials. Exact dependencies are recorded in the committed lockfiles. The repository name, `heyvalla:*` setup commands, demo credentials and internal session keys retain their existing technical names for compatibility; the product is branded Dhathuru App.

## Local setup

Use **Node.js 24**, npm, **PHP 8.4**, Composer and PHP's SQLite support. These instructions are for a fresh clone; keep existing environment files and application keys when updating an installation.

From the repository root, start Laravel:

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Creates the SQLite file if it does not exist; does not clear an existing file.
touch database/database.sqlite
php artisan migrate --no-interaction
php artisan heyvalla:demo --days=7
php artisan serve --host=127.0.0.1 --port=18765
```

In a second terminal, from the repository root:

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open [Dhathuru App locally](http://localhost:3000). The frontend's server-only `LARAVEL_API_URL` defaults to `http://127.0.0.1:18765`. If Laravel uses another port, update that value in `frontend/.env.local` and restart Next.js.

Health checks:

- [Laravel health](http://127.0.0.1:18765/api/health)
- [Frontend-to-backend connection](http://localhost:3000/api/backend-health): checks the Dhathuru application name, service identifier and Maldives timezone, and rejects a different application even if it returns HTTP 200.

No map API key is required: geographic outlines are bundled with the app. Backend npm installation is unnecessary for the product UI, which runs in Next.js. Environment files, database contents, dependencies and build outputs must remain outside version control. Keep `APP_DEBUG=false` on any shared/hosted demo. API errors retain useful messages and validation fields but strip exception classes, server paths and traces even if debug is accidentally enabled.

When updating an existing checkout, install dependencies from the lockfiles and run `php artisan migrate --no-interaction` before starting the app. Keep the existing `APP_KEY`.

## Repeatable local demonstration

`php artisan heyvalla:demo --days=7` creates missing fixtures for **Lagoon**, **Coral** and **Reef Demo Launches**, beginning tomorrow in Maldives time. Each provider has a 12-seat vessel, published morning/midday sailings and an afternoon draft. Running it again preserves existing records and adds missing sailings. The default is three days; the maximum is 30.

Public, fictional local provider accounts for `/providers`:

| Provider | Email | Password |
| --- | --- | --- |
| Lagoon Demo Launches | `lagoon@heyvalla.example` | `heyvalla-demo-2026` |
| Coral Demo Launches | `coral@heyvalla.example` | `heyvalla-demo-2026` |
| Reef Demo Launches | `reef@heyvalla.example` | `heyvalla-demo-2026` |

These are shared demonstration credentials, not private accounts. Use sample passenger details only. The optional `--reset` flag deletes and recreates these marked providers and their dependent demo records, including linked bookings and itineraries, and invalidates their sessions. Unrelated providers and original HV bookings are retained. Do not reset merely to add future dates.

### Journey with a flight

1. Open **Planner** and choose **Fill Thaa → Hulhumalé demo**. This fills tomorrow's fictional flight details.
2. Search and select a suitable built-in demo ferry. The **Passenger details & booking** form appears inline below the results. Enter sample passenger details and confirm; empty or invalid fields remain visible with inline errors. A provider sailing instead requires its owner's approval.
3. Open **My itineraries** and select **Book remaining journey services · Demo** for the confirmed ferry journey.
4. Choose the available taxi/bus options, review the simulated flight and transfer prices, and confirm with no payment.
5. Refresh to show the saved destination, address note, service states and receipt. Existing ferry/operator charges and additional demo-service totals remain separate.

### Ferry-only connection

1. Select **Ferries & launches** and **Fill Kinbidhoo → Gan demo**.
2. Search using **Travel date**. The example connects Kinbidhoo → Veymandoo, **10:00–10:05**, then Veymandoo → Laamu Gan, **10:30–12:00**, with a 25-minute wait.
3. Review and book both demo legs together, then open the receipt in **My itineraries**.
4. Try **Fill direct launch to Malé** for the fictional Vilufushi → Malé example.

These schedules and prices are fictional fixtures, not RTL services. Sea search also includes eligible published owner sailings. Each provider leg needs a separate request and approval; a multi-provider connection is not automatically confirmed as a through-ticket.

### Direct airport taxi

Choose **Taxi** in the main planner, or open **Taxi fares**. Pick Velana International Airport, Domestic Terminal or Sea Plane as the pickup, then Malé or either Hulhumalé phase as the drop-off. Use **See fare & book**, enter a travel date and passenger count, review and confirm the simulated reservation. No ferry or flight booking is required; the receipt appears in My itineraries. Airport shortcuts prefill the international-terminal route.

### Boat-owner updates

1. Sign into **Boat owners** with a seeded provider account.
2. Approve a passenger request for that provider's published sailing.
3. Open **Cargo, last call & location sharing** and publish a loading window or fully-loaded/last-call message. Optional sample coordinates demonstrate owner-controlled position sharing.
4. Show the update in **Sailings** or the affected passenger's activity timeline. These are in-app updates, not external push notifications or a live GPS feed.

For unattended pending-request expiry, run `php artisan schedule:work` locally. Normal list/action reads also resolve departure-expired requests; `php artisan heyvalla:expire-requests` performs a single expiry run.

## Data and demo boundaries

The [source register](docs/data-sources.md) records provenance, snapshot dates, transformations and limitations. Organizer-provided datasets are identified there; required source attribution is retained in the app.

- **Geography:** OneMap residential/tourism island records and natural outlines, plus a Maldives CAA land-airport snapshot. Tourism classification does not confirm an operating resort, and an airport entry does not establish current flight service.
- **Road transport:** Avas Ride's Greater Malé fare matrix and RTL bus route/schedule snapshots. These are references, not live dispatch, service-calendar or seat-availability guarantees. Greater Malé fares are kept separate from Thimarafushi transfer assumptions.
- **Flights:** a limited checked Maldivian reference snapshot, not a live fare feed. Nearby-date results are limited to recorded departures. Manual-flight demo pricing is explicitly fictional.
- **Sea travel:** built-in fictional schedules and owner-published sailings. Public RTL references do not constitute a nationwide routable or bookable ferry feed.

Each journey leg displays a planning price. Listed fares and quotes take priority; missing prices use labelled demo assumptions. The planning total includes all displayed legs, while recorded booking subtotals remain separate. See [visible planning prices](docs/demo-plan.md#visible-planning-prices) for the allowances.

Current limits:

- Flightless search supports direct or one-change journeys whose departures fall on the selected Maldives date, with 15–240 minutes between boats. Transfers assume the same island harbour; boarding points and transfer feasibility need operator verification.
- Flight-fit transfer assumptions are scoped to the Thimarafushi pilot. The app does not calculate arbitrary nationwide taxi–ferry–flight connections.
- Map route lines are illustrative connections between reference points, not navigable sea tracks or road directions. Address notes are not geocoded.
- Cancellation retries are safe: repeated demo-service cancellation returns `already_cancelled=true` without changing the record again. Cargo and last-call notices append timeline events without invalidating pending approval versions; changes to booking status still use version checks.
- Guest access is tied to this browser's cookie. Clearing it loses access; passenger account recovery is not implemented.
- Standalone demo service receipts are not automatically attached to an existing ferry journey. Fictional sea checkout does not hold real seats; owner requests require approval and capacity checks.
- Cargo notices and manual position sharing are implemented; cargo reservations, private-charter quoting, automatic disruption recovery and external notifications remain future work.
- The previous shared `/operator` taxi dashboard is absent from the current UI. Some underlying taxi request/quote logic remains; the current presentation flow uses in-app simulated checkout.

## Checks

From the repository root, run frontend checks:

```sh
cd frontend
npm run lint
npm test
npm run build
npm run typecheck
```

Run backend tests in another terminal from the repository root:

```sh
cd backend
php artisan test
```

For repeatable desktop and mobile browser checks:

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
```

The browser suite starts an isolated Laravel API on `127.0.0.1:18766` and Next.js on `127.0.0.1:3101`, with its own disposable SQLite database under `frontend/.e2e/`. It never resets your normal demo database. Test servers stop after the run; ports must be free. It covers planner → inline passenger validation → booking → saved itinerary → bus checkout, airport taxi bookings, provider approval/last-call updates, titles and mobile navigation. Traces/screenshots are saved under ignored `frontend/test-results/` on failure.

Next.js development uses `.next-dev`, production builds use `.next`, and browser tests use `.next-e2e`; a build can run without overwriting a running dev server’s output.

Tests cover connection timing, input validation, guest/provider ownership, capacity and lifecycle guards, retry handling, quotes, and saved journeys. Local tests do not establish real-provider availability or production concurrency guarantees.

Sailings can be filtered by travel date, provider, route and island/vessel text, and are grouped by Maldives-local departure day. Departed sailings are removed from the current list as time advances. The main navigation wraps on small screens, and each route has its own page title.

The transport API limits each guest capability or provider session to 60 requests per minute. Separate guests behind the same Next.js proxy receive separate limits; anonymous requests fall back to the source IP. Provider sign-in also has a per-email limit. Proxies retain `429` and `Retry-After`. Use a shared cache store in deployments. These limits are tested locally, including through Next.js; real deployment/load behaviour still needs verification. Client-issued guest capabilities are not an abuse-resistant identity or a replacement for edge protection.

Only `LARAVEL_API_URL` is needed in the frontend environment. The removed `/operator` UI no longer has frontend token/password settings. Keep local environment files private; Vercel OIDC credentials belong to deployment tooling, not `.env.local`.

## Deployment and next steps

The repository includes a two-project Vercel configuration: Next.js for the frontend and Laravel through a community PHP runtime for the API, with PostgreSQL/Supabase configuration. See [development notes](docs/development.md#hosted-demo-deployment) for environment and migration details. Supabase hosts the database, not the PHP application; database migrations are a separate deployment step. Shared public demo accounts are unsuitable for production.

Planned integrations include Maldivian and other airlines, seaplane operators, Avas Ride dispatch, RTL ticketing, and owner-authorized private vessel tracking. The public FollowMe v5 connector is prepared (see below); it awaits a key and verification of its response-field mapping. These require approved provider access and agreements. The intended flow is search → reprice → reserve → pay → confirm → cancel, with provider references, verified callbacks and reconciliation.

For project context:

- [Demo plan and rehearsal](docs/demo-plan.md)
- [Integrated mobility implementation plan](docs/integrated-mobility-implementation-plan.md)
- [Consolidated journey design](docs/consolidated-journey-view.md)
- [Feature audit and judging priorities](docs/feature-audit-and-judging-plan.md)
- [Data sources](docs/data-sources.md) and [RTL schedule strategy](docs/rtl-schedules.md)
- [Development notes](docs/development.md) and [design system](docs/design-system.md)

Some planning documents describe earlier phases; this README summarizes the current demo and distinguishes the implemented experience from the roadmap.


### FollowMe boat positions (prepared; API key required)

The journey and ferry-planner maps include a separate boat layer, name search and focusable vessel list. The connector uses only FollowMe's public vessel endpoint; it does not expose account/private vessels, infer seats or create bookings.

**Owner-linked positions on sailings.** In `/providers`, an owner can enter the FollowMe vessel ID of a boat that is public on FollowMe and confirm they operate it and authorise showing its position. The ID must appear in the public feed (if the feed is unavailable the link is saved but remains unverified), and each FollowMe vessel can belong to one owner. Published sailings show that boat's latest reported position, labelled owner-linked and unverified, only from three hours before departure; the FollowMe ID is never published, and a feed outage never hides a sailing or invents a position. FollowMe's logo and a data-source link appear wherever its data is shown. Owner-entered manual positions remain separate. Run `php artisan migrate` to add the `followme_id` column.

1. Obtain an approved key from [FollowMe](https://followme.mv/api/v5/) and set `FOLLOWME_API_KEY` in the **backend** environment. Never put it in a `NEXT_PUBLIC_` variable.
2. Confirm the JSON envelope and field paths against the first authorized response, then set `FOLLOWME_DATA_PATH` and the `FOLLOWME_*_FIELD` values from `backend/.env.example`. The defaults are provisional adapter paths, not a verified v5 schema. Report timestamps must be Unix seconds/milliseconds or ISO 8601 with a timezone; ambiguous local times are shown as unknown.
3. Clear cached configuration if applicable (`php artisan config:clear`) and restart Laravel. Check `/api/v1/live-vessels` and the map. No key currently exists in this project, so live connectivity has not been verified; automated fixtures are synthetic.

The backend shares one atomic 65-second upstream request gate across visitors, including failures. Use a persistent shared cache supporting atomic `add` (the local database cache does); separate deployments/other consumers of the same key also need coordinated limiting. Public clients cannot override the URL or request private account data. No upstream body, credential or URL is returned on errors. Review outbound-request tracing because FollowMe places the key in its URL.

Positions older than ten minutes, with unknown timestamps, or retained after a failed refresh are visibly labelled. Saved positions expire after an hour. Feed retrieval time is separate from position-report time. Missing coordinates are omitted, not plotted at a default location. The planner works without the feed. FollowMe attribution and its official logo appear on each map displaying the layer. See [source and usage notes](docs/data-sources.md); check FollowMe's terms before any paid public release.
