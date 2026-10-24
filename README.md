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

See [the demo plan](docs/demo-plan.md) and [RTL schedule strategy](docs/rtl-schedules.md). Authentication, search, booking, and the operator dashboard are planned features, not implemented in this foundation.
