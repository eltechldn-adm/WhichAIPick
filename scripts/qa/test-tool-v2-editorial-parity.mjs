import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
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
    console.log('STAGE 7E.3B.1 — TOOL PAGE V2 EDITORIAL PARITY TEST SUITE');
    console.log('======================================================\n');

    const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));

    // ----------------------------------------------------
    // 1. FIXTURE INTEGRITY
    // ----------------------------------------------------
    console.log('--- 1. FIXTURE INTEGRITY ---');
    const populatedIds = ['cursor', 'midjourney', 'claude', 'n8n'];
    for (const id of populatedIds) {
        const t = tools.find(x => x.id === id);
        recordCheck('1-FIXTURE', `Tool ${id} exists in tools.json`, !!t);
        recordCheck('1-FIXTURE', `Tool ${id} has populated pros array`, Array.isArray(t.pros) && t.pros.length > 0, `count=${t.pros?.length}`);
        recordCheck('1-FIXTURE', `Tool ${id} has populated cons array`, Array.isArray(t.cons) && t.cons.length > 0, `count=${t.cons?.length}`);
        recordCheck('1-FIXTURE', `Tool ${id} has populated feature_groups`, !!t.feature_groups && Object.keys(t.feature_groups).length > 0);
    }

    const docsbot = tools.find(x => x.id === 'docsbot');
    recordCheck('1-FIXTURE', 'Tool docsbot exists in tools.json', !!docsbot);
    recordCheck('1-FIXTURE', 'Tool docsbot has NO pros', !docsbot.pros || docsbot.pros.length === 0);
    recordCheck('1-FIXTURE', 'Tool docsbot has NO cons', !docsbot.cons || docsbot.cons.length === 0);
    recordCheck('1-FIXTURE', 'Tool docsbot has NO feature_groups', !docsbot.feature_groups || Object.keys(docsbot.feature_groups).length === 0);

    // ----------------------------------------------------
    // 2. UNIT RENDERING: POPULATED EDITORIAL FIELDS
    // ----------------------------------------------------
    console.log('\n--- 2. UNIT RENDERING: POPULATED EDITORIAL FIELDS ---');
    for (const id of populatedIds) {
        const t = tools.find(x => x.id === id);
        const vm = buildToolPageViewModel(t);
        const html = renderToolPageV2(vm, null);

        recordCheck('2-POPULATED', `${id}: Contains Key Features heading (h2)`, html.includes('<h2>Key Features</h2>'));
        recordCheck('2-POPULATED', `${id}: Contains Strengths & Limitations heading (h2)`, html.includes('<h2>Strengths & Limitations</h2>'));
        recordCheck('2-POPULATED', `${id}: Contains Strengths sub-heading (h3)`, html.includes('<h3>Strengths</h3>'));
        recordCheck('2-POPULATED', `${id}: Contains Limitations sub-heading (h3)`, html.includes('<h3>Limitations</h3>'));
        recordCheck('2-POPULATED', `${id}: Uses semantic .tool-v2-pros-list`, html.includes('class="tool-v2-list tool-v2-pros-list"'));
        recordCheck('2-POPULATED', `${id}: Uses semantic .tool-v2-cons-list`, html.includes('class="tool-v2-list tool-v2-cons-list"'));
        recordCheck('2-POPULATED', `${id}: Uses semantic .tool-v2-feature-list`, html.includes('class="tool-v2-list tool-v2-feature-list"'));

        // Verify all catalogue pros are in HTML
        for (const pro of t.pros) {
            recordCheck('2-POPULATED', `${id}: Pro rendered "${pro.slice(0, 30)}..."`, html.includes(pro));
        }

        // Verify all catalogue cons are in HTML
        for (const con of t.cons) {
            recordCheck('2-POPULATED', `${id}: Con rendered "${con.slice(0, 30)}..."`, html.includes(con));
        }

        // Verify feature groups
        const groups = Array.isArray(t.feature_groups) ? t.feature_groups : Object.values(t.feature_groups);
        for (const g of groups) {
            const escapedGroup = g.group.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            recordCheck('2-POPULATED', `${id}: Group heading rendered "${g.group}"`, html.includes(`<h3>${escapedGroup}</h3>`));
            for (const item of g.items) {
                const escapedItem = item.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                recordCheck('2-POPULATED', `${id}: Feature item rendered "${item.slice(0, 30)}..."`, html.includes(escapedItem));
            }
        }
    }

    // ----------------------------------------------------
    // 3. UNIT RENDERING: EMPTY CONTENT (DOCSBOT)
    // ----------------------------------------------------
    console.log('\n--- 3. UNIT RENDERING: EMPTY CONTENT (DOCSBOT) ---');
    const docsbotVm = buildToolPageViewModel(docsbot);
    const docsbotHtml = renderToolPageV2(docsbotVm, null);

    recordCheck('3-EMPTY', 'docsbot: Key Features heading omitted', !docsbotHtml.includes('<h2>Key Features</h2>'));
    recordCheck('3-EMPTY', 'docsbot: Strengths & Limitations heading omitted', !docsbotHtml.includes('<h2>Strengths & Limitations</h2>'));
    recordCheck('3-EMPTY', 'docsbot: .tool-v2-feature-groups container omitted', !docsbotHtml.includes('tool-v2-feature-groups'));
    recordCheck('3-EMPTY', 'docsbot: .tool-v2-pros-cons container omitted', !docsbotHtml.includes('tool-v2-pros-cons'));
    recordCheck('3-EMPTY', 'docsbot: No empty h2 tags', !docsbotHtml.includes('<h2></h2>') && !docsbotHtml.includes('<h2> </h2>'));
    recordCheck('3-EMPTY', 'docsbot: No empty h3 tags', !docsbotHtml.includes('<h3></h3>') && !docsbotHtml.includes('<h3> </h3>'));

    // ----------------------------------------------------
    // 4. EDGE CASES: PARTIAL DATA & DEDUPLICATION
    // ----------------------------------------------------
    console.log('\n--- 4. EDGE CASES: PARTIAL DATA & DEDUPLICATION ---');
    const baseTool = {
        id: 'partial-tool',
        name: 'Partial Tool',
        category: 'Productivity'
    };

    // Case 4A: Pros only
    const prosOnlyVm = buildToolPageViewModel({
        ...baseTool,
        pros: ['Only pro 1', 'Only pro 2']
    });
    const prosOnlyHtml = renderToolPageV2(prosOnlyVm, null);
    recordCheck('4-PARTIAL', 'Pros-only: Renders Strengths & Limitations', prosOnlyHtml.includes('<h2>Strengths & Limitations</h2>'));
    recordCheck('4-PARTIAL', 'Pros-only: Renders Strengths h3', prosOnlyHtml.includes('<h3>Strengths</h3>'));
    recordCheck('4-PARTIAL', 'Pros-only: Does NOT render Limitations h3', !prosOnlyHtml.includes('<h3>Limitations</h3>'));
    recordCheck('4-PARTIAL', 'Pros-only: Does NOT render Key Features', !prosOnlyHtml.includes('<h2>Key Features</h2>'));

    // Case 4B: Cons only
    const consOnlyVm = buildToolPageViewModel({
        ...baseTool,
        cons: ['Only limitation 1']
    });
    const consOnlyHtml = renderToolPageV2(consOnlyVm, null);
    recordCheck('4-PARTIAL', 'Cons-only: Renders Strengths & Limitations', consOnlyHtml.includes('<h2>Strengths & Limitations</h2>'));
    recordCheck('4-PARTIAL', 'Cons-only: Does NOT render Strengths h3', !consOnlyHtml.includes('<h3>Strengths</h3>'));
    recordCheck('4-PARTIAL', 'Cons-only: Renders Limitations h3', consOnlyHtml.includes('<h3>Limitations</h3>'));

    // Case 4C: Deduplication
    const dupeVm = buildToolPageViewModel({
        ...baseTool,
        pros: ['Same strength', 'Same strength', 'Unique strength'],
        cons: ['Same weakness', 'Same weakness']
    });
    const dupeHtml = renderToolPageV2(dupeVm, null);
    const sameStrengthMatches = (dupeHtml.match(/<li>Same strength<\/li>/g) || []).length;
    const sameWeaknessMatches = (dupeHtml.match(/<li>Same weakness<\/li>/g) || []).length;
    recordCheck('4-DEDUP', 'Deduplicates identical pros entries to 1 instance', sameStrengthMatches === 1, `count=${sameStrengthMatches}`);
    recordCheck('4-DEDUP', 'Deduplicates identical cons entries to 1 instance', sameWeaknessMatches === 1, `count=${sameWeaknessMatches}`);

    // Case 4D: Empty group items omitted
    const emptyGroupVm = buildToolPageViewModel({
        ...baseTool,
        feature_groups: [
            { group: 'Valid Group', items: ['Valid item'] },
            { group: 'Empty Group', items: [] },
            { group: 'Whitespace Group', items: ['   ', ''] }
        ]
    });
    const emptyGroupHtml = renderToolPageV2(emptyGroupVm, null);
    recordCheck('4-EMPTY-GROUP', 'Empty groups are filtered out of Key Features', !emptyGroupHtml.includes('Empty Group') && !emptyGroupHtml.includes('Whitespace Group'));
    recordCheck('4-EMPTY-GROUP', 'Valid group is rendered', emptyGroupHtml.includes('Valid Group'));

    // ----------------------------------------------------
    // 5. SECURITY & HTML ESCAPING
    // ----------------------------------------------------
    console.log('\n--- 5. SECURITY & HTML ESCAPING ---');
    const xssVm = buildToolPageViewModel({
        id: 'xss-tool',
        name: 'XSS <Test> & Co',
        category: 'Development',
        pros: ['<script>alert("xss-pro")</script>', 'Pro with & and <b>markup</b>'],
        cons: ['<img src="x" onerror="alert(1)">', 'Con with "quotes" and \'apostrophes\''],
        feature_groups: [
            {
                group: '<Dangerous Group>',
                items: ['<iframe src="evil.com"></iframe>', 'Item with <span style="color:red">tag</span>']
            }
        ]
    });
    const xssHtml = renderToolPageV2(xssVm, null);

    recordCheck('5-SECURITY', 'Unescaped <script> blocked', !xssHtml.includes('<script>alert'));
    recordCheck('5-SECURITY', 'Escaped &lt;script&gt; present', xssHtml.includes('&lt;script&gt;alert(&quot;xss-pro&quot;)&lt;/script&gt;'));
    recordCheck('5-SECURITY', 'Unescaped <img onerror blocked', !xssHtml.includes('<img src="x"'));
    recordCheck('5-SECURITY', 'Escaped &lt;img present', xssHtml.includes('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'));
    recordCheck('5-SECURITY', 'Unescaped <iframe blocked', !xssHtml.includes('<iframe src="evil.com">'));
    recordCheck('5-SECURITY', 'Escaped &lt;iframe present', xssHtml.includes('&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;'));
    recordCheck('5-SECURITY', 'Unescaped group heading tag blocked', !xssHtml.includes('<Dangerous Group>'));
    recordCheck('5-SECURITY', 'Escaped group heading present', xssHtml.includes('&lt;Dangerous Group&gt;'));

    // ----------------------------------------------------
    // 6. CANARY COHORT ON DISK INSPECTION
    // ----------------------------------------------------
    console.log('\n--- 6. CANARY COHORT ON DISK INSPECTION ---');
    const canaryIds = ['aider', 'activepieces', 'akiflow', 'adcreativeai', 'mindgrasp', 'crawl4ai'];
    for (const cid of canaryIds) {
        const filePath = path.join(ROOT, 'tools', cid, 'index.html');
        recordCheck('6-CANARY', `File exists for canary tool ${cid}`, fs.existsSync(filePath));
        const content = fs.readFileSync(filePath, 'utf8');
        recordCheck('6-CANARY', `${cid} is V2 template`, content.includes('class="tool-page-v2"'));
        recordCheck('6-CANARY', `${cid} retains Compare CTA`, content.includes(`href="/compare#tools=${cid}"`));
        recordCheck('6-CANARY', `${cid} retains Shortlist button`, content.includes(`data-tool-id="${cid}"`));

        // Check editorial parity expectation
        const catalogueTool = tools.find(x => x.id === cid);
        const hasCataloguePros = Array.isArray(catalogueTool.pros) && catalogueTool.pros.length > 0;
        const hasCatalogueFG = !!catalogueTool.feature_groups && Object.keys(catalogueTool.feature_groups).length > 0;

        if (hasCataloguePros) {
            recordCheck('6-CANARY', `${cid} correctly renders Strengths & Limitations`, content.includes('<h2>Strengths & Limitations</h2>'));
        } else {
            recordCheck('6-CANARY', `${cid} cleanly omits Strengths & Limitations`, !content.includes('<h2>Strengths & Limitations</h2>'));
        }

        if (hasCatalogueFG) {
            recordCheck('6-CANARY', `${cid} correctly renders Key Features`, content.includes('<h2>Key Features</h2>'));
        } else {
            recordCheck('6-CANARY', `${cid} cleanly omits Key Features`, !content.includes('<h2>Key Features</h2>'));
        }
    }

    // ----------------------------------------------------
    // 7. BROWSER VERIFICATION (PLAYWRIGHT)
    // ----------------------------------------------------
    console.log('\n--- 7. BROWSER VERIFICATION (PLAYWRIGHT) ---');
    const server = createStaticServer(ROOT);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Local static test server running on ${baseUrl}\n`);

    const browser = await chromium.launch({ headless: true });

    try {
        const viewports = [
            { name: 'Desktop (1280px)', width: 1280, height: 900 },
            { name: 'Mobile (390px)', width: 390, height: 844 }
        ];

        // 7A: Test Populated Canary Tool (activepieces)
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
            const overflow = await page.evaluate(() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth
                };
            });
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: No horizontal overflow`, overflow.scrollWidth <= overflow.clientWidth, `scroll=${overflow.scrollWidth}, client=${overflow.clientWidth}`);

            // Key Features visibility
            const keyFeaturesH2 = page.locator('h2:text("Key Features")');
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Key Features h2 visible`, await keyFeaturesH2.isVisible());

            // Strengths & Limitations visibility
            const strengthsH2 = page.locator('h2:text("Strengths & Limitations")');
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Strengths & Limitations h2 visible`, await strengthsH2.isVisible());

            const strengthsH3 = page.locator('h3:text("Strengths")');
            const limitationsH3 = page.locator('h3:text("Limitations")');
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Strengths h3 visible`, await strengthsH3.isVisible());
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Limitations h3 visible`, await limitationsH3.isVisible());

            // Compare CTA & Shortlist button retention
            const compareBtn = page.locator('a.tool-v2-btn-secondary:has-text("Compare Activepieces")');
            const shortlistBtn = page.locator('button.tool-v2-btn-shortlist');
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Compare button visible`, await compareBtn.isVisible());
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Shortlist button visible`, await shortlistBtn.isVisible());

            const shortlistBox = await shortlistBtn.boundingBox();
            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Shortlist button touch height >= 44px`, shortlistBox.height >= 44, `height=${shortlistBox.height}`);

            recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Zero console errors`, consoleErrors.length === 0, `errors=${consoleErrors.join(', ')}`);

            // Check responsive column stacking
            const prosBox = await page.locator('.tool-v2-pros').boundingBox();
            const consBox = await page.locator('.tool-v2-cons').boundingBox();
            if (vp.width === 1280) {
                // Side by side on desktop: y positions roughly equal
                const isSideBySide = Math.abs(prosBox.y - consBox.y) < 15;
                recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Strengths and Limitations side-by-side`, isSideBySide, `prosY=${prosBox.y}, consY=${consBox.y}`);
            } else {
                // Stacked on mobile: cons below pros
                const isStacked = consBox.y >= prosBox.y + prosBox.height - 5;
                recordCheck('7-PLAYWRIGHT', `activepieces [${vp.name}]: Strengths and Limitations stacked vertically`, isStacked, `prosY=${prosBox.y}, consY=${consBox.y}`);
            }

            await context.close();
        }

        // 7B: Test Empty Canary Tool (aider)
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

            const overflow = await page.evaluate(() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth
                };
            });
            recordCheck('7-PLAYWRIGHT', `aider [${vp.name}]: No horizontal overflow`, overflow.scrollWidth <= overflow.clientWidth, `scroll=${overflow.scrollWidth}, client=${overflow.clientWidth}`);

            const hasKeyFeatures = await page.locator('h2:text("Key Features")').count();
            const hasStrengths = await page.locator('h2:text("Strengths & Limitations")').count();
            recordCheck('7-PLAYWRIGHT', `aider [${vp.name}]: Key Features omitted`, hasKeyFeatures === 0);
            recordCheck('7-PLAYWRIGHT', `aider [${vp.name}]: Strengths & Limitations omitted`, hasStrengths === 0);

            // Retains functional shortlist & compare
            const compareBtn = page.locator('a.tool-v2-btn-secondary:has-text("Compare Aider")');
            const shortlistBtn = page.locator('button.tool-v2-btn-shortlist');
            recordCheck('7-PLAYWRIGHT', `aider [${vp.name}]: Compare button visible`, await compareBtn.isVisible());
            recordCheck('7-PLAYWRIGHT', `aider [${vp.name}]: Shortlist button visible`, await shortlistBtn.isVisible());

            recordCheck('7-PLAYWRIGHT', `aider [${vp.name}]: Zero console errors`, consoleErrors.length === 0);

            await context.close();
        }

        // 7C: Functional Interaction Retention (Compare & Shortlist click)
        console.log('\nTesting Functional Shortlist & Compare on V2 Tool...');
        const interactContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const interactPage = await interactContext.newPage();
        await interactPage.goto(`${baseUrl}/tools/activepieces/`, { waitUntil: 'domcontentloaded' });
        await interactPage.waitForTimeout(500);

        // Click shortlist
        const shortlistBtn = interactPage.locator('button.tool-v2-btn-shortlist');
        await shortlistBtn.click();
        await interactPage.waitForTimeout(200);

        const isSaved = await shortlistBtn.evaluate(el => el.classList.contains('saved'));
        recordCheck('7-INTERACTION', 'Shortlist button receives .saved class on click', isSaved);

        const storageState = await interactPage.evaluate(() => {
            const raw = localStorage.getItem('whichaipick_user_state');
            return raw ? JSON.parse(raw) : null;
        });
        recordCheck('7-INTERACTION', 'Activepieces stored in localStorage.whichaipick_user_state', storageState && storageState.savedToolIds && storageState.savedToolIds.includes('activepieces'));

        // Click Compare button
        const compareBtn = interactPage.locator('a.tool-v2-btn-secondary:has-text("Compare Activepieces")');
        await compareBtn.click();
        await interactPage.waitForURL('**/compare#tools=activepieces', { timeout: 3000 });
        recordCheck('7-INTERACTION', 'Compare button successfully navigated to /compare#tools=activepieces', interactPage.url().includes('/compare#tools=activepieces'));

        await interactContext.close();

    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL ${checks.length} EDITORIAL PARITY CHECKS PASSED!`);
    console.log(`======================================================\n`);
}

run().catch(err => {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
});
