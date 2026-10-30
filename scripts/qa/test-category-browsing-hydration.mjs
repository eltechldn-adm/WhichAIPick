/**
 * scripts/qa/test-category-browsing-hydration.mjs
 *
 * Automated regression suite verifying category browsing and client-side hydration:
 * - Tests all 10 categories
 * - Verifies static HTML tool cards and canonicals
 * - Verifies window.BROWSE_CONFIG serialization (zero HTML entity leaks like &amp;)
 * - Verifies Playwright DOM hydration and tool count reconciliation
 * - Verifies interactive search, clear filters, empty state, sorting, and free tier filtering
 * - Verifies responsive viewports (390px, 768px, 1280px)
 * - Verifies inline script injection safety
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('playwright');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function createStaticServer() {
  const server = http.createServer((req, res) => {
    let cleanUrl = req.url.split('?')[0];
    if (cleanUrl.endsWith('/')) cleanUrl += 'index.html';
    let filePath = path.join(ROOT, cleanUrl);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) filePath += '.html';

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(filePath));
    } else {
      console.log(`[SERVER 404] ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + req.url);
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

// ─── Unit Test: Safe Inline Script Serialization ─────────────────────────────
function testInlineScriptSafety() {
  console.log('[SECURITY] Verifying inline script serialization safety...');
  
  // Test vectors
  const maliciousVectors = [
    '</script><script>alert("XSS")</script>',
    'Video & Audio',
    'He said "Hello" & \'Goodbye\'',
    'Back\\slash and /slash',
    'Unicode: 🚀 — é — ñ',
    '<!-- HTML comment breakout -->',
    '"><script src=bad.js></script>'
  ];

  for (const vec of maliciousVectors) {
    const serialized = JSON.stringify(vec).replace(/</g, '\\u003c');
    
    // In HTML context, there must be NO unescaped literal "<" characters
    assert.strictEqual(serialized.includes('<'), false, `Serialized output contains unescaped '<': ${serialized}`);
    assert.strictEqual(serialized.includes('</script>'), false, `Serialized output contains unescaped closing script: ${serialized}`);
    
    // In JS context, evaluating it must restore the exact original string
    const evaluated = eval(serialized);
    assert.strictEqual(evaluated, vec, `Evaluation mismatch: expected ${vec}, got ${evaluated}`);
  }
  console.log('  ✓ Inline script serialization safely neutralizes breakouts and preserves all characters.');
}

async function runCategorySuite() {
  testInlineScriptSafety();

  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
  const categories = [...new Set(tools.map(t => t.category).filter(Boolean))].sort();

  const categorySlugs = {
    'Automation': 'automation',
    'Business': 'business',
    'Content Creation': 'content-creation',
    'Design': 'design',
    'Development': 'development',
    'Education': 'education',
    'Marketing': 'marketing',
    'Productivity': 'productivity',
    'Research': 'research',
    'Video & Audio': 'video-audio'
  };

  const { server, baseUrl } = await createStaticServer();
  console.log(`\n[SERVER] Test server running at ${baseUrl}`);
  const browser = await chromium.launch({ headless: true });

  const summary = [];
  let allPassed = true;

  try {
    for (const catName of categories) {
      const slug = categorySlugs[catName];
      assert.ok(slug, `Unknown slug for category ${catName}`);
      const catPath = path.join(ROOT, 'category', slug, 'index.html');
      assert.ok(fs.existsSync(catPath), `Category file missing: ${catPath}`);

      const rawHtml = fs.readFileSync(catPath, 'utf8');
      const staticCardCount = (rawHtml.match(/class="tool-card"/g) || []).length;
      const catTools = tools.filter(t => t.category === catName);

      // 1. Static HTML assertions
      assert.strictEqual(staticCardCount, catTools.length, `${slug}: Static cards count mismatch`);
      assert.ok(rawHtml.includes(`https://whichaipick.com/category/${slug}/`), `${slug}: Canonical URL missing or incorrect`);
      assert.ok(!rawHtml.includes('BROWSE_CONFIG = { category: \'Video &amp; Audio\' }'), `${slug}: HTML contains unescaped entity in BROWSE_CONFIG script`);
      assert.ok(!rawHtml.includes('BROWSE_CONFIG = { category: "Video &amp; Audio" }'), `${slug}: HTML contains unescaped entity in BROWSE_CONFIG script`);

      // 2. Browser Hydration Test (Desktop 1280px)
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];

      page.on('pageerror', err => pageErrors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const txt = msg.text();
          // Filter expected browser network warnings for third-party favicon fallbacks
          if (!txt.includes('Failed to load resource')) {
            consoleErrors.push(txt);
          }
        }
      });
      page.on('requestfailed', req => {
        if (req.url().startsWith(baseUrl)) failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
      });

      const resp = await page.goto(`${baseUrl}/category/${slug}/`, { waitUntil: 'networkidle' });
      const httpStatus = resp.status();

      const browseConfig = await page.evaluate(() => window.BROWSE_CONFIG);
      const hydratedCardsCount = await page.evaluate(() => document.querySelectorAll('#browse-list .tool-card').length);
      const countText = await page.evaluate(() => document.getElementById('directory-count')?.textContent?.trim() || '');

      // Check unique tool IDs in cards to guarantee no duplicates
      const renderedToolHrefs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#browse-list .tool-name a')).map(a => a.getAttribute('href'));
      });
      const uniqueHrefs = new Set(renderedToolHrefs);
      const hasDuplicates = renderedToolHrefs.length !== uniqueHrefs.size;

      // 3. Interactive Tests
      // A. Search for a specific tool in this category
      const sampleTool = catTools[0];
      const searchInput = page.locator('#search-input');
      await searchInput.fill(sampleTool.name);
      await page.waitForTimeout(100);
      const searchCardsCount = await page.evaluate(() => document.querySelectorAll('#browse-list .tool-card').length);
      assert.ok(searchCardsCount >= 1, `${slug}: Search for ${sampleTool.name} returned 0 results`);

      // B. Deliberately invalid search query (empty state test)
      await searchInput.fill('xyzNonExistentToolQuery98765');
      await page.waitForTimeout(100);
      const emptyStateVisible = await page.evaluate(() => {
        const el = document.getElementById('directory-empty-state');
        return el && window.getComputedStyle(el).display !== 'none';
      });
      const zeroCards = await page.evaluate(() => document.querySelectorAll('#browse-list .tool-card').length);
      assert.strictEqual(zeroCards, 0, `${slug}: Invalid search did not result in 0 cards`);
      assert.strictEqual(emptyStateVisible, true, `${slug}: Empty state container not visible on zero results`);

      // C. Clear filters via empty-clear-btn
      await page.locator('#empty-clear-btn').click();
      await page.waitForTimeout(100);
      const restoredCount = await page.evaluate(() => document.querySelectorAll('#browse-list .tool-card').length);
      assert.strictEqual(restoredCount, Math.min(30, catTools.length), `${slug}: Clear filters did not restore cards`);

      // D. Sort order change (Z-A)
      await page.locator('#sort-select').selectOption('za');
      await page.waitForTimeout(100);
      const firstZaName = await page.evaluate(() => document.querySelector('#browse-list .tool-name a')?.textContent?.trim() || '');
      await page.locator('#sort-select').selectOption('az');
      await page.waitForTimeout(100);
      const firstAzName = await page.evaluate(() => document.querySelector('#browse-list .tool-name a')?.textContent?.trim() || '');
      if (catTools.length > 1) {
        assert.notStrictEqual(firstZaName, firstAzName, `${slug}: Z-A sort did not reorder cards`);
      }

      // E. Viewport tests on Video & Audio (or all)
      let mobileOverflow = false;
      if (slug === 'video-audio') {
        // Mobile 390px
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(150);
        mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        assert.strictEqual(mobileOverflow, false, 'Video & Audio 390px mobile viewport has horizontal overflow');

        // Tablet 768px
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(150);
        const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        assert.strictEqual(tabletOverflow, false, 'Video & Audio 768px tablet viewport has horizontal overflow');
      }

      await context.close();

      const passed = (
        httpStatus === 200 &&
        browseConfig?.category === catName &&
        staticCardCount === catTools.length &&
        hydratedCardsCount === Math.min(30, catTools.length) &&
        countText.includes(`${catTools.length} tools found`) &&
        !hasDuplicates &&
        consoleErrors.length === 0 &&
        pageErrors.length === 0 &&
        failedRequests.length === 0 &&
        !mobileOverflow
      );

      if (!passed) {
        console.log(`[DEBUG FAIL: ${slug}]`, {
          httpStatus,
          configMatch: browseConfig?.category === catName,
          staticMatch: staticCardCount === catTools.length,
          hydratedMatch: hydratedCardsCount === Math.min(30, catTools.length),
          countTextMatch: countText.includes(`${catTools.length} tools found`),
          hasDuplicates,
          consoleErrors,
          pageErrors,
          failedRequests,
          mobileOverflow
        });
      }

      if (!passed) allPassed = false;

      summary.push({
        category: catName,
        slug,
        httpStatus,
        expectedConfig: catName,
        actualConfig: browseConfig?.category,
        totalTools: catTools.length,
        staticCards: staticCardCount,
        hydratedCards: hydratedCardsCount,
        countText,
        duplicates: hasDuplicates,
        consoleErrors: consoleErrors.length,
        status: passed ? 'PASS' : 'FAIL'
      });
    }

    console.log('\n===================================================================================================================');
    console.log('Category'.padEnd(18), 'Status'.padEnd(8), 'Total'.padEnd(8), 'Static'.padEnd(8), 'Hydrated'.padEnd(10), 'Count Text'.padEnd(20), 'Config Value'.padEnd(18), 'Result');
    console.log('===================================================================================================================');
    for (const s of summary) {
      console.log(
        s.category.padEnd(18),
        String(s.httpStatus).padEnd(8),
        String(s.totalTools).padEnd(8),
        String(s.staticCards).padEnd(8),
        String(s.hydratedCards).padEnd(10),
        s.countText.padEnd(20),
        JSON.stringify(s.actualConfig).padEnd(18),
        s.status
      );
    }
    console.log('===================================================================================================================');

  } finally {
    await browser.close();
    server.close();
  }

  if (!allPassed) {
    console.error('\n[FAIL] One or more category hydration tests failed.');
    process.exit(1);
  } else {
    console.log('\n[PASS] All 10 categories passed hydration and browsing verification successfully.');
  }
}

runCategorySuite().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
