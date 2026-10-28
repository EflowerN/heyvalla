# Dhathuru App frontend

Next.js App Router with TypeScript, Tailwind CSS, and ESLint. See the repository root README for setup and `docs/demo-plan.md` for scope.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

`npm run lint` checks code; `npm run build` creates a production build. Both dev and build use Webpack for compatibility with this development environment.

The API defaults to `http://127.0.0.1:18765`. Development writes `.next-dev`, production writes `.next`, and `npm run test:e2e` uses `.next-e2e` and a disposable test database. Install the Chromium test browser with `npx playwright install chromium` before the first browser-test run. `npm test` runs pure logic tests; `npm run typecheck` checks TypeScript after generated route types are available from a build.
