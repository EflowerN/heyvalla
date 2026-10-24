# HeyValla

A demonstration of ferry-to-airport journey planning for Thaa Atoll. Provider sailings, airport taxis and a passenger-entered flight target share one itinerary. Built with Next.js and Laravel.

**Demo only:** no real tickets, payments, seat inventory, live tracking, or operator affiliation.

## Structure

- `frontend/`: Next.js App Router, TypeScript, Tailwind CSS, ESLint
- `backend/`: Laravel API and business logic
- `docs/`: product plan, architecture, and RTL data-source strategy
- `presentation/`: presentation materials

## Local setup

Requirements: Node.js 20.9+, npm, PHP 8.4+, Composer, PHP SQLite extension. Use the committed lockfiles.

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Create database/database.sqlite if it does not exist.
touch database/database.sqlite
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

In a second terminal:

```sh
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Laravel runs at http://127.0.0.1:8000; `/api/health` checks the API. The Next.js `/api/backend-health` endpoint checks the connection without exposing the backend URL to browser code.

SQLite is the initial development default so no database service is required. MySQL is the planned shared/deployment database; concurrency-sensitive booking tests must run against MySQL before deployment.

## Checks

```sh
cd frontend
npm run lint
npm run build
```

```sh
cd backend
php artisan test
```

Current demo features: flight-fit search for built-in and published provider sailings, map/directory, browser-owned bookings, individual provider accounts and vessel publishing, seat approval, a shared taxi operator dashboard, and unified itineraries at `/journeys`. RTL buses and the Avas Greater Malé fare estimator are separate reference screens. See [the current audit follow-up](docs/feature-audit-and-judging-plan.md) for remaining work and [RTL schedule strategy](docs/rtl-schedules.md) for data limitations.

## Demo taxi add-on

Open **My itineraries**, request an airport taxi after the ferry is confirmed, then review and accept the operator quote. The itinerary, provider request list and taxi dashboard refresh every 15 seconds while visible. Original HV bookings also remain available on the planner.

The operator dashboard is at `/operator`. Configure `DEMO_OPERATOR_PASSWORD` in frontend `.env.local` and a matching random `DEMO_OPERATOR_TOKEN` (32+ characters) in frontend `.env.local` and backend `.env`. The checked-in environment examples leave both blank, so operator access fails closed until configured. Restart Next.js after changing these settings. See `docs/development.md` for local demo details and `docs/transport-expansion-plan.md` for the taxi/private-vessel roadmap.

## Repeatable local demonstration

After installing dependencies and configuring the local environment:

```sh
cd backend
php artisan migrate --no-interaction
php artisan heyvalla:demo
```

This local/testing-only command creates **Lagoon Demo Launches** and **Coral Demo Launches**, each with one 12-seat vessel and three days of dated fictional sailings beginning tomorrow in Maldives time. Re-running it preserves existing fixtures. `php artisan heyvalla:demo --reset` deliberately replaces only these two marked providers and their dependent demo sailings/bookings/taxis/itineraries; unrelated providers and original HV bookings remain. Reset revokes the seeded providers' sessions. It is not a production seed command or a global database reset.

Provider logins at `/providers`: `lagoon@heyvalla.example` and `coral@heyvalla.example`, password **`heyvalla-demo-2026`**. These are deliberately public fictional local credentials. The taxi dashboard uses your separately configured local operator password, not the provider password.

Rehearsal:

1. Search **Vilufushi → Thimarafushi**, tomorrow, flight **12:00**, check-in **60 minutes**.
2. Request two seats on **Lagoon Demo One, 08:00–09:30**, MVR 150 each. Its demo airport arrival is 09:50, leaving 70 minutes before the 11:00 check-in target.
3. Sign into `/providers` as Lagoon and confirm the request.
4. In `/journeys`, request the two-person airport taxi. In `/operator`, quote **09:35**, **MVR 150**. Accept in `/journeys`.
5. The itinerary now shows **ground transport confirmed**, MVR **450** known ground subtotal and an **external, unbooked flight**. No money is collected.
6. Optionally cancel the sailing with a reason in `/providers`; linked ferry bookings and taxis become cancelled and the reason appears in the passenger timeline. Reset the marked fixtures before the next rehearsal if needed.

For unattended request expiry run `php artisan schedule:work` locally (or configure the Laravel scheduler in a deployment). Departure-expired pending requests are also resolved during normal list/action reads, so this bounded demonstration works without a background worker. `php artisan heyvalla:expire-requests` runs expiry once.

This is not a complete taxi–ferry–flight–taxi booking platform. Flight booking, multi-airport transfers, delay/recovery workflows, cargo, private charters, GPS sharing, passenger account recovery, notifications and production concurrency validation remain future work. The map still shows three illustrative reference lines, not all published provider routes.
