import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const WORKTREE_ROOT = process.cwd();

// Simple static server for local testing
function createStaticServer(root) {
  return http.createServer((req, res) => {
    let filePath = path.join(root, req.url.split('?')[0]);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html' :
                        ext === '.css' ? 'text/css' :
                        ext === '.js' ? 'application/javascript' :
                        ext === '.json' ? 'application/json' : 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

const TOOLS = [
  { id: 'cline', name: 'Cline', expectedPrice: 'free and open-source' },
  { id: 'coderabbit', name: 'CodeRabbit', expectedPrice: 'Free Plan' },
  { id: 'tabby', name: 'Tabby', expectedPrice: 'free, open-source' },
  { id: 'sourcery', name: 'Sourcery', expectedPrice: 'Free Plan' },
  { id: 'zed', name: 'Zed', expectedPrice: 'free and open-source' }
];

async function run() {
  const remoteBase = process.env.PREVIEW_URL;
  let server = null;
  let baseUrl = remoteBase;

  if (remoteBase) {
    console.log(`[PLAYWRIGHT AUDIT] Testing against REMOTE Cloudflare preview: ${remoteBase}\n`);
  } else {
    server = createStaticServer(WORKTREE_ROOT);
    await new Promise(resolve => server.listen(8765, resolve));
    baseUrl = 'http://localhost:8765';
    console.log(`[PLAYWRIGHT AUDIT] Testing against LOCAL server: ${baseUrl}\n`);
  }

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

  try {
    // 1. Audit the 5 Enriched Tool Pages
    for (const tool of TOOLS) {
      const url = `${baseUrl}/tools/${tool.id}/`;
      console.log(`--- Testing Tool Profile: ${tool.name} (${tool.id}) ---`);

      // Desktop
      const contextDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const pageDesktop = await contextDesktop.newPage();
      const consoleErrors = [];
      pageDesktop.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await pageDesktop.goto(url, { waitUntil: 'domcontentloaded' });

      const h1Text = await pageDesktop.locator('h1').first().textContent();
      assert(h1Text.includes(tool.name), `Desktop H1 contains "${tool.name}"`);

      const howItWorks = await pageDesktop.locator('h2:text("How It Works")').count();
      assert(howItWorks === 1, `How It Works heading present`);

      const keyFeatures = await pageDesktop.locator('h2:text("Key Features")').count();
      assert(keyFeatures === 1, `Key Features heading present`);

      const strengths = await pageDesktop.locator('h2:text("Strengths & Limitations")').count();
      assert(strengths === 1, `Strengths & Limitations heading present`);

      const pricing = await pageDesktop.locator('h2:text("Pricing")').count();
      assert(pricing === 1, `Pricing heading present`);

      const pricingBody = await pageDesktop.locator('.tool-section:has(h2:text("Pricing"))').textContent();
      assert(pricingBody.includes(tool.expectedPrice), `Pricing overview contains expected price text ("${tool.expectedPrice}")`);

      // Mobile
      const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const pageMobile = await contextMobile.newPage();
      await pageMobile.goto(url, { waitUntil: 'domcontentloaded' });

      const hasHorizontalScroll = await pageMobile.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasHorizontalScroll, `Mobile viewport (390px) has zero horizontal overflow`);

      await contextDesktop.close();
      await contextMobile.close();
    }

    // 2. Audit Cursor Alternatives Page
    console.log(`--- Testing Alternatives Hub: Cursor Alternatives ---`);
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/alternatives/cursor/`, { waitUntil: 'domcontentloaded' });

      const h1Text = await page.locator('h1').first().textContent();
      assert(h1Text.includes('Cursor Alternatives'), `Alternatives H1 contains "Cursor Alternatives"`);

      const groupHeadings = await page.locator('.alternatives-group-header h2').allTextContents();
      assert(groupHeadings.length === 3, `Found 3 curated alternative groups`);
      assert(groupHeadings.some(h => h.includes('Direct Competitors')), `Group 1: Direct Competitors present`);
      assert(groupHeadings.some(h => h.includes('In-Editor Extensions')), `Group 2: In-Editor Extensions present`);
      assert(groupHeadings.some(h => h.includes('Code Review')), `Group 3: Code Review Assistants present`);

      const toolCards = await page.locator('.tool-card').count();
      assert(toolCards === 10, `Exactly 10 curated developer tool cards rendered (actual=${toolCards})`);

      // Mobile check
      const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const pageMobile = await contextMobile.newPage();
      await pageMobile.goto(`${baseUrl}/alternatives/cursor/`, { waitUntil: 'domcontentloaded' });
      const hasHorizontalScroll = await pageMobile.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasHorizontalScroll, `Cursor Alternatives mobile viewport (390px) has zero horizontal overflow`);

      await context.close();
      await contextMobile.close();
    }

    // 3. Audit Best AI Tools for Coding Page
    console.log(`--- Testing Category Hub: Best AI Tools for Coding ---`);
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/best-ai-tools/coding/`, { waitUntil: 'domcontentloaded' });

      const h1Text = await page.locator('h1').first().textContent();
      assert(h1Text.includes('Coding & Developers'), `Best Tools H1 contains "Coding & Developers"`);

      const toolCards = await page.locator('.tool-card').count();
      assert(toolCards === 10, `Exactly 10 curated coding tool cards rendered (actual=${toolCards})`);

      const guidance = await page.locator('.seo-editorial-guidance').textContent();
      assert(guidance.includes('How to Choose'), `Editorial guidance section present`);
      assert(guidance.includes('agentic autonomy'), `Deep editorial guidance rendered`);

      // Mobile check
      const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const pageMobile = await contextMobile.newPage();
      await pageMobile.goto(`${baseUrl}/best-ai-tools/coding/`, { waitUntil: 'domcontentloaded' });
      const hasHorizontalScroll = await pageMobile.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasHorizontalScroll, `Best Coding Tools mobile viewport (390px) has zero horizontal overflow`);

      await context.close();
      await contextMobile.close();
    }

    // 4. Audit Buying Guide Page
    console.log(`--- Testing Buying Guide: How to Choose an AI Coding Assistant ---`);
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/guides/how-to-choose-ai-coding-assistant/`, { waitUntil: 'domcontentloaded' });

      const h1Text = await page.locator('h1').first().textContent();
      assert(h1Text.includes('How to Choose an AI Coding Assistant'), `Guide H1 matches title`);

      const h2Count = await page.locator('.seo-guide-content h2').count();
      assert(h2Count >= 6, `Guide contains comprehensive sections (${h2Count} H2 headings)`);

      const matrixRows = await page.locator('.seo-guide-content table tbody tr').count();
      assert(matrixRows === 7, `Comparison matrix contains 7 tools in table (actual=${matrixRows})`);

      // Mobile check
      const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const pageMobile = await contextMobile.newPage();
      await pageMobile.goto(`${baseUrl}/guides/how-to-choose-ai-coding-assistant/`, { waitUntil: 'domcontentloaded' });
      const hasHorizontalScroll = await pageMobile.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasHorizontalScroll, `Buying Guide mobile viewport (390px) has zero horizontal overflow`);

      await context.close();
      await contextMobile.close();
    }

  } finally {
    await browser.close();
    if (server) server.close();
  }

  console.log(`\n======================================================`);
  console.log(`PLAYWRIGHT AUDIT RESULTS:`);
  console.log(`Total Checks:  ${totalChecks}`);
  console.log(`Passed Checks: ${passedChecks}`);
  console.log(`Failed Checks: ${failedChecks}`);
  console.log(`======================================================\n`);

  if (failedChecks > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('[CRITICAL TEST FAILURE]', err);
  process.exit(1);
});
