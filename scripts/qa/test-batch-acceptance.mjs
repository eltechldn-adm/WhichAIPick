#!/usr/bin/env node

/**
 * scripts/qa/test-batch-acceptance.mjs
 *
 * Generic Playwright Browser Acceptance Test Harness for WhichAIPick Editorial Batches.
 * Data-driven validation of generated static tool pages against validated batch contract payloads.
 *
 * Usage:
 *   node scripts/qa/test-batch-acceptance.mjs --batch=<path> [--base-url=<url>] [--json] [--verbose]
 *
 * Supported flags:
 *   --batch=<path>       Path to validated JSON batch payload (required or default)
 *   --base-url=<url>     Optional external URL (e.g. Cloudflare Preview). If omitted, runs local ephemeral server.
 *   --json               Output machine-readable JSON results
 *   --verbose            Detailed per-assertion logging
 *
 * Directive: WhichAIPick MCD v2.0
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');

// Approved disclosure regex used by static page generator
export const DISCLOSURE_RENDER_REGEX = /(?:research-based profile|source-researched|researched from|based on (?:published|bland ai|[a-z0-9 -]+ official))/i;

// Prohibited ad request patterns
const PROHIBITED_AD_PATTERNS = [
  'googlesyndication.com',
  'doubleclick.net',
  'adservice.google.com',
  'googleads.g.doubleclick.net',
  'pagead2.googlesyndication.com'
];

/**
 * Create a simple static server serving files from the workspace root
 */
export function createStaticServer(root) {
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

/**
 * Programmatic browser acceptance test runner
 */
export async function runBatchAcceptance(options = {}) {
  const {
    batchPath,
    batchPayload,
    baseUrl: customBaseUrl,
    workspaceRoot = DEFAULT_ROOT,
    verbose = true,
    headless = true,
    logger = console.log
  } = options;

  let payload = batchPayload;
  let resolvedBatchPath = null;

  if (!payload) {
    if (!batchPath) {
      throw new Error('[HARNESS ERROR] Either batchPath or batchPayload must be provided.');
    }
    resolvedBatchPath = path.resolve(workspaceRoot, batchPath);
    if (!fs.existsSync(resolvedBatchPath)) {
      throw new Error(`[HARNESS ERROR] Batch file not found: ${resolvedBatchPath}`);
    }
    try {
      payload = JSON.parse(fs.readFileSync(resolvedBatchPath, 'utf8'));
    } catch (err) {
      throw new Error(`[HARNESS ERROR] Failed to parse batch JSON: ${err.message}`);
    }
  }

  // Load canonical tools catalog for metadata fallback
  const toolsJsonPath = path.join(workspaceRoot, 'data', 'tools.json');
  let toolsCatalog = [];
  if (fs.existsSync(toolsJsonPath)) {
    try {
      toolsCatalog = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf8'));
    } catch (e) {
      // Ignore if unavailable in custom workspace
    }
  }
  const catalogMap = new Map(toolsCatalog.map(t => [t.id, t]));

  const targetIds = payload.targetToolIds;
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    throw new Error('[HARNESS ERROR] Batch payload contains no targetToolIds.');
  }

  let server = null;
  let baseUrl = customBaseUrl;

  if (!baseUrl) {
    server = createStaticServer(workspaceRoot);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    if (verbose) {
      logger(`[PLAYWRIGHT HARNESS] Started ephemeral local server at: ${baseUrl}`);
    }
  } else {
    if (verbose) {
      logger(`[PLAYWRIGHT HARNESS] Testing against external host: ${baseUrl}`);
    }
  }

  const browser = await chromium.launch({ headless });
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  const issues = [];
  const auditedTools = [];

  const assert = (condition, msg, toolId = null) => {
    totalChecks++;
    if (condition) {
      passedChecks++;
      if (verbose) logger(`  ✅ PASS: ${msg}`);
    } else {
      failedChecks++;
      issues.push({ toolId, message: msg });
      if (verbose) logger(`  ❌ FAIL: ${msg}`);
    }
  };

  try {
    for (const toolId of targetIds) {
      auditedTools.push(toolId);
      const toolData = payload.tools?.[toolId];
      if (!toolData) {
        assert(false, `Tool data for "${toolId}" missing from batch payload tools dictionary.`, toolId);
        continue;
      }

      const catRecord = catalogMap.get(toolId) || {};
      const expectedName = toolData.canonicalName || catRecord.canonicalName || catRecord.name || toolId;
      const expectedCategory = toolData.primaryCategory || catRecord.primaryCategory || catRecord.category;
      const expectedWebsite = toolData.website_url || catRecord.website_url;
      const url = `${baseUrl}/tools/${toolId}/`;

      if (verbose) {
        logger(`\n======================================================`);
        logger(`--- Testing Tool Profile: ${expectedName} (${toolId}) ---`);
        logger(`======================================================`);
      }

      // ── DESKTOP AUDIT (1280x800) ──────────────────────────
      const contextDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const pageDesktop = await contextDesktop.newPage();

      const consoleErrors = [];
      const pageErrors = [];
      const adRequests = [];

      pageDesktop.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      pageDesktop.on('pageerror', err => {
        pageErrors.push(err.message);
      });
      pageDesktop.on('request', req => {
        const reqUrl = req.url();
        for (const adDomain of PROHIBITED_AD_PATTERNS) {
          if (reqUrl.includes(adDomain)) {
            adRequests.push(reqUrl);
          }
        }
      });

      const response = await pageDesktop.goto(url, { waitUntil: 'domcontentloaded' });
      assert(response && response.status() === 200, `Page HTTP status 200 on ${toolId} (status=${response ? response.status() : 'NONE'})`, toolId);

      // 1. Check H1
      const h1Count = await pageDesktop.locator('h1').count();
      assert(h1Count === 1, `Exactly 1 H1 element present on ${toolId} (actual=${h1Count})`, toolId);
      if (h1Count > 0) {
        const h1Text = (await pageDesktop.locator('h1').first().textContent()).trim();
        assert(h1Text === expectedName, `Desktop H1 matches "${expectedName}" (actual="${h1Text}")`, toolId);
      }

      // 2. Check Category Badge
      const heroCategoryLocator = pageDesktop.locator('.tool-hero-category');
      assert((await heroCategoryLocator.count()) >= 1, `Hero category badge present on ${toolId}`, toolId);
      if ((await heroCategoryLocator.count()) >= 1) {
        const heroCategory = (await heroCategoryLocator.first().textContent()).trim();
        assert(heroCategory === expectedCategory, `Hero category badge matches "${expectedCategory}" (actual="${heroCategory}")`, toolId);
      }

      // 3. Check Canonical Link
      const canonicalHref = await pageDesktop.locator('link[rel="canonical"]').getAttribute('href');
      const expectedCanonical = `https://whichaipick.com/tools/${toolId}/`;
      assert(canonicalHref === expectedCanonical, `Canonical URL matches production: ${canonicalHref}`, toolId);

      // 4. Check Overview Summary Paragraphs
      const overviewParas = await pageDesktop.locator('.tool-summary p').count();
      assert(overviewParas >= 2, `Overview contains substantive paragraphs (actual=${overviewParas})`, toolId);

      // 5. Check All 8 Required Section Headings
      const REQUIRED_HEADINGS = [
        'Best For',
        'Not Ideal For',
        'How It Works',
        'Key Features',
        'Practical Workflows',
        'Strengths & Limitations',
        'Pricing',
        'How It Compares'
      ];
      for (const heading of REQUIRED_HEADINGS) {
        const count = await pageDesktop.locator(`h2:text("${heading}")`).count();
        assert(count === 1, `Section heading "${heading}" present on ${toolId}`, toolId);
      }

      // 6. Check How It Works Body Paragraphs
      const howItWorksParas = await pageDesktop.locator('.tool-section:has(h2:text("How It Works")) .tool-body-text p').count();
      assert(howItWorksParas >= 2, `How It Works contains substantive paragraphs on ${toolId} (actual=${howItWorksParas})`, toolId);

      // 7. Check Best For & Not Ideal For Item Counts
      const expectedBestFor = Array.isArray(toolData.bestFor) ? toolData.bestFor : (catRecord.bestFor || []);
      const bestForCount = await pageDesktop.locator('ul.tool-bestfor-list li').count();
      assert(bestForCount === expectedBestFor.length && bestForCount >= 2, `Best For items rendered on ${toolId} (expected=${expectedBestFor.length}, actual=${bestForCount})`, toolId);

      const expectedNotIdealFor = Array.isArray(toolData.notIdealFor) ? toolData.notIdealFor : (catRecord.notIdealFor || []);
      const notIdealForCount = await pageDesktop.locator('ul.tool-notidealfor-list li').count();
      assert(notIdealForCount === expectedNotIdealFor.length && notIdealForCount >= 2, `Not Ideal For items rendered on ${toolId} (expected=${expectedNotIdealFor.length}, actual=${notIdealForCount})`, toolId);

      // 8. Check Feature Groups (Heading and Count)
      const expectedFeatureGroups = Array.isArray(toolData.feature_groups) ? toolData.feature_groups : (catRecord.feature_groups || []);
      const featureGroupCount = await pageDesktop.locator('.tool-feature-group').count();
      assert(featureGroupCount === expectedFeatureGroups.length && featureGroupCount >= 2, `Feature groups count rendered on ${toolId} (expected=${expectedFeatureGroups.length}, actual=${featureGroupCount})`, toolId);

      for (const fg of expectedFeatureGroups) {
        const fgTitle = fg.group || fg.title;
        const fgCount = await pageDesktop.locator(`.tool-feature-group h4:text("${fgTitle}")`).count();
        assert(fgCount === 1, `Feature group h4 "${fgTitle}" rendered on ${toolId}`, toolId);
      }

      // 9. Check Pros (4) & Cons (4)
      const expectedPros = Array.isArray(toolData.pros) ? toolData.pros : (catRecord.pros || []);
      const prosCount = await pageDesktop.locator('ul.tool-pros-list li').count();
      assert(prosCount === expectedPros.length && prosCount >= 3, `Pros items rendered on ${toolId} (expected=${expectedPros.length}, actual=${prosCount})`, toolId);

      const expectedCons = Array.isArray(toolData.cons) ? toolData.cons : (catRecord.cons || []);
      const consCount = await pageDesktop.locator('ul.tool-cons-list li').count();
      assert(consCount === expectedCons.length && consCount >= 3, `Cons items rendered on ${toolId} (expected=${expectedCons.length}, actual=${consCount})`, toolId);

      // 10. Check Pricing Narrative Content
      const pricingSection = pageDesktop.locator('.tool-section:has(h2:text("Pricing"))');
      const pricingCount = await pricingSection.count();
      assert(pricingCount === 1, `Pricing section element present on ${toolId}`, toolId);
      const pricingBody = pricingCount > 0 ? ((await pricingSection.textContent()) || '') : '';

      // Determine expected pricing snippet
      let priceSnippet = toolData.expectedPriceSnippet;
      if (!priceSnippet) {
        if (toolData.startingPlan) {
          // If startingPlan is multi-word like "Starter after introductory credits", extract key plan name
          priceSnippet = toolData.startingPlan.split(' ')[0];
        } else {
          const strongMatches = Array.from(toolData.pricing_overview?.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi) || []);
          if (strongMatches.length > 0) {
            priceSnippet = strongMatches[0][1].replace(/<[^>]+>/g, '').trim();
          } else if (toolData.startingPrice !== null && toolData.startingPrice !== undefined) {
            priceSnippet = `$${toolData.startingPrice}`;
          }
        }
      }
      if (priceSnippet) {
        assert(pricingBody.toLowerCase().includes(String(priceSnippet).toLowerCase()), `Pricing body contains expected snippet ("${priceSnippet}") on ${toolId}`, toolId);
      } else {
        assert(pricingBody.trim().length > 50, `Pricing body contains substantive content on ${toolId}`, toolId);
      }

      // 11. Check Comparison Section Content
      const comparisonSection = pageDesktop.locator('.tool-section:has(h2:text("How It Compares"))');
      const compCount = await comparisonSection.count();
      assert(compCount === 1, `How It Compares section element present on ${toolId}`, toolId);
      const comparisonBody = compCount > 0 ? ((await comparisonSection.textContent()) || '') : '';
      assert(comparisonBody.trim().length > 50, `How It Compares body contains substantive content on ${toolId}`, toolId);

      // 12. Check Editorial Transparency Disclosure (.tool-source-summary)
      // Historical 4A behavior vs 4B/4C disclosure rendering
      const sourceSummary = (toolData.sourceSummary || catRecord.sourceSummary || '').trim();
      const hasTransparencyDisclosure = DISCLOSURE_RENDER_REGEX.test(sourceSummary);
      const sourceSummaryLocator = pageDesktop.locator('.tool-source-summary');
      const sourceSummaryCount = await sourceSummaryLocator.count();

      if (hasTransparencyDisclosure) {
        assert(sourceSummaryCount === 1, `Editorial transparency .tool-source-summary element present on ${toolId}`, toolId);
        if (sourceSummaryCount === 1) {
          const actualDisclosureText = (await sourceSummaryLocator.textContent()).trim();
          assert(actualDisclosureText === sourceSummary, `Editorial transparency text matches expected sourceSummary on ${toolId}`, toolId);
        }
      } else {
        // Historical Batch 4A or skeletal profile lacking disclosure phrasing
        assert(sourceSummaryCount === 0, `Non-disclosure sourceSummary correctly omitted from .tool-source-summary on ${toolId}`, toolId);
      }

      // 13. Check Practical Workflows (Ordered List, Exactly 3 Items, Titles and Descriptions)
      const expectedWorkflows = Array.isArray(toolData.workflows) ? toolData.workflows : (catRecord.workflows || []);
      const workflowListLocator = pageDesktop.locator('ol.tool-workflow-list');
      const wfListCount = await workflowListLocator.count();
      assert(wfListCount === 1, `Semantic <ol class="tool-workflow-list"> element present on ${toolId}`, toolId);

      const workflowItemsCount = await pageDesktop.locator('ol.tool-workflow-list li').count();
      assert(workflowItemsCount === expectedWorkflows.length && workflowItemsCount >= 2, `Exactly ${expectedWorkflows.length} workflow items in ol.tool-workflow-list on ${toolId} (actual=${workflowItemsCount})`, toolId);

      const workflowsFullText = wfListCount > 0 ? ((await workflowListLocator.textContent()) || '') : '';
      for (const wf of expectedWorkflows) {
        const wfTitle = wf.title || wf.name;
        const titleMatch = wfListCount > 0 ? await pageDesktop.locator(`ol.tool-workflow-list li strong:text("${wfTitle}:")`).count() : 0;
        assert(titleMatch === 1, `Workflow title "${wfTitle}:" rendered inside strong tag on ${toolId}`, toolId);
        if (wf.description) {
          assert(workflowsFullText.includes(wf.description), `Full workflow description for "${wfTitle}" visible in DOM on ${toolId}`, toolId);
        }
      }

      // 14. Check Tool Primary Website Link (CTA)
      const primaryCta = pageDesktop.locator('a.tool-cta, a.btn-primary:has-text("Visit")');
      const ctaCount = await primaryCta.count();
      assert(ctaCount >= 1, `Primary tool website CTA button present on ${toolId}`, toolId);
      if (ctaCount >= 1) {
        const ctaHref = (await primaryCta.first().getAttribute('href')) || '';
        assert(ctaHref.startsWith('http') || ctaHref.startsWith('/'), `Primary CTA has valid destination link on ${toolId} (href="${ctaHref}")`, toolId);
        if (expectedWebsite) {
          const urlDomain = new URL(expectedWebsite).hostname.replace(/^www\./, '');
          const hrefDomain = ctaHref.startsWith('http') ? new URL(ctaHref).hostname.replace(/^www\./, '') : '';
          assert(hrefDomain.includes(urlDomain) || ctaHref.includes('/redirect') || ctaHref.startsWith('/'), `CTA links to official destination or redirect on ${toolId}`, toolId);
        }
      }

      // 15. Check Invalid Nested Paragraph Defect (<p><p>)
      const nestedP = await pageDesktop.locator('p p').count();
      assert(nestedP === 0, `Zero invalid nested paragraphs <p><p> on ${toolId} (actual=${nestedP})`, toolId);

      // 16. Check Desktop Horizontal Overflow
      const hasDesktopOverflow = await pageDesktop.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      assert(!hasDesktopOverflow, `Desktop viewport (1280px) has zero horizontal overflow on ${toolId}`, toolId);

      // 17. Check Console & Page Errors
      assert(consoleErrors.length === 0, `Zero browser console errors on ${toolId} (actual=${consoleErrors.length})`, toolId);
      assert(pageErrors.length === 0, `Zero uncaught page errors on ${toolId} (actual=${pageErrors.length})`, toolId);

      // 18. Check Unexpected Commercial Ad Requests
      assert(adRequests.length === 0, `Zero commercial ad requests on ${toolId} (actual=${adRequests.length})`, toolId);

      // ── MOBILE AUDIT (390x844 & 360x740) ──────────────────
      for (const [w, h] of [[390, 844], [360, 740]]) {
        const contextMobile = await browser.newContext({ viewport: { width: w, height: h } });
        const pageMobile = await contextMobile.newPage();
        await pageMobile.goto(url, { waitUntil: 'domcontentloaded' });

        const hasHorizontalScroll = await pageMobile.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        assert(!hasHorizontalScroll, `Mobile viewport (${w}x${h}) has zero horizontal overflow on ${toolId}`, toolId);

        await contextMobile.close();
      }

      await contextDesktop.close();
    }

    if (verbose) {
      logger(`\n======================================================`);
      logger(`PLAYWRIGHT BATCH ACCEPTANCE SUMMARY`);
      logger(`Audited Tools: ${auditedTools.length} (${auditedTools.join(', ')})`);
      logger(`Total Checks:  ${totalChecks}`);
      logger(`Passed Checks: ${passedChecks}`);
      logger(`Failed Checks: ${failedChecks}`);
      logger(`Final Status:  ${failedChecks === 0 ? '✅ ALL CHECKS PASSED' : '❌ FAILED'}`);
      logger(`======================================================\n`);
    }

    return {
      success: failedChecks === 0,
      totalChecks,
      passedChecks,
      failedChecks,
      auditedTools,
      issues
    };

  } finally {
    await browser.close();
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

// ── CLI Runner ────────────────────────────────────────────────────────────

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    batchPath: 'data/enrichment/fixtures/batch-4c-valid.json',
    baseUrl: null,
    workspaceRoot: DEFAULT_ROOT,
    json: false,
    verbose: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--batch=')) {
      options.batchPath = arg.slice(8);
    } else if (arg === '--batch' && i + 1 < args.length) {
      options.batchPath = args[++i];
    } else if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice(11);
    } else if (arg === '--base-url' && i + 1 < args.length) {
      options.baseUrl = args[++i];
    } else if (arg.startsWith('--workspace-root=')) {
      options.workspaceRoot = path.resolve(process.cwd(), arg.slice(17));
    } else if (arg === '--workspace-root' && i + 1 < args.length) {
      options.workspaceRoot = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--json') {
      options.json = true;
      options.verbose = false;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--quiet' || arg === '--silent') {
      options.verbose = false;
    }
  }

  return options;
}

export async function main() {
  const options = parseCliArgs();

  try {
    const result = await runBatchAcceptance(options);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(result.success ? 0 : 1);
  } catch (err) {
    if (options.json) {
      console.error(JSON.stringify({ success: false, error: err.message }, null, 2));
    } else {
      console.error('[FATAL ERROR]', err.message);
    }
    process.exit(1);
  }
}

// Run CLI when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
