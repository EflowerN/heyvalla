# HeyValla

A demonstration of ferry-to-airport journey planning for Thaa Atoll, with Thimarafushi Airport as the destination. Built with Next.js and Laravel.

**Demo only:** no real tickets, payments, seat inventory, live tracking, or operator affiliation.

## Structure

- `frontend/`: Next.js App Router, TypeScript, Tailwind CSS, ESLint
- `backend/`: Laravel API and business logic
- `docs/`: product plan, architecture, and RTL data-source strategy
- `presentation/`: presentation materials

## Local setup

Requirements: Node.js 20.9+, npm, PHP 8.3+, Composer, PHP SQLite extension. Use the committed lockfiles.

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

See [the demo plan](docs/demo-plan.md) and [RTL schedule strategy](docs/rtl-schedules.md). Ferry search, the interactive map, and guest demo seat bookings are implemented. Authentication and the operator dashboard remain planned. Run migrations before using bookings; only future sailings meeting the recommended connection target are bookable. No money is collected or real ticket issued.

## Demo taxi add-on

Open a ferry booking under **My demo bookings** and choose **Request airport taxi**. Quotes are reviewed and accepted there after the demo operator responds. Use **Refresh bookings & taxi quotes** to retrieve updates.

The operator dashboard is at `/operator`. Configure `DEMO_OPERATOR_PASSWORD` in frontend `.env.local` and a matching random `DEMO_OPERATOR_TOKEN` (32+ characters) in frontend `.env.local` and backend `.env`. The checked-in environment examples leave both blank, so operator access fails closed until configured. Restart Next.js after changing these settings. See `docs/development.md` for local demo details and `docs/transport-expansion-plan.md` for the taxi/private-vessel roadmap.
