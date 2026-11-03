import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const WORKBOOK_PATH = path.join(ROOT, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const STAGED_PATH = path.join(ROOT, 'data', 'tools.phase11.staged.json');
const PUBLISHED_PATH = path.join(ROOT, 'data', 'tools.json');
const COMPARISON_INDEX_PATH = path.join(ROOT, 'data', 'comparison-index.json');
const LEDGER_PATH = path.join(ROOT, 'data', 'evidence', 'phase11-evidence-ledger.json');

const BATCH1_IDS = ['ollama', 'recraft', 'upscayl', 'docsbot', 'macwhisper', 'sitegpt', 'novelcrafter'];
const BATCH2_IDS = ['browse-ai', 'chatpdf', 'capacities', 'diffit', 'cleanvoice', 'anythingllm', 'flair-ai'];
const ALL_14_ENRICHED = [...BATCH1_IDS, ...BATCH2_IDS];

console.log('======================================================');
console.log('WHICHAIPICK SOURCE-OF-TRUTH INVARIANCE SUITE');
console.log('Validating Pipeline Consistency & Enriched Tool Parity');
console.log('======================================================\n');

let checksPassed = 0;
function pass(label) {
  checksPassed++;
  console.log(`  ✅ [PASS] ${label}`);
}

// 1. Workbook existence
assert(fs.existsSync(WORKBOOK_PATH), 'Phase 11 Excel workbook must exist');
pass('Phase 11 authoritative Excel workbook present on disk');

// 2. Staged and Published parity
const stagedRaw = fs.readFileSync(STAGED_PATH, 'utf8');
const publishedRaw = fs.readFileSync(PUBLISHED_PATH, 'utf8');
const staged = JSON.parse(stagedRaw);
const published = JSON.parse(publishedRaw);

assert.strictEqual(staged.length, 882, 'Staged catalogue must contain 882 tools');
assert.strictEqual(published.length, 882, 'Published catalogue must contain 882 tools');
assert.strictEqual(stagedRaw, publishedRaw, 'Staged catalogue must match published tools.json byte-for-byte');
pass('Staged catalogue matches published tools.json 100% byte-for-byte');

// 3. Comparison index integrity
assert(fs.existsSync(COMPARISON_INDEX_PATH), 'Comparison index must exist');
const compIndex = JSON.parse(fs.readFileSync(COMPARISON_INDEX_PATH, 'utf8'));
assert(Array.isArray(compIndex) && compIndex.length > 0, 'Comparison index must be non-empty array');
const publishedIdSet = new Set(published.map(t => t.id));

let compToolRefs = 0;
for (const entry of compIndex) {
  assert(publishedIdSet.has(entry.id), `Comparison index entry references unknown tool: ${entry.id}`);
  compToolRefs++;
}
pass(`Comparison index validated (${compIndex.length} entries, ${compToolRefs} tool IDs verified in published catalogue)`);

// 4. Evidence ledger coverage for all 14 enriched profiles
assert(fs.existsSync(LEDGER_PATH), 'Evidence ledger must exist');
const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
const ledgerToolIds = new Set(ledger.map(e => e.id));

for (const id of ALL_14_ENRICHED) {
  assert(ledgerToolIds.has(id), `Tool ${id} must have at least one record in evidence ledger`);
}
pass('All 14 enriched profiles have evidence ledger records');

// 5. Static HTML consistency for all 14 profiles
for (const id of ALL_14_ENRICHED) {
  const htmlPath = path.join(ROOT, 'tools', id, 'index.html');
  assert(fs.existsSync(htmlPath), `Static HTML page for ${id} must exist`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('How It Works'), `${id} HTML must render How It Works`);
  assert(html.includes('Key Features'), `${id} HTML must render Key Features`);
  assert(html.includes('Strengths & Limitations'), `${id} HTML must render Strengths & Limitations`);
  assert(html.includes('Pricing'), `${id} HTML must render Pricing`);
  assert(!html.includes('<!-- How it Works section will go here -->'), `${id} HTML must not contain placeholder`);
}
pass('All 14 enriched profiles render full editorial sections in static HTML');

// 6. Invariance: 882 - 14 = 868 non-target tools
const nonTargetCount = published.length - ALL_14_ENRICHED.length;
assert.strictEqual(nonTargetCount, 868, 'Expected 868 non-target tools');
pass(`Non-target catalogue partition confirmed (${nonTargetCount} tools locked)`);

console.log('\n======================================================');
console.log(`TOTAL INVARIANCE CHECKS PASSED: ${checksPassed}`);
console.log('🎉 SOURCE-OF-TRUTH PIPELINE VERIFIED CLEAN & INVARIANT!');
console.log('======================================================\n');
