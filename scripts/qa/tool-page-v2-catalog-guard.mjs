import fs from 'fs';
import path from 'path';
import assert from 'assert';

const STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
const LEDGER_PATH = path.resolve('data/evidence/phase11-evidence-ledger.json');
const CATALOG_DIR = path.resolve('tool-page-v2-preview/catalog');
const SITEMAP_PATH = path.resolve('sitemap.xml');

function run() {
    console.log('[START] Tool Page V2 Catalogue Guard running 100% validation...');
    const startTime = process.hrtime.bigint();

    if (!fs.existsSync(STAGED_PATH)) {
        console.error(`[FATAL] Missing staged data: ${STAGED_PATH}`);
        process.exit(1);
    }
    if (!fs.existsSync(CATALOG_DIR)) {
        console.error(`[FATAL] Missing catalog preview directory: ${CATALOG_DIR}`);
        process.exit(1);
    }

    const rawTools = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));
    const ledgerData = fs.existsSync(LEDGER_PATH) ? JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) : [];

    const ledgerMap = new Map();
    for (const row of ledgerData) {
        if (row.evidenceId && row.id) {
            ledgerMap.set(`${row.evidenceId}::${row.id}`, row);
        }
    }

    const toolMap = new Map();
    for (const t of rawTools) {
        toolMap.set(t.id, t);
    }

    // Check directory entries
    const dirEntries = fs.readdirSync(CATALOG_DIR).filter(e => {
        const full = path.join(CATALOG_DIR, e);
        return fs.statSync(full).isDirectory();
    });

    console.log(`Discovered ${dirEntries.length} tool directories in ${CATALOG_DIR}`);
    assert.strictEqual(dirEntries.length, rawTools.length, `Expected ${rawTools.length} directories, found ${dirEntries.length}`);

    // Check catalog index page
    const catalogIndexPath = path.join(CATALOG_DIR, 'index.html');
    assert.ok(fs.existsSync(catalogIndexPath), 'Missing catalog/index.html');
    const catalogIndexHtml = fs.readFileSync(catalogIndexPath, 'utf8');
    assert.ok(catalogIndexHtml.includes('<meta name="robots" content="noindex,nofollow">'), 'Catalog index missing noindex,nofollow');
    assert.ok(catalogIndexHtml.includes('Tool Page V2 Catalogue Preview'), 'Catalog index missing title heading');

    const validationResults = {
        totalEvaluated: rawTools.length,
        passedCount: 0,
        failedCount: 0,
        failures: [],
        metrics: {
            totalHtmlBytes: 0,
            minHtmlBytes: Infinity,
            maxHtmlBytes: 0,
            avgHtmlBytes: 0
        }
    };

    let totalBytes = 0;

    for (const id of dirEntries) {
        const tool = toolMap.get(id);
        if (!tool) {
            validationResults.failedCount++;
            validationResults.failures.push({ id, error: `Directory ${id} does not match any catalogue tool ID` });
            continue;
        }

        const htmlPath = path.join(CATALOG_DIR, id, 'index.html');
        if (!fs.existsSync(htmlPath)) {
            validationResults.failedCount++;
            validationResults.failures.push({ id, error: `Missing index.html for ${id}` });
            continue;
        }

        const html = fs.readFileSync(htmlPath, 'utf8');
        const size = Buffer.byteLength(html, 'utf8');
        totalBytes += size;
        if (size < validationResults.metrics.minHtmlBytes) validationResults.metrics.minHtmlBytes = size;
        if (size > validationResults.metrics.maxHtmlBytes) validationResults.metrics.maxHtmlBytes = size;

        const toolName = tool.canonicalName || tool.name;

        try {
            // 1. Structure
            assert.ok(html.startsWith('<!DOCTYPE html>'), 'Missing <!DOCTYPE html>');
            assert.ok(html.includes('</html>'), 'Missing </html>');
            assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'), 'Missing noindex,nofollow');

            // 2. Head & Title
            assert.ok(html.includes(`<title>${escapeXml(toolName)} | Tool Page V2 Preview</title>`), `Title mismatch for ${toolName}`);

            // 3. Single H1
            const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
            assert.strictEqual(h1Matches.length, 1, `Expected exactly 1 H1, found ${h1Matches.length}`);
            assert.ok(h1Matches[0].includes(escapeXml(toolName)), `H1 does not contain tool name: ${h1Matches[0]}`);

            // 4. Breadcrumb
            assert.ok(html.includes(`Home</a> &gt; <a href="/tools/">Tools</a> &gt; ${escapeXml(toolName)}`), 'Breadcrumb invalid');

            // 5. Official CTA
            const hasAffiliate = !!(tool.affiliate_url || tool.affiliateUrl || tool.commercial?.affiliateUrl);
            if (tool.website_url || tool.websiteUrl) {
                assert.ok(html.includes('class="tool-v2-btn-primary"'), 'Missing primary CTA');
                const btnMatch = html.match(/<a\b[^>]*class="tool-v2-btn-primary"[^>]*>/);
                assert.ok(btnMatch, 'Primary link tag not found');
                const relMatch = btnMatch[0].match(/rel="([^"]*)"/);
                assert.ok(relMatch, 'Primary link missing rel attribute');
                const relVal = relMatch[1];
                if (hasAffiliate) {
                    assert.ok(relVal.includes('sponsored'), 'Affiliate link missing sponsored');
                    assert.ok(relVal.includes('noopener') && relVal.includes('noreferrer'), 'Affiliate link missing noopener noreferrer');
                } else {
                    assert.strictEqual(relVal, 'noopener noreferrer', 'Normal link must have rel="noopener noreferrer"');
                    assert.ok(!relVal.includes('nofollow'), 'Normal official link has forbidden nofollow');
                }
            }

            // 6. Secondary Compare CTA
            assert.ok(html.includes(`href="/compare#tools=${escapeXml(tool.id)}"`), 'Missing compare CTA button');

            // 7. Trust & Review Dates
            let latestDate = null;
            for (const evId of tool.evidenceIds || []) {
                const row = ledgerMap.get(`${evId}::${tool.id}`);
                if (row && row.reviewedAt) {
                    const rowDate = new Date(row.reviewedAt);
                    if (!latestDate || rowDate > latestDate) latestDate = rowDate;
                }
            }
            if (latestDate) {
                const dateStr = latestDate.toISOString().split('T')[0];
                assert.ok(html.includes(`Last Reviewed: ${dateStr}`), `Missing or incorrect evidence date ${dateStr}`);
            }
            assert.ok(html.includes('href="/review-methodology.html"'), 'Missing review methodology link');
            assert.ok(html.includes('href="/corrections-policy.html"'), 'Missing corrections policy link');
            assert.ok(!html.includes('href="#"'), 'Found empty placeholder href="#" link');

            // 8. Sanitisation & No tag leakage
            const editorialMatch = html.match(/<div class="tool-v2-editorial">([\s\S]*?)<\/div>/);
            if (editorialMatch) {
                const edHtml = editorialMatch[1];
                assert.ok(!edHtml.includes('&lt;p&gt;'), 'Found unrendered &lt;p&gt;');
                assert.ok(!edHtml.includes('&lt;/p&gt;'), 'Found unrendered &lt;/p&gt;');
                assert.ok(!edHtml.includes('&lt;strong&gt;'), 'Found unrendered &lt;strong&gt;');
                assert.ok(!edHtml.includes('<script'), 'Found script injection in editorial');
                assert.ok(!edHtml.includes('onerror='), 'Found onerror in editorial');
                assert.ok(!edHtml.includes('onclick='), 'Found onclick in editorial');
            }

            // 9. No undefined/null text leakage
            const undefMatches = html.match(/>[^<]*\bundefined\b[^<]*</g);
            assert.ok(!undefMatches, `Found leaked "undefined" text: ${undefMatches ? undefMatches.join(', ') : ''}`);

            // 10. No fabricated claims / fake $0
            if (tool.startingPrice === null || tool.startingPrice === undefined) {
                assert.ok(!html.includes('Starting Price: $0'), 'Fabricated $0 starting price detected');
            }
            assert.ok(!html.includes('AggregateRating'), 'Found prohibited AggregateRating schema');
            assert.ok(!html.includes('"@type":"Review"'), 'Found prohibited Review schema');

            // 11. Valid JSON-LD
            const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
            assert.ok(schemaMatch, 'Missing JSON-LD schema block');
            const schemaJson = JSON.parse(schemaMatch[1]);
            assert.strictEqual(schemaJson['@context'], 'https://schema.org', 'Invalid schema @context');
            assert.strictEqual(schemaJson['@type'], 'SoftwareApplication', 'Invalid schema @type');
            assert.strictEqual(schemaJson.name, toolName, 'Schema name mismatch');

            // 12. Legacy Safeguards
            if (tool.id === 'amazon-codewhisperer') {
                assert.ok(html.includes('<h1>Amazon Q Developer</h1>'), 'Amazon Q Developer H1 missing');
                assert.ok(!html.includes('Recommended'), 'Ineligible tool has Recommended badge');
                assert.ok(!html.includes('Winner'), 'Ineligible tool has Winner badge');
                assert.ok(!html.includes('Top choice'), 'Ineligible tool has Top choice badge');
                assert.ok(!html.includes('Our pick'), 'Ineligible tool has Our pick badge');
            }
            if (tool.id === 'midjourney') {
                assert.ok(!html.includes('requires Discord'), 'Midjourney contains legacy Discord requirement contradiction');
            }

            validationResults.passedCount++;
        } catch (err) {
            validationResults.failedCount++;
            validationResults.failures.push({ id, error: err.message });
        }
    }

    validationResults.metrics.totalHtmlBytes = totalBytes;
    validationResults.metrics.avgHtmlBytes = Math.round(totalBytes / validationResults.totalEvaluated);

    // Production Isolation Check
    assert.ok(fs.existsSync('tools'), 'Production tools directory missing');
    const prodCount = fs.readdirSync('tools').filter(e => fs.statSync(path.join('tools', e)).isDirectory()).length;
    assert.strictEqual(prodCount, 882, `Production tools directory modified (expected 882, found ${prodCount})`);

    if (fs.existsSync(SITEMAP_PATH)) {
        const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
        assert.ok(!sitemap.includes('tool-page-v2-preview'), 'Sitemap contaminated with preview URLs');
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;
    validationResults.durationMs = durationMs;

    // Write machine-readable validation report
    fs.writeFileSync(path.join(CATALOG_DIR, 'validation-report.json'), JSON.stringify(validationResults, null, 2));

    console.log(`[RESULT] Validated ${validationResults.totalEvaluated} tool pages:`);
    console.log(`  Passed: ${validationResults.passedCount}`);
    console.log(`  Failed: ${validationResults.failedCount}`);
    console.log(`  Total HTML size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  Average HTML size: ${validationResults.metrics.avgHtmlBytes} bytes`);
    console.log(`  Min size: ${validationResults.metrics.minHtmlBytes} bytes, Max size: ${validationResults.metrics.maxHtmlBytes} bytes`);
    console.log(`  Duration: ${durationMs.toFixed(2)} ms`);

    if (validationResults.failedCount > 0) {
        console.error(`[FAIL] ${validationResults.failedCount} pages failed validation!`);
        console.error(validationResults.failures.slice(0, 5));
        process.exit(1);
    }

    console.log('PASS');
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

run();
