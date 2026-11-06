import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { ENRICHMENTS } from '../enrich-priority-batch4c.mjs';

const WORKTREE_ROOT = process.cwd();

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
    id: 'clay',
    name: 'Clay',
    category: 'Marketing',
    expectedPriceSnippet: "Clay's published FAQ lists 2,500 entry-level Data Credits, while its interactive pricing selector has shown 3,000.",
    expectedSourceSummary: ENRICHMENTS.clay.sourceSummary,
    workflows: ENRICHMENTS.clay.workflows,
    featureGroups: ENRICHMENTS.clay.feature_groups.map(fg => fg.group)
  },
  {
    id: 'photoroom',
    name: 'Photoroom',
    category: 'Design',
    expectedPriceSnippet: 'published US monthly prices of $12.99 for Pro, $34.99 for Max and $99 for Ultra',
    expectedSourceSummary: ENRICHMENTS.photoroom.sourceSummary,
    workflows: ENRICHMENTS.photoroom.workflows,
    featureGroups: ENRICHMENTS.photoroom.feature_groups.map(fg => fg.group)
  },
  {
    id: 'langfuse',
    name: 'Langfuse',
    category: 'Development',
    expectedPriceSnippet: 'Core costs $29/month, includes 100,000 units and allows additional usage at a published rate starting at $8 per 100,000 units.',
    expectedSourceSummary: ENRICHMENTS.langfuse.sourceSummary,
    workflows: ENRICHMENTS.langfuse.workflows,
    featureGroups: ENRICHMENTS.langfuse.feature_groups.map(fg => fg.group)
  },
  {
    id: 'chatbase',
    name: 'Chatbase',
    category: 'Business',
    expectedPriceSnippet: 'Chatbase advertises a 7-day trial for its paid self-service plans. Hobby costs $40/month on monthly billing, or $32/month when billed annually',
    expectedSourceSummary: ENRICHMENTS.chatbase.sourceSummary,
    workflows: ENRICHMENTS.chatbase.workflows,
    featureGroups: ENRICHMENTS.chatbase.feature_groups.map(fg => fg.group)
  },
  {
    id: 'deepgram',
    name: 'Deepgram',
    category: 'Video & Audio',
    expectedPriceSnippet: "Deepgram's Pay As You Go plan has no monthly platform minimum and includes a one-time $200 introductory credit",
    expectedSourceSummary: ENRICHMENTS.deepgram.sourceSummary,
    workflows: ENRICHMENTS.deepgram.workflows,
    featureGroups: ENRICHMENTS.deepgram.feature_groups.map(fg => fg.group)
  }
];

async function run() {
  const server = createStaticServer(WORKTREE_ROOT);
  await new Promise(resolve => server.listen(8770, resolve));
  const baseUrl = 'http://localhost:8770';
  console.log(`[PLAYWRIGHT AUDIT] Testing Batch 4C against LOCAL server: ${baseUrl}\n`);

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
      const pageErrors = [];
      pageDesktop.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      pageDesktop.on('pageerror', err => {
        pageErrors.push(err.message);
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

      // Check Overview (.tool-summary p count == 3)
      const overviewParas = await pageDesktop.locator('.tool-summary p').count();
      assert(overviewParas === 3, `Overview contains 3 substantive paragraphs (actual=${overviewParas})`);

      // Check How It Works (3 paragraphs)
      const howItWorksParas = await pageDesktop.locator('.tool-section:has(h2:text("How It Works")) .tool-body-text p').count();
      assert(howItWorksParas === 3, `How It Works contains 3 substantive paragraphs on ${tool.id} (actual=${howItWorksParas})`);

      // Check All Required Headings
      for (const heading of ['Best For', 'Not Ideal For', 'How It Works', 'Key Features', 'Practical Workflows', 'Strengths & Limitations', 'Pricing', 'How It Compares']) {
        const count = await pageDesktop.locator(`h2:text("${heading}")`).count();
        assert(count === 1, `Section heading "${heading}" present on ${tool.id}`);
      }

      // Check Best For & Not Ideal For item counts
      const bestForCount = await pageDesktop.locator('ul.tool-bestfor-list li').count();
      assert(bestForCount === 3, `Exactly 3 Best For items rendered on ${tool.id} (actual=${bestForCount})`);

      const notIdealForCount = await pageDesktop.locator('ul.tool-notidealfor-list li').count();
      assert(notIdealForCount === 3, `Exactly 3 Not Ideal For items rendered on ${tool.id} (actual=${notIdealForCount})`);

      // Check Feature Groups (3 groups)
      const featureGroupCount = await pageDesktop.locator('.tool-feature-group').count();
      assert(featureGroupCount === 3, `Exactly 3 feature groups rendered on ${tool.id} (actual=${featureGroupCount})`);
      for (const fgTitle of tool.featureGroups) {
        const fgCount = await pageDesktop.locator(`.tool-feature-group h4:text("${fgTitle}")`).count();
        assert(fgCount === 1, `Feature group h4 "${fgTitle}" rendered on ${tool.id}`);
      }

      // Check Pros (4) & Cons (4)
      const prosCount = await pageDesktop.locator('ul.tool-pros-list li').count();
      assert(prosCount === 4, `Exactly 4 Pros items rendered on ${tool.id} (actual=${prosCount})`);

      const consCount = await pageDesktop.locator('ul.tool-cons-list li').count();
      assert(consCount === 4, `Exactly 4 Cons items rendered on ${tool.id} (actual=${consCount})`);

      // Check Pricing Narrative Content
      const pricingBody = await pageDesktop.locator('.tool-section:has(h2:text("Pricing"))').textContent();
      assert(pricingBody.includes(tool.expectedPriceSnippet), `Pricing body contains expected snippet ("${tool.expectedPriceSnippet}")`);

      // Check Editorial Transparency (sourceSummary) Visible in Public DOM
      const sourceSummaryLocator = pageDesktop.locator('.tool-source-summary');
      assert((await sourceSummaryLocator.count()) === 1, `Editorial transparency .tool-source-summary element present on ${tool.id}`);
      const sourceSummaryText = (await sourceSummaryLocator.textContent()).trim();
      assert(sourceSummaryText === tool.expectedSourceSummary, `Editorial transparency text matches "${tool.expectedSourceSummary}" on ${tool.id}`);

      // Check Workflows Visibility in Public DOM (all 3 titles + full descriptions)
      const workflowList = await pageDesktop.locator('ol.tool-workflow-list');
      assert((await workflowList.count()) === 1, `Semantic <ol class="tool-workflow-list"> element present on ${tool.id}`);

      const workflowItems = await pageDesktop.locator('ol.tool-workflow-list li').count();
      assert(workflowItems === 3, `Exactly 3 workflow items in ol.tool-workflow-list on ${tool.id} (actual=${workflowItems})`);

      const workflowsFullText = await workflowList.textContent();
      for (const wf of tool.workflows) {
        const titleMatch = await pageDesktop.locator(`ol.tool-workflow-list li strong:text("${wf.title}:")`).count();
        assert(titleMatch === 1, `Workflow title "${wf.title}:" rendered inside strong tag on ${tool.id}`);
        assert(workflowsFullText.includes(wf.description), `Full workflow description for "${wf.title}" visible in DOM on ${tool.id}`);
      }

      // Check Desktop Horizontal Overflow
      const hasDesktopOverflow = await pageDesktop.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasDesktopOverflow, `Desktop viewport (1280px) has zero horizontal overflow on ${tool.id}`);

      // Check Nested Paragraph Defect
      const nestedP = await pageDesktop.locator('p p').count();
      assert(nestedP === 0, `Zero invalid nested paragraphs <p><p> on ${tool.id} (actual=${nestedP})`);

      // Check Console & Page Errors
      assert(consoleErrors.length === 0, `Zero browser console errors on ${tool.id} (actual=${consoleErrors.length})`);
      assert(pageErrors.length === 0, `Zero uncaught page errors on ${tool.id} (actual=${pageErrors.length})`);

      // ── MOBILE AUDIT (390x844 & 360x740) ──────────────────
      for (const width of [390, 360]) {
        const contextMobile = await browser.newContext({ viewport: { width, height: 800 } });
        const pageMobile = await contextMobile.newPage();
        await pageMobile.goto(url, { waitUntil: 'domcontentloaded' });

        const hasHorizontalScroll = await pageMobile.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        assert(!hasHorizontalScroll, `Mobile viewport (${width}px) has zero horizontal overflow on ${tool.id}`);

        await contextMobile.close();
      }

      await contextDesktop.close();
    }

    console.log(`\n======================================================`);
    console.log(`PLAYWRIGHT BATCH 4C AUDIT SUMMARY`);
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
  console.error('[FATAL]', err);
  process.exit(1);
});
