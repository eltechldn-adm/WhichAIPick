import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PORT = 8899;

// Lightweight static HTTP server
function createServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    if (!path.extname(reqPath)) {
      if (fs.existsSync(path.join(ROOT, reqPath + '.html'))) {
        reqPath += '.html';
      } else if (fs.existsSync(path.join(ROOT, reqPath, 'index.html'))) {
        reqPath = path.join(reqPath, 'index.html');
      }
    }

    const filePath = path.join(ROOT, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function runTests() {
  console.log('Starting Consent & Certified CMP Compliance Tests...');
  const server = createServer();
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Test server running at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  let failures = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`  ❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`  ✅ PASS: ${message}`);
    }
  }

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: First Visit (Default denied, banner displays)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: First Visit (Default Denied & Banner Render) ---');
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    const bannerExists = await page.waitForSelector('#waip-consent-banner', { timeout: 3000 }).then(() => true).catch(() => false);
    assert(bannerExists, 'Consent banner renders on first visit');

    const defaultDenied = await page.evaluate(() => {
      return window.dataLayer && window.dataLayer.some(args => 
        args[0] === 'consent' && args[1] === 'default' && args[2]?.ad_storage === 'denied'
      );
    });
    assert(defaultDenied, 'Google Consent Mode v2 default denied signals configured in page head');

    // Click Reject Non-Essential
    await page.click('#waip-consent-reject');
    await page.waitForTimeout(300);

    const bannerHiddenAfterReject = await page.$('#waip-consent-banner') === null;
    assert(bannerHiddenAfterReject, 'Banner dismissed after clicking Reject Non-Essential');

    const consentStateRejected = await page.evaluate(() => localStorage.getItem('waip_cookie_consent'));
    assert(consentStateRejected === 'rejected', 'localStorage records consent as "rejected"');

    const analyticsNotLoaded = await page.evaluate(() => {
      return !document.querySelector('script[src*="analytics.js"]') && !window.WAIP_ScriptsLoaded;
    });
    assert(analyticsNotLoaded, 'Analytics and third-party scripts remain suppressed on reject');

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Re-opening Preferences from Global Footer
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Footer "Cookie Settings" Trigger & Keyboard Escape ---');
    const footerLink = await page.$('#waip-cookie-settings');
    assert(footerLink !== null, 'Footer contains #waip-cookie-settings trigger');

    await page.click('#waip-cookie-settings');
    await page.waitForTimeout(300);

    const bannerReopened = await page.$('#waip-consent-banner') !== null;
    assert(bannerReopened, 'Banner re-opens when clicking Cookie Settings in footer');

    const bannerRole = await page.$eval('#waip-consent-banner', el => el.getAttribute('role'));
    const bannerModal = await page.$eval('#waip-consent-banner', el => el.getAttribute('aria-modal'));
    assert(bannerRole === 'dialog', 'Banner has role="dialog"');
    assert(bannerModal === 'true', 'Banner has aria-modal="true"');

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const bannerDismissedByEscape = await page.$('#waip-consent-banner') === null;
    assert(bannerDismissedByEscape, 'Banner dismissed when pressing Escape key');

    // Re-open and accept
    await page.click('#waip-cookie-settings');
    await page.waitForTimeout(300);
    await page.click('#waip-consent-accept');
    await page.waitForTimeout(500);

    const consentStateAccepted = await page.evaluate(() => localStorage.getItem('waip_cookie_consent'));
    assert(consentStateAccepted === 'accepted', 'localStorage updated to "accepted"');

    const updateSignalsGranted = await page.evaluate(() => {
      return window.dataLayer && window.dataLayer.some(args => 
        args[0] === 'consent' && args[1] === 'update' && args[2]?.ad_storage === 'granted'
      );
    });
    assert(updateSignalsGranted, 'gtag consent update sent with granted signals');

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: Cookies Page Dedicated Button
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Cookies Page Management Button ---');
    await page.goto(`http://localhost:${PORT}/cookies.html`, { waitUntil: 'domcontentloaded' });

    const manageBtn = await page.$('#waip-manage-cookies-btn');
    assert(manageBtn !== null, 'Cookies page has dedicated #waip-manage-cookies-btn');

    await page.click('#waip-manage-cookies-btn');
    await page.waitForTimeout(300);

    const bannerOnCookiesPage = await page.$('#waip-consent-banner') !== null;
    assert(bannerOnCookiesPage, 'Clicking button on cookies page opens consent preferences banner');

    const closeBtn = await page.$('#waip-consent-close');
    assert(closeBtn !== null, 'Banner contains explicit close button (#waip-consent-close)');

    await page.click('#waip-consent-close');
    await page.waitForTimeout(300);

    const bannerClosedViaBtn = await page.$('#waip-consent-banner') === null;
    assert(bannerClosedViaBtn, 'Banner closed via #waip-consent-close button');

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: Certified CMP Bridge (googlefc delegation)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Google Certified CMP Delegation (googlefc & TCF v2.3 Bridge) ---');
    const delegationTest = await page.evaluate(() => {
      let functionCalled = false;
      window.googlefc = {
        showRevocationMessage: () => { functionCalled = true; }
      };
      window.WAIP_Consent.showPreferences();
      const bannerCreated = !!document.getElementById('waip-consent-banner');
      return { functionCalled, bannerCreated };
    });

    assert(delegationTest.functionCalled === true, 'WAIP_Consent.showPreferences() calls googlefc.showRevocationMessage() when available');
    assert(delegationTest.bannerCreated === false, 'Local banner suppressed when Google certified CMP handles revocation');

    const queueTest = await page.evaluate(() => {
      let deferredExecuted = false;
      window.googlefc = {
        callbackQueue: []
      };
      window.WAIP_Consent.showPreferences();
      const queued = window.googlefc.callbackQueue.length === 1 && typeof window.googlefc.callbackQueue[0] === 'function';
      // Simulate CMP script loading later and executing queue
      window.googlefc.showRevocationMessage = () => { deferredExecuted = true; };
      if (queued) {
        window.googlefc.callbackQueue[0]();
      }
      return { queued, deferredExecuted };
    });
    assert(queueTest.queued === true, 'WAIP_Consent queues callback on googlefc.callbackQueue when initialized');
    assert(queueTest.deferredExecuted === true, 'Queued callback triggers googlefc.showRevocationMessage() upon CMP resolution');

    await context.close();
  } catch (err) {
    console.error('Unhandled test error:', err);
    failures++;
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n======================================================`);
  if (failures === 0) {
    console.log('🎉 ALL CONSENT & CMP TESTS PASSED (0 FAILURES)');
    process.exit(0);
  } else {
    console.error(`❌ ${failures} TEST(S) FAILED`);
    process.exit(1);
  }
}

runTests();
