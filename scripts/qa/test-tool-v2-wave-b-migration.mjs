import fs from 'fs';
import path from 'path';
import http from 'http';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const ORIGINAL_CANARIES = [
    'aider',
    'activepieces',
    'akiflow',
    'adcreativeai',
    'mindgrasp',
    'crawl4ai'
];

const WAVE_A_TOOLS = [
    'n8n',
    'anyword',
    'beautifulai',
    'github-copilot',
    'claude',
    'botpress',
    'assemblyai',
    'datarobot',
    'kapwing',
    'marketmuse'
];

const WAVE_B_TOOLS = [
    'clearscope',
    'buffer-ai-assistant',
    'brisk-teaching',
    'readai'
];

const EXPECTED_21 = [...ORIGINAL_CANARIES, ...WAVE_A_TOOLS, ...WAVE_B_TOOLS, 'cursor'];

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures = [];

function check(condition, label, detail = '') {
    totalChecks++;
    if (condition) {
        passedChecks++;
    } else {
        failedChecks++;
        const msg = detail ? `${label} (${detail})` : label;
        failures.push(msg);
        console.error(`  ❌ FAIL: ${msg}`);
    }
}

function createStaticServer(rootDir) {
    const mime = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon'
    };
    return http.createServer((req, res) => {
        try {
            const url = new URL(req.url, 'http://127.0.0.1');
            let pathname = decodeURIComponent(url.pathname);
            if (pathname.endsWith('/')) {
                pathname += 'index.html';
            }
            const filePath = path.join(rootDir, pathname);
            if (!filePath.startsWith(rootDir)) {
                res.writeHead(403);
                return res.end('Forbidden');
            }
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = path.extname(filePath);
                res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
                return fs.createReadStream(filePath).pipe(res);
            }
            res.writeHead(404);
            res.end('Not found');
        } catch (err) {
            res.writeHead(500);
            res.end(err.message);
        }
    });
}

async function run() {
    console.log('======================================================');
    console.log('WHICHAIPICK — STAGE 7F.4A WAVE B MIGRATION QA SUITE');
    console.log('======================================================\n');

    // 1. Manifest & Allowlist Verification
    const manifestPath = path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json');
    check(fs.existsSync(manifestPath), 'Authoritative manifest data/release/tool-page-v2-canary.json exists');
    check(!fs.existsSync(path.join(ROOT, 'data', 'tool-page-v2-canary.json')), 'No duplicate data/tool-page-v2-canary.json manifest exists');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check(manifest.expectedCount === 21, 'Manifest expectedCount === 21', `actual=${manifest.expectedCount}`);
    check(
        JSON.stringify(manifest.approvedToolIds) === JSON.stringify(EXPECTED_21),
        'Manifest approvedToolIds matches exact 16 previous + 4 Wave B + Cursor IDs in order'
    );

    // Explicit exclusions
    for (const excluded of ['midjourney', 'elevenlabs', 'jasper', 'notion-ai']) {
        check(!manifest.approvedToolIds.includes(excluded), `Excluded tool "${excluded}" is NOT in canary manifest`);
    }

    // 2. Page Inventory Verification
    const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
    const toolMap = new Map(tools.map(t => [t.id, t]));
    check(tools.length === 882, 'Catalogue contains 882 tools', `actual=${tools.length}`);

    let v2Count = 0;
    let v1Count = 0;
    const v2Found = [];
    for (const tool of tools) {
        const htmlPath = path.join(ROOT, 'tools', tool.id, 'index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        const isV2 = html.includes('class="tool-page-v2"');
        const isV1 = html.includes('class="tool-detail-page"');
        if (isV2 && !isV1) {
            v2Count++;
            v2Found.push(tool.id);
        } else if (isV1 && !isV2) {
            v1Count++;
        } else {
            check(false, `Ambiguous template for ${tool.id}`);
        }
    }
    check(v2Count === 21, 'Generated V2 page count is exactly 21', `actual=${v2Count}`);
    check(v1Count === 861, 'Generated V1 page count is exactly 861', `actual=${v1Count}`);
    check(
        JSON.stringify([...v2Found].sort()) === JSON.stringify([...EXPECTED_21].sort()),
        'Exact 21 V2 pages match approved allowlist with zero extras'
    );

    // Sitemap check
    const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const locCount = (sitemapXml.match(/<loc>/g) || []).length;
    check(locCount === 959, 'sitemap.xml contains exactly 959 URLs', `actual=${locCount}`);

    // 3. Four-Tool Content Parity Checks
    console.log('--- SECTION 6: FOUR-TOOL CONTENT & METRIC PARITY ---');
    for (const id of WAVE_B_TOOLS) {
        const tool = toolMap.get(id);
        const html = fs.readFileSync(path.join(ROOT, 'tools', id, 'index.html'), 'utf8');

        // Heading & Meta
        check(html.includes(`<h1>${tool.canonicalName || tool.name}</h1>`), `${id}: Exact <h1> matches canonical name`);
        check(html.includes(`<title>${tool.canonicalName || tool.name} — AI ${tool.primaryCategory || tool.category} Tool | WhichAIPick</title>`), `${id}: Meta title matches exact pattern`);
        check(html.includes(`rel="canonical" href="https://whichaipick.com/tools/${id}/"`), `${id}: Canonical URL matches https://whichaipick.com/tools/${id}/`);
        check(html.includes('content="index,follow"'), `${id}: Meta robots is index,follow`);

        // Mandatory V2 Sections (using actual V2 H2 headings)
        const requiredH2s = [
            'Editorial Overview',
            'Key Features',
            'Strengths & Limitations',
            'Who is it for?',
            'Primary Use Cases',
            'Pricing & Access'
        ];
        for (const h2 of requiredH2s) {
            check(html.includes(`<h2>${h2}</h2>`), `${id}: Section <h2>${h2}</h2> rendered`);
        }
        check(html.includes('<h3>How it works</h3>'), `${id}: How It Works subheading rendered`);
        check(html.includes('class="tool-v2-editorial tool-v2-comparison-summary"'), `${id}: How It Compares narrative rendered`);

        // Specific tool assertions
        if (id === 'clearscope') {
            check(html.includes('$129'), 'clearscope: Renders $129 starting price in UI');
            check(html.includes('14-day free trial'), 'clearscope: Renders 14-day free trial in narrative');
            check(html.includes('unlimited user seats'), 'clearscope: Notes unlimited user seats');
            check(html.includes('href="https://www.clearscope.io/"'), 'clearscope: Primary CTA links to https://www.clearscope.io/');
            check(html.includes('Free trial available'), 'clearscope: Displays Free trial available badge');
            check(html.includes('No ongoing free tier'), 'clearscope: Displays No ongoing free tier badge');
        } else if (id === 'buffer-ai-assistant') {
            check(html.includes('https://buffer.com/ai-assistant'), 'buffer-ai-assistant: CTA links to official product page');
            check(!html.includes('/buffer-ai"'), 'buffer-ai-assistant: No raw /buffer-ai redirect URL');
            check(html.includes('unlimited AI generation credits'), 'buffer-ai-assistant: Highlights unlimited AI generation credits across every Buffer plan');
            check(html.includes('$6 per channel per month'), 'buffer-ai-assistant: Explains $6 per channel Essentials plan');
            check(html.includes('Free tier available'), 'buffer-ai-assistant: Displays Free tier available badge');
            check(html.includes('Free trial available'), 'buffer-ai-assistant: Displays Free trial available badge');
        } else if (id === 'brisk-teaching') {
            check(html.includes('Publishes student data privacy commitments and states that it complies with student privacy laws such as FERPA'), 'brisk-teaching: Contains compliant FERPA wording');
            check(!/educational standards? such as FERPA/i.test(html), 'brisk-teaching: Zero misclassification of FERPA as educational standard');
            check(!/FERPA[- ]certified|certified (as )?FERPA/i.test(html), 'brisk-teaching: Zero claims of third-party FERPA certification');
            check(html.includes('Free tier available'), 'brisk-teaching: Displays Free tier available badge');
            check(html.includes('Free trial available'), 'brisk-teaching: Displays Free trial available badge');
        } else if (id === 'readai') {
            check(html.includes('$19.75'), 'readai: Renders $19.75 starting price');
            check(html.includes('Free tier available'), 'readai: Displays Free tier available badge');
            check(html.includes('Free trial available'), 'readai: Displays Free trial available badge');
            for (const banned of [
                'merciless dashboard',
                'Corporate Behavioral Psychologist',
                'dystopian',
                'resting angry face',
                'toxic corporate culture',
                'efficiency-obsessed',
                'secretly causing large-scale organizational disengagement',
                'alongside large-scale leader like',
                'grueling job',
                'brutally exposes'
            ]) {
                check(!html.includes(banned), `readai: Banned phrase "${banned}" absent from HTML`);
            }
        }
    }

    // 4. Cursor Integrity (Migrated to V2)
    console.log('--- CURSOR SAFETY & AFFILIATE CHECK ---');
    const cursorHtml = fs.readFileSync(path.join(ROOT, 'tools', 'cursor', 'index.html'), 'utf8');
    check(cursorHtml.includes('class="tool-page-v2"'), 'cursor: Has V2 tool-page-v2 template');
    check(!cursorHtml.includes('class="tool-detail-page"'), 'cursor: Does NOT have V1 tool-detail-page template');
    check(cursorHtml.includes('https://cursor.com/?ref=whichaipick'), 'cursor: Preserves affiliate link');
    check(cursorHtml.includes('rel="sponsored noopener noreferrer"'), 'cursor: Preserves rel="sponsored noopener noreferrer"');
    check(cursorHtml.includes('class="tool-v2-affiliate-note"'), 'cursor: Displays affiliate disclosure note');
    check(cursorHtml.includes('href="/disclosure.html"'), 'cursor: Affiliate note links to disclosure.html');
    check(cursorHtml.includes('$8'), 'cursor: Displays $8 starting price in UI');
    check(cursorHtml.includes('Plus'), 'cursor: Displays Plus plan in narrative');

    // 5. Playwright Browser Tests
    console.log('--- SECTION 7: PLAYWRIGHT BROWSER VERIFICATION ---');
    const server = createStaticServer(ROOT);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        let currentConsoleErrors = [];
        let currentPageErrors = [];
        let currentExternalFavicons = [];

        page.on('console', msg => {
            if (msg.type() === 'error') currentConsoleErrors.push(msg.text());
        });
        page.on('pageerror', err => {
            currentPageErrors.push(err.message);
        });
        page.on('request', req => {
            const url = req.url();
            if (!url.startsWith(baseUrl) && !url.startsWith('data:')) {
                if (req.resourceType() === 'image' || url.includes('favicon') || url.includes('google.com/s2')) {
                    currentExternalFavicons.push(url);
                }
            }
        });

        // Test each of the 4 Wave B tools + Cursor
        const testTools = [...WAVE_B_TOOLS, 'cursor'];
        for (const id of testTools) {
            currentConsoleErrors = [];
            currentPageErrors = [];
            currentExternalFavicons = [];

            // A. Desktop Responsive & Overflow (1280px)
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}/tools/${id}/`, { waitUntil: 'networkidle' });
            await page.evaluate(() => localStorage.clear());
            await page.reload({ waitUntil: 'networkidle' });

            check(currentExternalFavicons.length === 0, `${id}: Zero third-party favicon requests on desktop`);
            check(currentConsoleErrors.length === 0 && currentPageErrors.length === 0, `${id}: Zero console/page errors on desktop`);

            const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
            check(desktopOverflow, `${id}: Zero horizontal overflow at 1280px`);

            // B. Tablet Responsive (768px)
            await page.setViewportSize({ width: 768, height: 1024 });
            const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
            check(tabletOverflow, `${id}: Zero horizontal overflow at 768px`);

            // C. Mobile Responsive (390px)
            await page.setViewportSize({ width: 390, height: 844 });
            const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
            check(mobileOverflow, `${id}: Zero horizontal overflow at 390px`);

            // D. Primary CTA & Links
            await page.setViewportSize({ width: 1280, height: 800 });
            const ctaInfo = await page.evaluate(() => {
                const primaryCta = document.querySelector('.tool-v2-cta-group a.tool-v2-btn-primary');
                const compareCta = document.querySelector('.tool-v2-cta-group a.tool-v2-btn-secondary');
                const shortlistBtn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');
                return {
                    primaryHref: primaryCta?.getAttribute('href'),
                    primaryRel: primaryCta?.getAttribute('rel'),
                    primaryTarget: primaryCta?.getAttribute('target'),
                    compareHref: compareCta?.getAttribute('href'),
                    shortlistId: shortlistBtn?.getAttribute('data-tool-id')
                };
            });
            check(ctaInfo.primaryHref && ctaInfo.primaryHref.startsWith('https://'), `${id}: Primary CTA uses valid HTTPS destination`);
            check(ctaInfo.primaryRel && ctaInfo.primaryRel.includes('noopener') && ctaInfo.primaryRel.includes('noreferrer'), `${id}: Primary CTA has noopener noreferrer`);
            check(ctaInfo.primaryTarget === '_blank', `${id}: Primary CTA has target="_blank"`);
            check(ctaInfo.compareHref === `/compare#tools=${id}`, `${id}: Compare CTA uses /compare#tools=${id}`);
            check(ctaInfo.shortlistId === id, `${id}: Shortlist button has data-tool-id="${id}"`);

            // E. JSON-LD Security & Parsing
            const ldInfo = await page.evaluate(() => {
                const script = document.querySelector('script[type="application/ld+json"]');
                if (!script) return { exists: false };
                try {
                    const parsed = JSON.parse(script.textContent);
                    return { exists: true, valid: true, type: parsed['@type'], name: parsed.name };
                } catch (e) {
                    return { exists: true, valid: false, error: e.message };
                }
            });
            check(ldInfo.exists && ldInfo.valid, `${id}: Valid parseable JSON-LD in DOM`);
            check(ldInfo.type === 'SoftwareApplication', `${id}: JSON-LD @type is SoftwareApplication`);

            // F. Shortlist Interactive Flow (Save -> Storage -> Reload -> Unsave)
            const shortlistBtn = page.locator('.tool-v2-cta-group button.shortlist-toggle-btn');
            await shortlistBtn.click();
            await page.waitForTimeout(100);

            const savedState = await page.evaluate(() => {
                const btn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');
                const raw = localStorage.getItem('whichaipick_user_state');
                let parsed = {};
                try { parsed = JSON.parse(raw); } catch {}
                return {
                    isSavedClass: btn.classList.contains('saved'),
                    savedToolIds: parsed.savedToolIds || []
                };
            });
            check(savedState.isSavedClass, `${id}: Shortlist button receives .saved class`);
            check(savedState.savedToolIds.includes(id), `${id}: Tool ID stored in localStorage.whichaipick_user_state`);

            // Reload verification
            await page.reload({ waitUntil: 'networkidle' });
            const reloadSaved = await page.evaluate(() => {
                const btn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');
                return btn.classList.contains('saved');
            });
            check(reloadSaved, `${id}: Retains .saved class across page reload`);

            // Navigate to /my-tools/
            await page.goto(`${baseUrl}/my-tools/`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(300);
            const inMyTools = await page.evaluate((toolId) => {
                const cards = Array.from(document.querySelectorAll('.tool-card, [data-tool-id]'));
                const links = Array.from(document.querySelectorAll(`a[href*="/tools/${toolId}/"]`));
                return cards.some(c => c.textContent.includes(toolId) || c.getAttribute('data-tool-id') === toolId) || links.length > 0;
            }, id);
            check(inMyTools, `${id}: Appears in /my-tools/ saved list`);

            // Return to tool page and unsave
            await page.goto(`${baseUrl}/tools/${id}/`, { waitUntil: 'networkidle' });
            await page.locator('.tool-v2-cta-group button.shortlist-toggle-btn').click();
            await page.waitForTimeout(100);

            const unsavedState = await page.evaluate(() => {
                const btn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');
                const raw = localStorage.getItem('whichaipick_user_state');
                let parsed = {};
                try { parsed = JSON.parse(raw); } catch {}
                return {
                    hasSavedClass: btn.classList.contains('saved'),
                    savedToolIds: parsed.savedToolIds || []
                };
            });
            check(!unsavedState.hasSavedClass, `${id}: Shortlist button loses .saved class on unsave`);
            check(!unsavedState.savedToolIds.includes(id), `${id}: Tool ID removed from localStorage.whichaipick_user_state`);

            // G. Compare Flow (Preselection & Compare Engine)
            const compareBtn = page.locator('.tool-v2-cta-group a.tool-v2-btn-secondary');
            await compareBtn.click();
            await page.waitForURL(`**/compare#tools=${id}`);
            check(page.url().includes(`/compare#tools=${id}`), `${id}: Compare CTA navigated to /compare#tools=${id}`);

            await page.waitForTimeout(400);
            const compareActive = await page.evaluate((toolId) => {
                return window.location.hash.includes(`tools=${toolId}`);
            }, id);
            check(compareActive, `${id}: Compare engine retains URL hash preselection`);
        }

        await context.close();
    } finally {
        await browser.close();
        server.close();
    }

    console.log('\n======================================================');
    console.log(`WAVE B MIGRATION QA SUMMARY: ${passedChecks}/${totalChecks} PASSED (${failedChecks} failed)`);
    console.log('======================================================\n');

    if (failedChecks > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
