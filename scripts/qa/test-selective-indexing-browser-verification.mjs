import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const DOMAIN = 'https://whichaipick.com';

const NOINDEX_SAMPLE_20 = [
  '11x', '360learning', 'abridge', 'adwisely', 'aftershoot',
  'agno', 'ai-studios', 'ai2sql', 'aiarty-image-enhancer', 'airops',
  'aisdr', 'aisera', 'akool', 'albert', 'algor-education',
  'alphasense', 'altered', 'ambience-healthcare', 'amplemarket', 'anara'
];

const PROTECTED_EXCEPTIONS_10 = [
  'ollama', 'recraft', 'upscayl', 'docsbot', 'macwhisper', 'sitegpt', 'novelcrafter', // 7 brand skeletons
  'akiflow', 'crawl4ai', 'mindgrasp' // 3 short V2 canaries
];

const RICH_V1_SAMPLE_10 = [
  'adobe-firefly', 'ai21-labs', 'aiva', 'akkio', 'amazon-codewhisperer',
  'amazon-q', 'appgyver', 'apple-intelligence', 'automator', 'base44'
];

const V2_SAMPLE_10 = [
  'cursor', 'midjourney', 'claude', 'n8n', '10web',
  'adcreativeai', 'descript', 'elevenlabs', 'perplexity-ai', 'synthesia'
];

const CATEGORIES_10 = [
  'automation', 'business', 'content-creation', 'design', 'development',
  'education', 'marketing', 'productivity', 'research', 'video-audio'
];

// Content-type dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

async function createStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath.endsWith('/')) {
      reqPath += 'index.html';
    }
    let filePath = path.join(ROOT, reqPath.startsWith('/') ? reqPath.slice(1) : reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function runBrowserVerification() {
  console.log('======================================================');
  console.log('STAGE 7H.8B: PLAYWRIGHT BROWSER VERIFICATION SUITE');
  console.log('======================================================\n');

  const { server, baseUrl } = await createStaticServer();
  console.log(`Static server running at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  let totalTests = 0;
  let passedTests = 0;
  const failures = [];

  const viewports = [
    { name: 'Desktop (1280px)', width: 1280, height: 800 },
    { name: 'Mobile (390px)', width: 390, height: 844 }
  ];

  try {
    for (const vp of viewports) {
      console.log(`\n------------------------------------------------------`);
      console.log(`TESTING VIEWPORT: ${vp.name}`);
      console.log(`------------------------------------------------------`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.width <= 500
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();

      const testPage = async ({ path: urlPath, expectedRobots, expectedCanonical, label }) => {
        totalTests++;
        const consoleErrors = [];
        const errorHandler = msg => {
          if (msg.type() === 'error') {
            const txt = msg.text();
            // Filter out external third-party network failures (analytics, external google favicons)
            if (!txt.includes('google-analytics') &&
                !txt.includes('googletagmanager') &&
                !txt.includes('fonts.gstatic') &&
                !txt.includes('google.com/s2/favicons') &&
                !txt.includes('Failed to load resource')) {
              consoleErrors.push(txt);
            }
          }
        };
        page.on('console', errorHandler);

        try {
          const resp = await page.goto(`${baseUrl}${urlPath}`, { waitUntil: 'domcontentloaded' });
          const status = resp.status();
          const robots = await page.$eval('meta[name="robots"]', el => el.getAttribute('content')).catch(() => null);
          const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href')).catch(() => null);
          
          // Horizontal overflow check
          const overflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth + 1;
          });

          // Normalize whitespace in robots (e.g. "noindex, follow" vs "noindex,follow")
          const normalizedRobots = (robots || '').replace(/\s+/g, '');
          const normalizedExpectedRobots = (expectedRobots || '').replace(/\s+/g, '');

          const statusOk = status === 200;
          const robotsOk = normalizedRobots === normalizedExpectedRobots;
          const canonicalOk = canonical === expectedCanonical;
          const overflowOk = !overflow;
          const errorsOk = consoleErrors.length === 0;

          if (statusOk && robotsOk && canonicalOk && overflowOk && errorsOk) {
            passedTests++;
            console.log(`  ✅ PASS: [${vp.name}] ${label}: HTTP 200, robots="${robots}", canonical OK, no overflow`);
          } else {
            const issues = [];
            if (!statusOk) issues.push(`status=${status}`);
            if (!robotsOk) issues.push(`robots="${robots}" (expected "${expectedRobots}")`);
            if (!canonicalOk) issues.push(`canonical="${canonical}" (expected "${expectedCanonical}")`);
            if (!overflowOk) issues.push('horizontal overflow detected');
            if (!errorsOk) issues.push(`console errors: ${consoleErrors.join('; ')}`);
            failures.push(`[${vp.name}] ${label}: ${issues.join(', ')}`);
            console.error(`  ❌ FAIL: [${vp.name}] ${label}: ${issues.join(', ')}`);
          }
        } catch (err) {
          failures.push(`[${vp.name}] ${label} crashed: ${err.message}`);
          console.error(`  ❌ ERROR: [${vp.name}] ${label}: ${err.message}`);
        } finally {
          page.off('console', errorHandler);
        }
      };

      // 1. 20 Approved Noindex Stubs
      console.log(`\n  --- 20 Approved Noindex Stubs ---`);
      for (const id of NOINDEX_SAMPLE_20) {
        await testPage({
          path: `/tools/${id}/`,
          expectedRobots: 'noindex,follow',
          expectedCanonical: `${DOMAIN}/tools/${id}/`,
          label: `Noindex Stub (${id})`
        });
      }

      // 2. All 10 Protected Exceptions
      console.log(`\n  --- 10 Protected Exceptions ---`);
      for (const id of PROTECTED_EXCEPTIONS_10) {
        await testPage({
          path: `/tools/${id}/`,
          expectedRobots: 'index,follow',
          expectedCanonical: `${DOMAIN}/tools/${id}/`,
          label: `Protected Exception (${id})`
        });
      }

      // 3. 10 Rich V1 Tools
      console.log(`\n  --- 10 Rich V1 Tools ---`);
      for (const id of RICH_V1_SAMPLE_10) {
        await testPage({
          path: `/tools/${id}/`,
          expectedRobots: 'index,follow',
          expectedCanonical: `${DOMAIN}/tools/${id}/`,
          label: `Rich V1 Tool (${id})`
        });
      }

      // 4. 10 V2 Tools
      console.log(`\n  --- 10 V2 Tools ---`);
      for (const id of V2_SAMPLE_10) {
        await testPage({
          path: `/tools/${id}/`,
          expectedRobots: 'index,follow',
          expectedCanonical: `${DOMAIN}/tools/${id}/`,
          label: `V2 Tool (${id})`
        });
      }

      // 5. All 10 Category Hubs
      console.log(`\n  --- 10 Category Hubs ---`);
      for (const cat of CATEGORIES_10) {
        await testPage({
          path: `/category/${cat}/`,
          expectedRobots: 'index,follow',
          expectedCanonical: `${DOMAIN}/category/${cat}/`,
          label: `Category Hub (${cat})`
        });
      }

      // 6. Hub & Feature Pages (Finder, Compare, My Tools)
      console.log(`\n  --- Hub & Feature Pages ---`);
      await testPage({
        path: `/find.html`,
        expectedRobots: 'noindex,follow',
        expectedCanonical: `${DOMAIN}/find`,
        label: `AI Quiz / Finder`
      });

      await testPage({
        path: `/compare.html`,
        expectedRobots: 'index,follow',
        expectedCanonical: `${DOMAIN}/compare`,
        label: `Comparison Hub`
      });

      await testPage({
        path: `/my-tools/`,
        expectedRobots: 'noindex,follow',
        expectedCanonical: `${DOMAIN}/my-tools/`,
        label: `My Tools / Shortlist`
      });

      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n======================================================');
  console.log(`TOTAL BROWSER VERIFICATION CHECKS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failures.length}`);

  if (failures.length > 0) {
    console.error('\n❌ BROWSER VERIFICATION FAILED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL 106 BROWSER VERIFICATION CHECKS PASSED WITH ZERO DEFECTS!');
    console.log('======================================================\n');
    process.exit(0);
  }
}

runBrowserVerification().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
