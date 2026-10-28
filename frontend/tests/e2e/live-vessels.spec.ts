import { test, expect } from '@playwright/test';

test('unconfigured tracking is explicit on both maps and does not prevent journey planning', async ({ page }, testInfo) => {
  for (const path of ['/', '/ferry-planner']) {
    await page.goto(path);
    const tracking = page.getByRole('region', { name: 'FollowMe boat tracking' });
    await expect(tracking).toContainText('A FollowMe API key is required.');
    await expect(tracking.getByRole('img', { name: 'FollowMe Tracking Service' })).toBeVisible();
    await expect(page.locator('[title^="FollowMe boat:"]')).toHaveCount(0);
    await tracking.getByRole('checkbox', { name: 'Show boat positions' }).uncheck();
    await expect(tracking.getByRole('status')).toHaveCount(0);
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Fill Thaa → Hulhumalé demo', exact: true }).click();
  await page.getByRole('button', { name: 'Find my journey', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Passenger details & booking' })).toBeVisible();
  await page.getByRole('region', { name: 'FollowMe boat tracking' }).screenshot({ path: testInfo.outputPath('tracking-awaiting-key.png') });
});

test('synthetic feed renders separate safe boat markers, name filtering, focus and stale reports', async ({ page }, testInfo) => {
  const now = Date.now();
  const name = '<img src=x onerror=alert(1)> Synthetic boat';
  await page.route('**/api/live-vessels', route => route.fulfill({ json: {
    status: 'ok', message: 'Synthetic test feed — not live vessel data.', fetched_at: new Date(now).toISOString(), vessels: [
      { id: '1000', name, latitude: 2.21, longitude: 73.10, reported_at: new Date(now - 60000).toISOString(), freshness: 'recent' },
      { id: '1001', name: 'Old synthetic boat', latitude: 2.2, longitude: 73.13, reported_at: new Date(now - 7200000).toISOString(), freshness: 'stale' },
    ],
  } }));
  await page.goto('/');
  const tracking = page.getByRole('region', { name: 'FollowMe boat tracking' });
  await expect(page.locator('[title^="FollowMe boat:"]')).toHaveCount(2);
  await tracking.getByText('2 boat positions · view list', { exact: true }).click();
  await expect(tracking).toContainText('Last known position');
  await tracking.getByRole('searchbox', { name: 'Find a boat' }).fill('<img');
  await expect(page.locator('[title^="FollowMe boat:"]')).toHaveCount(1);
  await tracking.getByRole('button', { name: /Synthetic boat/ }).click();
  await expect(page.locator('.leaflet-popup-content')).toContainText(name);
  await expect(page.locator('.leaflet-popup-content img')).toHaveCount(0);
  await page.getByRole('region', { name: 'Whole journey map' }).screenshot({ path: testInfo.outputPath('synthetic-tracking-map.png') });
  await tracking.getByRole('checkbox', { name: 'Show boat positions' }).uncheck();
  await expect(page.locator('[title^="FollowMe boat:"]')).toHaveCount(0);
});
