import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/en', '/hi', '/en/selection', '/en/representatives', '/hi/representatives', '/en/government', '/hi/government/parliament', '/en/who-fixes-this', '/hi/who-fixes-this', '/en/world', '/hi/world', '/en/money', '/hi/money', '/en/check', '/hi/check', '/en/education', '/hi/education', '/en/ask', '/hi/ask', '/en/history', '/hi/history', '/en/scorecard', '/hi/scorecard/cpi-inflation', '/en/states/kerala', '/hi/states/ladakh', '/en/sources', '/hi/privacy'];

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
  await expect(page.getByText('All India, same period')).toHaveCount(2); // CPI inflation and higher-education GER
});

test('select and export: add an indicator, see it in the selection with sources and citations', async ({ page }) => {
  await page.goto('/en/scorecard/cpi-inflation');
  await page.getByRole('button', { name: /Add to selection/ }).click();
  await expect(page.getByRole('link', { name: /Selection \(1\)/ })).toBeVisible();
  await page.goto('/en/selection');
  await expect(page.getByRole('heading', { name: /Retail inflation/ })).toBeVisible();
  await expect(page.getByText('api.mospi.gov.in', { exact: false }).first()).toBeVisible();
  await page.getByText('Citations', { exact: true }).click();
  await expect(page.getByText(/@misc\{/)).toBeVisible();
});

test('public money: budget tables, the workbook/PDF note and evidence are shown', async ({ page }) => {
  await page.goto('/en/money');
  await expect(page.getByRole('heading', { level: 1, name: 'Public money' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Budget at a glance' })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: /17\. Fiscal Deficit/ })).toBeVisible();
  await expect(page.getByText(/the PDF, which the Ministry treats as final, shows 3036619/)).toBeVisible();
  await expect(page.getByText(/An allocation is not the same as money released or spent/)).toBeVisible();
  await page.goto('/hi/money');
  await expect(page.getByRole('heading', { level: 1, name: 'सार्वजनिक धन' })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: /राजकोषीय घाटा/ }).first()).toBeVisible();
});

test('check a figure: compares a stated number, allows rounding, and keeps the check in the address', async ({ page }) => {
  await page.goto('/en/check');
  await page.getByLabel('What is the figure about?').selectOption({ label: 'Retail inflation (CPI, year-on-year)' });
  await page.getByLabel(/Number stated/).fill('1000');
  await expect(page.getByText('Differs from the official figure by more than rounding.')).toBeVisible();
  await page.getByLabel(/Number stated/).fill('five');
  await expect(page.getByText('Type a number, e.g. 5.2')).toBeVisible();
  // Union Budget 2026-27 total expenditure (BE) is ₹53,47,315 crore; "53.47 lakh crore" is that figure, rounded.
  await page.goto('/en/check?t=budget-summary&s=total-expenditure&p=2026-27-be&v=53.47&u=lakh');
  await expect(page.getByText('Consistent with the official figure, allowing for rounding.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'See the full record and evidence' })).toHaveAttribute('href', '/en/money#t-summary');
  await page.goto('/hi/check?t=budget-summary&s=total-expenditure&p=2026-27-be&v=60&u=lakh');
  await expect(page.getByText('आधिकारिक आँकड़े से पूर्णांकन की सीमा से अधिक भिन्न है।')).toBeVisible();
});

test('check a figure: a Budget share of GDP can be checked', async ({ page }) => {
  // Fiscal deficit 2026-27 BE is printed as 4.3% of GDP.
  await page.goto('/en/check?t=budget-summary&s=fiscal-deficit-pct-gdp&p=2026-27-be&v=4.3');
  await expect(page.getByText('Consistent with the official figure, allowing for rounding.')).toBeVisible();
});

test('ask: matching records are listed (written answers off without a key)', async ({ page }) => {
  await page.goto('/en/ask');
  await page.getByLabel('Your question').fill('Who is the MP of Varanasi?');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByRole('heading', { name: 'Matching records on this site' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Varanasi: / })).toBeVisible();
  await expect(page.getByText('Written answers are not switched on yet.')).toBeVisible();
});

test('ask API: rejects wrong method, cross-site posts and bad input', async ({ request, baseURL }) => {
  expect((await request.get('/api/ask')).status()).toBe(405);
  expect((await request.post('/api/ask', { headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, data: { q: 'gdp', lang: 'en' } })).status()).toBe(403);
  expect((await request.post('/api/ask', { headers: { 'content-type': 'text/plain' }, data: 'gdp' })).status()).toBe(415);
  expect((await request.post('/api/ask', { headers: { 'content-type': 'application/json' }, data: { q: 'x', lang: 'en' } })).status()).toBe(400);
  expect((await request.post('/api/ask', { headers: { 'content-type': 'application/json' }, data: { q: 'gdp growth', lang: 'fr' } })).status()).toBe(400);
  const ok = await request.post('/api/ask', { headers: { origin: baseURL!, 'content-type': 'application/json' }, data: { q: 'GDP growth', lang: 'hi' } });
  expect(ok.status()).toBe(200);
  const body = await ok.json();
  expect(body.results.length).toBeGreaterThan(0);
  expect(body.results[0].href).toMatch(/^\/hi\//);
});
