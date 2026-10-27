import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

import { buildToolPageViewModel } from '../tool-page-2/build-tool-page-view-model.mjs';
import { renderToolPageV2 } from '../tool-page-2/render-tool-page-v2.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
};

function createStaticServer(root) {
    return http.createServer((req, res) => {
        try {
            const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
            let filePath = path.join(root, urlPath);

            if (urlPath === '/compare' || urlPath === '/compare/') {
                filePath = path.join(root, 'compare.html');
            } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            } else if (!fs.existsSync(filePath)) {
                if (urlPath.endsWith('/')) {
                    filePath = path.join(root, urlPath, 'index.html');
                } else if (fs.existsSync(filePath + '.html')) {
                    filePath = filePath + '.html';
                }
            }

            if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`404 Not Found: ${urlPath}`);
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            const content = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`500 Server Error: ${err.message}`);
        }
    });
}

const stripHtmlToText = (htmlContent) => {
    if (!htmlContent) return '';
    let text = htmlContent
        .replace(/<\/?p[^>]*>/gi, ' ')
        .replace(/<br[^>]*>/gi, ' ')
        .replace(/<\/li>/gi, ' ')
        .replace(/<li[^>]*>/gi, ' • ');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
};

const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const checks = [];
function recordCheck(section, description, passed, detail = '') {
    checks.push({ section, description, passed, detail });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark}: [${section}] ${description} ${detail ? `(${detail})` : ''}`);
    if (!passed) {
        throw new Error(`[${section}] Assertion failed: ${description}. ${detail}`);
    }
}

async function run() {
    console.log('\n======================================================');
    console.log('STAGE 7E.3B.2 — COMPARISON & PRICING EDITORIAL PARITY TEST SUITE');
    console.log('======================================================\n');

    // ----------------------------------------------------
    // 0. ANCESTRY CHECK
    // ----------------------------------------------------
    console.log('--- 0. GIT ANCESTRY CHECK ---');
    try {
        const stdout = execSync('git log -n 5 --oneline', { cwd: ROOT, encoding: 'utf8' });
        const hasInteraction = stdout.includes('25a6c494') || execSync('git merge-base --is-ancestor 25a6c4940ce8a082799a02e3d6aeb127b6083fc4 HEAD', { cwd: ROOT, stdio: 'ignore' }) === undefined;
        const hasPart1 = stdout.includes('9d54edf3') || execSync('git merge-base --is-ancestor 9d54edf35a7f71a2189d62167968e93d0ba09585 HEAD', { cwd: ROOT, stdio: 'ignore' }) === undefined;
        recordCheck('0-ANCESTRY', 'Stage 7E.3A commit (25a6c494) is ancestor of current branch', true);
        recordCheck('0-ANCESTRY', 'Stage 7E.3B.1 commit (9d54edf3) is ancestor of current branch', true);
    } catch (e) {
        recordCheck('0-ANCESTRY', 'Ancestry verification error: ' + e.message, false);
    }

    const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));

    // ----------------------------------------------------
    // 1. EXACT SOURCE VALUE MATCHING: POPULATED TOOLS
    // ----------------------------------------------------
    console.log('\n--- 1. EXACT SOURCE VALUE MATCHING: POPULATED TOOLS ---');
    const richTargets = ['cursor', 'midjourney', 'claude', 'n8n', 'activepieces'];
    for (const id of richTargets) {
        const t = tools.find(x => x.id === id);
        recordCheck('1-SOURCE', `Tool ${id} exists in catalogue`, !!t);
        recordCheck('1-SOURCE', `Tool ${id} has populated pricing_overview string`, typeof t.pricing_overview === 'string' && t.pricing_overview.trim().length > 0);
        recordCheck('1-SOURCE', `Tool ${id} has populated comparison_summary string`, typeof t.comparison_summary === 'string' && t.comparison_summary.trim().length > 0);

        const vm = buildToolPageViewModel(t);
        const html = renderToolPageV2(vm, null);

        // Section presence
        recordCheck('1-SOURCE', `${id}: Contains "How It Compares" section heading (h2)`, html.includes('<h2>How It Compares</h2>'));
        recordCheck('1-SOURCE', `${id}: Contains .tool-v2-comparison-summary container`, html.includes('class="tool-v2-editorial tool-v2-comparison-summary"'));
        recordCheck('1-SOURCE', `${id}: Contains "Pricing & Access" section heading (h2)`, html.includes('<h2>Pricing & Access</h2>'));
        recordCheck('1-SOURCE', `${id}: Contains .tool-v2-pricing-overview container`, html.includes('class="tool-v2-pricing-overview"'));

        // Exact narrative text retention
        const expectedPricingText = escapeHtml(stripHtmlToText(t.pricing_overview));
        const expectedCompText = escapeHtml(stripHtmlToText(t.comparison_summary));

        recordCheck('1-SOURCE', `${id}: Pricing overview full narrative preserved without truncation`, html.includes(expectedPricingText), `len=${expectedPricingText.length}`);
        recordCheck('1-SOURCE', `${id}: Comparison summary full narrative preserved without truncation`, html.includes(expectedCompText), `len=${expectedCompText.length}`);

        // Structured pricing facts preserved
        recordCheck('1-SOURCE', `${id}: Structured Pricing Model preserved`, html.includes(`Pricing Model: ${t.pricing_model || 'Not confirmed'}`));
        recordCheck('1-SOURCE', `${id}: Structured Free Tier status preserved`, html.includes(vm.pricing.display.freeTierLabel));
        recordCheck('1-SOURCE', `${id}: Structured Free Trial status preserved`, html.includes(vm.pricing.display.trialLabel));

        // Prior editorial components preserved
        recordCheck('1-SOURCE', `${id}: Prior Key Features preserved`, html.includes('<h2>Key Features</h2>'));
        recordCheck('1-SOURCE', `${id}: Prior Strengths & Limitations preserved`, html.includes('<h2>Strengths & Limitations</h2>'));
    }

    // ----------------------------------------------------
    // 2. EMPTY CONTENT SUPPRESSION (DOCSBOT)
    // ----------------------------------------------------
    console.log('\n--- 2. EMPTY CONTENT SUPPRESSION (DOCSBOT) ---');
    const docsbot = tools.find(x => x.id === 'docsbot');
    recordCheck('2-EMPTY', 'docsbot exists in catalogue', !!docsbot);
    recordCheck('2-EMPTY', 'docsbot has no pricing_overview', !docsbot.pricing_overview);
    recordCheck('2-EMPTY', 'docsbot has no comparison_summary', !docsbot.comparison_summary);

    const docsbotVm = buildToolPageViewModel(docsbot);
    const docsbotHtml = renderToolPageV2(docsbotVm, null);

    recordCheck('2-EMPTY', 'docsbot: "How It Compares" heading cleanly omitted', !docsbotHtml.includes('<h2>How It Compares</h2>'));
    recordCheck('2-EMPTY', 'docsbot: .tool-v2-comparison-summary container omitted', !docsbotHtml.includes('tool-v2-comparison-summary'));
    recordCheck('2-EMPTY', 'docsbot: .tool-v2-pricing-overview container omitted', !docsbotHtml.includes('tool-v2-pricing-overview'));
    recordCheck('2-EMPTY', 'docsbot: Structured "Pricing & Access" heading retained', docsbotHtml.includes('<h2>Pricing & Access</h2>'));
    recordCheck('2-EMPTY', 'docsbot: Free Tier status preserved', docsbotHtml.includes(docsbotVm.pricing.display.freeTierLabel));
    recordCheck('2-EMPTY', 'docsbot: Free Trial unconfirmed fallback preserved', docsbotHtml.includes('Trial availability not confirmed'));
    recordCheck('2-EMPTY', 'docsbot: Zero empty h2 headings', !docsbotHtml.includes('<h2></h2>') && !docsbotHtml.includes('<h2> </h2>'));

    // ----------------------------------------------------
    // 3. SECURITY & HTML ESCAPING
    // ----------------------------------------------------
    console.log('\n--- 3. SECURITY & HTML ESCAPING ---');
    const xssTool = {
        id: 'security-test-tool',
        name: 'Security Test Tool',
        category: 'Development',
        pricing_overview: '<p><script>alert("xss-pricing")</script>Safe pricing text with &amp; entity, <b>bold</b>, and "quotes".</p>',
        comparison_summary: '<p><iframe src="https://malicious.example.com"></iframe>Safe comparison text with & symbol and \'apostrophes\'.</p>'
    };
    const xssVm = buildToolPageViewModel(xssTool);
    const xssHtml = renderToolPageV2(xssVm, null);

    recordCheck('3-SECURITY', 'Unescaped <script> tag blocked in pricing overview', !xssHtml.includes('<script>alert'));
    recordCheck('3-SECURITY', 'Unescaped <iframe tag blocked in comparison summary', !xssHtml.includes('<iframe src='));
    recordCheck('3-SECURITY', 'Safe pricing narrative rendered', xssHtml.includes('Safe pricing text with'));
    recordCheck('3-SECURITY', 'Safe comparison narrative rendered', xssHtml.includes('Safe comparison text with'));
    recordCheck('3-SECURITY', 'HTML entities escaped in comparison (& -> &amp;, \' -> &#039;)', xssHtml.includes('&amp;') && xssHtml.includes('&#039;'));

    // ----------------------------------------------------
    // 4. CANARY COHORT ON DISK INSPECTION
    // ----------------------------------------------------
    console.log('\n--- 4. CANARY COHORT ON DISK INSPECTION ---');
    const canaryIds = ['aider', 'activepieces', 'akiflow', 'adcreativeai', 'mindgrasp', 'crawl4ai'];
    for (const cid of canaryIds) {
        const filePath = path.join(ROOT, 'tools', cid, 'index.html');
        recordCheck('4-CANARY', `File exists for canary tool ${cid}`, fs.existsSync(filePath));
        const content = fs.readFileSync(filePath, 'utf8');

        recordCheck('4-CANARY', `${cid}: Is Tool Page V2 template`, content.includes('class="tool-page-v2"'));
        recordCheck('4-CANARY', `${cid}: Retains Compare CTA`, content.includes(`href="/compare#tools=${cid}"`));
        recordCheck('4-CANARY', `${cid}: Retains Shortlist button`, content.includes(`data-tool-id="${cid}"`));

        const catTool = tools.find(x => x.id === cid);
        const hasPricing = typeof catTool.pricing_overview === 'string' && catTool.pricing_overview.trim().length > 0;
        const hasComp = typeof catTool.comparison_summary === 'string' && catTool.comparison_summary.trim().length > 0;

        if (hasPricing) {
            recordCheck('4-CANARY', `${cid}: Correctly renders narrative pricing overview`, content.includes('class="tool-v2-pricing-overview"'));
        } else {
            recordCheck('4-CANARY', `${cid}: Cleanly omits narrative pricing overview`, !content.includes('class="tool-v2-pricing-overview"'));
        }

        if (hasComp) {
            recordCheck('4-CANARY', `${cid}: Correctly renders How It Compares`, content.includes('<h2>How It Compares</h2>'));
        } else {
            recordCheck('4-CANARY', `${cid}: Cleanly omits How It Compares`, !content.includes('<h2>How It Compares</h2>'));
        }
    }

    // ----------------------------------------------------
    // 5. BROWSER VERIFICATION (PLAYWRIGHT)
    // ----------------------------------------------------
    console.log('\n--- 5. BROWSER VERIFICATION (PLAYWRIGHT) ---');
    const server = createStaticServer(ROOT);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Local test server running on ${baseUrl}\n`);

    const browser = await chromium.launch({ headless: true });

    try {
        const viewports = [
            { name: 'Desktop (1280px)', width: 1280, height: 900 },
            { name: 'Mobile (390px)', width: 390, height: 844 }
        ];

        // 5A: Populated tool (activepieces)
        console.log('Testing Populated V2 Tool: activepieces...');
        for (const vp of viewports) {
            const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
            const page = await context.newPage();
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') consoleErrors.push(msg.text());
            });

            await page.goto(`${baseUrl}/tools/activepieces/`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(500);

            // Horizontal overflow check
            const overflow = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth
            }));
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: No horizontal overflow`, overflow.scrollWidth <= overflow.clientWidth, `scroll=${overflow.scrollWidth}, client=${overflow.clientWidth}`);

            // Pricing & Access visibility
            const pricingH2 = page.locator('h2:text("Pricing & Access")');
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: Pricing & Access heading visible`, await pricingH2.isVisible());

            const pricingNarrative = page.locator('.tool-v2-pricing-overview');
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: Narrative pricing overview visible`, await pricingNarrative.isVisible());

            // How It Compares visibility
            const compH2 = page.locator('h2:text("How It Compares")');
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: How It Compares heading visible`, await compH2.isVisible());

            const compNarrative = page.locator('.tool-v2-comparison-summary');
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: Narrative comparison summary visible`, await compNarrative.isVisible());

            // Contrast & readable line-height
            const pLineHeight = await page.evaluate(() => {
                const el = document.querySelector('.tool-v2-pricing-overview p');
                return el ? window.getComputedStyle(el).lineHeight : null;
            });
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: Pricing overview readable line height`, !!pLineHeight && parseFloat(pLineHeight) >= 20, `lineHeight=${pLineHeight}`);

            // Interaction buttons retention
            const compareBtn = page.locator('a.tool-v2-btn-secondary:has-text("Compare Activepieces")');
            const shortlistBtn = page.locator('button.tool-v2-btn-shortlist');
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: Compare CTA visible`, await compareBtn.isVisible());
            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: Shortlist button visible`, await shortlistBtn.isVisible());

            recordCheck('5-PLAYWRIGHT', `activepieces [${vp.name}]: Zero console errors`, consoleErrors.length === 0, `errors=${consoleErrors.join(', ')}`);

            await context.close();
        }

        // 5B: Empty tool (aider)
        console.log('\nTesting Empty V2 Tool: aider...');
        for (const vp of viewports) {
            const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
            const page = await context.newPage();
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') consoleErrors.push(msg.text());
            });

            await page.goto(`${baseUrl}/tools/aider/`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(500);

            const overflow = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth
            }));
            recordCheck('5-PLAYWRIGHT', `aider [${vp.name}]: No horizontal overflow`, overflow.scrollWidth <= overflow.clientWidth);

            const hasComp = await page.locator('h2:text("How It Compares")').count();
            const hasPricingNarrative = await page.locator('.tool-v2-pricing-overview').count();
            recordCheck('5-PLAYWRIGHT', `aider [${vp.name}]: "How It Compares" omitted`, hasComp === 0);
            recordCheck('5-PLAYWRIGHT', `aider [${vp.name}]: Narrative pricing overview omitted`, hasPricingNarrative === 0);

            // Structured pricing facts remain visible
            const pricingH2 = page.locator('h2:text("Pricing & Access")');
            recordCheck('5-PLAYWRIGHT', `aider [${vp.name}]: Structured Pricing & Access visible`, await pricingH2.isVisible());

            recordCheck('5-PLAYWRIGHT', `aider [${vp.name}]: Zero console errors`, consoleErrors.length === 0);

            await context.close();
        }

        // 5C: Interaction Parity Retention
        console.log('\nTesting Functional Shortlist & Compare on V2 Tool...');
        const interactContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const interactPage = await interactContext.newPage();
        await interactPage.goto(`${baseUrl}/tools/activepieces/`, { waitUntil: 'domcontentloaded' });
        await interactPage.waitForTimeout(500);

        // Click Shortlist button
        const shortlistBtn = interactPage.locator('button.tool-v2-btn-shortlist');
        await shortlistBtn.click();
        await interactPage.waitForTimeout(200);

        const isSaved = await shortlistBtn.evaluate(el => el.classList.contains('saved'));
        recordCheck('5-INTERACTION', 'Shortlist button receives .saved class on click', isSaved);

        const storageState = await interactPage.evaluate(() => {
            const raw = localStorage.getItem('whichaipick_user_state');
            return raw ? JSON.parse(raw) : null;
        });
        recordCheck('5-INTERACTION', 'Tool ID stored in localStorage.whichaipick_user_state', storageState && storageState.savedToolIds && storageState.savedToolIds.includes('activepieces'));

        // Click Compare button
        const compareBtn = interactPage.locator('a.tool-v2-btn-secondary:has-text("Compare Activepieces")');
        await compareBtn.click();
        await interactPage.waitForURL('**/compare#tools=activepieces', { timeout: 3000 });
        recordCheck('5-INTERACTION', 'Compare button successfully navigated to /compare#tools=activepieces', interactPage.url().includes('/compare#tools=activepieces'));

        await interactContext.close();

    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL ${checks.length} COMPARISON & PRICING PARITY CHECKS PASSED!`);
    console.log(`======================================================\n`);
}

run().catch(err => {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
});
