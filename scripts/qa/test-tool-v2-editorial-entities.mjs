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
console.log('WHICHAIPICK — STAGE 7E.4A: HTML ENTITY NORMALISATION QA');
console.log('======================================================\n');

// 0. GIT ANCESTRY CHECK
console.log('--- 0. GIT ANCESTRY CHECK ---');
try {
    const gitLog = execSync('git log -n 6 --oneline', { encoding: 'utf-8' });
    console.log('Commit history:\n' + gitLog.trim().split('\n').map(l => '    ' + l).join('\n'));
    assert(gitLog.includes('f953042b'), 'Stage 7E.3B.3 commit f953042b is an ancestor');
    assert(gitLog.includes('048ff60c'), 'Stage 7E.3B.2 commit 048ff60c is an ancestor');
    assert(gitLog.includes('9d54edf3'), 'Stage 7E.3B.1 commit 9d54edf3 is an ancestor');
    assert(gitLog.includes('25a6c494'), 'Stage 7E.3A commit 25a6c494 is an ancestor');
    assert(gitLog.includes('5a3befad'), 'Production baseline 5a3befad is an ancestor');
} catch (e) {
    assert(false, 'Git ancestry verification failed: ' + e.message);
}

const tools = JSON.parse(fs.readFileSync('data/tools.json', 'utf-8'));
const baseTool = tools.find(t => t.id === 'activepieces') || tools[0];

// 1. TEST CASES A THROUGH J (HTML & TEXT ASSERTIONS)
console.log('\n--- 1. ENTITY TEST CASES (A-J) ---');

const entityTestCases = [
    {
        key: 'A',
        label: '&amp; entity',
        input: '<p>Research &amp; Development in AI</p>',
        expectedHtmlSnippet: '<p>Research &amp; Development in AI</p>',
        expectedText: 'Research & Development in AI'
    },
    {
        key: 'B',
        label: '&quot; entity',
        input: '<p>Pricing for &quot;Pro&quot; and &quot;Enterprise&quot; tiers</p>',
        expectedHtmlSnippet: '<p>Pricing for &quot;Pro&quot; and &quot;Enterprise&quot; tiers</p>',
        expectedText: 'Pricing for "Pro" and "Enterprise" tiers'
    },
    {
        key: 'C1',
        label: '&apos; entity',
        input: '<p>It&apos;s a flexible plan</p>',
        expectedHtmlSnippet: '<p>It&#039;s a flexible plan</p>',
        expectedText: "It's a flexible plan"
    },
    {
        key: 'C2',
        label: '&#39; decimal entity',
        input: '<p>It&#39;s a flexible plan</p>',
        expectedHtmlSnippet: '<p>It&#039;s a flexible plan</p>',
        expectedText: "It's a flexible plan"
    },
    {
        key: 'C3',
        label: '&#039; 3-digit decimal entity',
        input: '<p>It&#039;s a flexible plan</p>',
        expectedHtmlSnippet: '<p>It&#039;s a flexible plan</p>',
        expectedText: "It's a flexible plan"
    },
    {
        key: 'C4',
        label: '&#x27; hex entity',
        input: '<p>It&#x27;s a flexible plan</p>',
        expectedHtmlSnippet: '<p>It&#039;s a flexible plan</p>',
        expectedText: "It's a flexible plan"
    },
    {
        key: 'D',
        label: '&lt; and &gt; entities',
        input: '<p>Supports teams where size &gt; 5 and cost &lt; $500</p>',
        expectedHtmlSnippet: '<p>Supports teams where size &gt; 5 and cost &lt; $500</p>',
        expectedText: 'Supports teams where size > 5 and cost < $500'
    },
    {
        key: 'E1',
        label: 'Numeric entity &#8212; (em-dash)',
        input: '<p>Professional plan &#8212; includes API access</p>',
        expectedHtmlSnippet: '<p>Professional plan — includes API access</p>',
        expectedText: 'Professional plan — includes API access'
    },
    {
        key: 'E2',
        label: 'Hex entity &#xA9; (copyright)',
        input: '<p>Copyright &#xA9; 2026 Acme Corp</p>',
        expectedHtmlSnippet: '<p>Copyright © 2026 Acme Corp</p>',
        expectedText: 'Copyright © 2026 Acme Corp'
    },
    {
        key: 'F',
        label: 'Multiple paragraphs',
        input: '<p>First paragraph with details.</p><p>Second paragraph with pricing facts.</p>',
        expectedHtmlSnippet: '<p>First paragraph with details.</p>\n<p>Second paragraph with pricing facts.</p>',
        expectedText: 'First paragraph with details. Second paragraph with pricing facts.'
    },
    {
        key: 'G',
        label: 'Ordinary unencoded ampersand',
        input: '<p>Partnership with Allen & Overy</p>',
        expectedHtmlSnippet: '<p>Partnership with Allen &amp; Overy</p>',
        expectedText: 'Partnership with Allen & Overy'
    },
    {
        key: 'H',
        label: 'Malicious encoded HTML &lt;script&gt;',
        input: '<p>Code example: &lt;script&gt;alert(1)&lt;/script&gt;</p>',
        expectedHtmlSnippet: '<p>Code example: &lt;script&gt;alert(1)&lt;/script&gt;</p>',
        expectedText: 'Code example: <script>alert(1)</script>'
    },
    {
        key: 'I',
        label: 'Already double-encoded entity &amp;amp;',
        input: '<p>Display literal &amp;amp; symbol</p>',
        expectedHtmlSnippet: '<p>Display literal &amp;amp; symbol</p>',
        expectedText: 'Display literal &amp; symbol'
    }
];

const renderedCaseHtmlMap = new Map();

for (const tc of entityTestCases) {
    const testTool = {
        ...baseTool,
        id: `test-tool-${tc.key.toLowerCase()}`,
        canonicalName: `Entity Tool ${tc.key}`,
        pricing_overview: tc.input,
        comparison_summary: tc.input
    };
    const vm = buildToolPageViewModel(testTool);
    const html = renderToolPageV2(vm);
    renderedCaseHtmlMap.set(tc.key, { html, tc });

    // HTML assertions
    assert(html.includes(tc.expectedHtmlSnippet), `[Case ${tc.key}] Rendered HTML contains exact safe snippet for ${tc.label}`);
    assert(!html.includes('&amp;amp;') || tc.key === 'I', `[Case ${tc.key}] Zero double-encoded &amp;amp; (except literal double-encoded test)`);
    assert(!html.includes('&amp;quot;'), `[Case ${tc.key}] Zero double-encoded &amp;quot;`);
    assert(!html.includes('&amp;#'), `[Case ${tc.key}] Zero double-encoded &amp;# numeric entity`);
    assert(!html.includes('&amp;lt;') && !html.includes('&amp;gt;'), `[Case ${tc.key}] Zero double-encoded &amp;lt; / &amp;gt;`);
}

// Case J: Empty or missing fields
console.log('\n[Case J] Empty or Missing Editorial Fields:');
const toolEmptyStr = { ...baseTool, id: 'test-empty-str', pricing_overview: '', comparison_summary: '' };
const vmEmptyStr = buildToolPageViewModel(toolEmptyStr);
const htmlEmptyStr = renderToolPageV2(vmEmptyStr);
assert(!htmlEmptyStr.includes('tool-v2-pricing-overview'), 'Case J1: Empty string pricing_overview cleanly suppressed');
assert(!htmlEmptyStr.includes('<h2>How It Compares</h2>'), 'Case J1: Empty string comparison_summary cleanly suppressed');

const toolNull = { ...baseTool, id: 'test-null', pricing_overview: null, comparison_summary: null };
const vmNull = buildToolPageViewModel(toolNull);
const htmlNull = renderToolPageV2(vmNull);
assert(!htmlNull.includes('tool-v2-pricing-overview'), 'Case J2: Null pricing_overview cleanly suppressed');
assert(!htmlNull.includes('<h2>How It Compares</h2>'), 'Case J2: Null comparison_summary cleanly suppressed');

// 2. REAL CATALOGUE AUDIT
console.log('\n--- 2. REAL CATALOGUE ENTITY AUDIT ---');
let auditedPopulatedCount = 0;
let auditedEntitiesCount = 0;
let auditedDefectsCount = 0;
let auditedPassingCount = 0;

for (const tool of tools) {
    if (tool.pricing_overview || tool.comparison_summary) {
        auditedPopulatedCount++;
        const raw = (tool.pricing_overview || '') + ' ' + (tool.comparison_summary || '');
        if (/&(?:[a-z0-9]+|#\d+|#x[0-9a-f]+);/i.test(raw)) {
            auditedEntitiesCount++;
        }

        const vm = buildToolPageViewModel(tool);
        const rendered = renderToolPageV2(vm);

        // Check if any double-encoding exists in the rendered HTML
        const hasDoubleEncoding = /&amp;(?:[a-z0-9]+|#\d+|#x[0-9a-f]+);/i.test(rendered);
        if (hasDoubleEncoding) {
            auditedDefectsCount++;
        } else {
            auditedPassingCount++;
        }
    }
}

console.log(`Catalogue Audit Results:`);
console.log(`  - Populated records inspected: ${auditedPopulatedCount}`);
console.log(`  - Records containing HTML entities in source: ${auditedEntitiesCount}`);
console.log(`  - Records with double-encoding defects: ${auditedDefectsCount}`);
console.log(`  - Records passing cleanly after correction: ${auditedPassingCount}`);

assert(auditedPopulatedCount === 303, 'Audited exactly 303 populated catalogue records');
assert(auditedDefectsCount === 0, 'Zero double-encoding defects across all 303 populated catalogue records');
assert(auditedPassingCount === 303, '100% (303/303) populated records pass entity validation cleanly');

// Check representative tools
console.log('\nRepresentative Tools Check:');
const representativeTools = ['cursor', 'midjourney', 'claude', 'n8n', 'activepieces', 'docsbot'];
for (const slug of representativeTools) {
    const t = tools.find(x => x.id === slug);
    assert(t !== undefined, `Tool ${slug} exists in catalogue`);
    const vm = buildToolPageViewModel(t);
    const html = renderToolPageV2(vm);
    assert(!/&amp;(?:[a-z0-9]+|#\d+|#x[0-9a-f]+);/i.test(html), `${slug}: Rendered HTML has zero double-encoded entities`);
    if (slug === 'docsbot') {
        assert(!html.includes('tool-v2-pricing-overview'), 'docsbot: Cleanly omits narrative pricing overview');
        assert(!html.includes('<h2>How It Compares</h2>'), 'docsbot: Cleanly omits How It Compares');
    } else {
        assert(html.includes('class="tool-v2-pricing-overview"'), `${slug}: Renders narrative pricing overview`);
        assert(html.includes('<h2>How It Compares</h2>'), `${slug}: Renders How It Compares section`);
    }
}

// Check recraft and upscayl longDescription entities
const recraft = tools.find(t => t.id === 'recraft');
if (recraft) {
    const vmRecraft = buildToolPageViewModel(recraft);
    const htmlRecraft = renderToolPageV2(vmRecraft);
    assert(!htmlRecraft.includes('&amp;#x27;'), 'recraft: Long description &#x27; is normalized, zero &amp;#x27;');
}
const upscayl = tools.find(t => t.id === 'upscayl');
if (upscayl) {
    const vmUpscayl = buildToolPageViewModel(upscayl);
    const htmlUpscayl = renderToolPageV2(vmUpscayl);
    assert(!htmlUpscayl.includes('&amp;#x27;'), 'upscayl: Long description &#x27; is normalized, zero &amp;#x27;');
}

// 3. PLAYWRIGHT BROWSER VERIFICATION (DOM textContent matching)
console.log('\n--- 3. BROWSER VERIFICATION (PLAYWRIGHT DOM textContent) ---');

const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0].split('#')[0];
    if (reqPath.startsWith('/test-case/')) {
        const key = reqPath.replace('/test-case/', '').replace(/\/$/, '').toUpperCase();
        const item = renderedCaseHtmlMap.get(key);
        if (item) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(item.html);
            return;
        }
    }

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
    for (const tc of entityTestCases) {
        await page.goto(`${baseUrl}/test-case/${tc.key}`, { waitUntil: 'domcontentloaded' });

        const actualText = await page.evaluate(() => {
            const container = document.querySelector('.tool-v2-pricing-overview');
            if (!container) return null;
            const paragraphs = Array.from(container.querySelectorAll('p'));
            return paragraphs.map(p => p.textContent.trim()).join(' ');
        });

        assert(actualText === tc.expectedText, `[Browser textContent Case ${tc.key}] textContent matches expected readable text: "${actualText}" === "${tc.expectedText}"`);

        // XSS check: verify no script elements were created inside narrative
        const scriptCount = await page.evaluate(() => {
            const container = document.querySelector('.tool-v2-pricing-overview');
            return container ? container.querySelectorAll('script').length : 0;
        });
        assert(scriptCount === 0, `[Security Case ${tc.key}] Zero executable <script> tags in narrative DOM`);
    }

    // Paragraph count verification for Case F
    await page.goto(`${baseUrl}/test-case/F`, { waitUntil: 'domcontentloaded' });
    const pCount = await page.evaluate(() => {
        const container = document.querySelector('.tool-v2-pricing-overview');
        return container ? container.querySelectorAll('p').length : 0;
    });
    assert(pCount === 2, `[Paragraph Integrity] Case F maintains exactly 2 distinct <p> tags in DOM (actual=${pCount})`);

    // Verify existing canary activepieces at 1280px and 390px
    console.log('\nVerifying Canary Tool activepieces:');
    const viewports = [
        { width: 1280, height: 800, label: 'Desktop (1280px)' },
        { width: 390, height: 844, label: 'Mobile (390px)' }
    ];
    for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${baseUrl}/tools/activepieces/`, { waitUntil: 'networkidle' });

        const overflow = await page.evaluate(() => {
            return {
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth
            };
        });
        assert(overflow.scrollWidth === overflow.clientWidth, `activepieces [${vp.label}]: Zero horizontal overflow (${overflow.scrollWidth}px === ${overflow.clientWidth}px)`);

        const avatarSize = await page.evaluate(() => {
            const el = document.querySelector('.tool-v2-avatar');
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return { width: Math.round(rect.width), height: Math.round(rect.height) };
        });
        assert(avatarSize && avatarSize.width === 64 && avatarSize.height === 64, `activepieces [${vp.label}]: Avatar dimensions preserved at 64x64px`);
    }

    // Interaction check
    const shortlistBtn = page.locator('button.tool-v2-btn-shortlist');
    await shortlistBtn.click();
    const isSaved = await shortlistBtn.evaluate(el => el.classList.contains('saved'));
    assert(isSaved, 'Shortlist button receives .saved class on click');

    const storedState = await page.evaluate(() => localStorage.getItem('whichaipick_user_state'));
    assert(storedState && storedState.includes('activepieces'), 'Tool ID stored in localStorage.whichaipick_user_state');

    await page.click('a.tool-v2-btn-secondary:has-text("Compare ActivePieces")');
    await page.waitForURL('**/compare#tools=activepieces');
    assert(page.url().includes('/compare#tools=activepieces'), 'Compare button navigates to /compare#tools=activepieces');

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
    console.log('🎉 ALL HTML ENTITY NORMALISATION CHECKS PASSED!');
    console.log('======================================================\n');
}
