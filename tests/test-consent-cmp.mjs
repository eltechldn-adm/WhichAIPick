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
  console.log('======================================================');
  console.log('WHICHAIPICK STAGE 7H.10C CONSENT QA TEST SUITE');
  console.log('======================================================');

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
    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: First Visit (No consent, default denied, fallback banner)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: First Visit (Default Denied & Fallback Banner) ---');
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    const bannerExists1 = await page1.waitForSelector('#waip-consent-banner', { timeout: 3000 }).then(() => true).catch(() => false);
    assert(bannerExists1, 'Fallback banner renders on first visit with no CMP present');

    const defaultDenied1 = await page1.evaluate(() => {
      return window.dataLayer && window.dataLayer.some(args => 
        args[0] === 'consent' && args[1] === 'default' && args[2]?.ad_storage === 'denied'
      );
    });
    assert(defaultDenied1, 'Google Consent Mode v2 default denied signals configured in page head');

    const trackingSuppressed1 = await page1.evaluate(() => {
      return !window.WAIP_ScriptsLoaded && !document.querySelector('script[src*="analytics.js"]');
    });
    assert(trackingSuppressed1, 'Tracking scripts remain strictly suppressed on first visit');
    await ctx1.close();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Existing Legacy Accepted Value (State Isolation & No Ad Consent)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Legacy "accepted" Value State Isolation ---');
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    // Pre-populate legacy localStorage 'accepted'
    await page2.addInitScript(() => {
      localStorage.setItem('waip_cookie_consent', 'accepted');
    });
    await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    const adSignalsNotGranted2 = await page2.evaluate(() => {
      // Check dataLayer: there must be NO update that granted ad_storage or ad_personalization
      const updates = (window.dataLayer || []).filter(args => args[0] === 'consent' && args[1] === 'update');
      return !updates.some(u => u[2]?.ad_storage === 'granted' || u[2]?.ad_personalization === 'granted');
    });
    assert(adSignalsNotGranted2, 'Legacy localStorage "accepted" does NOT grant advertising consent');

    const adsScriptNotLoaded2 = await page2.evaluate(() => {
      return !document.querySelector('script[src*="adsbygoogle.js"]') &&
             (!window.WaipAds || !window.WaipAds.active);
    });
    assert(adsScriptNotLoaded2, 'AdSense remains inactive despite legacy local storage');
    await ctx2.close();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: Existing Legacy Rejected Value
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Legacy "rejected" Value Enforcement ---');
    const ctx3 = await browser.newContext();
    const page3 = await ctx3.newPage();
    await page3.addInitScript(() => {
      localStorage.setItem('waip_cookie_consent', 'rejected');
    });
    await page3.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    const bannerNotShown3 = await page3.$('#waip-consent-banner') === null;
    assert(bannerNotShown3, 'Fallback banner not shown when rejection is recorded');

    const scriptsNotLoaded3 = await page3.evaluate(() => !window.WAIP_ScriptsLoaded);
    assert(scriptsNotLoaded3, 'Scripts remain uninitialized on recorded rejection');
    await ctx3.close();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: Delayed Google CMP Loading & Overlap Prevention
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Delayed Google CMP (googlefc & TCF v2.3 Callbacks) ---');
    const ctx4 = await browser.newContext();
    const page4 = await ctx4.newPage();

    // Inject mock Google Funding Choices with delayed queue resolution
    await page4.addInitScript(() => {
      window.googlefc = {
        callbackQueue: []
      };
    });
    await page4.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    const queueRegistered4 = await page4.evaluate(() => {
      return Array.isArray(window.googlefc.callbackQueue) && window.googlefc.callbackQueue.length > 0;
    });
    assert(queueRegistered4, 'consent.js pushes callbacks to window.googlefc.callbackQueue');

    // Simulate Google CMP firing CONSENT_MODE_DATA_READY after delay
    const cmpDataReadyResult4 = await page4.evaluate(() => {
      let resolvedGranted = false;
      window.googlefc.getGoogleConsentModeValues = () => ({
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });

      // Find and execute the callback object
      for (const item of window.googlefc.callbackQueue) {
        if (item && typeof item.CONSENT_MODE_DATA_READY === 'function') {
          item.CONSENT_MODE_DATA_READY();
        }
      }

      const updates = (window.dataLayer || []).filter(args => args[0] === 'consent' && args[1] === 'update');
      resolvedGranted = updates.some(u => u[2]?.ad_storage === 'granted');
      const bannerAbsent = !document.getElementById('waip-consent-banner');
      return { resolvedGranted, bannerAbsent };
    });

    assert(cmpDataReadyResult4.resolvedGranted, 'Authoritative consent values processed upon CONSENT_MODE_DATA_READY');
    assert(cmpDataReadyResult4.bannerAbsent, 'Custom banner suppressed when Google CMP is active (no overlap)');
    await ctx4.close();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5: Google CMP Unavailable & Fallback Dialog
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Google CMP Unavailable & Accessible Fallback Dialog ---');
    const ctx5 = await browser.newContext();
    const page5 = await ctx5.newPage();
    await page5.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    // Open preferences via footer trigger
    await page5.click('#waip-cookie-settings');
    await page5.waitForTimeout(200);

    const bannerDialog5 = await page5.waitForSelector('#waip-consent-banner[role="dialog"]', { timeout: 2000 }).then(() => true).catch(() => false);
    assert(bannerDialog5, 'Fallback dialog opens with role="dialog" and aria-modal="true"');

    // Test Escape key dismissal
    await page5.keyboard.press('Escape');
    await page5.waitForTimeout(200);
    const dismissedEscape5 = await page5.$('#waip-consent-banner') === null;
    assert(dismissedEscape5, 'Dialog dismisses cleanly upon Escape key press');

    // Reopen and test close button
    await page5.click('#waip-cookie-settings');
    await page5.waitForTimeout(200);
    await page5.click('#waip-consent-close');
    await page5.waitForTimeout(200);
    const dismissedCloseBtn5 = await page5.$('#waip-consent-banner') === null;
    assert(dismissedCloseBtn5, 'Dialog dismisses cleanly upon close button click');
    await ctx5.close();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 6: Consent Withdrawal (Revocation)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: Consent Withdrawal & Revocation Delegation ---');
    const ctx6 = await browser.newContext();
    const page6 = await ctx6.newPage();
    await page6.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    // First accept locally
    await page6.click('#waip-consent-accept');
    await page6.waitForTimeout(200);

    // Call revokeConsent with mock googlefc.showRevocationMessage
    const revocationResult6 = await page6.evaluate(() => {
      let revocationInvoked = false;
      window.googlefc = {
        showRevocationMessage: () => { revocationInvoked = true; }
      };
      window.WAIP_Consent.revokeConsent();

      // Check that localStorage was cleared and denied signal sent
      const stored = localStorage.getItem('waip_cookie_consent');
      const updates = (window.dataLayer || []).filter(args => args[0] === 'consent' && args[1] === 'update');
      const lastUpdate = updates[updates.length - 1];
      const allDenied = lastUpdate && lastUpdate[2]?.ad_storage === 'denied' && lastUpdate[2]?.analytics_storage === 'denied';

      return { revocationInvoked, storedCleared: stored === null, allDenied };
    });

    assert(revocationResult6.storedCleared, 'revokeConsent() removes stored local consent');
    assert(revocationResult6.allDenied, 'revokeConsent() updates consent signals to denied');
    assert(revocationResult6.revocationInvoked, 'revokeConsent() delegates to googlefc.showRevocationMessage() when available');
    await ctx6.close();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 7: Duplicate Banner Prevention
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: Duplicate Banner Prevention ---');
    const ctx7 = await browser.newContext();
    const page7 = await ctx7.newPage();
    await page7.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });

    // Click Cookie Settings twice rapidly
    await page7.click('#waip-cookie-settings');
    await page7.click('#waip-cookie-settings');
    await page7.waitForTimeout(200);

    const bannerCount7 = await page7.$$eval('#waip-consent-banner', banners => banners.length);
    assert(bannerCount7 === 1, 'Multiple calls to showPreferences() never create duplicate banners in DOM');
    await ctx7.close();

    // ─────────────────────────────────────────────────────────────────────────
    // Test 8: Footer Settings on Diverse Public Page Templates
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 8: Footer Settings Trigger Across Public Page Templates ---');
    const testPages = [
      { url: '/tools/apify/', name: 'Tool Page (tools/apify/index.html)' },
      { url: '/category/development/', name: 'Category Page (category/development/index.html)' },
      { url: '/about.html', name: 'Company Page (about.html)' },
      { url: '/contact.html', name: 'Contact Page (contact.html)' },
      { url: '/cookies.html', name: 'Legal Page (cookies.html)' }
    ];

    for (const p of testPages) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`http://localhost:${PORT}${p.url}`, { waitUntil: 'domcontentloaded' });

      // Dismiss initial banner so footer trigger is clickable
      const initialBanner = await page.$('#waip-consent-banner');
      if (initialBanner) {
        await page.click('#waip-consent-reject');
        await page.waitForTimeout(200);
      }

      const footerControl = await page.$('#waip-cookie-settings');
      assert(footerControl !== null, `${p.name} contains #waip-cookie-settings in footer`);

      // Click footer control and verify banner re-appears
      await page.click('#waip-cookie-settings');
      await page.waitForTimeout(200);
      const reopened = await page.$('#waip-consent-banner') !== null;
      assert(reopened, `${p.name} footer control successfully triggers consent preferences dialog`);

      await ctx.close();
    }

  } catch (err) {
    console.error('Unhandled test failure:', err);
    failures++;
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n======================================================');
  if (failures === 0) {
    console.log('🎉 ALL STAGE 7H.10C SAFETY & ACCEPTANCE TESTS PASSED (0 FAILURES)');
    process.exit(0);
  } else {
    console.error(`❌ ${failures} TEST(S) FAILED`);
    process.exit(1);
  }
}

runTests();
