import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TOOLS_PATH = path.join(ROOT, 'data', 'tools.json');
const CANARY_PATH = path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json');
const EVIDENCE_LEDGER_PATH = path.join(ROOT, 'data', 'evidence', 'phase11-evidence-ledger.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'content-enrichment-backlog.json');

export const BATCH1_TOOL_IDS = Object.freeze([
  'ollama',
  'recraft',
  'upscayl',
  'docsbot',
  'macwhisper',
  'sitegpt',
  'novelcrafter'
]);

export const BATCH2_TOOL_IDS = Object.freeze([
  'browse-ai',
  'chatpdf',
  'capacities',
  'diffit',
  'cleanvoice',
  'anythingllm',
  'flair-ai'
]);

export const HISTORICAL_BASELINE = Object.freeze({
  totalTools: 882,
  v2Count: 46,
  historicalSkeletalCount: 575,
  historicalRichV1Count: 261, // included 3 ineligible tools with partial rich fields
  ineligibleCount: 3,
  batch1EnrichedCount: 7,
  batch2EnrichedCount: 7,
  totalEnrichedCount: 14,
  expectedRemainingSkeletalCount: 561,
  expectedEligibleRichV1Count: 272
});

export function isSubstantive(val) {
  if (!val) return false;
  if (typeof val === 'string') return val.trim().length > 30;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return false;
}

/**
 * Deterministically classifies a tool record into one of 5 mutually exclusive backlog categories:
 * 1. V2_STRUCTURED
 * 2. DEPRECATED_INELIGIBLE
 * 3. REQUIRES_REVIEW
 * 4. RICH_V1
 * 5. SKELETAL_V1
 */
export function classifyTool(tool, canarySet) {
  // Check 1: Ineligible / Deprecated
  if (tool.recommendationEligible === false || tool.directoryEligible === false) {
    return {
      category: 'DEPRECATED_INELIGIBLE',
      reason: `recommendationEligible=${tool.recommendationEligible}, directoryEligible=${tool.directoryEligible}`
    };
  }

  // Check 2: Explicit editorial review flag
  if (tool.contentReviewRequired === true || tool.pricingNeedsReview === true) {
    return {
      category: 'REQUIRES_REVIEW',
      reason: `contentReviewRequired=${tool.contentReviewRequired}, pricingNeedsReview=${tool.pricingNeedsReview}`
    };
  }

  // Check 3: Tool Page V2 Canary cohort
  if (canarySet.has(tool.id)) {
    return {
      category: 'V2_STRUCTURED',
      reason: 'Member of approved Tool Page V2 canary allowlist'
    };
  }

  // Check 4: Substantive V1 editorial content
  const hasHow = isSubstantive(tool.how_it_works);
  const hasFeatures = isSubstantive(tool.feature_groups);
  const hasPros = Array.isArray(tool.pros) && tool.pros.length > 0;
  const hasCons = Array.isArray(tool.cons) && tool.cons.length > 0;
  const hasStrengths = hasPros || hasCons;
  const hasPricing = isSubstantive(tool.pricing_overview);

  if (hasHow || hasFeatures || hasStrengths || hasPricing) {
    const presentSections = [];
    if (hasHow) presentSections.push('how_it_works');
    if (hasFeatures) presentSections.push('feature_groups');
    if (hasStrengths) presentSections.push('pros_cons');
    if (hasPricing) presentSections.push('pricing_overview');

    return {
      category: 'RICH_V1',
      reason: `Substantive editorial sections present: ${presentSections.join(', ')}`,
      sections: presentSections
    };
  }

  // Check 5: Skeletal V1 stub
  return {
    category: 'SKELETAL_V1',
    reason: 'Lacks substantive how_it_works, feature_groups, pros/cons, and pricing_overview'
  };
}

export function reconcileBacklog({ root = ROOT, writeManifest = true, verbose = true } = {}) {
  const tools = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tools.json'), 'utf8'));
  const canaryJson = JSON.parse(fs.readFileSync(path.join(root, 'data', 'release', 'tool-page-v2-canary.json'), 'utf8'));
  const canarySet = new Set(canaryJson.approvedToolIds);

  const ledger = fs.existsSync(path.join(root, 'data', 'evidence', 'phase11-evidence-ledger.json'))
    ? JSON.parse(fs.readFileSync(path.join(root, 'data', 'evidence', 'phase11-evidence-ledger.json'), 'utf8'))
    : [];

  const ledgerToolIds = new Set(ledger.map(e => e.id));

  const classificationBuckets = {
    V2_STRUCTURED: [],
    RICH_V1: [],
    SKELETAL_V1: [],
    DEPRECATED_INELIGIBLE: [],
    REQUIRES_REVIEW: []
  };

  const batch1Set = new Set(BATCH1_TOOL_IDS);
  const batch2Set = new Set(BATCH2_TOOL_IDS);
  const enrichedSet = new Set([...BATCH1_TOOL_IDS, ...BATCH2_TOOL_IDS]);

  for (const tool of tools) {
    const { category, reason, sections } = classifyTool(tool, canarySet);
    const enrichedBatch = batch1Set.has(tool.id) ? 'Batch 1' : (batch2Set.has(tool.id) ? 'Batch 2' : null);

    classificationBuckets[category].push({
      id: tool.id,
      name: tool.name || tool.canonicalName,
      category: tool.category || tool.primaryCategory,
      pricingModel: tool.pricingModel || tool.pricing_model,
      hasFreeTier: tool.hasFreeTier ?? tool.has_free_tier,
      hasFreeTrial: tool.hasFreeTrial,
      startingPrice: tool.startingPrice,
      hasEvidenceInLedger: ledgerToolIds.has(tool.id),
      enrichedBatch,
      classificationReason: reason,
      substantiveSections: sections || []
    });
  }

  const counts = {
    totalTools: tools.length,
    v2Structured: classificationBuckets.V2_STRUCTURED.length,
    richV1: classificationBuckets.RICH_V1.length,
    skeletalV1: classificationBuckets.SKELETAL_V1.length,
    deprecatedIneligible: classificationBuckets.DEPRECATED_INELIGIBLE.length,
    requiresReview: classificationBuckets.REQUIRES_REVIEW.length
  };

  const reconciledSum = counts.v2Structured + counts.richV1 + counts.skeletalV1 + counts.deprecatedIneligible + counts.requiresReview;

  // Validate exact mathematical reconciliation against historical baseline
  const reconciliationErrors = [];
  if (counts.totalTools !== HISTORICAL_BASELINE.totalTools) {
    reconciliationErrors.push(`Total tools ${counts.totalTools} != baseline ${HISTORICAL_BASELINE.totalTools}`);
  }
  if (counts.v2Structured !== HISTORICAL_BASELINE.v2Count) {
    reconciliationErrors.push(`V2 count ${counts.v2Structured} != baseline ${HISTORICAL_BASELINE.v2Count}`);
  }
  if (counts.deprecatedIneligible !== HISTORICAL_BASELINE.ineligibleCount) {
    reconciliationErrors.push(`Ineligible count ${counts.deprecatedIneligible} != baseline ${HISTORICAL_BASELINE.ineligibleCount}`);
  }
  if (counts.requiresReview !== 0) {
    reconciliationErrors.push(`Requires review count is ${counts.requiresReview}, expected 0`);
  }
  if (counts.skeletalV1 !== HISTORICAL_BASELINE.expectedRemainingSkeletalCount) {
    reconciliationErrors.push(`Skeletal count ${counts.skeletalV1} != expected ${HISTORICAL_BASELINE.expectedRemainingSkeletalCount}`);
  }
  if (counts.richV1 !== HISTORICAL_BASELINE.expectedEligibleRichV1Count) {
    reconciliationErrors.push(`Rich V1 count ${counts.richV1} != expected ${HISTORICAL_BASELINE.expectedEligibleRichV1Count}`);
  }
  if (reconciledSum !== counts.totalTools) {
    reconciliationErrors.push(`Sum of buckets (${reconciledSum}) != total tools (${counts.totalTools})`);
  }

  // Confirm that all 14 enriched tools are classified as RICH_V1
  const enrichedInRichV1 = classificationBuckets.RICH_V1.filter(t => enrichedSet.has(t.id)).map(t => t.id);
  if (enrichedInRichV1.length !== HISTORICAL_BASELINE.totalEnrichedCount) {
    reconciliationErrors.push(`Expected 14 enriched tools in RICH_V1, found ${enrichedInRichV1.length}`);
  }

  // Prioritize skeletal backlog by category distribution
  const skeletalByCategory = {};
  for (const item of classificationBuckets.SKELETAL_V1) {
    skeletalByCategory[item.category] = (skeletalByCategory[item.category] || 0) + 1;
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    description: 'Deterministic WhichAIPick content backlog manifest classifying all 882 tools for editorial enrichment.',
    baselineReconciliation: {
      historicalSkeletalBaseline: HISTORICAL_BASELINE.historicalSkeletalCount,
      batchesCompleted: [
        { batch: 1, count: HISTORICAL_BASELINE.batch1EnrichedCount, toolIds: [...BATCH1_TOOL_IDS] },
        { batch: 2, count: HISTORICAL_BASELINE.batch2EnrichedCount, toolIds: [...BATCH2_TOOL_IDS] }
      ],
      totalEnrichedToDate: HISTORICAL_BASELINE.totalEnrichedCount,
      remainingSkeletalBacklog: counts.skeletalV1,
      mathematicalProof: `${HISTORICAL_BASELINE.historicalSkeletalCount} (baseline skeletal) - ${HISTORICAL_BASELINE.totalEnrichedCount} (Batches 1 & 2 enriched) = ${counts.skeletalV1} remaining skeletal tools`
    },
    counts,
    skeletalByCategoryDistribution: skeletalByCategory,
    ineligibleToolIds: classificationBuckets.DEPRECATED_INELIGIBLE.map(t => t.id),
    v2ToolIds: classificationBuckets.V2_STRUCTURED.map(t => t.id),
    enrichedV1ToolIds: enrichedInRichV1,
    skeletalBacklogToolIds: classificationBuckets.SKELETAL_V1.map(t => t.id),
    classificationInventory: classificationBuckets
  };

  if (writeManifest) {
    const outPath = path.join(root, 'data', 'content-enrichment-backlog.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
    if (verbose) console.log(`[BACKLOG RECONCILER] Successfully wrote manifest to: ${outPath}`);
  }

  if (verbose) {
    console.log('======================================================');
    console.log('WHICHAIPICK CONTENT BACKLOG RECONCILIATION SUMMARY');
    console.log('======================================================');
    console.log(`Total Catalogue Records:       ${counts.totalTools}`);
    console.log(`- V2 Structured (Canary):       ${counts.v2Structured}`);
    console.log(`- Rich V1 (Substantive):        ${counts.richV1} (includes 14 newly enriched)`);
    console.log(`- Skeletal V1 (Backlog):        ${counts.skeletalV1}`);
    console.log(`- Deprecated / Ineligible:      ${counts.deprecatedIneligible}`);
    console.log(`- Requires Review:              ${counts.requiresReview}`);
    console.log('------------------------------------------------------');
    console.log(`Historical Baseline Skeletal:  ${HISTORICAL_BASELINE.historicalSkeletalCount}`);
    console.log(`Enriched in Batches 1 & 2:     -${HISTORICAL_BASELINE.totalEnrichedCount}`);
    console.log(`Remaining Skeletal Backlog:     ${counts.skeletalV1}`);
    console.log('------------------------------------------------------');
    console.log(`Reconciliation Invariant Check: ${reconciliationErrors.length === 0 ? '✅ 100% RECONCILED' : '❌ FAILED'}`);
    if (reconciliationErrors.length > 0) {
      console.error('Errors:', reconciliationErrors);
    }
  }

  return {
    success: reconciliationErrors.length === 0,
    errors: reconciliationErrors,
    counts,
    manifest
  };
}

// Direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = reconcileBacklog();
  if (!result.success) {
    console.error('[BACKLOG RECONCILER FATAL] Invariants violated.');
    process.exit(1);
  }
}
