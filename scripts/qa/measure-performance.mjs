import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = process.env.PERF_BASE_URL || 'https://whichaipick.com';

const ROUTES = [
  { name: 'Homepage', path: '/', selector: '#home-featured-tools' },
  { name: 'Directory (Browse)', path: '/tools/', selector: '#browse-list' },
  { name: 'Finder / Quiz', path: '/find', selector: '#quiz-container' },
  { name: 'Compare Hub', path: '/compare', selector: '.comparison-table, .comparison-card, #category-quick-links, main' },
  { name: 'V1 Tool (ChatGPT)', path: '/tools/chatgpt/', selector: '.tool-header, h1' },
  { name: 'V2 Tool (Cursor)', path: '/tools/cursor/', selector: '.tool-hero, h1' },
  { name: 'Category (Development)', path: '/category/development/', selector: '#category-tools-grid, .tool-card, main' },
];

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 800, isMobile: false },
  { name: 'Mobile', width: 390, height: 844, isMobile: true },
];

async function measurePageCycle(page, cdpSession, route, fullUrl, isWarm = false) {
  const requestMap = new Map();
  const failedRequests = [];
  const statusCounts = {};

  const requestListener = (params) => {
    requestMap.set(params.requestId, {
      url: params.request.url,
      type: params.type,
      method: params.request.method,
      encodedDataLength: 0,
      status: 0,
    });
  };

  const responseListener = (params) => {
    const req = requestMap.get(params.requestId);
    if (req) {
      req.status = params.response.status;
      req.headers = params.response.headers;
      statusCounts[params.response.status] = (statusCounts[params.response.status] || 0) + 1;
    }
  };

  const finishedListener = (params) => {
    const req = requestMap.get(params.requestId);
    if (req) {
      req.encodedDataLength = params.encodedDataLength || 0;
    }
  };

  const failedListener = (params) => {
    const req = requestMap.get(params.requestId);
    if (req) {
      req.failed = true;
      req.errorText = params.errorText;
      if (!req.url.includes('cloudflareinsights.com')) {
        failedRequests.push({ url: req.url, failure: params.errorText });
      }
    }
  };

  cdpSession.on('Network.requestWillBeSent', requestListener);
  cdpSession.on('Network.responseReceived', responseListener);
  cdpSession.on('Network.loadingFinished', finishedListener);
  cdpSession.on('Network.loadingFailed', failedListener);

  try {
    if (!isWarm) {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 35000 });
    } else {
      await page.reload({ waitUntil: 'networkidle', timeout: 35000 });
    }
  } catch (e) {
    await page.waitForLoadState('load').catch(() => {});
  }

  // Wait for functional hydration if selector is provided
  if (route.selector) {
    try {
      await page.waitForSelector(route.selector, { timeout: 5000 });
    } catch (e) {
      // Non-fatal if selector differs slightly
    }
  }

  // Allow layout observers and async video buffering to stabilize
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

    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find((p) => p.name === 'first-contentful-paint');

    return {
      ttfb: nav.responseStart ? Math.round(nav.responseStart - nav.requestStart) : 0,
      fcp: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
      domContentLoaded: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : 0,
      load: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
      lcp: Math.round(lcp),
      cls: Number(cls.toFixed(4)),
    };
  });

  // Calculate categorized bytes
  let totalBytes = 0;
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

  for (const [id, req] of requestMap.entries()) {
    const bytes = req.encodedDataLength || 0;
    totalBytes += bytes;

    const url = req.url.toLowerCase();
    const type = (req.type || '').toLowerCase();

    if (type === 'document' || url.endsWith('.html') || url === fullUrl) breakdown.html += bytes;
    else if (type === 'script' || url.endsWith('.js') || url.includes('.js?')) breakdown.js += bytes;
    else if (type === 'stylesheet' || url.endsWith('.css') || url.includes('.css?')) breakdown.css += bytes;
    else if (type === 'image' || url.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)(\?.*)?$/)) breakdown.image += bytes;
    else if (type === 'media' || url.match(/\.(mp4|webm|ogg)(\?.*)?$/)) breakdown.video += bytes;
    else if (type === 'fetch' || type === 'xhr' || url.endsWith('.json') || url.includes('.json?')) {
      if (url.includes('.json')) breakdown.json += bytes;
      else breakdown.other += bytes;
    } else if (type === 'font' || url.match(/\.(woff2?|ttf|otf|eot)(\?.*)?$/)) breakdown.font += bytes;
    else breakdown.other += bytes;

    if (url.includes('logo-final.png')) {
      assetDetails.logo = { url: req.url, wireBytes: bytes, status: req.status };
    }
    if (url.includes('hero-loop') || url.includes('hero-video') || url.includes('hero-poster')) {
      if (!assetDetails.hero) assetDetails.hero = [];
      assetDetails.hero.push({ url: req.url, wireBytes: bytes, status: req.status, type });
    }
    if (url.includes('tools.json')) {
      assetDetails.toolsJson = { url: req.url, wireBytes: bytes, status: req.status };
    }
  }

  // Detach listeners before returning
  cdpSession.off('Network.requestWillBeSent', requestListener);
  cdpSession.off('Network.responseReceived', responseListener);
  cdpSession.off('Network.loadingFinished', finishedListener);
  cdpSession.off('Network.loadingFailed', failedListener);

  return {
    isWarm,
    requestCount: requestMap.size,
    failedRequestCount: failedRequests.length,
    failedRequests,
    statusCounts,
    totalBytes,
    breakdown,
    perfMetrics,
    assetDetails,
  };
}

async function measureRoute(browser, route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    userAgent: viewport.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);
  await cdpSession.send('Network.enable');

  const fullUrl = `${BASE_URL}${route.path}`;

  // 1. Cold measurement
  const cold = await measurePageCycle(page, cdpSession, route, fullUrl, false);

  // 2. Warm measurement (in same context to test revalidation / disk cache)
  const warm = await measurePageCycle(page, cdpSession, route, fullUrl, true);

  await context.close();

  return {
    route: route.name,
    path: route.path,
    viewport: viewport.name,
    cold,
    warm,
  };
}

async function run() {
  console.log(`================================================================`);
  console.log(` WHICHAIPICK PERFORMANCE BENCHMARK (CDP WIRE-ACCURATE) `);
  console.log(` Target URL: ${BASE_URL}`);
  console.log(` Mode: Cold & Warm Cache | Full Functional Hydration`);
  console.log(`================================================================\n`);

  const browser = await chromium.launch();
  const allResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`=== VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) ===`);
    for (const route of ROUTES) {
      process.stdout.write(`Measuring ${route.name} (${route.path})... `);
      const res = await measureRoute(browser, route, vp);
      allResults.push(res);
      console.log(
        `Done! [Cold: ${(res.cold.totalBytes / 1024).toFixed(1)} KB, ${res.cold.requestCount} reqs, LCP ${res.cold.perfMetrics.lcp}ms] | ` +
        `[Warm: ${(res.warm.totalBytes / 1024).toFixed(1)} KB, ${res.warm.requestCount} reqs, LCP ${res.warm.perfMetrics.lcp}ms]`
      );
    }
    console.log('');
  }

  await browser.close();

  const outPath = process.env.PERF_OUT_FILE || '/tmp/perf_benchmark_results.json';
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
  console.log(`\nDetailed benchmark saved to ${outPath}\n`);
}

run().catch((err) => {
  console.error('Fatal error during benchmark:', err);
  process.exit(1);
});
