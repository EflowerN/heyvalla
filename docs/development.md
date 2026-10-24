# Development notes

The foundation uses Next.js 16.4.3, React 19.3.0, and Laravel 13 (exact versions are recorded in package-lock.json and composer.lock). PHP 8.4 and Node 24 were used during setup.

Next.js uses Webpack for local development and production builds, with Tailwind's PostCSS integration. The default Turbopack build could not start its CSS worker process in the setup environment. No remote fonts are needed to build the app.

The health endpoint is intentionally public and returns only application metadata. The initial Laravel `/api/health` route lives in `routes/web.php`; future product API routes should be registered separately with versioning, authentication, and authorization as appropriate. Next.js calls the endpoint server-side through `/api/backend-health`; no CORS configuration is needed for this check. The backend URL is a server-only environment variable.

Authentication and the operator dashboard are not scaffolded yet. Laravel's default welcome route and migrations remain available. Laravel's Vite files are starter assets; the product UI is in Next.js, so backend npm installation is not needed for this setup.

Local `.env` files, application keys, installed dependencies, build outputs, and the SQLite database are ignored by Git. Never commit these files. Use the environment examples and lockfiles to reproduce the setup.
