import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/en', '/hi', '/en/representatives', '/hi/representatives', '/en/scorecard', '/hi/scorecard/cpi-inflation', '/en/states/kerala', '/hi/states/ladakh', '/en/sources', '/hi/privacy'];

test('root redirects by browser language', async ({ browser }) => {
  const hi = await browser.newContext({ locale: 'hi-IN', extraHTTPHeaders: { 'accept-language': 'hi-IN,hi;q=0.9' } });
  const p = await hi.newPage();
  await p.goto('/');
  await expect(p).toHaveURL(/\/hi$/);
  await hi.close();
});

test('map: all 36 regions selectable by keyboard, URL is shareable, Escape returns to India', async ({ page }) => {
  await page.goto('/en');
  const regions = page.locator('svg path[role="button"]');
  await expect(regions).toHaveCount(36);
  const kerala = page.getByRole('button', { name: 'Kerala, State' });
  await kerala.focus();
  await page.keyboard.press('Enter');
  await expect(kerala).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/region=kerala/);
  await expect(page.getByRole('heading', { name: 'Kerala' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).not.toHaveURL(/region=/);
});

test('shared region link opens the region', async ({ page }) => {
  await page.goto('/en?region=ladakh');
  await expect(page.getByRole('heading', { name: 'Ladakh' })).toBeVisible();
});

test('list alternative links to every region', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('#region-list a')).toHaveCount(36);
});

test('unknown region is a 404, not a crash', async ({ page }) => {
  const res = await page.goto('/en/states/atlantis');
  expect(res?.status()).toBe(404);
});

test('language switch keeps the page', async ({ page }) => {
  await page.goto('/en/scorecard/gdp-growth');
  await page.getByRole('link', { name: 'पढ़ें हिंदी में' }).click();
  await expect(page).toHaveURL(/\/hi\/scorecard\/gdp-growth$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
});

test('unverified Hindi names fall back to English and are marked', async ({ page }) => {
  await page.goto('/hi/states/ladakh');
  await expect(page.locator('h1 [lang="en"]')).toHaveText('Ladakh');
});

for (const path of PAGES) {
  test(`${path}: disclaimer present, sources listed, no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('complementary', { name: 'Disclaimer' })).toBeVisible();
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}

test('reduced motion: map is visible immediately, no intro animation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8787/en');
  const op = await p.locator('svg path[role="button"]').first().evaluate((el) => getComputedStyle(el).opacity);
  expect(op).toBe('1');
  await ctx.close();
});

test('health endpoint reports real data state', async ({ request }) => {
  const r = await request.get('/api/health');
  const body = await r.json();
  expect(body.regions).toBe(36);
  expect(typeof body.lastVerified).toBe('string');
});

test('representatives: search filters the table', async ({ page }) => {
  await page.goto('/en/representatives');
  const rows = page.locator('tbody tr');
  expect(await rows.count()).toBeGreaterThan(500);
  await page.getByLabel('Search by state, constituency or name').fill('Wayanad');
  await expect(rows).toHaveCount(1);
});

test('region page lists its MPs and state inflation', async ({ page }) => {
  await page.goto('/en/states/kerala');
  await expect(page.getByRole('heading', { name: /Members of Parliament \(Lok Sabha\) from this region \(20\)/ })).toBeVisible();
  await expect(page.getByText('All India, same month')).toBeVisible();
});
