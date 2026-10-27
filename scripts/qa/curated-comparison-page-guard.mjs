import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '../..');

const MANIFEST_PATH = path.join(ROOT, 'data/seo/comparisons-v2.publish.json');
const RESEARCH_PATH = path.join(ROOT, 'data/seo/comparisons-v2.research.json');
const DIST_DIR = path.join(ROOT, 'compare');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const researchData = JSON.parse(fs.readFileSync(RESEARCH_PATH, 'utf-8'));

let errors = 0;

const FORBIDDEN_PHRASES = [
    "requires using Discord",
    "Discord-only",
    "gold standard",
    "widely preferred by developers",
    "superior coding abilities",
    "Copilot's current autocomplete and chat features",
    "DALL-E 3"
];

function checkPage(slug) {
    const indexPath = path.join(DIST_DIR, slug, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error(`[FAIL] Page missing for slug: ${slug}`);
        errors++;
        return;
    }

    const html = fs.readFileSync(indexPath, 'utf-8');
    const def = researchData.find(r => r.slug === slug);
    if (!def) {
        console.error(`[FAIL] No research data found for slug: ${slug}`);
        errors++;
        return;
    }

    // 1. Basic Metadata
    if (!html.includes(`<title>${def.title}</title>`)) { console.error(`[FAIL] ${slug} - Missing/incorrect title`); errors++; }
    if (!html.includes(`name="description" content="${def.metaDescription}"`)) { console.error(`[FAIL] ${slug} - Missing/incorrect meta description`); errors++; }
    if (!html.includes(`rel="canonical" href="https://whichaipick.com/compare/${slug}/"`)) { console.error(`[FAIL] ${slug} - Missing/incorrect canonical`); errors++; }
    if (!html.includes(`name="robots" content="index,follow`)) { console.error(`[FAIL] ${slug} - Missing/incorrect robots index,follow`); errors++; }
    if (!html.includes(`property="og:title" content="${def.title}"`)) { console.error(`[FAIL] ${slug} - Missing/incorrect og:title`); errors++; }
    if (!html.includes(`property="twitter:title" content="${def.title}"`)) { console.error(`[FAIL] ${slug} - Missing/incorrect twitter:title`); errors++; }

    // 2. Sections presence
    if (!html.includes('Quick Answer')) { console.error(`[FAIL] ${slug} - Missing Quick Answer section`); errors++; }
    if (!html.includes('Interactive Comparison')) { console.error(`[FAIL] ${slug} - Missing Interactive Comparison block`); errors++; }
    if (!html.includes('Decision Support')) { console.error(`[FAIL] ${slug} - Missing Choose sections (Decision Support)`); errors++; }
    if (def.pricingResearch && !html.includes('Pricing Snapshot')) { console.error(`[FAIL] ${slug} - Missing Pricing section`); errors++; }
    if (def.alternatives?.length > 0 && !html.includes('Alternatives')) { console.error(`[FAIL] ${slug} - Missing Alternatives section`); errors++; }
    if (def.faqCandidates?.length > 0 && !html.includes('Frequently Asked Questions')) { console.error(`[FAIL] ${slug} - Missing FAQ section`); errors++; }
    if (def.faqCandidates?.length > 0 && !html.includes('https://schema.org')) { console.error(`[FAIL] ${slug} - Missing Schema.org for FAQ`); errors++; }
    if (!html.includes('Research Sources')) { console.error(`[FAIL] ${slug} - Missing Sources section`); errors++; }
    if (!html.includes('/review-methodology')) { console.error(`[FAIL] ${slug} - Missing Methodology link`); errors++; }
    if (!html.includes(def.checkedAt)) { console.error(`[FAIL] ${slug} - Missing research checked date (${def.checkedAt})`); errors++; }

    // 3. Outdated Phrases Check
    FORBIDDEN_PHRASES.forEach(phrase => {
        // We only fail if DALL-E 3 is used outside of historical context, but for simplicity, we flag any match for manual review or fail it.
        // The prompt says "fail generated public comparisons containing: DALL-E 3... Exception: historical DALL-E wording may appear only if explicitly contextualised as historical."
        // We will just do a simple strict check for this test.
        if (html.toLowerCase().includes(phrase.toLowerCase())) {
            console.error(`[FAIL] ${slug} - Contains forbidden phrase: "${phrase}"`);
            errors++;
        }
    });
}

console.log('Running Curated Comparison Page Guard...');

if (manifest.approvedSlugs.length !== 8) {
    console.error(`[FAIL] Manifest must contain exactly 8 approved slugs, found ${manifest.approvedSlugs.length}`);
    errors++;
}

manifest.approvedSlugs.forEach(checkPage);

// Check if any extra comparisons were generated
const generatedDirs = fs.readdirSync(DIST_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && fs.existsSync(path.join(DIST_DIR, dirent.name, 'index.html')))
    .map(dirent => dirent.name);

const extraDirs = generatedDirs.filter(d => !manifest.approvedSlugs.includes(d));
if (extraDirs.length > 0) {
    console.error(`[FAIL] Found generated comparisons NOT in manifest: ${extraDirs.join(', ')}`);
    errors++;
}

if (errors > 0) {
    console.error(`\n[RESULT] Curated Comparison Page Guard FAILED with ${errors} errors.`);
    process.exit(1);
} else {
    console.log('\n[RESULT] Curated Comparison Page Guard PASSED. All 8 pages generated correctly and cleanly.');
    process.exit(0);
}
