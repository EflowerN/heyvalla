import { test, expect, type Page } from '@playwright/test';

const tomorrow = () => new Date(Date.now() + 29 * 3600_000).toISOString().slice(0, 10);
const demo = { email: 'demo@example.test', name: 'Audit Browser Demo' };

async function plan(page: Page) {
  await page.goto('/plan');
  await page.getByRole('button', { name: 'Fill Thaa → Hulhumalé demo', exact: true }).click();
  await page.getByRole('button', { name: 'Find my journey', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Passenger details & booking' })).toBeVisible();
  return page.getByRole('form', { name: 'Passenger booking' });
}

async function confirmService(page: Page) {
  await page.getByRole('button', { name: 'Review demo booking', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo booking · no payment', exact: true }).click();
  const result = page.getByRole('status').filter({ hasText: 'Demo confirmed' });
  await expect(result).toBeVisible();
  return (await result.innerText()).match(/DEMO-[A-Z0-9]+/)![0];
}

test('planner keeps empty/invalid fields visible, safely saves a full journey and checks out its bus option', async ({ page }, testInfo) => {
  const form = await plan(page);
  await form.getByRole('button', { name: 'Confirm demo booking', exact: true }).click();
  await expect(form).toBeVisible();
  await expect(form.getByText('Enter the lead passenger’s name.', { exact: true })).toBeVisible();
  await expect(form.getByText('Enter an email address for this demo booking.', { exact: true })).toBeVisible();
  const injection = '<script>window.__dhathuruXss = true</script>';
  await form.getByLabel('Lead passenger name').fill(injection);
  await form.getByLabel('Email (demo only)').fill('bad-email');
  await form.getByRole('button', { name: 'Confirm demo booking', exact: true }).click();
  await expect(form.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await form.getByLabel('Email (demo only)').fill(demo.email);
  await form.getByRole('button', { name: 'Confirm demo booking', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Demo booking confirmed' })).toBeVisible();
  await expect(form).toHaveCount(0);
  await page.getByRole('link', { name: 'Open my itinerary →', exact: true }).first().click();
  await expect(page).toHaveTitle('My itineraries | Dhathuru App');
  const journey = page.getByRole('article').filter({ has: page.getByRole('heading', { name: `${injection} · 1 passenger`, exact: true }) });
  await expect(journey).toBeVisible();
  await expect(journey.getByText('Planning total: 1784.00 MVR', { exact: true })).toBeVisible();
  await expect(page.locator('script').filter({ hasText: 'window.__dhathuruXss = true' })).toHaveCount(0);
  await journey.getByRole('button', { name: 'Book remaining journey services · Demo', exact: true }).click();
  await journey.getByLabel('From Velana to your destination').selectOption('bus');
  await journey.getByRole('button', { name: 'Review demo booking', exact: true }).click();
  await expect(journey.getByText('Simulated total: 1554.00 MVR', { exact: true })).toBeVisible();
  await journey.getByRole('button', { name: 'Confirm demo booking · no payment', exact: true }).click();
  await expect(journey.getByRole('status').filter({ hasText: 'Demo confirmed' })).toBeVisible();
  await page.reload();
  await expect(journey.getByText('demo services confirmed', { exact: true })).toBeVisible();
  await expect(journey.getByRole('heading', { name: /RTL R4/ })).toBeVisible();
  await journey.screenshot({ path: testInfo.outputPath('saved-journey.png') });
});

test('direct airport taxis to Malé and both Hulhumalé phases save independent receipts', async ({ page }) => {
  for (const [label, fare] of [['Airport → Malé', '70.00'], ['Airport → Hulhumalé Phase 1', '80.00'], ['Airport → Hulhumalé Phase 2', '85.00']]) {
    await page.goto('/greater-male-taxi');
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('button', { name: 'See fare & book', exact: true }).click();
    await expect(page.getByRole('heading', { name: `${fare} MVR`, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Book this taxi in Dhathuru App · Demo', exact: true }).click();
    await page.getByLabel('Travel date').fill(tomorrow());
    const reference = await confirmService(page);
    await page.getByRole('link', { name: 'View in My itineraries →', exact: true }).click();
    await expect(page.getByRole('article').filter({ hasText: reference })).toContainText(`Simulated total: ${fare} MVR`);
  }
});

test('provider approval and cargo last-call update appear in the passenger itinerary', async ({ page, browser }) => {
  await page.goto('/sailings');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('Lagoon Demo Launches');
  await page.getByLabel('Travel date', { exact: true }).fill(tomorrow());
  const sailing = page.getByRole('article').first();
  await sailing.locator('summary').filter({ hasText: 'Request seats' }).click();
  await sailing.getByLabel('Passenger name', { exact: true }).fill(demo.name);
  await sailing.getByRole('checkbox').check();
  await sailing.getByRole('button', { name: 'Request demo seats', exact: true }).click();
  const message = sailing.getByRole('status');
  await expect(message).toContainText('Awaiting operator approval');
  const reference = (await message.innerText()).match(/PV-[A-Z0-9]+/)![0];
  const ownerContext = await browser.newContext({ baseURL: 'http://127.0.0.1:3101' });
  const owner = await ownerContext.newPage();
  try {
    await owner.goto('/providers');
    await owner.getByLabel('Email', { exact: true }).fill('lagoon@heyvalla.example');
    await owner.getByLabel('Password', { exact: true }).fill('heyvalla-demo-2026');
    await owner.getByRole('button', { name: 'Sign in', exact: true }).click();
    const request = owner.getByRole('article').filter({ hasText: reference });
    await expect(request).toBeVisible();
    const departure = new Date(`${tomorrow()}T08:00:00+05:00`).toLocaleString('en-GB', {timeZone:'Indian/Maldives',dateStyle:'medium',timeStyle:'short'});
    const ownerSailing = owner.getByRole('article').filter({ hasText: departure }).filter({ has: owner.locator('summary').filter({hasText:'Cargo, last call & location sharing'}) }).first();
    const operation = ownerSailing.locator('details').filter({ has: owner.locator('summary').filter({ hasText: 'Cargo, last call & location sharing' }) }).first();
    await operation.locator('summary').first().click();
    await operation.getByRole('combobox', { name: 'Service update', exact: true }).selectOption('last_call');
    await operation.getByLabel('Message for passengers', { exact: true }).fill('Audit demo: last call for boarding.');
    await operation.getByRole('button', { name: 'Publish update & ping passengers', exact: true }).click();
    await expect(operation.getByRole('status')).toContainText('passenger request(s) updated');
    await request.getByRole('button', { name: 'Confirm seats', exact: true }).click();
    await expect(request).toContainText('confirmed');
    await page.goto('/journeys');
    const journey = page.getByRole('article').filter({ hasText: reference });
    await expect(journey).toContainText('confirmed');
    await expect(journey).toContainText('Audit demo: last call for boarding.');
  } finally { await ownerContext.close(); }
});

test('page titles, backend identity, wrapped navigation and location labels work on each screen', async ({ page }) => {
  const pages = [['/plan', 'Plan a trip'], ['/journeys', 'My itineraries'], ['/sailings', 'Sailings'], ['/providers', 'Boat owners'], ['/greater-male-taxi', 'Taxi booking & fares'], ['/buses', 'RTL buses'], ['/ferry-planner', 'Ferry connection planner']];
  for (const [path, title] of pages) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} | Dhathuru App`);
    const nav = page.getByRole('navigation', { name: 'Sections' }).first();
    await expect(nav.getByRole('link', { name: 'Plan a trip', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/');
  await expect(page).toHaveTitle('Dhathuru: island to island, door to door');
  await expect(page.getByRole('heading', { level: 1, name: 'Island to island, door to door.' }).first()).toBeVisible();
  await page.goto('/plan');
  await expect(page.getByText('Vilufushi · Thaa · Inhabited island · Selected', { exact: true })).toBeVisible();
  const health = await page.request.get('/api/backend-health');
  expect(health.status()).toBe(200);
  expect((await health.json()).backend.service_id).toBe('dhathuru-api');
});

test('the real proxy returns 429 and Retry-After per guest without blocking another browser', async ({ page, browser }) => {
  for (let i = 0; i < 60; i++) {
    expect((await page.request.get('/api/demo-bookings')).status()).toBe(200);
  }
  const limited = await page.request.get('/api/demo-bookings');
  expect(limited.status()).toBe(429);
  expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
  const other = await browser.newContext({ baseURL: 'http://127.0.0.1:3101' });
  try { expect((await other.request.get('/api/demo-bookings')).status()).toBe(200); }
  finally { await other.close(); }
});


test('service cancellation reports the result and an API retry is explicitly already cancelled', async ({ page }) => {
  await page.goto('/greater-male-taxi');
  await page.getByRole('button', {name:'Airport → Malé',exact:true}).click();
  await page.getByRole('button', {name:'See fare & book',exact:true}).click();
  await page.getByRole('button', {name:'Book this taxi in Dhathuru App · Demo',exact:true}).click();
  const reference = await confirmService(page);
  await page.getByRole('link', {name:'View in My itineraries →',exact:true}).click();
  const receipt=page.getByRole('article').filter({hasText:reference});
  await receipt.getByRole('button', {name:'Cancel demo services',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Demo reservation cancelled.'})).toBeVisible();
  await expect(receipt).toContainText('cancelled');
  const origin = new URL(page.url()).origin;
  const retry=await page.request.delete('/api/demo-checkout',{headers:{Origin:origin},data:{reference}});
  expect(retry.status()).toBe(200);
  expect((await retry.json()).already_cancelled).toBe(true);
});
