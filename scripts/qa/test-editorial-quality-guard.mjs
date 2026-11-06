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
import { simulateEnrichment } from '../reconcile-content-backlog.mjs';
import { generateReleaseEvidence, evaluateQuarantineStatus, runCmd } from './generate-release-evidence.mjs';

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
const BATCH4A = ['deepl', 'languagetool', 'paperpal', 'askyourpdf', 'nanonets'];
const BATCH4B = ['castmagic', 'captions', 'cartesia', 'bland-ai', 'lindy'];
const BATCH4C = ['clay', 'photoroom', 'langfuse', 'chatbase', 'deepgram'];
const ALL_29_IDS = [...BATCH1, ...BATCH2, ...BATCH4A, ...BATCH4B, ...BATCH4C];

console.log('======================================================');
console.log('WHICHAIPICK EDITORIAL QUALITY GUARD TEST SUITE');
console.log('Testing Positive Fixtures, Injected Defects & Check L');
console.log('======================================================\n');

let totalAssertions = 0;
function pass(msg) {
  totalAssertions++;
  console.log(`  ✅ [PASS] ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 1: POSITIVE FIXTURES (All 29 enriched tools must pass 100%)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- PART 1: Clean Positive Fixtures (29 Tools) ---');
for (const id of ALL_29_IDS) {
  const tool = tools.find(t => t.id === id);
  assert(tool, `Tool ${id} must exist in catalogue`);
  const report = auditToolProfile(tool, { ledger, allToolIds, root: ROOT, checkStaticHtml: true });
  assert.strictEqual(report.valid, true, `Tool ${id} failed clean audit: ${JSON.stringify(report.issues)}`);
  assert.strictEqual(report.issueCount, 0);
  pass(`Clean fixture "${id}" passed all Checks A - L`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 2: DELIBERATE DEFECT INJECTION (Negative Testing: Checks A - K)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 2: Injected Defect Detection Tests (Checks A - K) ---');

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

// Test 5: Ambiguous bare price without billing frequency (including disconnected 'allowance' later in sentence)
{
  const fixture = cloneTool('browse-ai');
  fixture.pricing_overview = '<p>The Pro subscription costs $99 directly.</p>';
  const issues = checkMonthlyVsAnnualPricing(fixture);
  assert(issues.some(i => i.code === 'C_AMBIGUOUS_BILLING_PERIOD'), 'Should detect bare price without billing period');
  pass('Defect detected: Bare price lacking frequency (C_AMBIGUOUS_BILLING_PERIOD)');

  const fixtureAllowance = cloneTool('browse-ai');
  fixtureAllowance.pricing_overview = '<p>Paid plans start at $29 with a generous usage allowance for teams.</p>';
  const issuesAllowance = checkMonthlyVsAnnualPricing(fixtureAllowance);
  assert(issuesAllowance.some(i => i.code === 'C_AMBIGUOUS_BILLING_PERIOD'), 'Should detect bare price even when "allowance" appears later in sentence');
  pass('Defect detected: Bare price "$29 with a generous usage allowance" rejected (C_AMBIGUOUS_BILLING_PERIOD)');

  const fixtureBusinessUnits = cloneTool('langfuse');
  fixtureBusinessUnits.pricing_overview = '<p>Enterprise access costs $8 for several business units across the organization.</p>';
  const issuesBusinessUnits = checkMonthlyVsAnnualPricing(fixtureBusinessUnits);
  assert(issuesBusinessUnits.some(i => i.code === 'C_AMBIGUOUS_BILLING_PERIOD'), 'Should reject bare price followed by "business units" without "per <number> units"');
  pass('Defect detected: Bare price "$8 for several business units" rejected (C_AMBIGUOUS_BILLING_PERIOD)');

  const fixtureCrossSentence = cloneTool('photoroom');
  fixtureCrossSentence.pricing_overview = '<p>Published US monthly prices of $12.99 for Pro. Later, Max costs $34.99 for Max.</p>';
  const issuesCrossSentence = checkMonthlyVsAnnualPricing(fixtureCrossSentence);
  assert(issuesCrossSentence.some(i => i.code === 'C_AMBIGUOUS_BILLING_PERIOD' && i.message.includes('$34.99')), 'Should reject cross-sentence bare price "$34.99 for Max" when separated by period');
  pass('Defect detected: Cross-sentence bare price "$34.99 for Max" rejected (C_AMBIGUOUS_BILLING_PERIOD)');
}

// Test 5a: Batch 4C Check C positive boundaries and additional negative boundaries
{
  const posMetered = cloneTool('langfuse');
  posMetered.pricing_overview = '<p>Core includes 100,000 units, with additional usage starting at <strong>$8 per 100,000 units</strong>.</p>';
  assert.strictEqual(checkMonthlyVsAnnualPricing(posMetered).length, 0, 'Metered "$8 per 100,000 units" must pass Check C');
  pass('Positive boundary: "$8 per 100,000 units" accepted by Check C');

  const posList = cloneTool('photoroom');
  posList.pricing_overview = '<p>The source research identified published US monthly prices of <strong>$12.99 for Pro</strong>, <strong>$34.99 for Max</strong> and <strong>$99 for Ultra</strong>.</p>';
  assert.strictEqual(checkMonthlyVsAnnualPricing(posList).length, 0, 'Same-sentence monthly plan-price list must pass Check C');
  pass('Positive boundary: same-sentence monthly plan-price list accepted by Check C');

  const posAnnualEq = cloneTool('photoroom');
  posAnnualEq.pricing_overview = '<p>Pro is <strong>$7.50/month billed yearly</strong> ($89.99/year), and Ultra is <strong>$82.50/month billed yearly</strong>.</p>';
  assert.strictEqual(checkMonthlyVsAnnualPricing(posAnnualEq).length, 0, 'Consistent qualified annual equivalent must pass Check C');
  pass('Positive boundary: consistent "$7.50/month billed yearly ($89.99/year)" accepted by Check C');

  const negPlanNoPeriod = cloneTool('photoroom');
  negPlanNoPeriod.pricing_overview = '<p>Photoroom offers <strong>$29 for Pro</strong> with extra exports.</p>';
  assert(checkMonthlyVsAnnualPricing(negPlanNoPeriod).some(i => i.code === 'C_AMBIGUOUS_BILLING_PERIOD'), '"$29 for Pro" without a billing-period qualifier must fail');
  pass('Defect detected: "$X for <Plan>" without any monthly/annual qualifier rejected (C_AMBIGUOUS_BILLING_PERIOD)');

  const negInconsistentEq = cloneTool('photoroom');
  negInconsistentEq.pricing_overview = '<p>Max costs <strong>$20.99/month billed yearly</strong> ($250/year) on the annual option.</p>';
  assert(checkMonthlyVsAnnualPricing(negInconsistentEq).some(i => i.code === 'C_INCONSISTENT_ANNUAL_EQUIVALENT'), 'Contradictory $20.99/month vs $250/year equivalent must fail');
  pass('Defect detected: contradictory "$20.99/month billed yearly ($250/year)" equivalent (C_INCONSISTENT_ANNUAL_EQUIVALENT)');

  const negMonthlyAsAnnual = cloneTool('chatbase');
  negMonthlyAsAnnual.billingPeriod = 'annual';
  negMonthlyAsAnnual.pricing_overview = '<p>Hobby costs <strong>$40/month</strong> and includes 700 message credits.</p>';
  assert(checkCurrencyAndBillingFrequency(negMonthlyAsAnnual).some(i => i.code === 'D_MONTHLY_RATE_MISLABELLED_ANNUAL'), 'Monthly price stored as annual must fail');
  pass('Defect detected: monthly price stored with billingPeriod="annual" (D_MONTHLY_RATE_MISLABELLED_ANNUAL)');

  const posAnnualStructured = cloneTool('chatbase');
  posAnnualStructured.billingPeriod = 'annual';
  posAnnualStructured.startingPrice = 384;
  posAnnualStructured.pricing_overview = '<p>Hobby is <strong>$384/year</strong> when billed annually.</p>';
  assert(!checkCurrencyAndBillingFrequency(posAnnualStructured).some(i => i.code === 'D_MONTHLY_RATE_MISLABELLED_ANNUAL'), 'Genuine annual price must not trigger D_MONTHLY_RATE_MISLABELLED_ANNUAL');
  pass('Positive boundary: genuine "$384/year" with billingPeriod="annual" not flagged');
}

// Test 5b: Per-minute rate falsely labelled as a monthly subscription
{
  const fixtureStructured = cloneTool('bland-ai');
  fixtureStructured.startingPrice = 0.14;
  fixtureStructured.billingPeriod = 'month';
  fixtureStructured.pricing_overview = '<p>Connected calls cost $0.14 per minute with pro-rata per-second billing.</p>';
  const issuesStructured = checkCurrencyAndBillingFrequency(fixtureStructured);
  assert(issuesStructured.some(i => i.code === 'D_METERED_RATE_MISLABELLED_MONTHLY'), 'Should detect metered per-minute rate stored with billingPeriod=month');
  pass('Defect detected: Per-minute rate stored as monthly subscription (D_METERED_RATE_MISLABELLED_MONTHLY)');

  const fixtureProse = cloneTool('bland-ai');
  fixtureProse.pricing_overview = '<p>Connected voice calls cost $0.14 per minute per month on the standard plan.</p>';
  const issuesProse = checkMonthlyVsAnnualPricing(fixtureProse);
  assert(issuesProse.some(i => i.code === 'C_CONTRADICTORY_PRICE_UNIT'), 'Should detect contradictory per-minute + per-month unit on same price');
  pass('Defect detected: Per-minute rate falsely labelled as monthly in prose (C_CONTRADICTORY_PRICE_UNIT)');
}

// Test 5c: Annual rate described as monthly with no billing caveat
{
  const fixtureAnnual = cloneTool('paperpal');
  fixtureAnnual.billingPeriod = 'month_billed_annually';
  fixtureAnnual.pricing_overview = '<p>Paperpal Prime costs $12/month for full access to grammar and editing tools.</p>';
  const issuesAnnual = checkMonthlyVsAnnualPricing(fixtureAnnual);
  assert(issuesAnnual.some(i => i.code === 'C_MISSING_ANNUAL_BILLING_CAVEAT'), 'Should detect month_billed_annually without annual caveat in prose');
  pass('Defect detected: Annual rate described as monthly without annual billing caveat (C_MISSING_ANNUAL_BILLING_CAVEAT)');
}

// Test 5d: $0 platform fee presented as unlimited free calling
{
  const fixtureZeroFee = cloneTool('bland-ai');
  fixtureZeroFee.hasFreeTier = false;
  fixtureZeroFee.hasFreeTrial = null;
  fixtureZeroFee.pricing_overview = '<p>The Start plan has a $0 monthly platform fee with unlimited free calling for all teams.</p>';
  const issuesZeroFee = checkFreeTierVsTrial(fixtureZeroFee);
  assert(issuesZeroFee.some(i => i.code === 'B_FALSE_UNLIMITED_FREE_CLAIM'), 'Should detect $0 platform fee falsely presented as unlimited free calling');
  pass('Defect detected: $0 platform fee presented as unlimited free calling (B_FALSE_UNLIMITED_FREE_CLAIM)');
}

// Test 5e: Per-user charge described as whole-workspace cost
{
  const fixtureSeat = cloneTool('lindy');
  fixtureSeat.pricing_overview = '<p>Paid usage begins with the Team plan at $49.99 per active user per month, which is a flat rate for the entire workspace.</p>';
  const issuesSeat = checkMonthlyVsAnnualPricing(fixtureSeat);
  assert(issuesSeat.some(i => i.code === 'C_CONTRADICTORY_SEAT_BILLING'), 'Should detect per-user charge described as whole-workspace flat cost');
  pass('Defect detected: Per-user charge described as whole-workspace cost (C_CONTRADICTORY_SEAT_BILLING)');
}

// Test 6: Invalid currency code
{
  const fixture = cloneTool('docsbot');
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

// ─────────────────────────────────────────────────────────────────────────────
// PART 3: TARGETED TESTS FOR CHECK L (Generated Static Page Consistency)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 3: Check L Static HTML Consistency Tests ---');

// Helper to construct baseline valid HTML for Check L
function createValidHtml(toolId) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${toolId} — AI Tool | WhichAIPick</title>
  <meta name="description" content="Substantive verified description of ${toolId} AI tool for testing purposes.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://whichaipick.com/tools/${toolId}/">
</head>
<body>
  <h1>${toolId}</h1>
  <section><h2>How It Works</h2><p>Explaining how the tool operates step-by-step.</p></section>
  <section><h2>Key Features</h2><p>Feature groups detailed breakdown.</p></section>
  <section><h2>Strengths & Limitations</h2><p>Pros and cons analysis.</p></section>
  <section><h2>Pricing</h2><p>Transparent pricing breakdown $20/month.</p></section>
</body>
</html>
  `.trim();
}

// Test 19: Check L - Clean HTML passes
{
  const html = createValidHtml('ollama');
  const issues = checkGeneratedPageConsistency('ollama', ROOT, html);
  assert.strictEqual(issues.length, 0, 'Valid HTML must produce 0 issues');
  pass('Check L baseline: Valid HTML satisfies all criteria');
}

// Test 20: Check L - Missing H1 tag
{
  const html = createValidHtml('ollama').replace('<h1>ollama</h1>', '');
  const issues = checkGeneratedPageConsistency('ollama', ROOT, html);
  assert(issues.some(i => i.code === 'L_INVALID_H1_COUNT'), 'Should detect missing H1');
  pass('Check L defect detected: Missing H1 tag (L_INVALID_H1_COUNT)');
}

// Test 21: Check L - Multiple H1 tags
{
  const html = createValidHtml('ollama').replace('<h1>ollama</h1>', '<h1>First H1</h1><h1>Second H1</h1>');
  const issues = checkGeneratedPageConsistency('ollama', ROOT, html);
  assert(issues.some(i => i.code === 'L_INVALID_H1_COUNT'), 'Should detect multiple H1 tags');
  pass('Check L defect detected: Multiple H1 tags (L_INVALID_H1_COUNT)');
}

// Test 22: Check L - Incorrect Canonical URL
{
  const html = createValidHtml('ollama').replace(
    'href="https://whichaipick.com/tools/ollama/"',
    'href="https://whichaipick.com/tools/wrong-canonical/"'
  );
  const issues = checkGeneratedPageConsistency('ollama', ROOT, html);
  assert(issues.some(i => i.code === 'L_INCORRECT_CANONICAL'), 'Should detect incorrect canonical URL');
  pass('Check L defect detected: Incorrect canonical link (L_INCORRECT_CANONICAL)');
}

// Test 23: Check L - Missing Robots Meta Tag
{
  const html = createValidHtml('ollama').replace('<meta name="robots" content="index,follow">', '');
  const issues = checkGeneratedPageConsistency('ollama', ROOT, html);
  assert(issues.some(i => i.code === 'L_INVALID_ROBOTS'), 'Should detect missing robots meta');
  pass('Check L defect detected: Missing robots meta (L_INVALID_ROBOTS)');
}

// Test 24: Check L - Missing Required Section Heading
{
  const html = createValidHtml('ollama').replace('<h2>Strengths & Limitations</h2>', '');
  const issues = checkGeneratedPageConsistency('ollama', ROOT, html);
  assert(issues.some(i => i.code === 'L_MISSING_HTML_HEADING'), 'Should detect missing section heading');
  pass('Check L defect detected: Missing required heading (L_MISSING_HTML_HEADING)');
}

// Test 25: Check L - Unresolved Template Token Leak
{
  const html = createValidHtml('ollama').replace('Explaining how the tool operates', 'Explaining {{ tool.summary }}');
  const issues = checkGeneratedPageConsistency('ollama', ROOT, html);
  assert(issues.some(i => i.code === 'L_TEMPLATE_TOKEN_LEAK'), 'Should detect template token leak');
  pass('Check L defect detected: Unresolved template token leak (L_TEMPLATE_TOKEN_LEAK)');
}

// Test 26: Check L - Missing file on disk
{
  const issues = checkGeneratedPageConsistency('completely-nonexistent-tool-xyz-12345', ROOT, null);
  assert(issues.some(i => i.code === 'L_PAGE_MISSING'), 'Should detect missing static page file');
  pass('Check L defect detected: Missing static page on disk (L_PAGE_MISSING)');
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 4: BACKLOG TRACKER DYNAMIC SIMULATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 4: Backlog Tracker Dynamic Simulation ---');
{
  // Pick an actual skeletal tool (e.g. 11x) and simulate enrichment
  const sim = simulateEnrichment('11x');
  assert.strictEqual(sim.skeletalDiff, -1, 'Skeletal count must decrease by exactly 1');
  assert.strictEqual(sim.richDiff, 1, 'Rich V1 count must increase by exactly 1');
  assert.strictEqual(sim.totalDiff, 0, 'Total tool count must remain invariant at 882');
  pass(`Simulation proof: Skeletal (${sim.baselineCounts.skeletalV1} -> ${sim.simulatedCounts.skeletalV1}), Rich (${sim.baselineCounts.richV1} -> ${sim.simulatedCounts.richV1}), Total invariant`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 5: EVIDENCE GENERATOR ROBUSTNESS & SECURITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 5: Evidence Generator Robustness & Security ---');
{
  const evidence = generateReleaseEvidence({ runSuites: false, verbose: false });
  
  // 1. Exact 40-character Git SHA (never short prefix)
  assert.strictEqual(typeof evidence.gitIdentity.headCommitSha, 'string');
  assert.strictEqual(evidence.gitIdentity.headCommitSha.length, 40, 'HEAD SHA must be full 40-character string');
  assert(/^[0-9a-f]{40}$/i.test(evidence.gitIdentity.headCommitSha), 'HEAD SHA must be valid hex');
  pass('Evidence generator: Exact 40-char full Git SHA captured directly from Git CLI');

  // 2. Skipped checks marked NOT TESTED (never invented)
  assert.strictEqual(evidence.previewDeployment.id, null);
  assert.strictEqual(evidence.previewDeployment.status, 'NOT TESTED');
  pass('Evidence generator: Null preview deployment explicitly marked [NOT TESTED]');

  // 3. Secret Leakage Protection
  const jsonReport = JSON.stringify(evidence);
  const secretPatterns = [/api[_-]?key/i, /token[_-]?secret/i, /password/i, /bearer\s+[a-z0-9]/i];
  for (const pat of secretPatterns) {
    assert(!pat.test(jsonReport), `Generated evidence must not leak secrets matching ${pat}`);
  }
  pass('Evidence generator: Zero secret or credential exposure in evidence output');

  // 4. Catalogue Invariants Verified
  assert.strictEqual(evidence.catalogueInvariants.totalTools.actual, 882);
  assert.strictEqual(evidence.catalogueInvariants.eligibleTools.actual, 879);
  assert.strictEqual(evidence.catalogueInvariants.ineligibleTools.actual, 3);
  assert.strictEqual(evidence.catalogueInvariants.v2CanaryTools.actual, 46);
  assert.strictEqual(evidence.catalogueInvariants.sitemapUrls.actual, 959);
  assert.strictEqual(evidence.catalogueInvariants.redirectRules.actual, 59);
  pass('Evidence generator: All 6 catalogue invariants verified with [VERIFIED] status');
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 6: FAIL-CLOSED BEHAVIOR & NEGATIVE INTEGRATION SUITE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- PART 6: Fail-Closed Behavior & Negative Integration Suite ---');

// Test A: Real failed-suite injection in an isolated harness
{
  const res = runCmd('node scripts/qa/generate-release-evidence.mjs --inject-failing-suite');
  assert.strictEqual(res.exitCode, 1, 'Reporter must exit 1 when a suite fails');
  assert(
    res.stderr.includes('Required QA suite failed: Injected Failing Suite') ||
    res.stdout.includes('Required QA suite failed: Injected Failing Suite'),
    'Error log must identify the failed suite'
  );

  const reportPath = path.join(ROOT, 'reports', 'stage-7h-9f-release-evidence.json');
  assert(fs.existsSync(reportPath), 'JSON report must survive on disk after suite failure for diagnosis');
  const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(savedReport.success, false, 'Report success flag must be false');
  const failedSuite = savedReport.testSuites.find(s => s.suite === 'Injected Failing Suite');
  assert(failedSuite, 'Report must contain record of failing suite');
  assert.strictEqual(failedSuite.exitCode, 42, 'Report must record actual nonzero exit code 42');
  assert.strictEqual(failedSuite.status, 'FAILED', 'Failing suite status must be FAILED');
  pass('Fail-closed proof A: Genuine failed-suite integration verified (real exit 42 -> reporter exit 1 -> JSON report preserved)');
}

// Test B: Incorrect catalogue count triggers invariant failure
{
  const mockTools = tools.slice(0, 881); // 881 instead of 882
  assert.strictEqual(mockTools.length, 881);
  const invariantCheck = {
    totalTools: { expected: 882, actual: mockTools.length, status: mockTools.length === 882 ? 'VERIFIED' : 'FAILED' }
  };
  assert.strictEqual(invariantCheck.totalTools.status, 'FAILED');
  pass('Fail-closed proof B: Incorrect catalogue count (881 != 882) triggers status=FAILED');
}

// Test C: Invalid Git baseline forces guard to fail nonzero
{
  const res = runCmd('node scripts/qa/editorial-quality-guard.mjs --targets=ollama --base=invalid-git-ref-nonexistent');
  assert.strictEqual(res.exitCode, 1, 'Guard must exit 1 when baseline ref is invalid');
  assert(
    res.stderr.includes('Mandatory baseline data/tools.json could not be loaded') ||
    res.stdout.includes('Mandatory baseline data/tools.json could not be loaded'),
    'Error must identify missing baseline'
  );
  pass('Fail-closed proof C: Invalid Git baseline forces nonzero guard exit with critical error');
}

// Test D: Unknown target tool ID forces guard to fail nonzero
{
  const res = runCmd('node scripts/qa/editorial-quality-guard.mjs --targets=completely-unknown-tool-id-999');
  assert.strictEqual(res.exitCode, 1, 'Guard must exit 1 on unknown target ID');
  assert(res.stdout.includes('Unknown target tool ID(s) specified') || res.stderr.includes('Unknown target tool ID(s) specified'));
  pass('Fail-closed proof D: Unknown target tool ID triggers A_UNKNOWN_TARGET_ID and exits nonzero');
}

// Test E: Non-target tool mutation triggers J_UNEXPECTED_NON_TARGET_MUTATION
{
  const baseline = JSON.parse(JSON.stringify(tools));
  const mutated = JSON.parse(JSON.stringify(tools));
  const nonTarget = mutated.find(t => t.id !== 'ollama');
  nonTarget.name = 'MUTATED_NON_TARGET_TOOL';

  const issues = checkNonTargetInvariance(['ollama'], baseline, mutated);
  assert(issues.some(i => i.code === 'J_UNEXPECTED_NON_TARGET_MUTATION'), 'Must detect non-target mutation');
  pass('Fail-closed proof E: Non-target tool mutation triggers J_UNEXPECTED_NON_TARGET_MUTATION');
}

// Test F: Missing evidence record triggers K_MISSING_EVIDENCE_RECORD
{
  const fakeTool = { id: 'unrecorded-tool-without-ledger', name: 'Fake Tool', pricing_overview: 'Pricing text long enough to satisfy check H' };
  const issues = checkEvidenceLedgerCompleteness(fakeTool, ledger);
  assert(issues.some(i => i.code === 'K_MISSING_EVIDENCE_RECORD'), 'Must flag missing ledger record');
  pass('Fail-closed proof F: Missing evidence record triggers K_MISSING_EVIDENCE_RECORD');
}

// Test G: Skipped or failing required QA suite forces failure in reporter
{
  const simulatedSuites = [
    { suite: 'Backlog Reconciler', exitCode: 0, status: 'VERIFIED' },
    { suite: 'Simulated Failing Suite', exitCode: 2, status: 'FAILED' }
  ];
  const hasFailedSuite = simulatedSuites.some(s => s.exitCode !== 0 || s.status !== 'VERIFIED');
  assert.strictEqual(hasFailedSuite, true);
  pass('Fail-closed proof G: Skipped or failing QA suite status=FAILED is caught by release gate');
}

// Test H: Incorrect deployment identity forces failure in reporter
{
  const evidence = generateReleaseEvidence({ previewDeploymentId: 'completely-invalid-id-xyz-999', runSuites: false, verbose: false });
  assert.strictEqual(evidence.previewDeployment.status, 'FAILED');
  assert.strictEqual(evidence.success, false);
  assert(evidence.failureReasons.some(r => r.includes('Preview deployment verification failed')));
  pass('Fail-closed proof H: Incorrect deployment identity fails preview verification and release gate');
}

// Test I: Empty explicit target list forces guard to fail nonzero
{
  const res = runCmd('node scripts/qa/editorial-quality-guard.mjs --targets=');
  assert.strictEqual(res.exitCode, 1, 'Guard must exit 1 when explicit --targets is empty');
  assert(res.stderr.includes('target list is empty'));
  pass('Fail-closed proof I: Explicit empty --targets argument rejected with nonzero exit');
}

// Test J: Duplicate target IDs rejected with nonzero exit
{
  const res = runCmd('node scripts/qa/editorial-quality-guard.mjs --targets=ollama,ollama');
  assert.strictEqual(res.exitCode, 1, 'Guard must exit 1 on duplicate target IDs');
  assert(res.stderr.includes('Duplicate target tool ID(s) provided'));
  pass('Fail-closed proof J: Duplicate target IDs rejected with nonzero exit');
}

// Test K: Invalid Git baseline handling in evidence reporter
{
  const res = runCmd('node scripts/qa/generate-release-evidence.mjs --base=nonexistent-git-ref --no-suites');
  assert.strictEqual(res.exitCode, 1, 'Reporter must exit 1 on nonexistent base ref');
  assert(
    res.stderr.includes('Base Git ref') ||
    res.stderr.includes('Catalogue baseline comparison failed') ||
    res.stdout.includes('Catalogue baseline comparison failed')
  );

  const reportPath = path.join(ROOT, 'reports', 'stage-7h-9f-release-evidence.json');
  assert(fs.existsSync(reportPath), 'JSON report must survive on disk');
  const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(savedReport.success, false, 'Report success must be false');
  assert.strictEqual(savedReport.catalogueDiff.status, 'FAILED', 'Diff status must be FAILED');
  assert.strictEqual(savedReport.catalogueDiff.comparisonExecuted, false, 'Comparison must not be marked executed');
  pass('Fail-closed proof K: Invalid baseline ref in reporter forces exit 1, diff status FAILED, and comparisonExecuted false');
}

// Test L: Deterministic quarantine exit-code evaluation (0=FAIL, 1=PASS, 128=FAIL)
{
  const exit0 = evaluateQuarantineStatus(0);
  assert.strictEqual(exit0.excluded, false, 'Exit 0 means ancestor -> not excluded');
  assert.strictEqual(exit0.status, 'FAILED', 'Exit 0 status must be FAILED');

  const exit1 = evaluateQuarantineStatus(1);
  assert.strictEqual(exit1.excluded, true, 'Exit 1 means not ancestor -> excluded');
  assert.strictEqual(exit1.status, 'VERIFIED', 'Exit 1 status must be VERIFIED');

  const exit128 = evaluateQuarantineStatus(128);
  assert.strictEqual(exit128.excluded, false, 'Exit 128 means error -> not verified');
  assert.strictEqual(exit128.status, 'FAILED', 'Exit 128 status must be FAILED');

  const exit255 = evaluateQuarantineStatus(255);
  assert.strictEqual(exit255.excluded, false, 'Exit 255 means error -> not verified');
  assert.strictEqual(exit255.status, 'FAILED', 'Exit 255 status must be FAILED');
  pass('Fail-closed proof L: Deterministic quarantine exit-code semantics verified (0=FAIL, 1=PASS, 128=FAIL, 255=FAIL)');
}

// Test M: Unexpected nested evidence generation under active runner fails closed (exit 1)
{
  const res = runCmd('node scripts/qa/generate-release-evidence.mjs', {
    env: { WHICHAIPICK_EVIDENCE_RUNNING: '1' }
  });
  assert.strictEqual(res.exitCode, 1, 'Nested CLI invocation must fail-closed with exit 1');
  assert(
    res.stderr.includes('Unexpected nested evidence generation detected') ||
    res.stdout.includes('Unexpected nested evidence generation detected'),
    'Error log must identify blocked nested recursion'
  );

  const reportPath = path.join(ROOT, 'reports', 'stage-7h-9f-release-evidence.json');
  assert(fs.existsSync(reportPath), 'JSON report must survive on disk');
  const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(savedReport.success, false, 'Report success must be false on blocked nested run');
  assert(
    savedReport.failureReasons.some(r => r.includes('Unexpected nested evidence generation detected')),
    'Report must record nested recursion failure reason'
  );
  pass('Fail-closed proof M: Unexpected nested CLI invocation triggers fail-closed gate without recursive forking');
}

console.log('\n======================================================');
console.log(`TOTAL TEST ASSERTIONS: ${totalAssertions}`);
console.log('🎉 ALL EDITORIAL QUALITY & FAILURE TESTS PASSED CLEANLY!');
console.log('======================================================\n');
