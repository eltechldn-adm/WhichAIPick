import { chromium } from 'playwright';

const BASE_URL = process.env.PERF_BASE_URL || 'https://whichaipick.com';

const ROUTES = [
  { name: 'Homepage', path: '/' },
  { name: 'Directory (Browse)', path: '/tools/' },
  { name: 'Finder / Quiz', path: '/find' },
  { name: 'Compare Hub', path: '/compare' },
  { name: 'V1 Tool (ChatGPT)', path: '/tools/chatgpt/' },
  { name: 'V2 Tool (Cursor)', path: '/tools/cursor/' },
  { name: 'Category (Development)', path: '/category/development/' },
];

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 800, isMobile: false },
  { name: 'Mobile', width: 390, height: 844, isMobile: true },
];

async function measureRoute(browser, route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    userAgent: viewport.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  const requests = [];
  const failedRequests = [];
  let totalTransferredBytes = 0;
  let totalEncodedBodyBytes = 0;

  const breakdown = {
    html: 0,
    js: 0,
    css: 0,
    image: 0,
    video: 0,
    json: 0,
    font: 0,
    other: 0,
  };

  const assetDetails = {};

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      const headers = response.headers();
      const resourceType = response.request().resourceType();
      
      let bodyLength = 0;
      try {
        const buffer = await response.body();
        bodyLength = buffer ? buffer.length : 0;
      } catch (e) {
        // May fail on streaming/redirects/aborted
      }

      const contentLength = parseInt(headers['content-length'] || '0', 10) || bodyLength;
      totalTransferredBytes += contentLength;

      // Classify
      if (resourceType === 'document') breakdown.html += contentLength;
      else if (resourceType === 'script') breakdown.js += contentLength;
      else if (resourceType === 'stylesheet') breakdown.css += contentLength;
      else if (resourceType === 'image') breakdown.image += contentLength;
      else if (resourceType === 'media') breakdown.video += contentLength;
      else if (resourceType === 'fetch' || resourceType === 'xhr') {
        if (url.includes('.json')) breakdown.json += contentLength;
        else breakdown.other += contentLength;
      } else if (resourceType === 'font') breakdown.font += contentLength;
      else breakdown.other += contentLength;

      requests.push({ url, status, resourceType, contentLength });

      // Track key assets
      if (url.includes('logo-final.png') || url.includes('logo')) {
        assetDetails.logo = { url, size: contentLength, status };
      }
      if (url.includes('hero-loop.mp4') || url.includes('hero-video.mp4') || url.includes('hero')) {
        if (!assetDetails.hero) assetDetails.hero = [];
        assetDetails.hero.push({ url, size: contentLength, status, type: resourceType });
      }
      if (url.includes('tools.json')) {
        assetDetails.toolsJson = { url, size: contentLength, status };
      }
    } catch (err) {
      // ignore
    }
  });

  page.on('requestfailed', (req) => {
    // Ignore analytics beacon errors on preview domains
    if (!req.url().includes('cloudflareinsights.com')) {
      failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
    }
  });

  const fullUrl = `${BASE_URL}${route.path}`;
  const startTime = Date.now();

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    // If networkidle times out (e.g. streaming video), fallback to load
    await page.waitForLoadState('load').catch(() => {});
  }

  // Small delay for LCP/CLS observers to settle
  await page.waitForTimeout(1000);

  // Extract browser performance entries
  const perfMetrics = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries[0] || {};

    let lcp = 0;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    let cls = 0;
    const clsEntries = performance.getEntriesByType('layout-shift');
    clsEntries.forEach((entry) => {
      if (!entry.hadRecentInput) {
        cls += entry.value;
      }
    });

    return {
      ttfb: nav.responseStart ? Math.round(nav.responseStart - nav.requestStart) : 0,
      domContentLoaded: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : 0,
      load: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
      lcp: Math.round(lcp),
      cls: Number(cls.toFixed(4)),
    };
  });

  await context.close();

  return {
    route: route.name,
    path: route.path,
    viewport: viewport.name,
    requestCount: requests.length,
    failedRequestCount: failedRequests.length,
    totalBytes: totalTransferredBytes,
    breakdown,
    perfMetrics,
    assetDetails,
    failedRequests,
  };
}

async function run() {
  console.log(`Starting performance benchmark against: ${BASE_URL}\n`);
  const browser = await chromium.launch();
  const allResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`=== VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) ===`);
    for (const route of ROUTES) {
      process.stdout.write(`Measuring ${route.name} (${route.path})... `);
      const res = await measureRoute(browser, route, vp);
      allResults.push(res);
      console.log(`Done! Requests: ${res.requestCount}, Bytes: ${(res.totalBytes / 1024).toFixed(1)} KB, LCP: ${res.perfMetrics.lcp}ms, CLS: ${res.perfMetrics.cls}`);
    }
    console.log('');
  }

  await browser.close();

  import('fs').then((fs) => {
    const outPath = process.env.PERF_OUT_FILE || '/tmp/perf_baseline_results.json';
    fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
    console.log(`\nDetailed benchmark saved to ${outPath}`);
  });
}

run().catch((err) => {
  console.error('Fatal error during benchmark:', err);
  process.exit(1);
});
