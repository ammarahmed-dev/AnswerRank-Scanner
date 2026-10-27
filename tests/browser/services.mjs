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
async function funnelEvents() {
  return page.evaluate(() => (window.dataLayer || []).filter(item => item && ['scan_start', 'scan_complete', 'service_cta_click', 'service_form_start', 'service_lead_saved'].includes(item.event)));
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
  assert.equal(await page.locator('h1').innerText(), 'Make your website clearer for AI search and your buyers.');
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
  assert.equal(await page.locator('.services-price strong').allTextContents().then(prices => prices.join(',')), '$499,$1,499,$999');
  checks.push('Mobile menu without auth config, keyboard/Escape/link close, scrollable features, tablet breakpoints and service pricing');

  assert.doesNotMatch(await page.locator('main').innerText(), /\b(hours?|hourly)\b/i);
  assert.equal(await page.locator('.services-recommended').innerText(), 'Recommended starting point');
  assert.match(await page.locator('.services-package').nth(1).innerText(), /up to 3 existing priority pages/);
  assert.match(await page.locator('.services-package').nth(2).innerText(), /up to 2 existing-page improvements/);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#scope').scrollIntoViewIfNeeded();
    await noOverflow();
    await screenshot(`service-packages-${width}`, true);
  }
  await page.locator('#service-engagement').selectOption({ label: 'AEO/GEO Foundation' });

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
  assert.equal((await funnelEvents()).filter(item => item.event === 'service_form_start').length, 1);
  assert.equal((await funnelEvents()).filter(item => item.event === 'service_lead_saved').length, 0);
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
  assert.equal((await funnelEvents()).filter(item => item.event === 'service_lead_saved').length, 0);
  succeed = true;
  await submit.click();
  await page.locator('.contact-success').waitFor();
  assert.match(await page.locator('.contact-success').innerText(), /has been saved/);
  assert.equal(payload.service.source, 'report');
  assert.equal(payload.service.engagement, 'key-pages');
  assert.deepEqual(Object.keys(payload.service).sort(), ['engagement', 'platform', 'source', 'website']);
  const savedEvents = (await funnelEvents()).filter(item => item.event === 'service_lead_saved');
  assert.deepEqual(savedEvents, [{ event: 'service_lead_saved', aeocheck_event_version: 1, aeocheck_source: 'report', aeocheck_engagement: 'key-pages' }]);
  assert.equal((await funnelEvents()).filter(item => item.event === 'service_form_start').length, 1);
  checks.push('Intercepted sending, failure/retry and confirmed-success UI; no valid lead sent; one privacy-safe saved event only after success');

  await goto('/contact?subject=services');
  await page.locator('#service-website').waitFor();
  assert.equal(await page.locator('#contact-subject').inputValue(), 'Optimization services');
  await noOverflow();
  await screenshot('contact-services-mobile', true);
  await goto('/contact');
  assert.equal(await page.locator('#contact-subject').inputValue(), 'General question');
  assert.equal(await page.locator('#service-website').count(), 0);
  await page.locator('#contact-name').focus();
  assert.deepEqual(await funnelEvents(), []);
  checks.push('Existing service and general contact subjects');
  for (const url of ['/blog/best-aeo-tools-ai-search-visibility', '/tools/schema-checker']) {
    await goto(url);
    const link = page.getByRole('link', { name: 'Explore implementation', exact: true });
    assert.equal(await link.count(), 1);
    assert.equal(await link.getAttribute('href'), path + '?source=content');
    await link.click();
    await page.waitForURL(origin + path + '?source=content');
    assert.deepEqual((await funnelEvents()).filter(item => item.event === 'service_cta_click'), [{ event: 'service_cta_click', aeocheck_event_version: 1, aeocheck_source: 'content', aeocheck_engagement: null }]);
  }
  checks.push('Comparison guide and tool service discovery');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await goto('/pricing');
    const software = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).find(value => value['@type'] === 'SoftwareApplication'));
    assert.equal(software.hasOfferCatalog, undefined);
    assert.deepEqual(software.offers.map(offer => [offer.name, offer.price, offer.priceCurrency]), [['Free', '0', 'USD'], ['Starter', '9', 'USD'], ['Pro', '19', 'USD'], ['Agency', '49', 'USD']]);
    assert.match(software.offers[3].description, /Unlimited monitored URLs/);
    assert.doesNotMatch(JSON.stringify(software), /-1 monitored/);
    assert.deepEqual(software.offers.filter(offer => offer.priceSpecification).map(offer => offer.name), ['Pro', 'Agency']);
    for (const price of ['$0', '$9', '$19', '$49']) assert.equal(await page.getByText(price, { exact: true }).count(), 1);
    await noOverflow();
    for (const [label, price] of [['starter', '$9'], ['agency', '$49']]) {
      await page.getByText(price, { exact: true }).scrollIntoViewIfNeeded();
      await screenshot(`software-pricing-${label}-${width}`);
    }
  }
  checks.push('Software pricing at both widths: preserved visible prices, direct offers/intervals, unlimited sentinel translated and canonical JSON-LD');

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
    await block.locator('a').click();
    await page.waitForURL(origin + path + '?source=' + source);
    assert.equal((await funnelEvents()).find(item => item.event === 'service_cta_click')?.aeocheck_source, source);
  }
  checks.push('One homepage/pricing CTA and responsive neighboring sections');

  const fixtureModule = { exports: {} };
  const compiled = ts.transpileModule(await readFile('lib/sample-report.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(compiled.outputText, { exports: fixtureModule.exports });
  const sample = fixtureModule.exports.SAMPLE_REPORT;
  await goto('/blog/best-aeo-tools-ai-search-visibility');
  assert.equal(await page.getByRole('link', { name: 'view a sample report', exact: true }).getAttribute('href'), '/sample-report');
  await page.getByRole('link', { name: 'Run the free AEO checker', exact: true }).click();
  await page.waitForURL(origin + '/');
  await page.getByRole('form', { name: 'Scan a website', exact: true }).waitFor();
  checks.push('Existing best-checker guide to scanner and sample-report journey');
  let scanSucceeds = false;
  await page.route('**/api/scan', async route => {
    const result = { ...sample, reportId: 'funnel-synthetic', url: 'https://example.invalid/private?token=secret', isFullReport: false, unlocked: false };
    const stream = [{ type: 'progress', step: 6, label: 'Complete', status: 'complete' }, { type: 'result', result }].map(event => 'data: ' + JSON.stringify(event) + '\n\n').join('');
    await route.fulfill(scanSucceeds ? { status: 200, contentType: 'text/event-stream', body: stream } : { status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic failed scan' }) });
  });
  for (const success of [false, true]) {
    scanSucceeds = success;
    await goto('/');
    const form = page.getByRole('form', { name: 'Scan a website', exact: true });
    await form.locator('input').fill('https://example.invalid/private?token=secret');
    await form.getByRole('button', { name: 'Scan My Website', exact: true }).click();
    if (success) await page.waitForURL(origin + '/report?id=funnel-synthetic');
    else await page.getByText('Synthetic failed scan', { exact: true }).waitFor();
    const events = await funnelEvents();
    assert.deepEqual(events.map(item => item.event), success ? ['scan_start', 'scan_complete'] : ['scan_start']);
    for (const event of events) assert.deepEqual(Object.keys(event).sort(), ['aeocheck_engagement', 'aeocheck_event_version', 'aeocheck_source', 'event']);
    assert.doesNotMatch(JSON.stringify(events), /example\.invalid|secret|funnel-synthetic/);
  }
  checks.push('Synthetic scanner dispatch/completion signals, no completion on failure, and no scanned URL/report token in event payloads');

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

  {
    const id = 'synthetic-resource-evidence';
    const checks = [
      { id: 'robots', label: 'Robots policy', status: 'warn', detail: 'robots.txt could not be verified: scanner request restricted (HTTP 403); absence is not established', weight: 2, diagnostic: { state: 'blocked', httpStatus: 403 } },
      { id: 'sitemap', label: 'Sitemap response', status: 'warn', detail: 'sitemap.xml could not be verified: HTTP 503; absence is not established', weight: 2, diagnostic: { state: 'http_error', httpStatus: 503 } },
      { id: 'llms_txt', label: 'Optional llms summary', status: 'warn', detail: 'llms.txt not found (HTTP 404)', weight: 2, diagnostic: { state: 'not_found', httpStatus: 404 } },
    ];
    const fixture = { ...sample, reportId: id, url: 'https://example.invalid', checks, aiInsights: null, unlocked: true, isFullReport: true };
    await page.addInitScript(({ id, fixture }) => sessionStorage.setItem(`aeocheck_report:${id}`, JSON.stringify(fixture)), { id, fixture });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await goto('/report?id=' + id);
      for (const title of ['Robots policy', 'Sitemap response', 'Optional llms summary']) {
        const card = page.locator('.issue-accordion-card').filter({ has: page.locator('.issue-toggle-title', { hasText: title }) });
        await card.getByRole('button', { name: 'Expand details for ' + title, exact: true }).click();
        const text = await card.locator('.issue-expanded').innerText();
        assert.match(text, title === 'Optional llms summary' ? /optional \/llms\.txt summary/ : /retry before creating or replacing a file/);
        if (title !== 'Optional llms summary') assert.match(text, /absence is not established/);
        else assert.match(text, /does not guarantee AI inclusion/);
        await noOverflow();
        await card.scrollIntoViewIfNeeded();
        if (title !== 'Sitemap response') await screenshot(`resource-${title === 'Robots policy' ? 'restricted' : 'missing'}-${width}`);
      }
      const pack = page.getByRole('region', { name: 'Fix pack', exact: true });
      assert.equal(await pack.getByRole('heading', { name: 'robots.txt that welcomes AI crawlers', exact: true }).count(), 0);
      await pack.getByRole('heading', { name: 'llms.txt starter', exact: true }).waitFor();
    }
  }
  checks.push('Resource evidence at desktop/mobile: restricted/error verification-first guidance, optional confirmed-missing summary, no replacement robots starter');

  for (const state of ['generated', 'legacy', 'local']) {
    const id = `source-${state}`;
    const insights = state === 'local' ? null : { ...sample.aiInsights };
    if (state === 'generated') insights.provenance = {
      kind: 'provider_generated', provider: 'OpenRouter', requestedModel: 'openrouter/free',
      responseModel: 'vendor/model-v2', generatedAt: '2026-10-25T10:15:00.000Z',
    };
    const fixture = { ...sample, reportId: id, url: 'https://example.invalid', aiInsights: insights, unlocked: true, isFullReport: true };
    await page.addInitScript(({ id, fixture }) => sessionStorage.setItem(`aeocheck_report:${id}`, JSON.stringify(fixture)), { id, fixture });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await goto('/report?id=' + id);
      const note = page.locator('.report-stack .recommendation-source');
      await note.waitFor();
      const text = await note.innerText();
      assert.match(text, state === 'generated' ? /AI-generated guidance with rule-based checks/ : state === 'legacy' ? /Analysis source unavailable/ : /Local rule-based guidance/);
      if (state === 'generated') {
        assert.match(text, /2026-10-25 10:15:00 UTC/);
        assert.match(text, /Requested model: openrouter\/free/);
        assert.match(text, /Provider-reported model: vendor\/model-v2/);
      } else assert.equal(await note.locator('time').count(), 0);
      await noOverflow();
      await note.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100));
      assert(await note.evaluate(el => el.getBoundingClientRect().top >= 90), 'Source note clears sticky header');
      await screenshot(`recommendation-${state}-${width}`);
      if (state === 'generated' && width === 1280) {
        // Guest reports intentionally do not mount paid PrintLayout. Review its synthetic
        // SSR fixture with the same loaded styles, without modifying application access.
        assert.equal(await page.locator('.print-layout').count(), 0);
        const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => link.outerHTML).join(''));
        const printHtml = await readFile(`${output}/print-source-fixture.html`, 'utf8');
        await page.setContent(`<html><head>${styles}</head><body>${printHtml}</body></html>`, { waitUntil: 'networkidle' });
        await page.emulateMedia({ media: 'print' });
        const printed = page.locator('.print-layout .recommendation-source');
        assert.equal(await printed.isVisible(), true);
        assert.equal(await printed.innerText(), text);
        await printed.scrollIntoViewIfNeeded();
        await screenshot('recommendation-print');
        await page.emulateMedia({ media: 'screen' });
      }
    }
  }
  checks.push('Generated, unknown legacy and local recommendation disclosures at both widths; matching printable provenance');

  // Actual tracker markup with synthetic hook data only; no admin login or provider request.
  await goto('/ai-visibility');
  const trackerStyles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => link.outerHTML).join(''));
  const trackerHtml = await readFile(`${output}/visibility-destination-fixture.html`, 'utf8');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.setContent(`<html><head>${trackerStyles}</head><body><main><section class="launch-section llms-tool-section"><div class="launch-container">${trackerHtml}</div></section></main></body></html>`, { waitUntil: 'networkidle' });
    for (const summary of await page.locator('summary').all()) await summary.click();
    assert.match(await page.locator('body').innerText(), /wrapper.example: reached aeocheck.co/);
    assert.match(await page.locator('body').innerText(), /source destination not verified/);
    assert.match(await page.locator('body').innerText(), /older or unverified citation method/);
    await noOverflow();
    await page.locator('.llms-tool-result').scrollIntoViewIfNeeded();
    await screenshot(`visibility-destinations-${width}`);
    await page.locator('.vis-history').scrollIntoViewIfNeeded();
    await screenshot(`visibility-history-${width}`);
  }
  checks.push('Synthetic actual tracker markup at both widths: checked destinations, unavailable sources and older-method history labels; no provider/admin acceptance claimed');

  // Actual crawler-tool UI, isolated API responses; no external site crawl or quota mutation.
  let crawlerOutcome = 'training';
  const crawlerUrl = 'https://example.invalid/private?mode=secret';
  await page.route('**/api/tools/ai-crawler-check', async route => {
    assert.equal(route.request().method(), 'POST');
    assert.equal(route.request().postDataJSON().url, crawlerUrl);
    if (crawlerOutcome === 'error') return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'The robots.txt response was not a verified text policy. No crawler access verdict is available; check the response and retry.' }) });
    const crawlers = [
      { token: 'oai-searchbot', label: 'OAI-SearchBot (ChatGPT search)', kind: 'search', allowed: crawlerOutcome !== 'search', source: crawlerOutcome === 'missing' ? 'default' : 'wildcard' },
      { token: 'gptbot', label: 'GPTBot (OpenAI)', kind: 'training', allowed: crawlerOutcome === 'missing', source: crawlerOutcome === 'missing' ? 'default' : 'own' },
      { token: 'chatgpt-user', label: 'ChatGPT-User', kind: 'user', allowed: true, source: 'default' },
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ origin: 'https://example.invalid', checkedUrl: crawlerUrl, requestedRobotsUrl: 'https://example.invalid/robots.txt', robotsUrl: 'https://cdn.example.invalid/policy', found: crawlerOutcome !== 'missing', crawlers }) });
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await goto('/tools/ai-crawler-checker');
    const faq = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
    assert.match(JSON.stringify(faq), /Allowing it does not prove/);
    await page.getByRole('textbox', { name: 'Website URL' }).fill(crawlerUrl);
    for (const outcome of ['training', 'search', 'missing', 'error']) {
      crawlerOutcome = outcome;
      await page.getByRole('button', { name: 'Check AI crawlers', exact: true }).click();
      if (outcome === 'error') {
        await page.getByRole('alert').waitFor();
        assert.equal(await page.locator('.llms-tool-result').count(), 0);
      } else {
        await page.locator('.crawler-verdict').waitFor();
        const expected = outcome === 'training' ? 'Search rules allow; other controls restrict' : outcome === 'search' ? 'Search crawling disallowed by robots.txt' : 'No robots policy found (HTTP 404)';
        await until(async () => (await page.locator('.crawler-verdict strong').innerText()) === expected, 'crawler verdict');
        assert.match(await page.locator('.crawler-verdict').innerText(), /not fetched/);
        assert.match(await page.locator('.crawler-verdict').innerText(), /private\?mode=secret/);
        assert.doesNotMatch(await page.locator('.llms-tool-result').innerText(), /Visible in AI search|cannot appear|keeps your content out/);
        assert.equal(await page.getByRole('heading', { name: 'Training and reuse controls', exact: true }).count(), 1);
      }
      await noOverflow();
      await screenshot(`crawler-${outcome}-${width}`, true);
    }
  }
  await page.unroute('**/api/tools/ai-crawler-check');
  checks.push('Crawler tool desktop/mobile: submitted page scope, search versus training/reuse rule labels, HTTP404 defaults and unavailable retry without stale verdict; FAQ/schema agree; no actual crawl or inclusion claim');

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
