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
                        ext === '.json' ? 'application/json' :
                        ext === '.png' ? 'image/png' :
                        ext === '.svg' ? 'image/svg+xml' : 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

const TOOLS = [
  {
    id: 'deepl',
    name: 'DeepL',
    category: 'Productivity',
    expectedPriceSnippet: '$8.74/month',
    workflows: ['Customer support', 'Document localisation', 'Software localisation']
  },
  {
    id: 'languagetool',
    name: 'LanguageTool',
    category: 'Content Creation',
    expectedPriceSnippet: 'LanguageTool offers a free service and paid Premium',
    workflows: ['Multilingual emails', 'Team documentation', 'Local technical writing']
  },
  {
    id: 'paperpal',
    name: 'Paperpal',
    category: 'Content Creation',
    expectedPriceSnippet: 'Prime at $12/month',
    workflows: ['Manuscript editing', 'Thesis preparation', 'Pre-submission review']
  },
  {
    id: 'askyourpdf',
    name: 'AskYourPDF',
    category: 'Research',
    expectedPriceSnippet: '$11.99/month',
    workflows: ['Research literature', 'Technical documentation', 'Financial reports']
  },
  {
    id: 'nanonets',
    name: 'Nanonets',
    category: 'Automation',
    expectedPriceSnippet: '$100/month for 100 credits',
    workflows: ['Invoice processing', 'Logistics records', 'Operations automation']
  }
];

async function run() {
  const server = createStaticServer(WORKTREE_ROOT);
  await new Promise(resolve => server.listen(8768, resolve));
  const baseUrl = 'http://localhost:8768';
  console.log(`[PLAYWRIGHT AUDIT] Testing against LOCAL server: ${baseUrl}\n`);

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
    for (const tool of TOOLS) {
      const url = `${baseUrl}/tools/${tool.id}/`;
      console.log(`\n======================================================`);
      console.log(`--- Testing Tool Profile: ${tool.name} (${tool.id}) ---`);
      console.log(`======================================================`);

      // ── DESKTOP AUDIT (1280x800) ──────────────────────────
      const contextDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const pageDesktop = await contextDesktop.newPage();
      const consoleErrors = [];
      pageDesktop.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await pageDesktop.goto(url, { waitUntil: 'domcontentloaded' });

      // Check H1
      const h1Text = await pageDesktop.locator('h1').first().textContent();
      assert(h1Text.trim() === tool.name, `Desktop H1 exactly matches "${tool.name}" (actual="${h1Text.trim()}")`);

      // Check Category
      const heroCategory = await pageDesktop.locator('.tool-hero-category').textContent();
      assert(heroCategory.trim() === tool.category, `Hero category badge matches "${tool.category}"`);

      // Check Canonical
      const canonicalHref = await pageDesktop.locator('link[rel="canonical"]').getAttribute('href');
      assert(canonicalHref === `https://whichaipick.com/tools/${tool.id}/`, `Canonical URL matches production: ${canonicalHref}`);

      // Check Headings
      const bestFor = await pageDesktop.locator('h2:text("Best For")').count();
      assert(bestFor === 1, `Best For section heading present`);

      const notIdealFor = await pageDesktop.locator('h2:text("Not Ideal For")').count();
      assert(notIdealFor === 1, `Not Ideal For section heading present`);

      const howItWorks = await pageDesktop.locator('h2:text("How It Works")').count();
      assert(howItWorks === 1, `How It Works section heading present`);

      const keyFeatures = await pageDesktop.locator('h2:text("Key Features")').count();
      assert(keyFeatures === 1, `Key Features section heading present`);

      const strengths = await pageDesktop.locator('h2:text("Strengths & Limitations")').count();
      assert(strengths === 1, `Strengths & Limitations section heading present`);

      const pricing = await pageDesktop.locator('h2:text("Pricing")').count();
      assert(pricing === 1, `Pricing section heading present`);

      const compSummary = await pageDesktop.locator('h2:text("How It Compares")').count();
      assert(compSummary === 1, `How It Compares section heading present`);

      // Check Pricing Narrative Content
      const pricingBody = await pageDesktop.locator('.tool-section:has(h2:text("Pricing"))').textContent();
      assert(pricingBody.includes(tool.expectedPriceSnippet), `Pricing body contains expected snippet ("${tool.expectedPriceSnippet}")`);

      // Check Workflows Visibility in Public DOM
      const workflowsH2 = await pageDesktop.locator('h2:text("Practical Workflows")').count();
      assert(workflowsH2 === 1, `Practical Workflows h2 heading present on ${tool.id} (actual=${workflowsH2})`);

      const workflowList = await pageDesktop.locator('ol.tool-workflow-list');
      assert((await workflowList.count()) === 1, `Semantic <ol class="tool-workflow-list"> element present on ${tool.id}`);

      const workflowItems = await pageDesktop.locator('ol.tool-workflow-list li').count();
      assert(workflowItems === 3, `Exactly 3 workflow items in ol.tool-workflow-list on ${tool.id} (actual=${workflowItems})`);

      for (const expectedTitle of tool.workflows) {
        const titleMatch = await pageDesktop.locator(`ol.tool-workflow-list li strong:text("${expectedTitle}:")`).count();
        assert(titleMatch === 1, `Workflow title "${expectedTitle}:" rendered inside strong tag on ${tool.id}`);
      }

      // Check Nested Paragraph Defect
      const nestedP = await pageDesktop.locator('p p').count();
      assert(nestedP === 0, `Zero invalid nested paragraphs <p><p> (actual=${nestedP})`);

      // Check Console Errors
      assert(consoleErrors.length === 0, `Zero browser console errors (actual=${consoleErrors.length})`);

      // ── MOBILE AUDIT (390x844 & 360x740) ──────────────────
      for (const width of [390, 360]) {
        const contextMobile = await browser.newContext({ viewport: { width, height: 800 } });
        const pageMobile = await contextMobile.newPage();
        await pageMobile.goto(url, { waitUntil: 'domcontentloaded' });

        const hasHorizontalScroll = await pageMobile.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        assert(!hasHorizontalScroll, `Mobile viewport (${width}px) has zero horizontal overflow`);

        await contextMobile.close();
      }

      await contextDesktop.close();
    }

    console.log(`\n======================================================`);
    console.log(`PLAYWRIGHT AUDIT SUMMARY`);
    console.log(`Total Checks:  ${totalChecks}`);
    console.log(`Passed Checks: ${passedChecks}`);
    console.log(`Failed Checks: ${failedChecks}`);
    console.log(`Final Status:  ${failedChecks === 0 ? '✅ ALL CHECKS PASSED' : '❌ FAILED'}`);
    console.log(`======================================================\n`);

  } finally {
    await browser.close();
    server.close();
  }

  if (failedChecks > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
