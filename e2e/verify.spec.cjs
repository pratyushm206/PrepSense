const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5055';
const password = process.env.E2E_PASSWORD || 'TestOnly!Pass123';
const emailA = process.env.E2E_A_EMAIL || 'alex@verification.invalid';
const emailAdmin = process.env.E2E_ADMIN_EMAIL || 'admin2@verification.invalid';
const artifacts = path.join(__dirname, 'artifacts');
const errors = [];
fs.mkdirSync(artifacts, { recursive: true });

async function login(page, email = emailA) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/dashboard/);
}
async function apiHeaders(page) {
  return { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('prepsense_token'))}` };
}
function watch(page) {
  page.on('console', message => { if (message.type() === 'error') errors.push(`console ${page.url()} ${message.text()}`); });
  page.on('pageerror', error => errors.push(`pageerror ${page.url()} ${error.message}`));
  page.on('requestfailed', request => errors.push(`network ${request.url()} ${request.failure()?.errorText}`));
}

test('F1 Register, dashboard welcome and gauge state', async ({ page }) => {
  watch(page);
  await page.goto('/register');
  await page.getByLabel('Name', { exact: true }).fill('Riley Realname');
  await page.getByLabel('Email', { exact: true }).fill(`riley-${Date.now()}@verification.invalid`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/dashboard/);
  await expect(page.getByRole('heading', { name: 'Welcome, start your first round' })).toBeVisible();
  await expect(page.locator('.gauge-num')).toHaveText('-');
  await expect(page.locator('.user-avatar')).toHaveText('R');
  await expect(page.getByText('User, needs focused reps')).toHaveCount(0);
});

test('F2 Shared pages render without null/NaN/undefined text', async ({ page }) => {
  watch(page); await login(page);
  const sessionsResponse = await page.request.get('/api/sessions', { headers: await apiHeaders(page) });
  const sessions = (await sessionsResponse.json()).data;
  const routes = ['/dashboard', '/profile', '/interview/new', '/history', ...sessions.map(session => `/interview/${session._id}/summary`), '/recommendations', '/leaderboard?company=Accenture', '/resume-analyzer'];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText(/\b(?:null|NaN|undefined)\b/i);
    await page.screenshot({ path: path.join(artifacts, `F2-${route.replace(/[^a-z0-9]/gi, '_')}.png`), fullPage: true });
  }
});

test('F3 History filters, links, delete confirmation and failed-session cleanup', async ({ page }) => {
  watch(page); await login(page); await page.goto('/history');
  await page.getByRole('button', { name: /Needs attention/ }).click();
  await expect(page).toHaveURL(/status=needs-attention/);
  await page.getByLabel('Filter by topic').fill('arrays');
  await expect(page).toHaveURL(/topic=arrays/);
  await page.reload(); await expect(page.getByLabel('Filter by topic')).toHaveValue('arrays');
  await page.goto('/dashboard');
  const topicRow = page.locator('.topic-row').filter({ hasText: 'strings' }).first();
  if (await topicRow.count()) { await topicRow.click(); await expect(page).toHaveURL(/history\?topic=strings/); }
  await page.goto('/history');
  const companyLink = page.locator('.history-company-link').first();
  if (await companyLink.count()) { await companyLink.click(); await expect(page).toHaveURL(/history\?company=/); }
  const deleteButton = page.getByRole('button', { name: 'Delete', exact: true }).first();
  if (await deleteButton.count()) {
    const beforeCount = await page.locator('.session-row').count();
    await deleteButton.click(); await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.session-row')).toHaveCount(beforeCount);
    await deleteButton.click(); await page.getByRole('button', { name: 'Delete session' }).click();
    await expect(page.locator('.session-row')).toHaveCount(beforeCount - 1);
  }
  await page.goto('/history?status=needs-attention');
  const clear = page.getByRole('button', { name: 'Clear failed sessions' });
  page.on('dialog', dialog => dialog.accept());
  if (await clear.count()) await clear.click();
  await page.goto('/history?topic=networks');
  await expect(page.locator('.session-row')).not.toHaveCount(0);
});

test('F4 Logout, landing and back button do not reveal protected content', async ({ page }) => {
  watch(page); await login(page);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.locator('#account-menu-panel').getByRole('button', { name: 'Log out' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(`${base}/`);
  await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/(?:login)?$/);
  await expect(page.getByRole('heading', { name: /Welcome, start your first round/ })).toHaveCount(0);
});

test('F5 Protected route refresh behavior', async ({ page }) => {
  watch(page); await login(page);
  for (const route of ['/history', '/resume-analyzer']) { await page.goto(route); await page.reload(); await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/'))); }
  await page.evaluate(() => localStorage.removeItem('prepsense_token'));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('F6 Admin browser route and nav visibility', async ({ page }) => {
  watch(page); await login(page, emailAdmin);
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
  await page.goto('/admin'); await page.reload(); await expect(page).toHaveURL(/\/admin$/);
  await login(page, emailA); await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.goto('/admin'); await expect(page).toHaveURL(/\/dashboard$/);
});

test('F7 Delete throwaway account and confirm old report not found', async ({ page }) => {
  watch(page);
  const email = `throwaway-${Date.now()}@verification.invalid`;
  await page.goto('/register');
  await page.getByLabel('Name', { exact: true }).fill('Throwaway User');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click(); await page.waitForURL(/dashboard/);
  const headers = await apiHeaders(page);
  const sessionResponse = await page.request.post('/api/sessions', { headers, data: { company: 'TestCo', role: 'Tester' } });
  const session = (await sessionResponse.json()).data;
  const shared = await page.request.post(`/api/sessions/${session._id}/share`, { headers });
  const reportPath = (await shared.json()).data.path;
  await page.goto('/profile'); await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).last().fill(password);
  await page.getByLabel('Type DELETE').fill('DELETE');
  await page.getByRole('button', { name: 'Permanently delete' }).click();
  await expect(page).toHaveURL(`${base}/`);
  await page.goto(reportPath); await expect(page.getByText('Report not found.')).toBeVisible();
});

test('F8 Resume CTAs open the external analyzer in a new tab', async ({ page, context }) => {
  watch(page); await login(page);
  await page.route('https://ai-resume-analyzer-pratyushm206.streamlit.app/**', route => route.abort());
  for (const route of ['/dashboard', '/resume-analyzer']) {
    await page.goto(route);
    const cta = page.getByRole('link', { name: 'Analyze my resume' }).first();
    const popupPromise = context.waitForEvent('page'); await cta.click(); const popup = await popupPromise;
    await expect(popup).toHaveURL(/ai-resume-analyzer-pratyushm206\.streamlit\.app/); await popup.close();
  }
});

test('F9 Responsive layouts and screenshots at 360/768/1280', async ({ page }) => {
  watch(page);
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/');
    const landingWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    expect(landingWidth.scroll).toBeLessThanOrEqual(landingWidth.width);
    await page.screenshot({ path: path.join(artifacts, `F9-${width}-landing.png`), fullPage: true });
  }
  await login(page);
  const routes = ['/dashboard', '/interview/new', '/history', '/profile', '/resume-analyzer', '/leaderboard?company=Accenture', '/recommendations'];
  const sessions = (await (await page.request.get('/api/sessions', { headers: await apiHeaders(page) })).json()).data;
  routes.push(`/interview/${sessions[0]._id}/summary`);
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route); const dimensions = await page.evaluate(() => { const links = [...document.querySelectorAll('.nav-links a')]; const nav = document.querySelector('.nav-links'); return { scroll: document.documentElement.scrollWidth, width: innerWidth, nav: Boolean(nav && nav.getBoundingClientRect().width > 0 && links.length) && links.every(link => link.getBoundingClientRect().height >= 44) }; });
      await page.screenshot({ path: path.join(artifacts, `F9-${width}-${route.replace(/[^a-z0-9]/gi, '_')}.png`), fullPage: true });
      expect(dimensions.scroll, `${route} at ${width}px scroll width`).toBeLessThanOrEqual(dimensions.width);
      expect(dimensions.nav, `${route} at ${width}px nav tap size`).toBeTruthy();
    }
  }
  await login(page, emailAdmin); await page.goto('/admin');
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/admin');
    const dimensions = await page.evaluate(() => { const links = [...document.querySelectorAll('.nav-links a')]; const nav = document.querySelector('.nav-links'); return { scroll: document.documentElement.scrollWidth, width: innerWidth, nav: Boolean(nav && nav.getBoundingClientRect().width > 0 && links.length) && links.every(link => link.getBoundingClientRect().height >= 44) }; });
    await page.screenshot({ path: path.join(artifacts, `F9-${width}-admin.png`), fullPage: true });
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width); expect(dimensions.nav).toBeTruthy();
  }
});

test('F10 Collect console errors and failed network requests', async ({ page }) => {
  watch(page); await login(page);
  for (const route of ['/dashboard', '/interview/new', '/history', '/profile', '/resume-analyzer', '/leaderboard?company=Accenture', '/recommendations', '/admin']) {
    await page.goto(route).catch(() => {});
  }
  fs.writeFileSync(path.join(artifacts, 'console-network.json'), JSON.stringify(errors, null, 2));
  console.log(`F10 browser errors/network failures: ${JSON.stringify(errors)}`);
  expect(errors, 'console/page/network errors').toEqual([]);
});
