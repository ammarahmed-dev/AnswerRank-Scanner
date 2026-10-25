import { chromium } from 'playwright';
import ts from 'typescript';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Local built app, synthetic fixtures and intercepted valid submissions only.
// No production credentials, customer reports, analytics or test emails.
const origin = 'http://127.0.0.1:3044';
const path = '/services/aeo-geo-implementation';
const output = 'test-results/services';
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3044'], {
  env: { PATH: process.env.PATH, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
let browser;
let page;
const errors = [];
const checks = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${label}`);
}
async function screenshot(name, fullPage = false) {
  if (fullPage) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${output}/${name}.png`, fullPage, animations: 'disabled' });
}
async function noOverflow() {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow');
}
async function goto(url) {
  await page.goto(origin + url, { waitUntil: 'networkidle' });
}
try {
  await until(async () => {
    if (server.exitCode !== null) throw new Error(`Server exited: ${serverLog}`);
    try { return (await fetch(origin + path)).ok; } catch { return false; }
  }, 'local server');
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await goto(path + '?source=report');
  assert.match(await page.title(), /AEO.*GEO.*Implementation/i);
  assert.equal(await page.locator('h1').innerText(), 'Turn your website audit into implemented fixes.');
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://www.aeocheck.co' + path);
  assert.equal(await page.locator('.services-package').count(), 3);
  await noOverflow();
  await screenshot('services-desktop', true);
  checks.push('Desktop page, canonical, packages and overflow');

  // Navigation must work even when this credential-free build has no Supabase config.
  for (const width of [320, 390, 800, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    const toggle = page.getByRole('button', { name: 'Open menu', exact: true });
    await toggle.focus();
    await page.keyboard.press('Enter');
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await nav.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Close menu', exact: true }).getAttribute('aria-expanded'), 'true');
    await nav.getByRole('button', { name: 'Features', exact: true }).click();
    assert.equal(await nav.getByRole('button', { name: 'Features', exact: true }).getAttribute('aria-expanded'), 'true');
    await nav.getByRole('link', { name: /Free tools/ }).scrollIntoViewIfNeeded();
    await noOverflow();
    assert(await nav.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Menu fits the viewport');
    await screenshot(`mobile-menu-${width}`);
    await page.keyboard.press('Escape');
    assert.equal(await nav.isVisible(), false);
    assert(await toggle.evaluate(el => el === document.activeElement));
    await toggle.click();
    await nav.getByRole('link', { name: 'Implementation services', exact: true }).click();
    await page.waitForURL(origin + path);
    assert.equal(await page.getByRole('navigation', { name: 'Mobile navigation' }).isVisible(), false);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.locator('.site-header').click({ position: { x: 190, y: 30 } });
    await until(async () => !(await page.getByRole('navigation', { name: 'Mobile navigation' }).isVisible()), 'outside click closes menu');
    await goto(path + '?source=report');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).isVisible(), false);
  assert.equal(await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Implementation services' }).getAttribute('href'), path);
  assert.equal(await page.locator('.services-price strong').allTextContents().then(prices => prices.join(',')), '$499,$999,$499');
  checks.push('Mobile menu without auth config, keyboard/Escape/link close, scrollable features, tablet breakpoints and service pricing');

  const submit = page.locator('form button[type="submit"]');
  await submit.click();
  await page.locator('#contact-name-error').waitFor();
  await until(() => page.locator('#contact-name').evaluate(el => el === document.activeElement), 'name error focus');
  await page.locator('#contact-name').fill('Synthetic Fixture');
  await page.locator('#contact-email').fill('fixture@example.invalid');
  await page.locator('#service-website').fill('https://example.invalid/?private=not-a-real-token');
  await page.locator('#contact-message').fill('Synthetic local browser fixture for implementation enquiry.');
  await submit.click();
  await until(async () => (await page.locator('#service-website-error').innerText()).length > 0, 'website error');
  await until(() => page.locator('#service-website').evaluate(el => el === document.activeElement), 'website error focus');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await screenshot('services-mobile', true);
  await page.locator('#service-website').scrollIntoViewIfNeeded();
  await screenshot('form-mobile-error');
  checks.push('Real invalid API responses, field focus and mobile error layout');

  await page.locator('#service-website').fill('https://example.invalid');
  let payload;
  let succeed = false;
  await page.route('**/api/contact', async route => {
    payload = route.request().postDataJSON();
    await pause(350);
    await route.fulfill({ status: succeed ? 200 : 503, contentType: 'application/json', body: JSON.stringify(succeed ? { success: true } : { error: 'Synthetic storage unavailable. Please retry.' }) });
  });
  await submit.click();
  await until(() => submit.isDisabled(), 'sending disabled state');
  await page.getByText('Synthetic storage unavailable. Please retry.', { exact: true }).waitFor();
  await until(() => submit.isEnabled(), 'retry enabled state');
  succeed = true;
  await submit.click();
  await page.locator('.contact-success').waitFor();
  assert.match(await page.locator('.contact-success').innerText(), /has been saved/);
  assert.equal(payload.service.source, 'report');
  assert.deepEqual(Object.keys(payload.service).sort(), ['engagement', 'platform', 'source', 'website']);
  checks.push('Intercepted sending, failure/retry and confirmed-success UI; no valid lead sent');

  await goto('/contact?subject=services');
  await page.locator('#service-website').waitFor();
  assert.equal(await page.locator('#contact-subject').inputValue(), 'Optimization services');
  await noOverflow();
  await screenshot('contact-services-mobile', true);
  await goto('/contact');
  assert.equal(await page.locator('#contact-subject').inputValue(), 'General question');
  assert.equal(await page.locator('#service-website').count(), 0);
  checks.push('Existing service and general contact subjects');
  for (const url of ['/blog/best-aeo-tools-ai-search-visibility', '/tools/schema-checker']) {
    await goto(url);
    const link = page.getByRole('link', { name: 'Explore implementation', exact: true });
    assert.equal(await link.count(), 1);
    assert.equal(await link.getAttribute('href'), path + '?source=content');
  }
  checks.push('Comparison guide and tool service discovery');
  for (const [url, source] of [['/', 'home'], ['/pricing', 'pricing']]) {
    await goto(url);
    const block = page.getByRole('complementary', { name: 'Implementation help' });
    assert.equal(await block.count(), 1);
    assert.equal(await block.locator('a').getAttribute('href'), path + '?source=' + source);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow();
      await block.scrollIntoViewIfNeeded();
      await screenshot(`${source}-cta-${width}`);
    }
  }
  checks.push('One homepage/pricing CTA and responsive neighboring sections');

  const fixtureModule = { exports: {} };
  const compiled = ts.transpileModule(await readFile('lib/sample-report.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(compiled.outputText, { exports: fixtureModule.exports });
  const sample = fixtureModule.exports.SAMPLE_REPORT;
  for (const full of [true, false]) {
    const id = full ? 'synthetic-full' : 'synthetic-preview';
    const fixture = { ...sample, reportId: id, url: 'https://example.invalid', unlocked: full, isFullReport: full, redacted: !full };
    if (!full) fixture.aiInsights = { ...fixture.aiInsights, recommendations: [], quickWin: '', contentGap: '' };
    await page.addInitScript(({ id, fixture }) => sessionStorage.setItem(`aeocheck_report:${id}`, JSON.stringify(fixture)), { id, fixture });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await goto('/report?id=' + id);
      const block = page.getByRole('complementary', { name: 'Implementation help' });
      await block.waitFor();
      assert.equal(await block.count(), 1);
      assert.equal(await block.locator('a').getAttribute('href'), path + '?source=report');
      assert.equal(await page.getByText(full ? 'Full Report' : 'Free Preview', { exact: true }).count(), 1);
      await noOverflow();
      await block.scrollIntoViewIfNeeded();
      await screenshot(`report-${full ? 'full' : 'preview'}-${width}`);
    }
  }
  checks.push('Synthetic full/preview reports at both widths; one CTA, no private report context');
  assert.deepEqual(errors, [], 'Browser page errors');
  await writeFile(`${output}/checks.json`, JSON.stringify({ checks, pageErrors: errors, synthetic: true }, null, 2));
  console.log(JSON.stringify({ passed: checks, pageErrors: errors, screenshots: output }));
} catch (error) {
  if (page) await screenshot('failure').catch(() => {});
  await writeFile(`${output}/failure.txt`, `${error.stack}\n${serverLog}`);
  throw error;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
