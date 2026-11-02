import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export const DEFAULT_MANIFEST_PATH = path.join(ROOT, 'data', 'seo', 'tool-indexing-manifest.json');
export const CANARY_MANIFEST_PATH = path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json');

export const PROTECTED_BRAND_SKELETONS = Object.freeze([
  'ollama',
  'recraft',
  'upscayl',
  'docsbot',
  'macwhisper',
  'sitegpt',
  'novelcrafter'
]);

export const PROTECTED_V2_CANARIES = Object.freeze([
  'akiflow',
  'crawl4ai',
  'mindgrasp'
]);

export const PROTECTED_V2_CANARY_QUALITY_RISKS = Object.freeze({
  akiflow: [
    'Missing feature_groups (core capabilities unexpanded)',
    'Missing pros and cons editorial analysis',
    'Low editorial depth (142 visible words in main)',
    'Missing comparisons section'
  ],
  crawl4ai: [
    'Missing feature_groups (core capabilities unexpanded)',
    'Missing pros and cons editorial analysis',
    'Low editorial depth (142 visible words in main)',
    'Missing comparisons section'
  ],
  mindgrasp: [
    'Missing feature_groups (core capabilities unexpanded)',
    'Missing pros and cons editorial analysis',
    'Low editorial depth (151 visible words in main)',
    'Missing comparisons section'
  ]
});

let _cachedManifest = null;
let _cachedNoindexSet = null;

export function loadIndexingManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  if (_cachedManifest && manifestPath === DEFAULT_MANIFEST_PATH) {
    return _cachedManifest;
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[INDEXING POLICY FATAL] Manifest not found: ${manifestPath}`);
  }
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  
  if (!Array.isArray(manifest.approvedNoindexToolIds)) {
    throw new Error('[INDEXING POLICY FATAL] approvedNoindexToolIds must be an array');
  }
  if (manifest.approvedNoindexToolIds.length !== manifest.expectedNoindexCount) {
    throw new Error(`[INDEXING POLICY FATAL] expectedNoindexCount (${manifest.expectedNoindexCount}) does not match approvedNoindexToolIds length (${manifest.approvedNoindexToolIds.length})`);
  }
  
  _cachedManifest = manifest;
  _cachedNoindexSet = new Set(manifest.approvedNoindexToolIds);
  return manifest;
}

export function isSubstantive(val) {
  if (!val) return false;
  if (typeof val === 'string') return val.trim().length > 30;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return false;
}

/**
 * Classifies a tool dynamically based on MCD v2.0 multi-condition eligibility criteria.
 */
export function classifyToolEligibility(tool, canarySet = null) {
  if (!canarySet && fs.existsSync(CANARY_MANIFEST_PATH)) {
    const canary = JSON.parse(fs.readFileSync(CANARY_MANIFEST_PATH, 'utf8'));
    canarySet = new Set(canary.approvedToolIds);
  }
  const isV2 = canarySet ? canarySet.has(tool.id) : false;

  if (isV2) {
    if (PROTECTED_V2_CANARIES.includes(tool.id)) {
      return {
        id: tool.id,
        isV2: true,
        tier: 'PROTECTED_V2_CANARY',
        indexable: true,
        robots: 'index,follow',
        qualityRisks: PROTECTED_V2_CANARY_QUALITY_RISKS[tool.id] || []
      };
    }
    return {
      id: tool.id,
      isV2: true,
      tier: 'INDEXABLE_V2',
      indexable: true,
      robots: 'index,follow'
    };
  }

  // V1 Editorial Content Evaluation
  const hasHow = isSubstantive(tool.how_it_works);
  const hasFeatures = isSubstantive(tool.feature_groups);
  const hasPros = Array.isArray(tool.pros) && tool.pros.length > 0;
  const hasCons = Array.isArray(tool.cons) && tool.cons.length > 0;
  const hasStrengths = hasPros || hasCons;
  const hasPricing = isSubstantive(tool.pricing_overview);

  if (hasHow || hasFeatures || hasStrengths || hasPricing) {
    return {
      id: tool.id,
      isV2: false,
      tier: 'INDEXABLE_RICH_V1',
      indexable: true,
      robots: 'index,follow'
    };
  }

  // Pure Skeleton Stub
  if (PROTECTED_BRAND_SKELETONS.includes(tool.id)) {
    return {
      id: tool.id,
      isV2: false,
      tier: 'PROTECTED_BRAND_SKELETON',
      indexable: true,
      robots: 'index,follow',
      priorityEnrichmentRequired: true
    };
  }

  return {
    id: tool.id,
    isV2: false,
    tier: 'NOINDEX_LOW_VALUE_STUB',
    indexable: false,
    robots: 'noindex,follow',
    reason: 'Low-value V1 skeleton stub with missing How It Works, Features, Pros/Cons, and Pricing'
  };
}

/**
 * Returns whether a tool is indexable (true) or should receive noindex (false).
 */
export function isToolIndexable(tool) {
  const id = typeof tool === 'string' ? tool : tool.id;
  if (!_cachedNoindexSet) {
    loadIndexingManifest();
  }
  return !_cachedNoindexSet.has(id);
}

/**
 * Returns the meta robots directive for a tool: "index,follow" or "noindex,follow".
 */
export function getToolRobotsDirective(tool) {
  return isToolIndexable(tool) ? 'index,follow' : 'noindex,follow';
}
