import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

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
  totalTools: 881,
  historicalSkeletalCount: 574,
  ineligibleCount: 3
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
 * 1. DEPRECATED_INELIGIBLE
 * 2. REQUIRES_REVIEW
 * 3. V2_STRUCTURED
 * 4. RICH_V1
 * 5. SKELETAL_V1
 */
export function classifyTool(tool, canarySet) {
  // Check 1: Ineligible / Deprecated (highest precedence)
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
  if (canarySet && canarySet.has(tool.id)) {
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

export function reconcileBacklog(options = {}) {
  const {
    root = ROOT,
    toolsData = null,
    writeManifest = true,
    verbose = true
  } = options;

  const tools = toolsData || JSON.parse(fs.readFileSync(path.join(root, 'data', 'tools.json'), 'utf8'));
  const canaryJsonPath = path.join(root, 'data', 'release', 'tool-page-v2-canary.json');
  const canaryJson = fs.existsSync(canaryJsonPath)
    ? JSON.parse(fs.readFileSync(canaryJsonPath, 'utf8'))
    : { approvedToolIds: [] };
  const canarySet = new Set(canaryJson.approvedToolIds);

  const ledgerPath = path.join(root, 'data', 'evidence', 'phase11-evidence-ledger.json');
  const ledger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
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

  // Validate structural invariants (mutual exclusivity & completeness)
  const reconciliationErrors = [];
  if (reconciledSum !== counts.totalTools) {
    reconciliationErrors.push(`Sum of buckets (${reconciledSum}) != total tools (${counts.totalTools})`);
  }
  if (counts.deprecatedIneligible !== HISTORICAL_BASELINE.ineligibleCount) {
    reconciliationErrors.push(`Ineligible count ${counts.deprecatedIneligible} != baseline ${HISTORICAL_BASELINE.ineligibleCount}`);
  }
  if (counts.v2Structured !== canarySet.size) {
    reconciliationErrors.push(`V2 count ${counts.v2Structured} != canary allowlist count ${canarySet.size}`);
  }
  if (counts.requiresReview !== 0) {
    reconciliationErrors.push(`Requires review count is ${counts.requiresReview}, expected 0`);
  }

  // Derive dynamic enriched count from the baseline
  const derivedEnrichedCount = HISTORICAL_BASELINE.historicalSkeletalCount - counts.skeletalV1;

  // Prioritize skeletal backlog by category distribution
  const skeletalByCategory = {};
  for (const item of classificationBuckets.SKELETAL_V1) {
    skeletalByCategory[item.category] = (skeletalByCategory[item.category] || 0) + 1;
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    description: 'Deterministic WhichAIPick content backlog manifest classifying all catalogue tools for editorial enrichment.',
    baselineReconciliation: {
      historicalSkeletalBaseline: HISTORICAL_BASELINE.historicalSkeletalCount,
      derivedEnrichedCountToDate: derivedEnrichedCount,
      remainingSkeletalBacklog: counts.skeletalV1,
      mathematicalProof: `${HISTORICAL_BASELINE.historicalSkeletalCount} (baseline skeletal) - ${derivedEnrichedCount} (tools enriched to date) = ${counts.skeletalV1} remaining skeletal tools`
    },
    counts,
    skeletalByCategoryDistribution: skeletalByCategory,
    ineligibleToolIds: classificationBuckets.DEPRECATED_INELIGIBLE.map(t => t.id),
    v2ToolIds: classificationBuckets.V2_STRUCTURED.map(t => t.id),
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
    console.log(`- Rich V1 (Substantive):        ${counts.richV1}`);
    console.log(`- Skeletal V1 (Backlog):        ${counts.skeletalV1}`);
    console.log(`- Deprecated / Ineligible:      ${counts.deprecatedIneligible}`);
    console.log(`- Requires Review:              ${counts.requiresReview}`);
    console.log('------------------------------------------------------');
    console.log(`Historical Baseline Skeletal:  ${HISTORICAL_BASELINE.historicalSkeletalCount}`);
    console.log(`Derived Enriched To Date:      -${derivedEnrichedCount}`);
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

/**
 * Simulates enrichment of a skeletal tool in a temporary in-memory clone.
 * Does NOT write or alter real catalogue data.
 */
export function simulateEnrichment(toolId, simulatedFields = {}, options = {}) {
  const { root = ROOT } = options;
  const originalTools = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tools.json'), 'utf8'));
  const clonedTools = JSON.parse(JSON.stringify(originalTools));

  const target = clonedTools.find(t => t.id === toolId);
  if (!target) {
    throw new Error(`Tool "${toolId}" not found for enrichment simulation`);
  }

  // Apply simulated rich fields
  target.how_it_works = simulatedFields.how_it_works || 'Simulated comprehensive step-by-step workflow for testing dynamic backlog reconciliation.';
  target.feature_groups = simulatedFields.feature_groups || [
    { group: 'Core Engine', items: ['Simulated item 1', 'Simulated item 2'] },
    { group: 'API & Integrations', items: ['Simulated API 1', 'Simulated API 2'] }
  ];
  target.pros = simulatedFields.pros || ['Simulated advantage 1', 'Simulated advantage 2'];
  target.cons = simulatedFields.cons || ['Simulated limitation 1', 'Simulated limitation 2'];
  target.pricing_overview = simulatedFields.pricing_overview || '<p>Simulated transparent pricing breakdown $20/month.</p>';

  const baselineResult = reconcileBacklog({ root, toolsData: originalTools, writeManifest: false, verbose: false });
  const simulatedResult = reconcileBacklog({ root, toolsData: clonedTools, writeManifest: false, verbose: false });

  return {
    baselineCounts: baselineResult.counts,
    simulatedCounts: simulatedResult.counts,
    skeletalDiff: simulatedResult.counts.skeletalV1 - baselineResult.counts.skeletalV1,
    richDiff: simulatedResult.counts.richV1 - baselineResult.counts.richV1,
    totalDiff: simulatedResult.counts.totalTools - baselineResult.counts.totalTools
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
