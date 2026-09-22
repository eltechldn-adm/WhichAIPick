import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Test 1: Reject Consent
  let context = await browser.newContext();
  let page = await context.newPage();
  let adRequestCount = 0;
  page.on('request', request => {
      const url = request.url();
      if (url.includes('adsbygoogle') || url.includes('doubleclick') || url.includes('googlesyndication')) {
          adRequestCount++;
      }
  });

  await page.goto('https://phase-review.whichaipick.pages.dev/');
  let dl = await page.evaluate(() => window.dataLayer);
  let consentCommand = dl ? dl.find(item => item[0] === 'consent' && item[1] === 'default') : null;
  console.log('[CONSENT] Default state injected:', consentCommand ? 'YES' : 'NO');
  
  await page.click('#waip-consent-reject');
  await page.waitForTimeout(500);
  dl = await page.evaluate(() => window.dataLayer);
  let updateCommand = dl.find(item => item[0] === 'consent' && item[1] === 'update');
  console.log('[CONSENT] After Reject - ad_storage:', updateCommand ? updateCommand[2].ad_storage : 'N/A');
  await context.close();

  // Test 2: Accept Consent
  context = await browser.newContext();
  page = await context.newPage();
  page.on('request', request => {
      const url = request.url();
      if (url.includes('adsbygoogle') || url.includes('doubleclick') || url.includes('googlesyndication')) {
          adRequestCount++;
      }
  });
  await page.goto('https://phase-review.whichaipick.pages.dev/');
  await page.click('#waip-consent-accept');
  await page.waitForTimeout(500);
  dl = await page.evaluate(() => window.dataLayer);
  updateCommand = dl.find(item => item[0] === 'consent' && item[1] === 'update');
  console.log('[CONSENT] After Accept - ad_storage:', updateCommand ? updateCommand[2].ad_storage : 'N/A');
  console.log('[NETWORK] Total Ad Requests Before/After Actions:', adRequestCount);

  // Ad Slot QA
  const slots = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-ad-slot]')).map(el => ({
          name: el.getAttribute('data-ad-slot'),
          height: el.offsetHeight,
          isActive: el.classList.contains('waip-ad-active')
      }));
  });
  console.log('Slots on Homepage:', slots);

  await page.goto('https://phase-review.whichaipick.pages.dev/tools/cursor/');
  await page.waitForTimeout(1000);
  const outboundUrl = await page.evaluate(() => {
      const btn = document.querySelector('.cta-button.primary');
      return btn ? { href: btn.href, rel: btn.rel } : 'NO_BUTTON';
  });
  console.log('CTA attributes (Cursor):', outboundUrl);
  
  const toolSlots = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-ad-slot]')).map(el => ({
          name: el.getAttribute('data-ad-slot'),
          height: el.offsetHeight,
          isActive: el.classList.contains('waip-ad-active')
      }));
  });
  console.log('Slots on Tool Page:', toolSlots);

  await browser.close();
})();
