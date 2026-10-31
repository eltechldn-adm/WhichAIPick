/**
 * test-synthesia-domain-guard.mjs
 *
 * Stage 7H.2B Focused Regression Test:
 * Enforces correct Synthesia domain (synthesia.io), removal of unverified affiliate link,
 * verified Starter pricing ($19/mo), and absence of synthesia.com across catalogue and HTML.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import XLSX from 'xlsx';

console.log('[SYNTHESIA GUARD] Starting regression verification...');

const WORKBOOK_PATH = path.resolve('data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const TOOLS_JSON_PATH = path.resolve('data/tools.json');
const STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
const COMPARISON_INDEX_PATH = path.resolve('data/comparison-index.json');
const AFFILIATE_LINKS_PATH = path.resolve('data/affiliate-links.json');
const EVIDENCE_PATH = path.resolve('data/evidence/phase11-evidence-ledger.json');
const SYNTHESIA_HTML_PATH = path.resolve('tools/synthesia/index.html');
const VIDEO_AUDIO_HTML_PATH = path.resolve('category/video-audio/index.html');

let checksPassed = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    checksPassed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}

// 0. Verify Excel Workbook
check('data/WhichAIPick_Catalog_...xlsx has synthesia row with synthesia.io and startingPrice 19', () => {
  const wb = XLSX.readFile(WORKBOOK_PATH);
  const sheet = wb.Sheets['Catalog'];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const row = rows.find(r => r.id === 'synthesia');
  assert.ok(row, 'Synthesia row missing in Catalog sheet');
  assert.strictEqual(row.website_url, 'https://www.synthesia.io/');
  assert.strictEqual(row.startingPrice, 19);
  assert.strictEqual(row.startingPlan, 'Starter');
  assert.strictEqual(row.billingPeriod, 'month');
  assert.ok(!row.verificationSources.includes('synthesia.com'));
  assert.ok(!row.fieldProvenance.includes('synthesia.com'));
});

// 1. Verify data/tools.json
const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));
const synTool = tools.find(t => t.id === 'synthesia');

check('data/tools.json contains synthesia record', () => {
  assert.ok(synTool, 'Synthesia not found in data/tools.json');
});

check('data/tools.json has canonical website_url https://www.synthesia.io/', () => {
  assert.strictEqual(synTool.website_url, 'https://www.synthesia.io/');
});

check('data/tools.json has affiliate_url set to null (unverified link removed)', () => {
  assert.strictEqual(synTool.affiliate_url, null);
});

check('data/tools.json has startingPrice 19 and startingPlan Starter', () => {
  assert.strictEqual(synTool.startingPrice, 19);
  assert.strictEqual(synTool.startingPlan, 'Starter');
  assert.strictEqual(synTool.billingPeriod, 'month');
});

check('data/tools.json verificationSources point exclusively to synthesia.io', () => {
  assert.ok(Array.isArray(synTool.verificationSources));
  synTool.verificationSources.forEach(src => {
    assert.ok(!src.includes('synthesia.com'), `verificationSource still contains synthesia.com: ${src}`);
    assert.ok(src.includes('synthesia.io'), `verificationSource does not contain synthesia.io: ${src}`);
  });
});

check('data/tools.json fieldProvenance contains no references to synthesia.com', () => {
  const fpStr = JSON.stringify(synTool.fieldProvenance);
  assert.ok(!fpStr.includes('synthesia.com'), 'fieldProvenance still contains synthesia.com');
});

check('data/tools.json has accurate October 2026 plan facts (Basic, Starter, Pro)', () => {
  assert.ok(synTool.pricingEvidenceNotes.includes('10 mins/month'), 'Missing 10 mins/month in pricingEvidenceNotes');
  assert.ok(synTool.pricingEvidenceNotes.includes('500 monthly credits'), 'Missing 500 monthly credits in pricingEvidenceNotes');
  assert.ok(synTool.pricingEvidenceNotes.includes('Pro (formerly Creator)'), 'Missing Pro (formerly Creator) in pricingEvidenceNotes');
  assert.ok(synTool.pricingEvidenceNotes.includes('6,500 credits'), 'Missing 6,500 credits in pricingEvidenceNotes');
  assert.ok(synTool.freeTierScope.includes('10 minutes/month'), 'Missing 10 minutes/month in freeTierScope');
  assert.ok(synTool.pricing_overview.includes('Pro plan (formerly Creator'), 'Missing Pro (formerly Creator in pricing_overview');
});

// 2. Verify data/tools.phase11.staged.json
const stagedTools = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));
const synStaged = stagedTools.find(t => t.id === 'synthesia');

check('data/tools.phase11.staged.json has canonical website_url https://www.synthesia.io/', () => {
  assert.strictEqual(synStaged.website_url, 'https://www.synthesia.io/');
  assert.strictEqual(synStaged.affiliate_url, null);
  assert.strictEqual(synStaged.startingPrice, 19);
});

// 3. Verify data/comparison-index.json
const compIndex = JSON.parse(fs.readFileSync(COMPARISON_INDEX_PATH, 'utf8'));
const synComp = compIndex.find(t => t.id === 'synthesia');

check('data/comparison-index.json has website_url https://www.synthesia.io/ and startingPrice 19', () => {
  assert.strictEqual(synComp.website_url, 'https://www.synthesia.io/');
  assert.strictEqual(synComp.startingPrice, 19);
  assert.strictEqual(synComp.evidenceReviewedAt, '2026-10-30');
});

// 4. Verify data/affiliate-links.json
const affLinks = JSON.parse(fs.readFileSync(AFFILIATE_LINKS_PATH, 'utf8'));

check('data/affiliate-links.json has no active synthesia entry pointing to synthesia.com', () => {
  const synAff = affLinks.find(l => l.toolId === 'synthesia');
  assert.strictEqual(synAff, undefined, 'Synthesia should not be present in active affiliate-links.json');
});

// 5. Verify data/evidence/phase11-evidence-ledger.json
const ledger = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const e260 = ledger.find(e => e.evidenceId === 'E0260' && e.id === 'synthesia');

check('Evidence ledger entry E0260 has synthesia.io and reviewedAt 2026-10-30', () => {
  assert.ok(e260, 'E0260 evidence entry not found');
  assert.strictEqual(e260.sourceURL, 'https://www.synthesia.io/pricing');
  assert.strictEqual(e260.reviewedAt, '2026-10-30');
  assert.ok(!e260.finding.includes('synthesia.com'));
});

// 6. Verify tools/synthesia/index.html (V1 or V2 page)
const synHtml = fs.readFileSync(SYNTHESIA_HTML_PATH, 'utf8');

check('tools/synthesia/index.html contains no references to synthesia.com', () => {
  assert.ok(!synHtml.includes('synthesia.com'), 'tools/synthesia/index.html contains synthesia.com');
});

check('tools/synthesia/index.html renders non-affiliate Visit CTA to synthesia.io', () => {
  assert.ok(synHtml.includes('href="https://www.synthesia.io/"'), 'Missing link to synthesia.io');
  assert.ok(synHtml.includes('>Visit Synthesia</a>') || synHtml.includes('>Visit Website</a>'), 'Missing Visit CTA label');
  assert.ok(!synHtml.includes('(Affiliate Link)'), 'Still contains (Affiliate Link) label');
  assert.ok(!synHtml.includes('class="tool-affiliate-note"'), 'Still contains affiliate note disclosure');
  assert.ok(!synHtml.includes('class="tool-v2-affiliate-note"'), 'Still contains V2 affiliate note disclosure');
});

check('tools/synthesia/index.html Schema.org url is https://www.synthesia.io/', () => {
  assert.ok(synHtml.includes('"url": "https://www.synthesia.io/"') || synHtml.includes('"url":"https://www.synthesia.io/"'), 'Schema.org url does not match');
});

check('tools/synthesia/index.html favicon does not link to synthesia.com', () => {
  assert.ok(!synHtml.includes('domain=synthesia.com'), 'Favicon points to synthesia.com');
  if (synHtml.includes('class="tool-detail-page"')) {
    assert.ok(synHtml.includes('domain=synthesia.io'), 'V1 Favicon does not point to synthesia.io');
  }
});

check('tools/synthesia/index.html renders updated October 2026 pricing overview', () => {
  assert.ok(synHtml.includes('Pro plan (formerly Creator'), 'Missing Pro plan (formerly Creator in tools/synthesia/index.html');
  assert.ok(synHtml.includes('1,250 monthly credit pool'), 'Missing 1,250 credit pool in tools/synthesia/index.html');
  assert.ok(synHtml.includes('6,500 monthly credits'), 'Missing 6,500 credits in tools/synthesia/index.html');
});

// 7. Verify category/video-audio/index.html
const catHtml = fs.readFileSync(VIDEO_AUDIO_HTML_PATH, 'utf8');

check('category/video-audio/index.html contains no references to synthesia.com', () => {
  assert.ok(!catHtml.includes('synthesia.com'), 'category/video-audio/index.html contains synthesia.com');
});

check('category/video-audio/index.html links to synthesia.io with domain label', () => {
  assert.ok(catHtml.includes('href="https://www.synthesia.io/"'), 'Missing synthesia.io link');
  assert.ok(catHtml.includes('>synthesia.io</a>'), 'Missing synthesia.io card action label');
});

// 8. Negative test: ensure guard rejects synthesia.com
check('Negative test: guard rejects synthesia.com mock violation', () => {
  const mockHtml = '<a href="https://www.synthesia.com/">Visit</a>';
  assert.throws(() => {
    if (mockHtml.includes('synthesia.com')) {
      throw new Error('Detected synthesia.com collision!');
    }
  }, /Detected synthesia.com collision!/);
});

console.log(`\n[SYNTHESIA GUARD PASS] All ${checksPassed} checks passed successfully.`);
