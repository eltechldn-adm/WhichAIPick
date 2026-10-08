import fs from 'fs';
import path from 'path';
import assert from 'assert';

const OUT_DIR = path.resolve('tool-page-v2-preview');
const SITEMAP_PATH = path.resolve('sitemap.xml'); // or public/sitemap.xml, check if it exists

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
        const comparisons = (html.match(/<li>ChatGPT vs/g) || []).length + (html.match(/<li>Midjourney vs ChatGPT/g) || []).length;
        assert.strictEqual(comparisons, 4, `ChatGPT: Expected 4 featured comparisons, found ${comparisons}`);
    }

    if (id === 'midjourney') {
        assert.ok(html.includes('>web<'), `Midjourney: Missing web interface`);
        assert.ok(html.includes('>discord<'), `Midjourney: Missing discord interface`);
    }

    if (id === 'cursor') {
        assert.ok(html.includes('>windows<'), `Cursor: Missing windows OS`);
        assert.ok(html.includes('>macos<'), `Cursor: Missing macos OS`);
        assert.ok(html.includes('>linux<'), `Cursor: Missing linux OS`);
        assert.ok(html.includes('>api<'), `Cursor: Missing api`);
        assert.ok(html.includes('>cli<'), `Cursor: Missing cli`);

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
