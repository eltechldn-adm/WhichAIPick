import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 8899;
const BASE_DIR = path.resolve('.');

// Simple static file server
function createServer() {
    return http.createServer((req, res) => {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath.endsWith('/')) reqPath += 'index.html';
        const filePath = path.join(BASE_DIR, reqPath);

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
}

const VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 }
];

const SAMPLE_TOOLS = [
    // 6 Prototypes
    { id: 'chatgpt', category: 'Content Creation', reason: 'Prototype / Content Creation / Freemium / Comparisons' },
    { id: 'cursor', category: 'Development', reason: 'Prototype / Development / Paid / Comparisons' },
    { id: 'midjourney', category: 'Design', reason: 'Prototype / Design / Paid / Legacy contradiction safeguard' },
    { id: 'aider', category: 'Development', reason: 'Prototype / Development / Free / Open Source' },
    { id: 'amazon-codewhisperer', category: 'Development', reason: 'Prototype / Legacy rebrand / Ineligible for recommendations' },
    { id: 'zapier-ai', category: 'Automation', reason: 'Prototype / Automation / Paid' },
    // Category & Data Diversity
    { id: '10web', category: 'Development', reason: 'Extensive editorial (Long Desc + How It Works) / Freemium' },
    { id: 'activepieces', category: 'Automation', reason: 'Starting price populated ($20 USD) / Open source & Self-hosted' },
    { id: 'abridge', category: 'Business', reason: 'Business category / Enterprise pricing / Intermediate skill' },
    { id: 'adcreativeai', category: 'Marketing', reason: 'Marketing category / Paid with trial / High use-case count' },
    { id: 'ai-studios', category: 'Video & Audio', reason: 'Video & Audio category / Rebranded / Free trial' },
    { id: 'akiflow', category: 'Productivity', reason: 'Productivity category / Multi-platform desktop & mobile' },
    { id: '360learning', category: 'Education', reason: 'Education category / Enterprise / Free trial' },
    { id: 'alphasense', category: 'Research', reason: 'Research category / Enterprise / Multi-platform' },
    { id: 'appgyver', category: 'Development', reason: 'Rebranded (SAP Build) / Recommendation-ineligible' },
    { id: 'descript-overdub', category: 'Video & Audio', reason: 'Recommendation-ineligible legacy audio tool' },
    { id: 'lovable', category: 'Development', reason: 'Multiple featured comparisons (Bolt.new & Replit)' },
    { id: 'apple-intelligence', category: 'Productivity', reason: 'Free model / Apple-exclusive OS platforms' }
];

async function run() {
    const server = createServer();
    await new Promise(resolve => server.listen(PORT, resolve));
    console.log(`[SERVER] Local server running on port ${PORT}`);

    const screenshotsDir = path.resolve('scratch/qa-catalog-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const report = {
        totalEvaluated: SAMPLE_TOOLS.length,
        totalViewportChecks: SAMPLE_TOOLS.length * VIEWPORTS.length,
        passed: 0,
        failed: 0,
        results: []
    };

    console.log(`[TESTING] Evaluating ${SAMPLE_TOOLS.length} representative tools across 5 viewports (90 total checks)...`);

    for (const item of SAMPLE_TOOLS) {
        const page = await browser.newPage();
        const url = `http://localhost:${PORT}/tool-page-v2-preview/catalog/${item.id}/`;

        let pageErrors = [];
        let failedRequests = [];

        page.on('console', msg => {
            if (msg.type() === 'error') pageErrors.push(msg.text());
        });
        page.on('pageerror', err => pageErrors.push(err.toString()));
        page.on('requestfailed', req => {
            failedRequests.push(`${req.url()} (${req.failure()?.errorText || 'failed'})`);
        });

        await page.goto(url, { waitUntil: 'networkidle0' });

        // Check primary CTA computed styles
        const ctaStyle = await page.evaluate(() => {
            const btn = document.querySelector('a.tool-v2-btn-primary');
            if (!btn) return null;
            const cs = window.getComputedStyle(btn);
            return {
                color: cs.color,
                backgroundColor: cs.backgroundColor,
                fontWeight: cs.fontWeight
            };
        });

        // Hover test
        let hoverStyle = null;
        if (ctaStyle) {
            await page.hover('a.tool-v2-btn-primary');
            hoverStyle = await page.evaluate(() => {
                const btn = document.querySelector('a.tool-v2-btn-primary');
                const cs = window.getComputedStyle(btn);
                return {
                    color: cs.color,
                    backgroundColor: cs.backgroundColor
                };
            });
        }

        const viewportResults = [];

        for (const vp of VIEWPORTS) {
            await page.setViewport(vp);
            await new Promise(r => setTimeout(r, 200));

            const overflow = await page.evaluate(() => {
                return document.documentElement.scrollWidth > window.innerWidth;
            });

            const screenshotPath = path.join(screenshotsDir, `${item.id}_${vp.width}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: false });

            viewportResults.push({
                width: vp.width,
                horizontalOverflow: overflow,
                screenshot: screenshotPath
            });

            if (overflow) {
                console.error(`[OVERFLOW] ${item.id} has horizontal overflow at ${vp.width}px!`);
            }
        }

        const hasOverflow = viewportResults.some(v => v.horizontalOverflow);
        const hasErrors = pageErrors.length > 0 || failedRequests.length > 0;
        const passed = !hasOverflow && !hasErrors;

        if (passed) report.passed++;
        else report.failed++;

        report.results.push({
            id: item.id,
            category: item.category,
            reason: item.reason,
            ctaStyle,
            hoverStyle,
            passed,
            pageErrors,
            failedRequests,
            viewportResults
        });

        console.log(`[${passed ? 'PASS' : 'FAIL'}] ${item.id} | CTA: ${ctaStyle?.backgroundColor} / ${ctaStyle?.color} | Errors: ${pageErrors.length} | Overflow: ${hasOverflow}`);

        await page.close();
    }

    await browser.close();
    server.close();

    fs.writeFileSync(
        path.resolve('tool-page-v2-preview/catalog/browser-qa-results.json'),
        JSON.stringify(report, null, 2)
    );

    console.log(`\n========================================`);
    console.log(`Browser QA Complete:`);
    console.log(`  Passed: ${report.passed} / ${report.totalEvaluated}`);
    console.log(`  Failed: ${report.failed} / ${report.totalEvaluated}`);
    console.log(`  Total responsive checks: ${report.totalViewportChecks}`);
    console.log(`========================================\n`);

    if (report.failed > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal Browser QA Error:', err);
    process.exit(1);
});
