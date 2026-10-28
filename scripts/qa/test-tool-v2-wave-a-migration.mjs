import fs from 'fs';
import path from 'path';
import http from 'http';
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

const V1_CONTROLS = [
    'chatgpt',
    'midjourney',
    '10web'
];

const EXPECTED_16 = [...ORIGINAL_CANARIES, ...WAVE_A_TOOLS];

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
            const urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
            let filePath = path.join(rootDir, urlPath);
            if (urlPath === '/compare' || urlPath === '/compare/') {
                filePath = path.join(rootDir, 'compare.html');
            } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                const indexCandidate = path.join(filePath, 'index.html');
                if (fs.existsSync(indexCandidate)) {
                    filePath = indexCandidate;
                } else if (fs.existsSync(filePath + '.html')) {
                    filePath = filePath + '.html';
                } else {
                    filePath = indexCandidate;
                }
            } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
                filePath = filePath + '.html';
            }
            if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
                return;
            }
            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
            res.end(fs.readFileSync(filePath));
        } catch (err) {
            res.writeHead(500);
            res.end(String(err));
        }
    });
}

function stripTags(str) {
    return String(str || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

async function run() {
    console.log('======================================================');
    console.log('WHICHAIPICK — STAGE 7F.2A WAVE A MIGRATION QA SUITE');
    console.log('======================================================\n');

    // 1. Verify authoritative manifest & cohort counts
    const manifestPath = path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json');
    check(fs.existsSync(manifestPath), 'Authoritative manifest data/release/tool-page-v2-canary.json exists');
    check(!fs.existsSync(path.join(ROOT, 'data', 'tool-page-v2-canary.json')), 'No duplicate data/tool-page-v2-canary.json manifest exists');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check(manifest.expectedCount === 16, 'Manifest expectedCount === 16', `actual=${manifest.expectedCount}`);
    check(
        JSON.stringify(manifest.approvedToolIds) === JSON.stringify(EXPECTED_16),
        'Manifest approvedToolIds matches exact 6 original + 10 Wave A IDs in order'
    );

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
    check(v2Count === 16, 'Generated V2 page count is exactly 16', `actual=${v2Count}`);
    check(v1Count === 866, 'Generated V1 page count is exactly 866', `actual=${v1Count}`);
    check(
        JSON.stringify([...v2Found].sort()) === JSON.stringify([...EXPECTED_16].sort()),
        'Exact 16 V2 pages match approved allowlist with zero extras'
    );

    // Sitemap check
    const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const locCount = (sitemapXml.match(/<loc>/g) || []).length;
    check(locCount === 959, 'sitemap.xml contains exactly 959 URLs', `actual=${locCount}`);

    // 2. Section 7 — Ten-Tool Content Parity (V1 baseline vs V2 generated + catalogue)
    console.log('--- SECTION 7: 10-TOOL CONTENT PARITY VERIFICATION ---');
    const parityTable = [];

    for (const id of WAVE_A_TOOLS) {
        const tool = toolMap.get(id);
        const v2Html = fs.readFileSync(path.join(ROOT, 'tools', id, 'index.html'), 'utf8');
        const v2Title = stripTags((v2Html.match(/<title>([^<]+)<\/title>/) || [])[1]);
        const v2Desc = stripTags((v2Html.match(/<meta name="description" content="([^"]+)"/) || [])[1]);
        const v2Canonical = (v2Html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
        const v2Robots = (v2Html.match(/<meta name="robots" content="([^"]+)"/) || [])[1];

        const expectedTitle = `${tool.name} — AI ${tool.category} Tool | WhichAIPick`;
        check(v2Title === expectedTitle, `${id}: <title> matches "${expectedTitle}"`, `actual="${v2Title}"`);
        check(v2Desc.length >= 60, `${id}: <meta name="description"> populated (${v2Desc.length} chars)`);
        check(v2Canonical === `https://whichaipick.com/tools/${id}/`, `${id}: Canonical URL is https://whichaipick.com/tools/${id}/`);
        check(v2Robots === 'index,follow', `${id}: Robots meta is index,follow`);

        // Name & Category
        const escCat = tool.category.replace(/&/g, '&amp;');
        check(v2Html.includes(`<h1>${tool.name}</h1>`), `${id}: H1 matches tool name "${tool.name}"`);
        check(v2Html.includes(`<span class="tool-v2-category">${escCat}</span>`), `${id}: Category badge matches "${tool.category}"`);

        // Hero short description & no verbatim duplication with Editorial Overview
        const shortSummary = stripTags(tool.sourceSummary || tool.short_description || tool.description);
        const longDesc = stripTags(tool.long_description);
        check(shortSummary.length > 20 && v2Html.includes('class="tool-v2-description"'), `${id}: Hero short description rendered`);
        check(shortSummary !== longDesc, `${id}: Hero description is distinct from Editorial Overview (no verbatim duplication)`);

        // All editorial & guidance sections
        const requiredH2s = [
            'Editorial Overview',
            'Key Features',
            'Strengths & Limitations',
            'Who is it for?',
            'Primary Use Cases',
            'Pricing & Access',
            'Platforms & Technical Capabilities',
            'How It Compares',
            'Trust & Verification'
        ];
        for (const h2 of requiredH2s) {
            check(v2Html.includes(`<h2>${h2}</h2>`), `${id}: Section <h2>${h2}</h2> rendered`);
        }
        check(v2Html.includes('<h3>How it works</h3>'), `${id}: How It Works subheading rendered`);
        check(v2Html.includes('<h3>Best For</h3>') && v2Html.includes('>Not Ideal For</h3>'), `${id}: Best For / Not Ideal For rendered`);
        check(v2Html.includes('class="tool-v2-pricing-overview"'), `${id}: Pricing Overview narrative rendered`);
        check(v2Html.includes('class="tool-v2-editorial tool-v2-comparison-summary"'), `${id}: How It Compares narrative rendered`);
        check(v2Html.includes('/review-methodology.html') && v2Html.includes('/corrections-policy.html'), `${id}: Trust & Methodology links rendered`);

        // Verify source content preservation for pros, cons, feature_groups, long_description, how_it_works, pricing_overview, comparison_summary
        const plainV2 = stripTags(v2Html);
        check(plainV2.includes(longDesc.slice(0, 80)), `${id}: Editorial Overview preserves source long_description`);
        check(plainV2.includes(stripTags(tool.how_it_works).slice(0, 80)), `${id}: How It Works preserves source how_it_works`);
        check(plainV2.includes(stripTags(tool.pricing_overview).slice(0, 80)), `${id}: Pricing Overview preserves source pricing_overview`);
        check(plainV2.includes(stripTags(tool.comparison_summary).slice(0, 80)), `${id}: How It Compares preserves source comparison_summary`);

        for (const pro of (tool.pros || [])) {
            check(plainV2.includes(stripTags(pro).slice(0, 40)), `${id}: Preserves pro "${pro.slice(0, 30)}..."`);
        }
        for (const con of (tool.cons || [])) {
            check(plainV2.includes(stripTags(con).slice(0, 40)), `${id}: Preserves con "${con.slice(0, 30)}..."`);
        }
        const fgList = Array.isArray(tool.feature_groups)
            ? tool.feature_groups
            : Object.values(tool.feature_groups || {});
        for (const g of fgList) {
            const groupHeading = g.group || g.name || 'Features';
            check(plainV2.includes(stripTags(groupHeading)), `${id}: Preserves feature group "${groupHeading}"`);
            for (const item of (g.items || [])) {
                check(plainV2.includes(stripTags(item).slice(0, 40)), `${id}: Preserves feature item "${item.slice(0, 30)}..."`);
            }
        }

        // Safe avatar & no double-encoded entities & no external favicons
        check(v2Html.includes('class="tool-v2-avatar tool-v2-avatar-initials"'), `${id}: Renders safe initials avatar`);
        check(!v2Html.includes('google.com/s2/favicons'), `${id}: Zero Google S2 favicon URLs in V2 HTML`);
        check(!/&amp;(amp|quot|#0?39|lt|gt);/i.test(v2Html), `${id}: Zero double-encoded HTML entities`);

        parityTable.push({
            id,
            name: tool.name,
            category: tool.category,
            titleMatch: v2Title === expectedTitle,
            metaMatch: v2Desc.length >= 60,
            prosCount: (tool.pros || []).length,
            consCount: (tool.cons || []).length,
            featureGroups: Object.keys(tool.feature_groups || {}).length,
            canonical: v2Canonical
        });
    }

    // 3. Section 9 — Original 6 Canaries & V1 Controls Static Check
    console.log('--- SECTION 9: ORIGINAL CANARIES & V1 CONTROLS STATIC CHECK ---');
    for (const cid of ORIGINAL_CANARIES) {
        const afterHtml = fs.readFileSync(path.join(ROOT, 'tools', cid, 'index.html'), 'utf8');
        check(afterHtml.includes('class="tool-page-v2"') && !afterHtml.includes('class="tool-detail-page"'), `Original V2 canary ${cid}: Remains V2 template`);
        check(afterHtml.includes(`href="/compare#tools=${cid}"`) && afterHtml.includes(`data-tool-id="${cid}"`), `Original V2 canary ${cid}: Retains Compare & Shortlist CTAs`);
        check(afterHtml.includes('class="tool-v2-avatar tool-v2-avatar-initials"'), `Original V2 canary ${cid}: Retains safe initials avatar`);
    }
    for (const v1Id of V1_CONTROLS) {
        const afterHtml = fs.readFileSync(path.join(ROOT, 'tools', v1Id, 'index.html'), 'utf8');
        check(afterHtml.includes('class="tool-detail-page"') && !afterHtml.includes('class="tool-page-v2"'), `${v1Id}: Remains V1 template`);
        check(afterHtml.includes(`<link rel="canonical" href="https://whichaipick.com/tools/${v1Id}/">`), `${v1Id}: Retains canonical URL`);
    }

    // 4. Section 8 & 9 — Playwright End-to-End Browser Verification (10 Wave A + 6 Original Canaries + 3 V1 Controls)
    console.log('--- SECTIONS 8 & 9: PLAYWRIGHT BROWSER INTERACTION & RESPONSIVE QA ---');
    const server = createStaticServer(ROOT);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const browser = await chromium.launch({ headless: true });
    const browserResults = [];

    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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

        // Test all 10 Wave A tools + 6 original canaries
        for (const id of EXPECTED_16) {
            const tool = toolMap.get(id);
            currentConsoleErrors = [];
            currentPageErrors = [];
            currentExternalFavicons = [];

            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}/tools/${id}/`, { waitUntil: 'networkidle' });
            await page.evaluate(() => localStorage.clear());
            await page.reload({ waitUntil: 'networkidle' });

            const onPageExternalFavicons = [...currentExternalFavicons];
            const onPageConsoleErrors = [...currentConsoleErrors];
            const onPageErrors = [...currentPageErrors];

            check(onPageExternalFavicons.length === 0, `${id}: Zero third-party favicon/image requests on V2 tool page`);
            check(onPageConsoleErrors.length === 0 && onPageErrors.length === 0, `${id}: Zero console/page errors on V2 tool page`);

            // A. Visit Website CTA & JSON-LD Security
            const securityAndCta = await page.evaluate(() => {
                const primaryCta = document.querySelector('.tool-v2-cta-group a.tool-v2-btn-primary');
                const compareCta = document.querySelector('.tool-v2-cta-group a.tool-v2-btn-secondary');
                const shortlistBtn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');

                // Check keyboard focus visibility
                const focusCheck = [primaryCta, compareCta, shortlistBtn].every(el => {
                    if (!el) return false;
                    el.focus();
                    const s = window.getComputedStyle(el);
                    return document.activeElement === el && (s.outlineStyle !== 'none' || s.boxShadow !== 'none');
                });

                const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                let ldParsed = null;
                try {
                    ldParsed = JSON.parse(ldScripts[0].textContent);
                } catch {}

                const allLinks = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href'));
                const unsafeScheme = allLinks.find(h => /^(javascript|data|vbscript|file):/i.test(h.trim()));

                return {
                    visitHref: primaryCta ? primaryCta.getAttribute('href') : null,
                    visitRel: primaryCta ? primaryCta.getAttribute('rel') : null,
                    visitTarget: primaryCta ? primaryCta.getAttribute('target') : null,
                    compareHref: compareCta ? compareCta.getAttribute('href') : null,
                    shortlistDataId: shortlistBtn ? shortlistBtn.getAttribute('data-tool-id') : null,
                    focusCheck,
                    ldCount: ldScripts.length,
                    ldValid: Boolean(ldParsed && ldParsed['@type'] === 'SoftwareApplication'),
                    unsafeScheme: unsafeScheme || null
                };
            });

            check(securityAndCta.visitHref === (tool.affiliate_url || tool.website_url), `${id}: Visit Website CTA points to ${tool.affiliate_url || tool.website_url}`);
            check(securityAndCta.visitTarget === '_blank' && securityAndCta.visitRel === 'noopener noreferrer', `${id}: Visit Website CTA has target="_blank" rel="noopener noreferrer"`);
            check(securityAndCta.focusCheck, `${id}: Primary, Compare, and Shortlist CTAs receive visible keyboard focus`);
            check(securityAndCta.ldCount === 1 && securityAndCta.ldValid, `${id}: Valid SoftwareApplication JSON-LD`);
            check(securityAndCta.unsafeScheme === null, `${id}: Zero unsafe URL schemes on page`);

            // D. Responsive viewports: 1280px desktop, 768px tablet, 390px mobile
            const responsive = {};
            for (const vp of [
                { key: 'desktop1280', width: 1280, height: 800 },
                { key: 'tablet768', width: 768, height: 1024 },
                { key: 'mobile390', width: 390, height: 844 }
            ]) {
                await page.setViewportSize({ width: vp.width, height: vp.height });
                const checkVp = await page.evaluate(() => {
                    const sw = document.documentElement.scrollWidth;
                    const cw = document.documentElement.clientWidth;
                    const ctasVisible = ['.tool-v2-btn-primary', '.tool-v2-btn-secondary', '.shortlist-toggle-btn'].every(sel => {
                        const el = document.querySelector(sel);
                        if (!el) return false;
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0;
                    });
                    return { overflowPx: Math.max(0, sw - cw), ctasVisible };
                });
                responsive[vp.key] = checkVp;
                check(checkVp.overflowPx === 0 && checkVp.ctasVisible, `${id} [${vp.key}]: 0px horizontal overflow and CTAs accessible`);
            }

            await page.setViewportSize({ width: 1280, height: 800 });

            // C. Shortlist E2E Flow
            const saveBtn = page.locator('.tool-v2-cta-group button.shortlist-toggle-btn');
            await saveBtn.click();
            const savedState = await page.evaluate(() => {
                const btn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');
                const badge = document.getElementById('header-shortlist-badge');
                const raw = localStorage.getItem('whichaipick_user_state');
                return {
                    hasSavedClass: btn.classList.contains('saved'),
                    text: btn.textContent.trim(),
                    badgeText: badge ? badge.textContent.trim() : null,
                    parsedState: raw ? JSON.parse(raw) : null
                };
            });
            check(
                savedState.hasSavedClass &&
                savedState.text === 'Saved' &&
                savedState.badgeText === '1' &&
                Array.isArray(savedState.parsedState?.savedToolIds) &&
                savedState.parsedState.savedToolIds.includes(id),
                `${id}: Shortlist Save updates .saved, badge ("1"), and localStorage.whichaipick_user_state`
            );

            // Reload and check persistence
            await page.reload({ waitUntil: 'networkidle' });
            const persistedAfterReload = await page.evaluate(() => {
                const btn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');
                return btn && btn.classList.contains('saved') && btn.textContent.trim() === 'Saved';
            });
            check(persistedAfterReload, `${id}: Shortlist .saved state persists across page reload`);

            // Open /my-tools/ and confirm saved tool appears
            await page.goto(`${baseUrl}/my-tools/`, { waitUntil: 'networkidle' });
            const renderedInMyTools = await page.evaluate((toolId) => {
                const grid = document.getElementById('saved-tools-grid');
                return Boolean(grid && grid.querySelector(`a[href="/tools/${toolId}/"]`));
            }, id);
            check(renderedInMyTools, `${id}: Saved tool card renders inside /my-tools/`);

            // Navigate back and remove saved tool
            await page.goto(`${baseUrl}/tools/${id}/`, { waitUntil: 'networkidle' });
            await page.locator('.tool-v2-cta-group button.shortlist-toggle-btn').click();
            const unsavedState = await page.evaluate((toolId) => {
                const btn = document.querySelector('.tool-v2-cta-group button.shortlist-toggle-btn');
                const raw = localStorage.getItem('whichaipick_user_state');
                const parsed = raw ? JSON.parse(raw) : null;
                return {
                    removedClass: !btn.classList.contains('saved') && btn.textContent.trim() === 'Save',
                    removedFromStorage: Array.isArray(parsed?.savedToolIds) && !parsed.savedToolIds.includes(toolId)
                };
            }, id);
            check(unsavedState.removedClass && unsavedState.removedFromStorage, `${id}: Unsave removes .saved class and updates localStorage.whichaipick_user_state`);

            // B. Compare E2E Flow
            await page.locator('.tool-v2-cta-group a.tool-v2-btn-secondary').click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(150);

            const peerId = id === 'aider' ? 'claude' : 'aider';
            const peerTool = toolMap.get(peerId);

            const comparePreselect = await page.evaluate(() => {
                const pathname = window.location.pathname;
                const hash = window.location.hash;
                const emptyStateText = document.getElementById('compare-empty-state')?.innerText?.trim() || '';
                return { pathname, hash, emptyStateText };
            });

            await page.evaluate(() => window.CompareEngine && window.CompareEngine.openSelector());
            await page.waitForTimeout(100);
            await page.fill('#compare-selector-input', peerTool.canonicalName || peerTool.name);
            await page.waitForTimeout(150);
            await page.evaluate((targetPeerId) => {
                const items = Array.from(document.querySelectorAll('#compare-selector-results .selector-result-item, #compare-selector-results [onclick], #compare-selector-results button, #compare-selector-results div'));
                const match = items.find(el => (el.getAttribute('onclick') || '').includes(targetPeerId) || el.dataset?.toolId === targetPeerId);
                if (match) match.click();
            }, peerId);
            await page.waitForTimeout(150);

            const compareFlow = await page.evaluate(({ toolId, secondId }) => {
                const tableContainer = document.getElementById('compare-table-container');
                const tableHtml = tableContainer?.innerHTML || '';
                const tableVisible = Boolean(tableContainer && tableContainer.style.display !== 'none' && tableHtml.trim().length > 0);
                return {
                    hashAfterSecond: window.location.hash,
                    tableRenderedBoth: tableVisible && tableHtml.includes(toolId) && tableHtml.includes(secondId)
                };
            }, { toolId: id, secondId: peerId });

            check(
                comparePreselect.hash === `#tools=${id}` &&
                comparePreselect.emptyStateText.includes(tool.name) &&
                compareFlow.tableRenderedBoth,
                `${id}: Compare CTA navigates to /compare#tools=${id}, preselects ${tool.name}, and renders side-by-side table with ${peerId}`
            );

            browserResults.push({
                id,
                cohort: WAVE_A_TOOLS.includes(id) ? 'Wave A' : 'Original Canary',
                visitHref: securityAndCta.visitHref,
                compareHash: compareFlow.hashAfterSecond,
                compareTableOk: compareFlow.tableRenderedBoth,
                shortlistSavedAndMyToolsOk: renderedInMyTools && unsavedState.removedFromStorage,
                responsiveOk: responsive.desktop1280.overflowPx === 0 && responsive.tablet768.overflowPx === 0 && responsive.mobile390.overflowPx === 0,
                consoleErrors: onPageConsoleErrors.length
            });
        }

        // Test 3 Representative V1 Controls in Playwright (chatgpt, midjourney, 10web)
        for (const v1Id of V1_CONTROLS) {
            await page.goto(`${baseUrl}/tools/${v1Id}/`, { waitUntil: 'networkidle' });
            await page.evaluate(() => localStorage.clear());
            await page.reload({ waitUntil: 'networkidle' });

            const v1Btn = page.locator(`button.shortlist-toggle-btn[data-tool-id="${v1Id}"]`);
            check(await v1Btn.count() === 1, `V1 control ${v1Id}: Shortlist button present`);
            await v1Btn.click();
            const v1Saved = await page.evaluate((id) => {
                const raw = localStorage.getItem('whichaipick_user_state');
                const parsed = raw ? JSON.parse(raw) : null;
                return parsed && Array.isArray(parsed.savedToolIds) && parsed.savedToolIds.includes(id);
            }, v1Id);
            check(v1Saved, `V1 control ${v1Id}: Shortlist save works`);
            await v1Btn.click();

            const v1CompareHref = await page.locator(`a[href="/compare#tools=${v1Id}"]`).count();
            check(v1CompareHref >= 1, `V1 control ${v1Id}: Compare link (/compare#tools=${v1Id}) intact`);
        }

        await context.close();
    } finally {
        await browser.close();
        server.close();
    }

    console.log('\n======================================================');
    console.log(`WAVE A MIGRATION QA SUMMARY: ${passedChecks}/${totalChecks} PASSED (${failedChecks} failed)`);
    console.log('======================================================\n');

    if (failedChecks > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
