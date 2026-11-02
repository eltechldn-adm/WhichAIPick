import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

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

            // Clean route resolution
            if (urlPath === '/find' || urlPath === '/find/') {
                filePath = path.join(root, 'find.html');
            } else if (urlPath === '/compare' || urlPath === '/compare/') {
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

async function runQuizRoutingRegressionTests() {
    console.log('======================================================');
    console.log('STAGE 7H.8A: QUIZ ROUTING PERMANENT REGRESSION TESTS');
    console.log('======================================================');

    // --- 1. STATIC SOURCE CODE GUARD ---
    console.log('\n--- 1. Static Source Code Guard ---');
    const findJsPath = path.join(ROOT, 'js', 'find.js');
    const findJs = fs.readFileSync(findJsPath, 'utf8');
    assert(!findJs.includes('/tool.html'), 'FAIL: js/find.js contains legacy /tool.html link reference');
    assert(findJs.includes('/tools/${encodeURIComponent(tool.id)}/'), 'FAIL: js/find.js does not use canonical /tools/<tool-id>/ routing pattern');
    console.log('  ✅ PASS: js/find.js contains zero /tool.html references and enforces canonical /tools/<id>/ routing');

    // --- 2. LOCAL HTTP SERVER & BROWSER EXECUTION ---
    const server = createStaticServer(ROOT);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Local static test server running on ${baseUrl}`);

    const browser = await chromium.launch({ headless: true });
    let totalChecks = 0;
    let passedChecks = 0;

    function check(desc, passed, detail = '') {
        totalChecks++;
        if (passed) {
            passedChecks++;
            console.log(`  ✅ PASS: ${desc}`);
        } else {
            console.error(`  ❌ FAIL: ${desc} ${detail}`);
            throw new Error(`Regression test failed: ${desc}`);
        }
    }

    const testFlows = [
        {
            name: 'Writing & Content (Free) Flow',
            q1Text: 'Writing & Content',
            expectedCategory: 'Content Creation'
        },
        {
            name: 'Image Creation Flow',
            q1Text: 'Image Creation',
            expectedCategory: 'Design'
        },
        {
            name: 'Research & Data Flow',
            q1Text: 'Research & Data Analysis',
            expectedCategory: 'Research'
        }
    ];

    const viewports = [
        { name: 'Desktop (1280px)', width: 1280, height: 800 },
        { name: 'Mobile (390px)', width: 390, height: 844 }
    ];

    try {
        for (const vp of viewports) {
            console.log(`\n--- Testing Viewport: ${vp.name} ---`);
            const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

            for (const flow of testFlows) {
                console.log(`\n  Executing ${flow.name} [${vp.name}]...`);
                const page = await context.newPage();
                const consoleErrors = [];
                page.on('console', msg => {
                    if (msg.type() === 'error') consoleErrors.push(msg.text());
                });

                // Clear previous localStorage quiz state
                await page.goto(`${baseUrl}/find`, { waitUntil: 'networkidle' });
                await page.evaluate(() => localStorage.clear());
                await page.reload({ waitUntil: 'networkidle' });

                // Q1
                await page.locator(`.answer-option:has-text("${flow.q1Text}")`).click();
                await page.locator('#next-btn').click();
                await page.waitForTimeout(200);

                // Q2
                await page.locator('.answer-option').first().click();
                await page.locator('#next-btn').click();
                await page.waitForTimeout(200);

                // Q3
                await page.locator('.answer-option').first().click();
                await page.locator('#next-btn').click();
                await page.waitForTimeout(200);

                // Q4
                await page.locator('.answer-option').first().click();
                await page.locator('#next-btn').click();
                await page.waitForTimeout(500);

                // Verify Results page is displayed
                const resultsVisible = await page.locator('#results-container').isVisible();
                check(`${flow.name} [${vp.name}] Quiz results visible`, resultsVisible);

                const cardCount = await page.locator('.tool-result-card').count();
                check(`${flow.name} [${vp.name}] Recommendations rendered (count: ${cardCount})`, cardCount > 0);

                // Audit each recommended card
                for (let i = 0; i < cardCount; i++) {
                    const card = page.locator('.tool-result-card').nth(i);
                    const titleLink = card.locator('h4 a');
                    const ctaLink = card.locator('a.btn-primary');

                    const titleHref = await titleLink.getAttribute('href');
                    const ctaHref = await ctaLink.getAttribute('href');
                    const toolName = (await titleLink.innerText()).trim();

                    // Assert Hrefs follow canonical /tools/<id>/
                    check(
                        `${flow.name} [${vp.name}] Card #${i + 1} (${toolName}) title link uses canonical /tools/<id>/`,
                        titleHref.startsWith('/tools/') && titleHref.endsWith('/') && !titleHref.includes('.html') && !titleHref.includes('?'),
                        `Got: ${titleHref}`
                    );
                    check(
                        `${flow.name} [${vp.name}] Card #${i + 1} (${toolName}) CTA link matches title link`,
                        ctaHref === titleHref,
                        `Got CTA: ${ctaHref}, Title: ${titleHref}`
                    );
                }

                // Click first tool title and verify destination
                const firstCard = page.locator('.tool-result-card').first();
                const expectedToolUrl = await firstCard.locator('h4 a').getAttribute('href');
                const expectedToolName = (await firstCard.locator('h4 a').innerText()).trim();

                const [navResp] = await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                    firstCard.locator('h4 a').click()
                ]);

                check(`${flow.name} [${vp.name}] Title navigation HTTP status 200`, navResp.status() === 200);
                check(
                    `${flow.name} [${vp.name}] Destination URL is exact canonical path`,
                    page.url() === `${baseUrl}${expectedToolUrl}`,
                    `Expected: ${baseUrl}${expectedToolUrl}, Got: ${page.url()}`
                );

                const destH1 = (await page.locator('h1').innerText()).trim();
                check(
                    `${flow.name} [${vp.name}] Destination H1 matches tool name (${destH1} vs ${expectedToolName})`,
                    destH1.toLowerCase().includes(expectedToolName.toLowerCase()) || expectedToolName.toLowerCase().includes(destH1.toLowerCase())
                );
                check(`${flow.name} [${vp.name}] Destination is not generic directory`, destH1 !== 'Browse AI Tools');
                check(`${flow.name} [${vp.name}] Zero console errors on destination page`, consoleErrors.length === 0, `Errors: ${consoleErrors.join('; ')}`);

                // Navigate back to results and verify "View Tool" button click
                await page.goBack({ waitUntil: 'networkidle' });
                const viewToolBtn = page.locator('.tool-result-card').first().locator('a.btn-primary');
                const [btnNavResp] = await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                    viewToolBtn.click()
                ]);

                check(`${flow.name} [${vp.name}] View Tool button navigation HTTP status 200`, btnNavResp.status() === 200);
                check(
                    `${flow.name} [${vp.name}] View Tool button destination matches expected canonical path`,
                    page.url() === `${baseUrl}${expectedToolUrl}`
                );

                await page.close();
            }

            await context.close();
        }

    } finally {
        await browser.close();
        await new Promise((resolve) => server.close(resolve));
    }

    console.log('\n======================================================');
    console.log(`TOTAL CHECKS: ${totalChecks}`);
    console.log(`PASSED: ${passedChecks}`);
    console.log('🎉 ALL QUIZ ROUTING REGRESSION CHECKS PASSED WITH ZERO DEFECTS!');
    console.log('======================================================');
}

runQuizRoutingRegressionTests().catch(err => {
    console.error('Fatal error running regression tests:', err);
    process.exit(1);
});
