import { chromium } from 'playwright';

const PREVIEW_BASE = process.env.PREVIEW_URL || 'https://0dd2e1d5.whichaipick.pages.dev';
const TOOLS = [
  { id: 'browse-ai', name: 'Browse AI', expectedPrice: 'Free Plan' },
  { id: 'chatpdf', name: 'ChatPDF', expectedPrice: 'Free Plan' },
  { id: 'capacities', name: 'Capacities', expectedPrice: 'Basic Plan' },
  { id: 'diffit', name: 'Diffit', expectedPrice: 'Basic Plan' },
  { id: 'cleanvoice', name: 'Cleanvoice', expectedPrice: 'Free Trial' },
  { id: 'anythingllm', name: 'AnythingLLM', expectedPrice: 'AnythingLLM Desktop' },
  { id: 'flair-ai', name: 'Flair AI', expectedPrice: 'Free Tier' }
];

async function run() {
  console.log(`[PLAYWRIGHT AUDIT] Testing 7 Batch 2 tools on preview: ${PREVIEW_BASE}\n`);
  const browser = await chromium.launch();
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  const assert = (condition, msg) => {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✅ PASS: ${msg}`);
    } else {
      failedChecks++;
      console.error(`  ❌ FAIL: ${msg}`);
    }
  };

  for (const tool of TOOLS) {
    const url = `${PREVIEW_BASE}/tools/${tool.id}/`;
    console.log(`--- Testing Tool: ${tool.name} (${tool.id}) ---`);

    // 1. Direct HTTP Header & Canonical Check
    const res = await fetch(url);
    assert(res.status === 200, `${tool.id} returns HTTP 200 (actual=${res.status})`);
    const xRobots = res.headers.get('x-robots-tag') || '';
    assert(xRobots.includes('noindex'), `${tool.id} has preview noindex header (actual="${xRobots}")`);

    // 2. Desktop Viewport (1280px)
    const contextDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageDesktop = await contextDesktop.newPage();
    const consoleErrorsDesktop = [];
    pageDesktop.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && !text.includes('cloudflareinsights.com') && !text.includes('net::ERR_FAILED')) {
        consoleErrorsDesktop.push(text);
      }
    });

    await pageDesktop.goto(url, { waitUntil: 'networkidle' });

    // Canonical link
    const canonical = await pageDesktop.getAttribute('link[rel="canonical"]', 'href');
    assert(canonical === `https://whichaipick.com/tools/${tool.id}/`, `${tool.id} [Desktop] canonical is apex (actual="${canonical}")`);

    // Page title
    const title = await pageDesktop.title();
    assert(title.includes(tool.name), `${tool.id} [Desktop] title includes "${tool.name}" (actual="${title}")`);

    // H1 header
    const h1 = await pageDesktop.textContent('h1');
    assert(h1.includes(tool.name), `${tool.id} [Desktop] H1 includes "${tool.name}" (actual="${h1.trim()}")`);

    // Editorial sections rendered
    const hasPricing = (await pageDesktop.locator('h2:has-text("Pricing")').count()) > 0;
    assert(hasPricing, `${tool.id} [Desktop] Pricing section rendered`);

    const hasHowItWorks = (await pageDesktop.locator('h2:has-text("How It Works")').count()) > 0;
    assert(hasHowItWorks, `${tool.id} [Desktop] How It Works section rendered`);

    const hasFeatures = (await pageDesktop.locator('h4').count()) >= 2;
    assert(hasFeatures, `${tool.id} [Desktop] At least 2 Feature Groups rendered`);

    const hasBestFor = (await pageDesktop.locator('h2:has-text("Best For"), h3:has-text("Best for"), h3:has-text("Best For")').count()) > 0;
    assert(hasBestFor, `${tool.id} [Desktop] Best For section rendered`);

    const hasLimitations = (await pageDesktop.locator('h3:has-text("Limitations")').count()) > 0;
    assert(hasLimitations, `${tool.id} [Desktop] Limitations section rendered`);

    const hasHowItCompares = (await pageDesktop.locator('h2:has-text("How It Compares")').count()) > 0;
    assert(hasHowItCompares, `${tool.id} [Desktop] How It Compares section rendered`);

    // Verified Price text
    const bodyText = await pageDesktop.textContent('body');
    assert(bodyText.includes(tool.expectedPrice), `${tool.id} [Desktop] Pricing text mentions "${tool.expectedPrice}"`);

    // Horizontal overflow check
    const scrollWidthDesktop = await pageDesktop.evaluate(() => document.documentElement.scrollWidth);
    assert(scrollWidthDesktop <= 1280, `${tool.id} [Desktop] No horizontal overflow (scrollWidth=${scrollWidthDesktop})`);

    // Console errors
    assert(consoleErrorsDesktop.length === 0, `${tool.id} [Desktop] Zero console errors (${consoleErrorsDesktop.join(', ') || 'none'})`);

    await contextDesktop.close();

    // 3. Mobile Viewport (390px)
    const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' });
    const pageMobile = await contextMobile.newPage();
    const consoleErrorsMobile = [];
    pageMobile.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && !text.includes('cloudflareinsights.com') && !text.includes('net::ERR_FAILED')) {
        consoleErrorsMobile.push(text);
      }
    });

    await pageMobile.goto(url, { waitUntil: 'networkidle' });

    // Mobile horizontal overflow check
    const scrollWidthMobile = await pageMobile.evaluate(() => document.documentElement.scrollWidth);
    assert(scrollWidthMobile <= 390, `${tool.id} [Mobile] No horizontal overflow (scrollWidth=${scrollWidthMobile})`);

    // Mobile buttons visible
    const ctaVisible = await pageMobile.locator('.tool-cta-section a, .tool-hero-cta a, .btn-primary').first().isVisible();
    assert(ctaVisible, `${tool.id} [Mobile] Primary CTA button visible`);

    // Console errors mobile
    assert(consoleErrorsMobile.length === 0, `${tool.id} [Mobile] Zero console errors (${consoleErrorsMobile.join(', ') || 'none'})`);

    await contextMobile.close();
    console.log('');
  }

  await browser.close();

  console.log(`======================================================`);
  console.log(`PLAYWRIGHT PREVIEW AUDIT COMPLETE`);
  console.log(`TOTAL CHECKS:  ${totalChecks}`);
  console.log(`PASSED CHECKS: ${passedChecks}`);
  console.log(`FAILED CHECKS: ${failedChecks}`);
  console.log(`======================================================`);

  if (failedChecks > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error during Playwright preview audit:', err);
  process.exit(1);
});
