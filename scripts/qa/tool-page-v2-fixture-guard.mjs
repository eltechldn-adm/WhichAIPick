import fs from 'fs';
import path from 'path';
import assert from 'assert';

const OUT_DIR = path.resolve('tool-page-v2-preview');
const SITEMAP_PATH = path.resolve('sitemap.xml'); // or public/sitemap.xml, check if it exists
const STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
const LEDGER_PATH = path.resolve('data/evidence/phase11-evidence-ledger.json');

const rawData = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));
let ledgerData = [];
if (fs.existsSync(LEDGER_PATH)) {
    ledgerData = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

const fixtures = ['chatgpt', 'midjourney', 'cursor', 'zapier-ai', 'aider', 'amazon-codewhisperer'];

if (!fs.existsSync(OUT_DIR)) {
    console.error(`Preview directory missing: ${OUT_DIR}`);
    process.exit(1);
}

const entries = fs.readdirSync(OUT_DIR).filter(e => fs.statSync(path.join(OUT_DIR, e)).isDirectory());
assert.strictEqual(entries.length, 6, `Expected exactly 6 preview routes, found ${entries.length}`);

for (const id of fixtures) {
    assert.ok(entries.includes(id), `Missing fixture route: ${id}`);

    const htmlPath = path.join(OUT_DIR, id, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const tool = rawData.find(t => t.id === id);

    let expectedDate = null;
    if (tool && Array.isArray(tool.evidenceIds) && tool.evidenceIds.length > 0) {
        let latestDate = null;
        for (const evId of tool.evidenceIds) {
            const row = ledgerData.find(r => r.evidenceId === evId && r.id === tool.id);
            if (row && row.reviewedAt) {
                const rowDate = new Date(row.reviewedAt);
                if (!latestDate || rowDate > latestDate) {
                    latestDate = rowDate;
                }
            }
        }
        if (latestDate) {
            expectedDate = latestDate.toISOString().split('T')[0];
        }
    }
    if (expectedDate) {
        assert.ok(html.includes(`Last Reviewed: ${expectedDate}`), `${id}: Missing or incorrect expected evidence date ${expectedDate}`);
    }

    assert.ok(html.includes('href="/review-methodology.html"'), `${id}: Missing /review-methodology.html link`);
    assert.ok(html.includes('href="/corrections-policy.html"'), `${id}: Missing /corrections-policy.html link`);
    assert.ok(!html.includes('href="#"'), `${id}: Found href="#" placeholder link`);

    const editorialMatch = html.match(/<div class="tool-v2-editorial">([\s\S]*?)<\/div>/);
    if (editorialMatch) {
        const editorialHtml = editorialMatch[1];
        assert.ok(!editorialHtml.includes('&lt;p&gt;'), `${id}: Found escaped <p> tag`);
        assert.ok(!editorialHtml.includes('&lt;/p&gt;'), `${id}: Found escaped </p> tag`);
        assert.ok(!editorialHtml.includes('&lt;strong&gt;'), `${id}: Found escaped <strong> tag`);
        assert.ok(!editorialHtml.includes('<script'), `${id}: Found <script tag`);
        assert.ok(!editorialHtml.includes('onerror='), `${id}: Found onerror= attribute`);
        assert.ok(!editorialHtml.includes('onclick='), `${id}: Found onclick= attribute`);
    }

    const hasAffiliate = tool?.affiliateUrl || tool?.commercial?.affiliateUrl || tool?.pricing?.affiliateUrl;
    if (hasAffiliate) {
        assert.ok(html.includes('rel="sponsored noopener noreferrer"'), `${id}: Affiliate link missing 'sponsored noopener noreferrer'`);
    } else {
        const linkMatch = html.match(/<a[^>]*class="tool-v2-btn-primary"[^>]*rel="([^"]*)"[^>]*>/);
        if (linkMatch) {
            assert.ok(!linkMatch[1].includes('nofollow'), `${id}: Normal official link has 'nofollow'`);
            assert.ok(linkMatch[1] === 'noopener noreferrer', `${id}: Normal official link has incorrect rel`);
        }
    }

    // Basic assertions
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'), `${id}: Missing noindex,nofollow`);

    const h1Match = html.match(/<h1[^>]*>.*?<\/h1>/gi);
    assert.strictEqual(h1Match ? h1Match.length : 0, 1, `${id}: Expected exactly 1 H1 tag`);

    assert.ok(html.includes(`href="/compare#tools=${id}"`), `${id}: Missing correct Compare CTA link`);

    assert.ok(!html.includes('$0'), `${id}: Found fake $0`);
    assert.ok(!html.includes('AggregateRating'), `${id}: Found AggregateRating schema`);
    assert.ok(!html.includes('"@type":"Review"'), `${id}: Found Review schema`);
    assert.ok(!html.includes('requires Discord'), `${id}: Found "requires Discord"`);
    assert.ok(!html.includes('Fully verified'), `${id}: Found "Fully verified"`);
    assert.ok(!html.includes('Pricing verified'), `${id}: Found "Pricing verified"`);

    // Fixture-specific guards
    if (id === 'chatgpt') {
        assert.ok(html.includes('href="/compare/chatgpt-vs-claude/"'), `ChatGPT: Missing Claude compare link`);
        assert.ok(html.includes('href="/compare/chatgpt-vs-gemini/"'), `ChatGPT: Missing Gemini compare link`);
        assert.ok(html.includes('href="/compare/chatgpt-vs-perplexity/"'), `ChatGPT: Missing Perplexity compare link`);
        assert.ok(html.includes('href="/compare/midjourney-vs-chatgpt-images/"'), `ChatGPT: Missing Midjourney compare link`);
    }

    if (id === 'midjourney') {
        assert.ok(html.includes('>web<'), `Midjourney: Missing web interface`);
        assert.ok(html.includes('>discord<'), `Midjourney: Missing discord interface`);
        assert.ok(html.includes('href="/compare/midjourney-vs-leonardo-ai/"'), `Midjourney: Missing Leonardo AI compare link`);
        assert.ok(html.includes('href="/compare/midjourney-vs-chatgpt-images/"'), `Midjourney: Missing ChatGPT Images compare link`);
    }

    if (id === 'cursor') {
        assert.ok(html.includes('>windows<'), `Cursor: Missing windows OS`);
        assert.ok(html.includes('>macos<'), `Cursor: Missing macos OS`);
        assert.ok(html.includes('>linux<'), `Cursor: Missing linux OS`);
        assert.ok(html.includes('>api<'), `Cursor: Missing api`);
        assert.ok(html.includes('>cli<'), `Cursor: Missing cli`);
        assert.ok(html.includes('href="/compare/cursor-vs-github-copilot/"'), `Cursor: Missing GitHub Copilot compare link`);

        // Assert API/CLI not in Operating Systems section
        const osSection = html.substring(html.indexOf('<h3>Operating Systems</h3>'), html.indexOf('<h3>Technical Access</h3>'));
        assert.ok(!osSection.includes('>api<'), `Cursor: API found in OS section`);
        assert.ok(!osSection.includes('>cli<'), `Cursor: CLI found in OS section`);
    }

    if (id === 'zapier-ai') {
        assert.ok(!html.includes('Featured Comparisons'), `Zapier AI: Should not have Featured Comparisons`);
    }

    if (id === 'aider') {
        assert.ok(html.includes('Open source</span'), `Aider: Missing open source label`);
        assert.ok(html.includes('<h3>Technical Access</h3>'), `Aider: Missing Technical Access section`);
    }

    if (id === 'amazon-codewhisperer') {
        assert.ok(html.includes('<h1>Amazon Q Developer</h1>'), `Amazon: Missing Amazon Q Developer H1`);
        assert.ok(!html.includes('Recommended'), `Amazon: Found Recommended badge`);
        assert.ok(!html.includes('Winner'), `Amazon: Found Winner badge`);
        assert.ok(!html.includes('Top choice'), `Amazon: Found Top choice badge`);
        assert.ok(!html.includes('Our pick'), `Amazon: Found Our pick badge`);
    }
}

// Check sitemap
if (fs.existsSync(SITEMAP_PATH)) {
    const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
    assert.ok(!sitemap.includes('tool-page-v2-preview'), 'Sitemap contains preview URLs');
}

console.log('PASS');
