import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- PREVIEW NETWORK QA (AdsEnabled: false) ---');
  let adRequestCount = 0;
  page.on('request', request => {
      const url = request.url();
      if (url.includes('adsbygoogle') || url.includes('doubleclick') || url.includes('googlesyndication')) {
          adRequestCount++;
          console.log('[NETWORK] Unwanted ad request:', url);
      }
  });

  await page.goto('https://phase-review.whichaipick.pages.dev/');
  
  // Consent Defaults QA
  let dl = await page.evaluate(() => window.dataLayer);
  let consentCommand = dl ? dl.find(item => item[0] === 'consent' && item[1] === 'default') : null;
  console.log('[CONSENT] Default state injected:', consentCommand ? 'YES' : 'NO');
  if (consentCommand) {
      console.log('  ad_storage:', consentCommand[2].ad_storage);
      console.log('  analytics_storage:', consentCommand[2].analytics_storage);
      console.log('  ad_user_data:', consentCommand[2].ad_user_data);
      console.log('  ad_personalization:', consentCommand[2].ad_personalization);
  }

  // Reject Consent
  await page.click('#consent-reject');
  await page.waitForTimeout(500);
  
  dl = await page.evaluate(() => window.dataLayer);
  let updateCommand = dl.find(item => item[0] === 'consent' && item[1] === 'update');
  console.log('[CONSENT] After Reject - Update triggered:', updateCommand ? 'YES' : 'NO');
  if (updateCommand) {
      console.log('  ad_storage:', updateCommand[2].ad_storage);
  }

  // Clear and Accept Consent
  await context.clearCookies();
  await page.goto('https://phase-review.whichaipick.pages.dev/');
  await page.click('#consent-accept');
  await page.waitForTimeout(500);

  dl = await page.evaluate(() => window.dataLayer);
  updateCommand = dl.find(item => item[0] === 'consent' && item[1] === 'update');
  console.log('[CONSENT] After Accept - Update triggered:', updateCommand ? 'YES' : 'NO');
  if (updateCommand) {
      console.log('  ad_storage:', updateCommand[2].ad_storage);
      console.log('  analytics_storage:', updateCommand[2].analytics_storage);
  }

  console.log('[NETWORK] Total Ad Requests Before/After Actions:', adRequestCount);

  // Ad Slot QA (Homepage)
  console.log('\n--- AD SLOT QA ---');
  const slots = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-ad-slot]')).map(el => ({
          name: el.getAttribute('data-ad-slot'),
          height: el.offsetHeight,
          isActive: el.classList.contains('waip-ad-active')
      }));
  });
  console.log('Slots on Homepage:', slots);

  // Navigate to a tool page to check Affiliate fallback
  await page.goto('https://phase-review.whichaipick.pages.dev/tools/cursor/');
  await page.waitForTimeout(1000);
  
  console.log('\n--- AFFILIATE QA (Cursor) ---');
  const outboundUrl = await page.evaluate(() => {
      const btn = document.querySelector('.cta-button.primary');
      if (!btn) return 'NO_BUTTON';
      // Click it and intercept? Since it's a target=_blank or standard link, let's just grab the href
      return { href: btn.href, rel: btn.rel };
  });
  console.log('CTA attributes:', outboundUrl);

  const toolSlots = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-ad-slot]')).map(el => ({
          name: el.getAttribute('data-ad-slot'),
          height: el.offsetHeight,
          isActive: el.classList.contains('waip-ad-active')
      }));
  });
  console.log('Slots on Tool Page:', toolSlots);

  // Page Type QA - Finder
  await page.goto('https://phase-review.whichaipick.pages.dev/find/');
  const finderSlots = await page.evaluate(() => document.querySelectorAll('[data-ad-slot]').length);
  console.log('\n--- PAGE TYPE QA (Finder) ---');
  console.log('Ad Slots found on Finder:', finderSlots);

  await browser.close();
})();
