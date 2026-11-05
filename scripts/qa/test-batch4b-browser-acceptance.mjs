import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

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
    id: 'castmagic',
    name: 'Castmagic',
    category: 'Video & Audio',
    expectedPriceSnippet: 'library totals, not monthly allowances',
    expectedSourceSummary: "Source-researched from Castmagic's official product, pricing and privacy documentation on 5 November 2026; no firsthand testing claimed.",
    workflows: [
      {
        title: 'Podcast publishing',
        description: 'Import a recorded episode, produce a transcript and draft show notes, then prepare a newsletter and selected social posts for editorial review.'
      },
      {
        title: 'Webinar repurposing',
        description: 'Upload a webinar, identify key discussion points and turn them into blog sections, short highlights and a follow-up email.'
      },
      {
        title: 'Client content production',
        description: 'Organise recordings in separate Spaces, apply reusable prompts and review draft outputs before delivering them to different clients.'
      }
    ],
    featureGroups: [
      'Recording transcription and content library',
      'Content generation and repurposing',
      'Collaboration and integrations'
    ]
  },
  {
    id: 'captions',
    name: 'Captions',
    category: 'Video & Audio',
    expectedPriceSnippet: 'Lite costs $4.99/month and works only on Android.',
    expectedSourceSummary: 'Based on published Captions and Mirage product, subscription, API and privacy information reviewed on 5 November 2026; no firsthand testing claimed.',
    workflows: [
      {
        title: 'Short-form video editing',
        description: 'Import a talking-head video, add synchronized captions, trim pauses and prepare an export suitable for a social platform.'
      },
      {
        title: 'Multilingual promotion',
        description: 'Create a product explanation video, translate or dub it using an eligible plan, and check the output before publishing.'
      },
      {
        title: 'AI presenter content',
        description: 'Build an approved digital presenter using eligible AI actor or AI Twin features, generate a video draft and review it for accuracy and consent.'
      }
    ],
    featureGroups: [
      'Captions and video editing',
      'AI creation and localisation',
      'Creator and developer access'
    ]
  },
  {
    id: 'cartesia',
    name: 'Cartesia',
    category: 'Video & Audio',
    expectedPriceSnippet: 'promotional Managed Agents rate of $0.03 per minute through 31 December 2026',
    expectedSourceSummary: "Researched from Cartesia's official pricing, product and developer documentation on 5 November 2026. Promotional rates and vendor-reported technical capabilities require rechecking over time.",
    workflows: [
      {
        title: 'Voice-enabled application',
        description: 'Connect Sonic text-to-speech to an application so users can hear spoken responses instead of reading text.'
      },
      {
        title: 'Conversation transcription',
        description: "Process incoming audio using Ink, capture recognised speech and pass it to an application's workflow logic."
      },
      {
        title: 'Customer service voice agent',
        description: 'Configure a Managed Agent to answer approved questions, retrieve information from connected systems and transfer unresolved matters to a person.'
      }
    ],
    featureGroups: [
      'Speech generation',
      'Speech recognition',
      'Managed voice agents and APIs'
    ]
  },
  {
    id: 'bland-ai',
    name: 'Bland AI',
    category: 'Automation',
    expectedPriceSnippet: 'Start plan has a $0 monthly platform fee, but this does not mean unlimited free usage.',
    expectedSourceSummary: "Based on Bland AI's official pricing and developer documentation reviewed on 5 November 2026. No claims of tested call quality or measured latency are made.",
    workflows: [
      {
        title: 'Customer enquiry routing',
        description: 'Answer a routine inbound question, retrieve approved information and send unresolved or sensitive requests to an appropriate employee.'
      },
      {
        title: 'Appointment coordination',
        description: 'Guide an authorised caller through appointment options, validate required information and update a connected scheduling system.'
      },
      {
        title: 'Outbound service follow-up',
        description: 'Initiate consent-compliant follow-up calls, record structured outcomes and route exceptions to a human team.'
      }
    ],
    featureGroups: [
      'Inbound and outbound calling',
      'Conversation design and monitoring',
      'Developer and enterprise integrations'
    ]
  },
  {
    id: 'lindy',
    name: 'Lindy',
    category: 'Automation',
    expectedPriceSnippet: '$49.99 per active user per month',
    expectedSourceSummary: "Researched from Lindy's official pricing, usage, documentation and security information reviewed on 5 November 2026. No firsthand testing or productivity benchmark claimed.",
    forbiddenPriceSnippets: ['$29.99', '3,000'],
    workflows: [
      {
        title: 'Meeting follow-up',
        description: 'Prepare meeting notes, summarise agreed actions and draft follow-up messages for approval.'
      },
      {
        title: 'Inbox triage',
        description: 'Identify messages requiring attention, organise them by priority and prepare suggested replies without sending them automatically.'
      },
      {
        title: 'Team operations',
        description: 'Monitor an approved workflow, collect information from connected tools and create a structured update for the responsible team.'
      }
    ],
    featureGroups: [
      'AI assistants and reusable work',
      'Communications and collaboration',
      'Advanced automation and controls'
    ]
  }
];

async function run() {
  const server = createStaticServer(WORKTREE_ROOT);
  await new Promise(resolve => server.listen(8769, resolve));
  const baseUrl = 'http://localhost:8769';
  console.log(`[PLAYWRIGHT AUDIT] Testing Batch 4B against LOCAL server: ${baseUrl}\n`);

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
      if (tool.forbiddenPriceSnippets) {
        const fullBodyText = await pageDesktop.locator('body').textContent();
        for (const forbidden of tool.forbiddenPriceSnippets) {
          assert(!fullBodyText.includes(forbidden), `Page body does NOT contain stale snippet "${forbidden}" on ${tool.id}`);
        }
      }

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
    console.log(`PLAYWRIGHT BATCH 4B AUDIT SUMMARY`);
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
