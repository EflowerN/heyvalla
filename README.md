# HeyValla

**Plan your whole journey across the Maldives.**

HeyValla brings ferry, launch, flight and ground transport information into one place. Start with **“Where are you?”** and **“Where are you going?”**, compare connections on a map, and keep the selected services in **My itineraries**. Passengers can plan a journey with a flight or travel entirely by sea.

The project began with a Thaa Atoll pilot: helping passengers reach Thimarafushi Airport in time for check-in. It now demonstrates a broader approach to coordinating island travel and giving boat owners a place to publish services and updates that would otherwise be scattered across apps and manual messages.

> **Working demo, not a live booking service.** Confirmations are simulated. HeyValla does not collect payments, issue real tickets, dispatch vehicles or reserve supplier inventory. Public reference data, owner-entered information and fictional demo schedules are identified separately. No transport-provider partnership or live API integration is claimed.

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

Product plans and source references live in [`docs/`](docs/). [`presentation/`](presentation/) is reserved for presentation materials. Exact dependencies are recorded in the committed lockfiles.

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
php artisan serve --host=127.0.0.1 --port=8000
```

In a second terminal, from the repository root:

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open [HeyValla locally](http://localhost:3000). The frontend's server-only `LARAVEL_API_URL` defaults to `http://127.0.0.1:8000`. If Laravel uses another port, update that value in `frontend/.env.local` and restart Next.js.

Health checks:

- [Laravel health](http://127.0.0.1:8000/api/health)
- [Frontend-to-backend connection](http://localhost:3000/api/backend-health)

No map API key is required: geographic outlines are bundled with the app. Backend npm installation is unnecessary for the product UI, which runs in Next.js. Environment files, database contents, dependencies and build outputs must remain outside version control.

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
2. Search and select a suitable built-in demo ferry. Review the connection and book with sample passenger details. A provider sailing instead requires its owner's approval.
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
- Guest access is tied to this browser's cookie. Clearing it loses access; passenger account recovery is not implemented.
- Standalone demo service receipts are not automatically attached to an existing ferry journey. Fictional sea checkout does not hold real seats; owner requests require approval and capacity checks.
- Cargo notices and manual position sharing are implemented; cargo reservations, private-charter quoting, automatic disruption recovery and external notifications remain future work.
- The previous shared `/operator` taxi dashboard is absent from the current UI. Some underlying taxi request/quote logic remains; the current presentation flow uses in-app simulated checkout.

## Checks

From the repository root, run frontend checks:

```sh
cd frontend
npm run lint
node --test tests/*.test.mjs
npm run build
```

Run backend tests in another terminal from the repository root:

```sh
cd backend
php artisan test
```

Tests cover connection timing, input validation, guest/provider ownership, capacity and lifecycle guards, retry handling, quotes, and saved journeys. Local tests do not establish real-provider availability or production concurrency guarantees.

## Deployment and next steps

The repository includes a two-project Vercel configuration: Next.js for the frontend and Laravel through a community PHP runtime for the API, with PostgreSQL/Supabase configuration. See [development notes](docs/development.md#hosted-demo-deployment) for environment and migration details. Supabase hosts the database, not the PHP application; database migrations are a separate deployment step. Shared public demo accounts are unsuitable for production.

Planned integrations include Maldivian and other airlines, seaplane operators, Avas Ride dispatch, RTL ticketing, and an owner-authorized FollowMe-style vessel-location feed. These require approved provider access and agreements. The intended flow is search → reprice → reserve → pay → confirm → cancel, with provider references, verified callbacks and reconciliation.

For project context:

- [Demo plan and rehearsal](docs/demo-plan.md)
- [Integrated mobility implementation plan](docs/integrated-mobility-implementation-plan.md)
- [Consolidated journey design](docs/consolidated-journey-view.md)
- [Feature audit and judging priorities](docs/feature-audit-and-judging-plan.md)
- [Data sources](docs/data-sources.md) and [RTL schedule strategy](docs/rtl-schedules.md)
- [Development notes](docs/development.md) and [design system](docs/design-system.md)

Some planning documents describe earlier phases; this README summarizes the current demo and distinguishes the implemented experience from the roadmap.
