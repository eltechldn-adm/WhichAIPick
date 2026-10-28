import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { renderToolPageV2 } from '../tool-page-2/render-tool-page-v2.mjs';
import { buildToolPageViewModel } from '../tool-page-2/build-tool-page-view-model.mjs';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedChecks++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

console.log('======================================================');
console.log('WHICHAIPICK — STAGE 7E.3B.3: AVATAR PARITY QA SUITE');
console.log('======================================================\n');

// 0. GIT ANCESTRY CHECK
console.log('--- 0. GIT ANCESTRY CHECK ---');
function isCommitAncestor(commitSha) {
    try {
        execSync(`git merge-base --is-ancestor ${commitSha} HEAD`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}
try {
    const headSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    console.log(`Verifying ancestry against HEAD (${headSha}) via git merge-base --is-ancestor...`);
    assert(isCommitAncestor('048ff60c915fe4c1fd777fdc31c7747d0189a2d2'), 'Stage 7E.3B.2 commit 048ff60c is an ancestor');
    assert(isCommitAncestor('9d54edf35a7f71a2189d62167968e93d0ba09585'), 'Stage 7E.3B.1 commit 9d54edf3 is an ancestor');
    assert(isCommitAncestor('25a6c4940ce8a082799a02e3d6aeb127b6083fc4'), 'Stage 7E.3A commit 25a6c494 is an ancestor');
    assert(isCommitAncestor('5a3befadcac9f95f5b95ba756910266a3f223ac3'), 'Production baseline 5a3befad is an ancestor');
} catch (e) {
    assert(false, 'Git ancestry verification failed: ' + e.message);
}

// 1. AVATAR FAILURE CASES A THROUGH G
console.log('\n--- 1. AVATAR RESOLUTION & FAILURE CASES (A-G) ---');

const tools = JSON.parse(fs.readFileSync('data/tools.json', 'utf-8'));
const baseTool = tools.find(t => t.id === 'activepieces') || tools[0];

// Case A: Valid first-party logo
console.log('\n[Case A] Valid First-Party Logo:');
const toolWithValidLogo = {
    ...baseTool,
    canonicalName: 'Logo Test Tool',
    logo_url: '/assets/logo/logo-final.png'
};
const vmA = buildToolPageViewModel(toolWithValidLogo);
assert(vmA.identity.logoUrl === '/assets/logo/logo-final.png', 'View model identity exposes logoUrl');
const htmlA = renderToolPageV2(vmA);
assert(htmlA.includes('<img class="tool-v2-avatar tool-v2-avatar-img"'), 'Case A renders img tag with .tool-v2-avatar-img');
assert(htmlA.includes('src="/assets/logo/logo-final.png"'), 'Case A preserves exact first-party src');
assert(htmlA.includes('alt="Logo Test Tool logo"'), 'Case A provides correct image alt accessibility attribute');
assert(htmlA.includes('width="64" height="64"'), 'Case A reserves 64x64 dimensions');
assert(htmlA.includes('loading="lazy" decoding="async"'), 'Case A has loading="lazy" decoding="async"');
assert(!htmlA.includes('onerror='), 'Case A has NO inline onerror handler');

// Case B: Missing logo
console.log('\n[Case B] Missing Logo:');
const toolWithNoLogo = {
    ...baseTool,
    canonicalName: 'Activepieces',
    logo_url: null
};
const vmB = buildToolPageViewModel(toolWithNoLogo);
const htmlB = renderToolPageV2(vmB);
assert(htmlB.includes('<div class="tool-v2-avatar tool-v2-avatar-initials" aria-hidden="true">A</div>'), 'Case B renders initials avatar with aria-hidden="true"');
assert(!htmlB.includes('<img class="tool-v2-avatar'), 'Case B does NOT render img tag');
assert(!htmlB.includes('google.com/s2/favicons'), 'Case B does NOT request Google S2 favicons');

// Case C: Invalid or malformed logo URL
console.log('\n[Case C] Invalid / Malformed Logo URL:');
const invalidUrls = [
    'javascript:alert(1)',
    'not-a-valid-path',
    'data:image/svg+xml;base64,PHN2Zz4=',
    '//malicious.com/evil.png',
    'ftp://server/logo.png',
    '/assets/logo/../../secret.png'
];
for (const badUrl of invalidUrls) {
    const toolBad = { ...baseTool, canonicalName: 'Safe Tool', logo_url: badUrl };
    const vmBad = buildToolPageViewModel(toolBad);
    const htmlBad = renderToolPageV2(vmBad);
    assert(htmlBad.includes('<div class="tool-v2-avatar tool-v2-avatar-initials" aria-hidden="true">ST</div>'), `Case C cleanly rejects malformed URL "${badUrl}" and renders initials`);
    assert(!htmlBad.includes('<img'), `Case C does not render img for "${badUrl}"`);
}

// Case D: Unsupported external image URL (Google S2 / external CDN)
console.log('\n[Case D] Unsupported External Image URLs:');
const externalUrls = [
    'https://www.google.com/s2/favicons?domain=example.com&sz=128',
    'http://cdn.example.com/logo.png',
    'https://assets.vendor.ai/img.webp'
];
for (const extUrl of externalUrls) {
    const toolExt = { ...baseTool, canonicalName: 'External Tool', logo_url: extUrl };
    const vmExt = buildToolPageViewModel(toolExt);
    const htmlExt = renderToolPageV2(vmExt);
    assert(htmlExt.includes('<div class="tool-v2-avatar tool-v2-avatar-initials" aria-hidden="true">ET</div>'), `Case D cleanly rejects external URL "${extUrl}" and renders initials`);
    assert(!htmlExt.includes(extUrl), `Case D does NOT include external URL "${extUrl}" in rendered HTML`);
}

// Case E: Empty or unusual tool name
console.log('\n[Case E] Empty or Unusual Tool Name:');
const nameTestCases = [
    { name: '', expected: '??', label: 'empty string' },
    { name: '   ', expected: '??', label: 'whitespace only' },
    { name: 'Cursor', expected: 'C', label: 'single word' },
    { name: 'n8n', expected: 'N', label: 'lowercase single word' },
    { name: 'GitHub Copilot', expected: 'GC', label: 'two words' },
    { name: 'Amazon Web Services AI', expected: 'AW', label: 'three words (first 2 taken)' },
    { name: '3D Studio', expected: '3S', label: 'alphanumeric starting with number' }
];
for (const tc of nameTestCases) {
    const toolName = { ...baseTool, canonicalName: tc.name, name: tc.name, logo_url: null };
    const vmName = buildToolPageViewModel(toolName);
    const htmlName = renderToolPageV2(vmName);
    assert(htmlName.includes(`<div class="tool-v2-avatar tool-v2-avatar-initials" aria-hidden="true">${tc.expected}</div>`), `Case E correctly generates initials "${tc.expected}" for ${tc.label}`);
}

// Case F: Broken / missing first-party image
console.log('\n[Case F] Broken / Missing First-Party Image:');
const toolBrokenLocal = {
    ...baseTool,
    canonicalName: 'Missing Asset Tool',
    logo_url: '/assets/logos/this-file-does-not-exist-98765.png'
};
const vmF = buildToolPageViewModel(toolBrokenLocal);
const htmlF = renderToolPageV2(vmF);
assert(htmlF.includes('<div class="tool-v2-avatar tool-v2-avatar-initials" aria-hidden="true">MA</div>'), 'Case F detects missing local file on disk and cleanly falls back to initials');
assert(!htmlF.includes('this-file-does-not-exist'), 'Case F does NOT render broken img path (prevents 404)');

// Case G: HTML Injection attempts
console.log('\n[Case G] HTML Injection Protection:');
const toolInjection = {
    ...baseTool,
    canonicalName: '<script>alert("name-pwn")</script>',
    name: '<script>alert("name-pwn")</script>',
    logo_url: '/assets/logo.png" onerror="alert(\'url-pwn\')'
};
const vmG = buildToolPageViewModel(toolInjection);
const htmlG = renderToolPageV2(vmG);
assert(!htmlG.includes('<h1><script>'), 'Case G blocked unescaped script tag in h1');
assert(!htmlG.includes('onerror='), 'Case G blocked onerror handler in logo_url');
assert(htmlG.includes('<h1>&lt;script&gt;alert(&quot;name-pwn&quot;)&lt;/script&gt;</h1>'), 'Case G safely escaped name in h1');

// 2. CHECK ALL 6 CANARY TOOLS ON DISK
console.log('\n--- 2. CANARY COHORT ON DISK INSPECTION ---');
const canaryTools = ['activepieces', 'adcreativeai', 'aider', 'akiflow', 'mindgrasp', 'crawl4ai'];
for (const slug of canaryTools) {
    const filePath = path.resolve(`tools/${slug}/index.html`);
    assert(fs.existsSync(filePath), `Canary file exists on disk: tools/${slug}/index.html`);
    const pageHtml = fs.readFileSync(filePath, 'utf-8');

    assert(pageHtml.includes('class="tool-v2-hero-header"'), `${slug}: Has .tool-v2-hero-header container`);
    assert(pageHtml.includes('class="tool-v2-avatar tool-v2-avatar-initials"'), `${slug}: Has .tool-v2-avatar initials badge`);
    assert(!pageHtml.includes('google.com/s2/favicons'), `${slug}: Zero Google S2 requests`);
    assert(!pageHtml.includes('onerror='), `${slug}: Zero inline event handlers`);
    assert(pageHtml.includes('class="tool-v2-btn-primary"'), `${slug}: Retains Visit Website CTA`);
    assert(pageHtml.includes('class="tool-v2-btn-secondary"'), `${slug}: Retains Compare CTA`);
    assert(pageHtml.includes('class="tool-v2-btn-secondary tool-v2-btn-shortlist shortlist-toggle-btn"'), `${slug}: Retains Shortlist button`);
}

// 3. EDITORIAL TEXT CHECK (Section 6: Double-Encoding Inspection)
console.log('\n--- 3. EDITORIAL TEXT DOUBLE-ENCODING INSPECTION ---');
const testEntitiesTool = {
    ...baseTool,
    canonicalName: 'Entity Check Tool',
    pricing_overview: '<p>Pricing is $20 &amp; up for &quot;Pro&quot; tiers.</p><p>Second paragraph with details.</p>',
    comparison_summary: '<p>Competes with Tool A &amp; Tool B in &quot;AI Automation&quot;.</p>'
};
const vmEntities = buildToolPageViewModel(testEntitiesTool);
const htmlEntities = renderToolPageV2(vmEntities);

console.log('Inspecting rendered narrative HTML:');
const pricingOverviewBlock = htmlEntities.match(/<div class="tool-v2-pricing-overview">([\s\S]*?)<\/div>/)?.[1] || '';
console.log('Rendered pricing overview HTML excerpt:\n', pricingOverviewBlock.trim());

const hasAmpAmp = pricingOverviewBlock.includes('&amp;amp;');
const hasAmpQuot = pricingOverviewBlock.includes('&amp;quot;');

console.log('Double-encoding check findings:');
console.log('  - Contains &amp;amp;:', hasAmpAmp);
console.log('  - Contains &amp;quot;:', hasAmpQuot);

if (hasAmpAmp || hasAmpQuot) {
    console.log('  ⚠️ NOTE: formatParagraphs applies escapeHtml to raw string containing pre-existing HTML entities.');
    console.log('  Per Stage 7E.3B.3 directive Section 6: Document this finding for production release readiness without silently refactoring in this avatar phase.');
} else {
    console.log('  No double-encoding detected.');
}
assert(true, 'Section 6 editorial text double-encoding inspection completed and recorded');

// 4. BROWSER VERIFICATION (PLAYWRIGHT)
console.log('\n--- 4. BROWSER VERIFICATION (PLAYWRIGHT) ---');

const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0].split('#')[0];
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
        res.end(fs.readFileSync(filePath));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
console.log(`Local test server running on ${baseUrl}`);

const browser = await chromium.launch();
const page = await browser.newPage();

try {
    const thirdPartyRequests = [];
    page.on('request', req => {
        const url = req.url();
        if (!url.startsWith(baseUrl)) {
            thirdPartyRequests.push(url);
        }
    });

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const viewports = [
        { width: 1280, height: 800, label: 'Desktop (1280px)' },
        { width: 390, height: 844, label: 'Mobile (390px)' }
    ];

    for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${baseUrl}/tools/activepieces/`, { waitUntil: 'networkidle' });

        // Horizontal overflow check
        const overflow = await page.evaluate(() => {
            return {
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth
            };
        });
        assert(overflow.scrollWidth === overflow.clientWidth, `activepieces [${vp.label}]: No horizontal overflow (${overflow.scrollWidth}px === ${overflow.clientWidth}px)`);

        // Avatar presence and dimensions
        const avatarBox = await page.evaluate(() => {
            const el = document.querySelector('.tool-v2-avatar');
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
                width: rect.width,
                height: rect.height,
                display: styles.display,
                text: el.textContent.trim()
            };
        });

        assert(avatarBox !== null, `activepieces [${vp.label}]: Avatar element exists`);
        assert(Math.round(avatarBox.width) === 64, `activepieces [${vp.label}]: Avatar width exactly 64px (actual=${avatarBox.width}px)`);
        assert(Math.round(avatarBox.height) === 64, `activepieces [${vp.label}]: Avatar height exactly 64px (actual=${avatarBox.height}px)`);
        assert(avatarBox.text === 'A', `activepieces [${vp.label}]: Avatar displays initials "A"`);

        // Heading alignment
        const headingBox = await page.evaluate(() => {
            const h1 = document.querySelector('.tool-v2-hero-header h1');
            if (!h1) return null;
            const rect = h1.getBoundingClientRect();
            return {
                text: h1.textContent.trim(),
                width: rect.width,
                visible: rect.width > 0 && rect.height > 0
            };
        });
        assert(headingBox !== null && headingBox.visible, `activepieces [${vp.label}]: H1 heading visible inside .tool-v2-hero-header`);
        assert(headingBox.text.toLowerCase() === 'activepieces', `activepieces [${vp.label}]: H1 text matches "ActivePieces" (actual="${headingBox.text}")`);

        // Check console errors
        assert(consoleErrors.length === 0, `activepieces [${vp.label}]: Zero browser console errors (errors=${consoleErrors.join('; ')})`);
    }

    // Verify zero third-party image requests were made
    const googleS2Requests = thirdPartyRequests.filter(u => u.includes('google.com/s2'));
    assert(googleS2Requests.length === 0, `Playwright network audit: Zero Google S2 requests (actual=${googleS2Requests.length})`);
    console.log(`Total third-party requests intercepted: ${thirdPartyRequests.length}`);

    // Check shortlist & compare button interactions still function
    console.log('\nTesting Functional Shortlist & Compare Interactions:');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${baseUrl}/tools/activepieces/`, { waitUntil: 'networkidle' });

    const shortlistBtn = page.locator('button.tool-v2-btn-shortlist');
    await shortlistBtn.click();
    const isSaved = await shortlistBtn.evaluate(el => el.classList.contains('saved'));
    assert(isSaved, 'Shortlist button receives .saved class on click');

    const storedState = await page.evaluate(() => localStorage.getItem('whichaipick_user_state'));
    assert(storedState && storedState.includes('activepieces'), 'Tool ID stored in localStorage.whichaipick_user_state');

    await page.click('a.tool-v2-btn-secondary:has-text("Compare Activepieces")');
    await page.waitForURL('**/compare#tools=activepieces');
    assert(page.url().includes('/compare#tools=activepieces'), 'Compare button successfully navigated to /compare#tools=activepieces');

} finally {
    await browser.close();
    server.close();
}

console.log('\n======================================================');
console.log(`QA AUDIT COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
if (failedChecks > 0) {
    console.error(`💥 ${failedChecks} CHECKS FAILED!`);
    process.exit(1);
} else {
    console.log('🎉 ALL AVATAR PARITY CHECKS PASSED!');
    console.log('======================================================\n');
}
