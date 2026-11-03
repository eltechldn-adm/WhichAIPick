import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  auditToolProfile,
  checkToolIdentityAndURL,
  checkFreeTierVsTrial,
  checkMonthlyVsAnnualPricing,
  checkCurrencyAndBillingFrequency,
  checkPricingSourceAndReviewDate,
  checkUnsupportedAbsoluteClaims,
  checkDuplicateWordsAndTypos,
  checkSubstantiveEditorialSections,
  checkComparisonReferences,
  checkNonTargetInvariance,
  checkEvidenceLedgerCompleteness,
  checkGeneratedPageConsistency
} from './editorial-quality-guard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const TOOLS_PATH = path.join(ROOT, 'data', 'tools.json');
const LEDGER_PATH = path.join(ROOT, 'data', 'evidence', 'phase11-evidence-ledger.json');

const tools = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
const ledger = fs.existsSync(LEDGER_PATH) ? JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) : [];
const allToolIds = new Set(tools.map(t => t.id));

const BATCH1 = ['ollama', 'recraft', 'upscayl', 'docsbot', 'macwhisper', 'sitegpt', 'novelcrafter'];
const BATCH2 = ['browse-ai', 'chatpdf', 'capacities', 'diffit', 'cleanvoice', 'anythingllm', 'flair-ai'];
const ALL_14_IDS = [...BATCH1, ...BATCH2];

console.log('======================================================');
console.log('WHICHAIPICK EDITORIAL QUALITY GUARD TEST SUITE');
console.log('Testing Positive Fixtures & Injected Deliberate Errors');
console.log('======================================================\n');

let totalAssertions = 0;
function pass(msg) {
  totalAssertions++;
  console.log(`  ✅ [PASS] ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: POSITIVE FIXTURES (All 14 enriched tools must pass 100%)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- PART 1: Clean Positive Fixtures (14 Tools) ---');
for (const id of ALL_14_IDS) {
  const tool = tools.find(t => t.id === id);
  assert(tool, `Tool ${id} must exist in catalogue`);
  const report = auditToolProfile(tool, { ledger, allToolIds, root: ROOT, checkStaticHtml: true });
  assert.strictEqual(report.valid, true, `Tool ${id} failed clean audit: ${JSON.stringify(report.issues)}`);
  assert.strictEqual(report.issueCount, 0);
  pass(`Clean fixture "${id}" passed all Checks A - L`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: DELIBERATE DEFECT INJECTION (Negative Testing)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 2: Injected Defect Detection Tests ---');

function cloneTool(id) {
  const original = tools.find(t => t.id === id);
  return JSON.parse(JSON.stringify(original));
}

// Test 1: Broken official URL format
{
  const fixture = cloneTool('ollama');
  fixture.website_url = 'ftp://broken-schema.com';
  const issues = checkToolIdentityAndURL(fixture);
  assert(issues.some(i => i.code === 'A_INVALID_URL_PROTOCOL'), 'Should detect invalid URL protocol');
  pass('Defect detected: Invalid URL protocol (A_INVALID_URL_PROTOCOL)');
}

// Test 2: Invalid Tool ID slug
{
  const fixture = cloneTool('ollama');
  fixture.id = 'Invalid_Slug_Capitalised!';
  const issues = checkToolIdentityAndURL(fixture);
  assert(issues.some(i => i.code === 'A_INVALID_ID'), 'Should detect malformed slug ID');
  pass('Defect detected: Invalid tool ID slug (A_INVALID_ID)');
}

// Test 3: Contradictory Free Tier semantics
{
  const fixture = cloneTool('sitegpt'); // sitegpt has hasFreeTier=false
  fixture.pricing_overview += ' Our platform offers a permanent free plan for small teams.';
  const issues = checkFreeTierVsTrial(fixture);
  assert(issues.some(i => i.code === 'B_CONTRADICTORY_FREE_TIER'), 'Should detect free tier contradiction');
  pass('Defect detected: Contradictory free tier claim (B_CONTRADICTORY_FREE_TIER)');
}

// Test 4: Contradictory Paid Only semantics on free tool
{
  const fixture = cloneTool('ollama'); // ollama has hasFreeTier=true
  fixture.pricing_overview += ' Notice: There is no free plan available on our service.';
  const issues = checkFreeTierVsTrial(fixture);
  assert(issues.some(i => i.code === 'B_CONTRADICTORY_PAID_ONLY'), 'Should detect paid-only contradiction');
  pass('Defect detected: Contradictory paid-only claim on free tier (B_CONTRADICTORY_PAID_ONLY)');
}

// Test 5: Ambiguous bare price without billing frequency
{
  const fixture = cloneTool('browse-ai');
  fixture.pricing_overview = '<p>The Pro subscription costs $99 directly.</p>';
  const issues = checkMonthlyVsAnnualPricing(fixture);
  assert(issues.some(i => i.code === 'C_AMBIGUOUS_BILLING_PERIOD'), 'Should detect bare price without billing period');
  pass('Defect detected: Bare price lacking frequency (C_AMBIGUOUS_BILLING_PERIOD)');
}

// Test 6: Invalid currency code
{
  const fixture = cloneTool('cleanvoice');
  fixture.priceCurrency = 'XYZ_CRYPTO';
  const issues = checkCurrencyAndBillingFrequency(fixture);
  assert(issues.some(i => i.code === 'D_INVALID_CURRENCY'), 'Should detect unsupported currency');
  pass('Defect detected: Unsupported currency code (D_INVALID_CURRENCY)');
}

// Test 7: Invalid billing period
{
  const fixture = cloneTool('docsbot');
  fixture.billingPeriod = 'bi_weekly_custom';
  const issues = checkCurrencyAndBillingFrequency(fixture);
  assert(issues.some(i => i.code === 'D_INVALID_BILLING_PERIOD'), 'Should detect invalid billing period');
  pass('Defect detected: Invalid billing period (D_INVALID_BILLING_PERIOD)');
}

// Test 8: Missing verification sources
{
  const fixture = cloneTool('capacities');
  fixture.verificationSources = [];
  const emptyLedger = [];
  const issues = checkPricingSourceAndReviewDate(fixture, emptyLedger);
  assert(issues.some(i => i.code === 'E_MISSING_VERIFICATION_SOURCES'), 'Should detect missing verification sources');
  pass('Defect detected: Missing verification sources (E_MISSING_VERIFICATION_SOURCES)');
}

// Test 9: Missing pricing review date
{
  const fixture = cloneTool('capacities');
  fixture.reviewedAt = null;
  const emptyLedger = [];
  const issues = checkPricingSourceAndReviewDate(fixture, emptyLedger);
  assert(issues.some(i => i.code === 'E_INVALID_REVIEW_DATE'), 'Should detect missing review date');
  pass('Defect detected: Missing review date (E_INVALID_REVIEW_DATE)');
}

// Test 10: Unsupported hype phrases
{
  const fixture = cloneTool('diffit');
  fixture.how_it_works += ' This game changer tool is insane and will supercharge your workflow.';
  const issues = checkUnsupportedAbsoluteClaims(fixture);
  assert(issues.some(i => i.message.includes('game changer')), 'Should detect game changer hype phrase');
  assert(issues.some(i => i.message.includes('insane')), 'Should detect insane hype phrase');
  assert(issues.some(i => i.message.includes('supercharge')), 'Should detect supercharge hype phrase');
  pass('Defect detected: Prohibited hype phrases (F_PROHIBITED_HYPE_PHRASE)');
}

// Test 11: Duplicate word editorial typo
{
  const fixture = cloneTool('chatpdf');
  fixture.how_it_works = 'ChatPDF allows users to to interact with their documents seamlessly.';
  const issues = checkDuplicateWordsAndTypos(fixture);
  assert(issues.some(i => i.code === 'G_DUPLICATE_WORD'), 'Should detect duplicate word');
  pass('Defect detected: Duplicate word "to to" (G_DUPLICATE_WORD)');
}

// Test 12: Raw double-encoded entity leak
{
  const fixture = cloneTool('chatpdf');
  fixture.how_it_works = 'Supports multi-lingual &amp;amp; cross-domain question answering.';
  const issues = checkDuplicateWordsAndTypos(fixture);
  assert(issues.some(i => i.code === 'G_RAW_ENTITY_LEAK'), 'Should detect double-encoded HTML entity');
  pass('Defect detected: Raw HTML entity leak (G_RAW_ENTITY_LEAK)');
}

// Test 13: Missing required section (how_it_works)
{
  const fixture = cloneTool('macwhisper');
  fixture.how_it_works = 'Short';
  const issues = checkSubstantiveEditorialSections(fixture);
  assert(issues.some(i => i.code === 'H_MISSING_HOW_IT_WORKS'), 'Should detect missing substantive how_it_works');
  pass('Defect detected: Insufficient how_it_works (H_MISSING_HOW_IT_WORKS)');
}

// Test 14: Placeholder marker detection
{
  const fixture = cloneTool('macwhisper');
  fixture.sourceSummary += ' <!-- How it Works section will go here -->';
  const issues = checkSubstantiveEditorialSections(fixture);
  assert(issues.some(i => i.code === 'H_PLACEHOLDER_MARKER_DETECTED'), 'Should detect placeholder comment');
  pass('Defect detected: Placeholder comment marker (H_PLACEHOLDER_MARKER_DETECTED)');
}

// Test 15: Invalid comparison reference
{
  const fixture = cloneTool('recraft');
  fixture.comparison_summary = 'Compared to /tools/non-existent-fake-generator-tool/ in speed and cost.';
  const issues = checkComparisonReferences(fixture, allToolIds);
  assert(issues.some(i => i.code === 'I_INVALID_COMPARISON_REFERENCE'), 'Should detect invalid comparison slug');
  pass('Defect detected: Invalid comparison slug (I_INVALID_COMPARISON_REFERENCE)');
}

// Test 16: Non-target mutation detection (Invariance guard)
{
  const baseline = JSON.parse(JSON.stringify(tools));
  const modifiedCurrent = JSON.parse(JSON.stringify(tools));
  // Mutate an untouched tool (e.g. chatgpt) while targeting only 'ollama'
  const chatgpt = modifiedCurrent.find(t => t.id === 'chatgpt');
  chatgpt.name = 'ChatGPT Tampered Version';

  const invarianceIssues = checkNonTargetInvariance(['ollama'], baseline, modifiedCurrent);
  assert(invarianceIssues.some(i => i.code === 'J_UNEXPECTED_NON_TARGET_MUTATION'), 'Should detect mutation on chatgpt');
  pass('Defect detected: Non-target catalogue mutation (J_UNEXPECTED_NON_TARGET_MUTATION)');
}

// Test 17: Non-target removal detection
{
  const baseline = JSON.parse(JSON.stringify(tools));
  const modifiedCurrent = JSON.parse(JSON.stringify(tools)).filter(t => t.id !== 'cursor');

  const invarianceIssues = checkNonTargetInvariance(['ollama'], baseline, modifiedCurrent);
  assert(invarianceIssues.some(i => i.code === 'J_NON_TARGET_REMOVED'), 'Should detect removal of cursor');
  pass('Defect detected: Non-target tool deletion (J_NON_TARGET_REMOVED)');
}

// Test 18: Evidence ledger missing record
{
  const fixture = cloneTool('flair-ai');
  const emptyLedger = [];
  const issues = checkEvidenceLedgerCompleteness(fixture, emptyLedger);
  assert(issues.some(i => i.code === 'K_MISSING_EVIDENCE_RECORD'), 'Should detect missing evidence ledger entry');
  pass('Defect detected: Missing evidence ledger record (K_MISSING_EVIDENCE_RECORD)');
}

console.log('\n======================================================');
console.log(`TOTAL TEST ASSERTIONS: ${totalAssertions}`);
console.log('🎉 ALL EDITORIAL QUALITY GUARD TESTS PASSED WITH ZERO DEFECTS!');
console.log('======================================================\n');
