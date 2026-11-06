#!/usr/bin/env node

/**
 * scripts/enrich/validate-batch.mjs
 *
 * READ-ONLY Dry-Run Batch Validator for WhichAIPick Editorial Enrichment Batches.
 * Enforces the declarative batch contract under WhichAIPick MCD v2.0.
 *
 * Usage:
 *   node scripts/enrich/validate-batch.mjs --batch=<path-to-batch.json> --mode=<new|replay> [--json] [--verbose]
 *
 * Hard Rules:
 *   - Strictly READ-ONLY: Never creates, mutates, or touches any catalogue or production files.
 *   - Explicit validation mode required: 'new' (only skeletal backlog) or 'replay' (historical regression).
 *   - Zero hidden fallback between modes.
 *   - Exit code 0 on valid batch; exit code 1 on any schema, semantic, or eligibility defect.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// ── Canonical Path Constants ──────────────────────────────────────────────
const TOOLS_JSON_PATH = path.join(ROOT, 'data/tools.json');
const BACKLOG_PATH = path.join(ROOT, 'data/content-enrichment-backlog.json');
const EVIDENCE_LEDGER_PATH = path.join(ROOT, 'data/evidence/phase11-evidence-ledger.json');

// ── Approved Enums & Allowed Sets ─────────────────────────────────────────
export const APPROVED_CATEGORIES = Object.freeze([
  'Marketing',
  'Education',
  'Business',
  'Design',
  'Development',
  'Video & Audio',
  'Content Creation',
  'Research',
  'Automation',
  'Productivity'
]);

export const VALID_PRICING_MODELS = Object.freeze(new Set([
  'free', 'freemium', 'paid', 'enterprise', 'unknown'
]));

export const VALID_FREE_ACCESS_TYPES = Object.freeze(new Set([
  'limited_preview', 'none', 'trial_only', 'recurring_service', 'software_only', 'one_time_credits'
]));

export const VALID_CURRENCIES = Object.freeze(new Set([
  'USD', 'EUR', 'GBP', 'AUD', 'CAD'
]));

export const VALID_BILLING_PERIODS = Object.freeze(new Set([
  'month', 'month_billed_annually', 'one_time', 'monthly', 'annual', 'usage', 'free'
]));

export const VALID_PLATFORMS = Object.freeze(new Set([
  'web', 'macos', 'windows', 'linux', 'ios', 'android', 'api', 'cli', 'extension', 'cloud', 'discord'
]));

export const VALID_TARGET_USERS = Object.freeze(new Set([
  'individual', 'team', 'enterprise', 'mixed', 'unknown',
  'developers', 'professionals', 'researchers', 'designers', 'marketers', 'creators'
]));

export const VALID_LICENSE_TYPES = Object.freeze(new Set([
  'unknown', 'open_source', 'mixed', 'source_available', 'proprietary'
]));

export const VALID_DEPLOYMENT_MODES = Object.freeze(new Set([
  'cloud', 'local', 'self_hosted', 'self_hosted_enterprise', 'local_worker'
]));

// ── Prohibited Hype & Placeholder Patterns ────────────────────────────────
export const PROHIBITED_HYPE_PATTERNS = Object.freeze([
  { pattern: /\bgame[- ]changer\b/i, label: 'game changer' },
  { pattern: /\bcrazy\s+powerful\b/i, label: 'crazy powerful' },
  { pattern: /\binsane(?:ly)?\b/i, label: 'insane' },
  { pattern: /\brevolution(?:ary|ize|ising)\b/i, label: 'revolutionary / revolutionize' },
  { pattern: /\bmiracle\b/i, label: 'miracle' },
  { pattern: /\bmind[- ]blowing\b/i, label: 'mind-blowing' },
  { pattern: /\bsupercharge[ds]?\b/i, label: 'supercharge / supercharged' },
  { pattern: /\bkiller\s+feature\b/i, label: 'killer feature' },
  { pattern: /\bworld['’]s\s+best\b/i, label: "world's best" },
  { pattern: /\b#1\s+tool\b/i, label: '#1 tool' },
  { pattern: /\bunrivaled\b/i, label: 'unrivaled' },
  { pattern: /\bunmatched\b/i, label: 'unmatched' }
]);

export const SUSPICIOUS_DUPLICATE_WORDS = Object.freeze([
  'the', 'in', 'with', 'for', 'to', 'and', 'is', 'that', 'tool', 'tier',
  'plan', 'pricing', 'users', 'data', 'model', 'models', 'a', 'an', 'of'
]);

export const PLACEHOLDER_MARKERS = Object.freeze([
  '<!-- how it works section will go here -->',
  '<!-- key features section will go here -->',
  '<!-- strengths & limitations section will go here -->',
  '<!-- pricing section will go here -->',
  'lorem ipsum',
  'todo',
  'tbd',
  '[insert'
]);

// ── Permitted Field Sets ──────────────────────────────────────────────────
export const TOP_LEVEL_REQUIRED_KEYS = Object.freeze([
  'batchId', 'researchDate', 'targetToolIds', 'tools'
]);

export const TOP_LEVEL_OPTIONAL_KEYS = Object.freeze([
  '$schema', 'description', 'mode', 'evidence'
]);

export const TOOL_PAYLOAD_REQUIRED_KEYS = Object.freeze([
  'shortDescription',
  'long_description',
  'sourceSummary',
  'how_it_works',
  'feature_groups',
  'bestFor',
  'notIdealFor',
  'workflows',
  'pros',
  'cons',
  'pricing_overview',
  'comparison_summary',
  'pricingModel',
  'hasFreeTier',
  'hasFreeTrial',
  'freeAccessType',
  'startingPrice',
  'priceCurrency',
  'billingPeriod',
  'startingPlan',
  'trialDays',
  'apiAvailable',
  'platforms',
  'verificationSources',
  'evidence'
]);

export const TOOL_PAYLOAD_OPTIONAL_KEYS = Object.freeze([
  'freeTierScope',
  'pricingScope',
  'targetUsers',
  'licenseType',
  'licenseName',
  'openSource',
  'selfHosted',
  'deploymentModes',
  'pricingNeedsReview',
  'contentReviewRequired',
  'unresolvedDiscrepancy',
  'evidenceIds'
]);

export const NULLABLE_KEYS = Object.freeze(new Set([
  'startingPrice',
  'priceCurrency',
  'billingPeriod',
  'startingPlan',
  'trialDays',
  'hasFreeTrial',
  'apiAvailable',
  'freeTierScope',
  'pricingScope',
  'targetUsers',
  'licenseType',
  'licenseName',
  'openSource',
  'selfHosted',
  'deploymentModes',
  'pricingNeedsReview',
  'contentReviewRequired',
  'unresolvedDiscrepancy',
  'evidenceIds'
]));

// ── Validation Helpers ────────────────────────────────────────────────────

/**
 * Validates editorial transparency disclosure in sourceSummary.
 * Evaluates semantic disclosure criteria without hardcoding rigid natural-language strings:
 *   1. Length bounded (50 to 600 characters).
 *   2. Evaluation basis: identifies official documentation, research, or published source data.
 *   3. Review timeframe: includes review year (e.g. 2026) or ISO date.
 *   4. Scope boundary: explicit testing disclaimer (e.g. no firsthand testing, vendor-reported limits, etc.).
 *   5. Free of hype and placeholders.
 */
export function validateEditorialDisclosure(text, toolId) {
  const issues = [];
  if (typeof text !== 'string') {
    return [{ code: 'DISCLOSURE_INVALID_TYPE', message: `Tool "${toolId}" sourceSummary must be a string.` }];
  }

  const trimmed = text.trim();
  if (trimmed.length < 50 || trimmed.length > 600) {
    issues.push({
      code: 'DISCLOSURE_INVALID_LENGTH',
      message: `Tool "${toolId}" sourceSummary length must be between 50 and 600 chars (got ${trimmed.length}).`
    });
  }

  // 1. Provenance basis: official/vendor documentation or published/research basis
  if (!/(?:research|review|official|published|documentation|vendor)/i.test(trimmed)) {
    issues.push({
      code: 'DISCLOSURE_MISSING_BASIS',
      message: `Tool "${toolId}" sourceSummary lacks clear research or official-source evaluation basis.`
    });
  }

  // 2. Review timeframe: year 202x or date reference
  if (!/(?:202\d)/.test(trimmed)) {
    issues.push({
      code: 'DISCLOSURE_MISSING_DATE',
      message: `Tool "${toolId}" sourceSummary lacks review year or date reference (e.g. 2026).`
    });
  }

  // 3. Disclaimer / scope boundary
  const hasBoundary = /(?:no (?:firsthand|independent|guaranteed|claims? of|tested)|vendor-(?:reported|published)|published (?:rates|limits|specifications|capabilities|information)|without claiming|require rechecking)/i.test(trimmed);
  if (!hasBoundary) {
    issues.push({
      code: 'DISCLOSURE_MISSING_BOUNDARY',
      message: `Tool "${toolId}" sourceSummary lacks explicit disclosure boundary (e.g. "no firsthand testing claimed" or "vendor-reported").`
    });
  }

  return issues;
}

/**
 * Validates pricing semantic coherence (adapted from editorial-quality-guard.mjs).
 */
export function validatePricingSemantics(tool) {
  const issues = [];
  const id = tool.id;
  const pricingHtml = tool.pricing_overview || '';
  const allText = `${tool.long_description || ''} ${pricingHtml} ${tool.sourceSummary || ''}`;

  // Check 1: hasFreeTier=false contradictions
  if (tool.hasFreeTier === false) {
    if (tool.freeAccessType === 'recurring_service') {
      issues.push({
        code: 'PRICING_CONTRADICTORY_FREE_ACCESS',
        message: `Tool "${id}" has hasFreeTier=false but freeAccessType="recurring_service".`
      });
    }

    const affirmativeFreeMatch = allText.match(/(?:offers|includes|features|has|provides)\s+(?:a\s+)?(?:permanent\s+)?free\s+(?:plan|tier)/i);
    if (affirmativeFreeMatch) {
      const idx = affirmativeFreeMatch.index;
      const prefix = allText.slice(Math.max(0, idx - 15), idx).toLowerCase();
      if (!/(?:no|not|without|never)\s+$/.test(prefix)) {
        issues.push({
          code: 'PRICING_CONTRADICTORY_FREE_TIER',
          message: `Tool "${id}" has hasFreeTier=false but editorial copy affirmatively mentions a free plan/tier.`
        });
      }
    }
  }

  // Check 2: hasFreeTier=true contradictions
  if (tool.hasFreeTier === true) {
    if (/\b(?:no free plan|no free tier|paid only|requires a paid subscription to use at all)\b/i.test(allText)) {
      issues.push({
        code: 'PRICING_CONTRADICTORY_PAID_ONLY',
        message: `Tool "${id}" has hasFreeTier=true but editorial copy mentions "no free plan" or "paid only".`
      });
    }
  }

  // Check 3: Free trial confused with permanent free
  if (tool.hasFreeTrial === true && tool.hasFreeTier === false) {
    if (/\b(?:free forever|forever free)\b/i.test(allText)) {
      issues.push({
        code: 'PRICING_TRIAL_CONFUSED_WITH_FREE',
        message: `Tool "${id}" is a paid tool with trial only, but mentions "free forever".`
      });
    }
  }

  // Check 4: Bare price check
  const priceRegex = /\$(\d+(?:\.\d{1,4})?)/g;
  let match;
  while ((match = priceRegex.exec(pricingHtml)) !== null) {
    const fullPrice = match[0];
    const num = parseFloat(match[1]);
    if (num === 0) continue;

    const idx = match.index;
    const prefix = pricingHtml.slice(Math.max(0, idx - 40), idx);
    const sentencePrefix = pricingHtml.slice(Math.max(0, idx - 120), idx);
    const suffix = pricingHtml.slice(idx + fullPrice.length, Math.min(pricingHtml.length, idx + fullPrice.length + 50));
    const windowText = `${prefix} ${fullPrice} ${suffix}`;

    const hasValidContext = /(?:\/|\bper\s+(?:(?:connected|transfer|active)\s+)?|\bfor\s+)(?:mo|month|yr|year|hour|hr|min|minute|sec|second|credit|token|generation|image|page|seat|user|license|styles?|vector)|\bper\s+[\d,]+\s+units?\b|\b(?:billed|annually|monthly|subscription|one-time|pack|bundle|credits?\b|hours?\b|tokens?\b|generations?\b|licenses?\b|years?\b)|^\s*(?:Managed\s+Agents\s+|agent\s+|spending\s+|credit\s+|monthly\s+){1,3}allowance\b|[–\-\+]/i.test(suffix) ||
      /(?:\d+\s+(?:hours?|credits?|tokens?|generations?|images?|pages?|minutes?|licenses?)\s+(?:for|at)\s+|(?:starts?|starts?\s+around|starting\s+at|ranging\s+from|from|to|roughly|approx(?:imately)?)\s+)$/i.test(prefix) ||
      (/\b(?:monthly|annual|yearly)\s+prices?\s+of\b(?:[^.;]|\.(?=\d))*$/i.test(sentencePrefix) && /^\s*(?:<\/strong>)?\s*for\s+[A-Z]/i.test(suffix));

    if (!hasValidContext) {
      issues.push({
        code: 'PRICING_AMBIGUOUS_BILLING_PERIOD',
        message: `Tool "${id}" pricing overview contains bare price "${fullPrice}" without clear billing frequency or unit in context: "${windowText.trim()}".`
      });
    }
  }

  // Check 5: Annual-equivalent consistency
  const plainSentences = pricingHtml.replace(/<[^>]+>/g, ' ').split(/(?<!\d)\.(?!\d)|;/);
  for (const sentence of plainSentences) {
    const monthlyEquivalents = [...sentence.matchAll(/\$(\d+(?:\.\d{1,2})?)\s*(?:\/\s*mo(?:nth)?|per\s+month)\s*,?\s*billed\s+(?:yearly|annually)/gi)];
    const yearlyTotals = [...sentence.matchAll(/\$(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/\s*(?:yr|year)\b|per\s+year\b)/gi)];
    if (monthlyEquivalents.length === 1 && yearlyTotals.length === 1) {
      const monthly = parseFloat(monthlyEquivalents[0][1]);
      const yearly = parseFloat(yearlyTotals[0][1].replace(/,/g, ''));
      if (Math.abs(yearly / 12 - monthly) > 0.05) {
        issues.push({
          code: 'PRICING_INCONSISTENT_ANNUAL_EQUIVALENT',
          message: `Tool "${id}" pairs "$${monthlyEquivalents[0][1]}/month billed yearly" with "$${yearlyTotals[0][1]}" yearly (≈ $${(yearly / 12).toFixed(2)}/month).`
        });
      }
    }
  }

  // Check 6: Starting price requires currency and billing frequency
  if (typeof tool.startingPrice === 'number' && tool.startingPrice > 0) {
    if (!tool.priceCurrency || !VALID_CURRENCIES.has(tool.priceCurrency)) {
      issues.push({
        code: 'PRICING_MISSING_CURRENCY',
        message: `Tool "${id}" has startingPrice=${tool.startingPrice} but invalid or missing priceCurrency="${tool.priceCurrency}".`
      });
    }
    if (!tool.billingPeriod || !VALID_BILLING_PERIODS.has(tool.billingPeriod)) {
      issues.push({
        code: 'PRICING_MISSING_BILLING_PERIOD',
        message: `Tool "${id}" has startingPrice=${tool.startingPrice} but invalid or missing billingPeriod="${tool.billingPeriod}".`
      });
    }
  }

  return issues;
}

/**
 * Validates text fields against prohibited hype and placeholder markers.
 */
export function validateHypeAndPlaceholders(text, fieldName, toolId) {
  const issues = [];
  if (!text || typeof text !== 'string') return issues;

  // Hype check
  for (const { pattern, label } of PROHIBITED_HYPE_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        code: 'TEXT_PROHIBITED_HYPE',
        message: `Tool "${toolId}" contains prohibited hype phrase "${label}" in ${fieldName}.`
      });
    }
  }

  // Placeholder check
  const lower = text.toLowerCase();
  for (const marker of PLACEHOLDER_MARKERS) {
    if (lower.includes(marker.toLowerCase())) {
      issues.push({
        code: 'TEXT_PLACEHOLDER_MARKER',
        message: `Tool "${toolId}" contains unfinished placeholder "${marker}" in ${fieldName}.`
      });
    }
  }

  // Duplicate words check
  const clean = text.replace(/<[^>]+>/g, ' ');
  for (const word of SUSPICIOUS_DUPLICATE_WORDS) {
    const dupRegex = new RegExp(`\\b${word}\\s+${word}\\b`, 'i');
    if (dupRegex.test(clean)) {
      issues.push({
        code: 'TEXT_DUPLICATE_WORD',
        message: `Tool "${toolId}" contains duplicate word "${word} ${word}" in ${fieldName}.`
      });
    }
  }

  // Entity leak check
  if (/&amp;amp;|&amp;lt;|&amp;gt;|&amp;#39;/i.test(text)) {
    issues.push({
      code: 'TEXT_RAW_ENTITY_LEAK',
      message: `Tool "${toolId}" contains double-encoded HTML entity in ${fieldName}.`
    });
  }

  return issues;
}

// ── Master Dry-Run Validator ──────────────────────────────────────────────

/**
 * Validates a declarative batch payload against WhichAIPick standards.
 *
 * @param {object} payload - Parsed JSON batch payload
 * @param {object} options
 * @param {string} options.mode - 'new' or 'replay'
 * @param {string} [options.batchFilePath] - Optional path for reporting
 * @param {Array} [options.toolsCatalog] - Array of all 882 tools (defaults to data/tools.json)
 * @param {object} [options.backlogManifest] - Parsed backlog manifest (defaults to data/content-enrichment-backlog.json)
 * @returns {object} { isValid: boolean, errorCount: number, warningCount: number, issues: Array, summary: object }
 */
export function validateBatch(payload, options = {}) {
  const issues = [];
  const warnings = [];

  // 1. Mode Validation (Strict, no fallback)
  const mode = options.mode || payload.mode;
  if (!mode || (mode !== 'new' && mode !== 'replay')) {
    issues.push({
      code: 'MODE_INVALID',
      message: `Validation mode must be explicitly specified as either "new" or "replay" (received: ${JSON.stringify(mode)}).`
    });
    return {
      isValid: false,
      errorCount: issues.length,
      warningCount: 0,
      issues,
      warnings,
      summary: { totalTools: 0, mode: mode || 'UNSPECIFIED' }
    };
  }

  // 2. Load Reference Data
  let toolsCatalog = options.toolsCatalog;
  if (!toolsCatalog) {
    if (!fs.existsSync(TOOLS_JSON_PATH)) {
      throw new Error(`[VALIDATOR FATAL] Catalogue not found at ${TOOLS_JSON_PATH}`);
    }
    toolsCatalog = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf8'));
  }
  const catalogMap = new Map(toolsCatalog.map(t => [t.id, t]));

  let backlogManifest = options.backlogManifest;
  if (!backlogManifest) {
    if (!fs.existsSync(BACKLOG_PATH)) {
      throw new Error(`[VALIDATOR FATAL] Backlog manifest not found at ${BACKLOG_PATH}`);
    }
    backlogManifest = JSON.parse(fs.readFileSync(BACKLOG_PATH, 'utf8'));
  }

  const skeletalSet = new Set(backlogManifest.skeletalBacklogToolIds || []);
  const canarySet = new Set(backlogManifest.v2ToolIds || []);
  const ineligibleSet = new Set(backlogManifest.ineligibleToolIds || []);

  // 3. Top-Level Batch Payload Structure
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    issues.push({ code: 'PAYLOAD_NOT_OBJECT', message: 'Batch payload root must be a JSON object.' });
    return { isValid: false, errorCount: issues.length, warningCount: 0, issues, warnings, summary: { totalTools: 0, mode } };
  }

  // Check unknown top-level keys
  const allowedTopKeys = new Set([...TOP_LEVEL_REQUIRED_KEYS, ...TOP_LEVEL_OPTIONAL_KEYS]);
  for (const k of Object.keys(payload)) {
    if (!allowedTopKeys.has(k)) {
      issues.push({ code: 'TOP_LEVEL_UNKNOWN_KEY', message: `Unknown property at root: "${k}".` });
    }
  }

  // Required top-level keys
  for (const reqKey of TOP_LEVEL_REQUIRED_KEYS) {
    if (payload[reqKey] === undefined || payload[reqKey] === null) {
      issues.push({ code: 'TOP_LEVEL_MISSING_KEY', message: `Missing required root property: "${reqKey}".` });
    }
  }

  // Validate batchId
  if (payload.batchId && (typeof payload.batchId !== 'string' || !/^batch-[a-z0-9-]+$/.test(payload.batchId))) {
    issues.push({ code: 'BATCH_ID_INVALID', message: `batchId must match format "^batch-[a-z0-9-]+$" (got "${payload.batchId}").` });
  }

  // Validate researchDate
  if (payload.researchDate && (typeof payload.researchDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.researchDate))) {
    issues.push({ code: 'RESEARCH_DATE_INVALID', message: `researchDate must be ISO "YYYY-MM-DD" format (got "${payload.researchDate}").` });
  }

  // Validate targetToolIds
  const targetIds = payload.targetToolIds;
  if (!Array.isArray(targetIds)) {
    issues.push({ code: 'TARGET_IDS_NOT_ARRAY', message: 'targetToolIds must be an array of tool ID strings.' });
    return { isValid: false, errorCount: issues.length, warningCount: 0, issues, warnings, summary: { totalTools: 0, mode } };
  }

  // Batch cohort size: 1 to 20 tools
  if (targetIds.length < 1 || targetIds.length > 20) {
    issues.push({
      code: 'BATCH_SIZE_OUT_OF_BOUNDS',
      message: `Batch cohort size must be between 1 and 20 tools (received ${targetIds.length} tools).`
    });
  }

  // Check duplicate target IDs
  const seenTargets = new Set();
  for (const id of targetIds) {
    if (typeof id !== 'string') {
      issues.push({ code: 'TARGET_ID_NOT_STRING', message: `Tool ID must be a string, got ${typeof id}.` });
      continue;
    }
    if (seenTargets.has(id)) {
      issues.push({ code: 'TARGET_ID_DUPLICATE', message: `Duplicate tool ID in targetToolIds: "${id}".` });
    }
    seenTargets.add(id);
  }

  // Tools object validation
  const toolsObj = payload.tools;
  if (!toolsObj || typeof toolsObj !== 'object' || Array.isArray(toolsObj)) {
    issues.push({ code: 'TOOLS_NOT_OBJECT', message: 'Root "tools" property must be a dictionary object keyed by tool ID.' });
    return { isValid: false, errorCount: issues.length, warningCount: 0, issues, warnings, summary: { totalTools: targetIds.length, mode } };
  }

  const payloadToolKeys = Object.keys(toolsObj);
  for (const id of targetIds) {
    if (!toolsObj[id]) {
      issues.push({ code: 'TARGET_TOOL_MISSING_PAYLOAD', message: `Target tool "${id}" is listed in targetToolIds but missing from tools object.` });
    }
  }
  for (const id of payloadToolKeys) {
    if (!seenTargets.has(id)) {
      issues.push({ code: 'EXTRA_TOOL_IN_PAYLOAD', message: `Tool "${id}" exists in tools object but is not declared in targetToolIds.` });
    }
  }

  // 4. Per-Tool Verification
  const allowedToolKeys = new Set([...TOOL_PAYLOAD_REQUIRED_KEYS, ...TOOL_PAYLOAD_OPTIONAL_KEYS]);
  const seenEvidenceIds = new Map();

  for (const id of targetIds) {
    const tool = toolsObj[id];
    if (!tool || typeof tool !== 'object') continue;

    // A. Catalogue Existence & Eligibility
    const catRecord = catalogMap.get(id);
    if (!catRecord) {
      issues.push({ code: 'TOOL_NOT_IN_CATALOGUE', message: `Tool "${id}" does not exist in data/tools.json.` });
      continue;
    }

    if (catRecord.recommendationEligible === false || catRecord.directoryEligible === false) {
      issues.push({
        code: 'TOOL_INELIGIBLE',
        message: `Tool "${id}" is ineligible (recommendationEligible=${catRecord.recommendationEligible}, directoryEligible=${catRecord.directoryEligible}).`
      });
    }

    // B. Mode-Specific Eligibility
    if (mode === 'new') {
      if (canarySet.has(id)) {
        issues.push({
          code: 'TARGET_IS_CANARY_V2',
          message: `Tool "${id}" is a V2 Canary tool and cannot be targeted for V1 enrichment in mode=new.`
        });
      }
      if (ineligibleSet.has(id)) {
        issues.push({
          code: 'TARGET_IS_INELIGIBLE',
          message: `Tool "${id}" is classified as Ineligible/Deprecated and cannot be enriched.`
        });
      }
      if (!skeletalSet.has(id)) {
        issues.push({
          code: 'TARGET_NOT_SKELETAL_V1',
          message: `Tool "${id}" is not in skeletalBacklogToolIds. Only un-enriched Skeletal V1 tools may be enriched in mode=new.`
        });
      }
    } else if (mode === 'replay') {
      // Replay mode: target must not be ineligible
      if (ineligibleSet.has(id)) {
        issues.push({
          code: 'REPLAY_TARGET_INELIGIBLE',
          message: `Tool "${id}" is deprecated/ineligible in catalogue.`
        });
      }
    }

    // C. Key Integrity (Reject Unknown Fields)
    for (const key of Object.keys(tool)) {
      if (!allowedToolKeys.has(key)) {
        issues.push({
          code: 'TOOL_UNKNOWN_KEY',
          message: `Tool "${id}" contains unauthorized property "${key}".`
        });
      }
    }

    // Required fields check
    for (const reqKey of TOOL_PAYLOAD_REQUIRED_KEYS) {
      if (tool[reqKey] === undefined) {
        issues.push({
          code: 'TOOL_MISSING_REQUIRED_KEY',
          message: `Tool "${id}" is missing required property "${reqKey}".`
        });
      } else if (tool[reqKey] === null && !NULLABLE_KEYS.has(reqKey)) {
        issues.push({
          code: 'TOOL_NULL_NOT_ALLOWED',
          message: `Tool "${id}" property "${reqKey}" cannot be null.`
        });
      }
    }

    // D. Core String Lengths
    if (typeof tool.shortDescription === 'string') {
      const len = tool.shortDescription.trim().length;
      if (len < 30 || len > 250) {
        issues.push({ code: 'SHORT_DESCRIPTION_LENGTH', message: `Tool "${id}" shortDescription length must be 30-250 chars (got ${len}).` });
      }
      issues.push(...validateHypeAndPlaceholders(tool.shortDescription, 'shortDescription', id));
    }
    if (typeof tool.long_description === 'string') {
      const len = tool.long_description.trim().length;
      if (len < 60 || len > 2000) {
        issues.push({ code: 'LONG_DESCRIPTION_LENGTH', message: `Tool "${id}" long_description length must be 60-2000 chars (got ${len}).` });
      }
      issues.push(...validateHypeAndPlaceholders(tool.long_description, 'long_description', id));
    }

    // E. Editorial Transparency Disclosure
    if (tool.sourceSummary !== undefined) {
      issues.push(...validateEditorialDisclosure(tool.sourceSummary, id));
      issues.push(...validateHypeAndPlaceholders(tool.sourceSummary, 'sourceSummary', id));
    }

    // F. HTML Editorial Sections
    if (typeof tool.how_it_works === 'string') {
      const len = tool.how_it_works.trim().length;
      if (len < 60) {
        issues.push({ code: 'HOW_IT_WORKS_TOO_SHORT', message: `Tool "${id}" how_it_works must be >= 60 chars (got ${len}).` });
      }
      issues.push(...validateHypeAndPlaceholders(tool.how_it_works, 'how_it_works', id));
    }
    if (typeof tool.pricing_overview === 'string') {
      const len = tool.pricing_overview.trim().length;
      if (len < 40) {
        issues.push({ code: 'PRICING_OVERVIEW_TOO_SHORT', message: `Tool "${id}" pricing_overview must be >= 40 chars (got ${len}).` });
      }
      issues.push(...validateHypeAndPlaceholders(tool.pricing_overview, 'pricing_overview', id));
    }
    if (typeof tool.comparison_summary === 'string') {
      const len = tool.comparison_summary.trim().length;
      if (len < 40) {
        issues.push({ code: 'COMPARISON_SUMMARY_TOO_SHORT', message: `Tool "${id}" comparison_summary must be >= 40 chars (got ${len}).` });
      }
      issues.push(...validateHypeAndPlaceholders(tool.comparison_summary, 'comparison_summary', id));
    }

    // G. Feature Groups Schema (Exact Structure: 3 groups, each with group title and >=3 items)
    if (Array.isArray(tool.feature_groups)) {
      if (tool.feature_groups.length !== 3) {
        issues.push({
          code: 'FEATURE_GROUPS_COUNT',
          message: `Tool "${id}" feature_groups must contain exactly 3 groups (got ${tool.feature_groups.length}).`
        });
      }
      tool.feature_groups.forEach((fg, idx) => {
        if (!fg || typeof fg !== 'object') {
          issues.push({ code: 'FEATURE_GROUP_NOT_OBJECT', message: `Tool "${id}" feature_groups[${idx}] must be an object.` });
          return;
        }
        if (!fg.group || typeof fg.group !== 'string' || fg.group.trim().length < 3) {
          issues.push({ code: 'FEATURE_GROUP_INVALID_TITLE', message: `Tool "${id}" feature_groups[${idx}] lacks a valid "group" title.` });
        }
        if (!Array.isArray(fg.items) || fg.items.length < 3) {
          issues.push({ code: 'FEATURE_GROUP_INSUFFICIENT_ITEMS', message: `Tool "${id}" feature_groups[${idx}] items must be an array of >= 3 strings.` });
        } else {
          fg.items.forEach((item, itemIdx) => {
            if (typeof item !== 'string' || item.trim().length < 5) {
              issues.push({ code: 'FEATURE_ITEM_TOO_SHORT', message: `Tool "${id}" feature_groups[${idx}].items[${itemIdx}] must be string >= 5 chars.` });
            }
            issues.push(...validateHypeAndPlaceholders(item, `feature_groups[${idx}].items[${itemIdx}]`, id));
          });
        }
      });
    }

    // H. Workflows Schema (Exact Structure: 3 workflows, title + description)
    if (Array.isArray(tool.workflows)) {
      if (tool.workflows.length !== 3) {
        issues.push({
          code: 'WORKFLOWS_COUNT',
          message: `Tool "${id}" workflows must contain exactly 3 workflows (got ${tool.workflows.length}).`
        });
      }
      tool.workflows.forEach((wf, idx) => {
        if (!wf || typeof wf !== 'object') {
          issues.push({ code: 'WORKFLOW_NOT_OBJECT', message: `Tool "${id}" workflows[${idx}] must be an object.` });
          return;
        }
        if (!wf.title || typeof wf.title !== 'string' || wf.title.trim().length < 3) {
          issues.push({ code: 'WORKFLOW_INVALID_TITLE', message: `Tool "${id}" workflows[${idx}] lacks valid "title".` });
        }
        if (!wf.description || typeof wf.description !== 'string' || wf.description.trim().length < 20) {
          issues.push({ code: 'WORKFLOW_INVALID_DESCRIPTION', message: `Tool "${id}" workflows[${idx}] lacks substantive "description" (>= 20 chars).` });
        }
        issues.push(...validateHypeAndPlaceholders(wf.title, `workflows[${idx}].title`, id));
        issues.push(...validateHypeAndPlaceholders(wf.description, `workflows[${idx}].description`, id));
      });
    }

    // I. Best For & Not Ideal For (Exact count: 3 items each)
    if (Array.isArray(tool.bestFor)) {
      if (tool.bestFor.length !== 3) {
        issues.push({ code: 'BEST_FOR_COUNT', message: `Tool "${id}" bestFor must contain exactly 3 items (got ${tool.bestFor.length}).` });
      }
      tool.bestFor.forEach((bf, idx) => {
        if (typeof bf !== 'string' || bf.trim().length < 15) {
          issues.push({ code: 'BEST_FOR_ITEM_TOO_SHORT', message: `Tool "${id}" bestFor[${idx}] must be string >= 15 chars.` });
        }
        issues.push(...validateHypeAndPlaceholders(bf, `bestFor[${idx}]`, id));
      });
    }
    if (Array.isArray(tool.notIdealFor)) {
      if (tool.notIdealFor.length !== 3) {
        issues.push({ code: 'NOT_IDEAL_FOR_COUNT', message: `Tool "${id}" notIdealFor must contain exactly 3 items (got ${tool.notIdealFor.length}).` });
      }
      tool.notIdealFor.forEach((nif, idx) => {
        if (typeof nif !== 'string' || nif.trim().length < 15) {
          issues.push({ code: 'NOT_IDEAL_FOR_ITEM_TOO_SHORT', message: `Tool "${id}" notIdealFor[${idx}] must be string >= 15 chars.` });
        }
        issues.push(...validateHypeAndPlaceholders(nif, `notIdealFor[${idx}]`, id));
      });
    }

    // J. Pros & Cons (Exact count: 4 items each)
    if (Array.isArray(tool.pros)) {
      if (tool.pros.length !== 4) {
        issues.push({ code: 'PROS_COUNT', message: `Tool "${id}" pros must contain exactly 4 items (got ${tool.pros.length}).` });
      }
      tool.pros.forEach((p, idx) => {
        if (typeof p !== 'string' || p.trim().length < 10) {
          issues.push({ code: 'PROS_ITEM_TOO_SHORT', message: `Tool "${id}" pros[${idx}] must be string >= 10 chars.` });
        }
        issues.push(...validateHypeAndPlaceholders(p, `pros[${idx}]`, id));
      });
    }
    if (Array.isArray(tool.cons)) {
      if (tool.cons.length !== 4) {
        issues.push({ code: 'CONS_COUNT', message: `Tool "${id}" cons must contain exactly 4 items (got ${tool.cons.length}).` });
      }
      tool.cons.forEach((c, idx) => {
        if (typeof c !== 'string' || c.trim().length < 10) {
          issues.push({ code: 'CONS_ITEM_TOO_SHORT', message: `Tool "${id}" cons[${idx}] must be string >= 10 chars.` });
        }
        issues.push(...validateHypeAndPlaceholders(c, `cons[${idx}]`, id));
      });
    }

    // K. Commercial Enums & Booleans
    if (tool.pricingModel && !VALID_PRICING_MODELS.has(tool.pricingModel)) {
      issues.push({ code: 'ENUM_INVALID_PRICING_MODEL', message: `Tool "${id}" has invalid pricingModel="${tool.pricingModel}".` });
    }
    if (typeof tool.hasFreeTier !== 'boolean') {
      issues.push({ code: 'TYPE_INVALID_HAS_FREE_TIER', message: `Tool "${id}" hasFreeTier must be a boolean.` });
    }
    if (tool.hasFreeTrial !== null && typeof tool.hasFreeTrial !== 'boolean') {
      issues.push({ code: 'TYPE_INVALID_HAS_FREE_TRIAL', message: `Tool "${id}" hasFreeTrial must be boolean or null.` });
    }
    if (tool.freeAccessType && !VALID_FREE_ACCESS_TYPES.has(tool.freeAccessType)) {
      issues.push({ code: 'ENUM_INVALID_FREE_ACCESS_TYPE', message: `Tool "${id}" has invalid freeAccessType="${tool.freeAccessType}".` });
    }
    if (tool.priceCurrency !== null && tool.priceCurrency !== undefined && !VALID_CURRENCIES.has(tool.priceCurrency)) {
      issues.push({ code: 'ENUM_INVALID_CURRENCY', message: `Tool "${id}" has unsupported priceCurrency="${tool.priceCurrency}".` });
    }
    if (tool.billingPeriod !== null && tool.billingPeriod !== undefined && !VALID_BILLING_PERIODS.has(tool.billingPeriod)) {
      issues.push({ code: 'ENUM_INVALID_BILLING_PERIOD', message: `Tool "${id}" has invalid billingPeriod="${tool.billingPeriod}".` });
    }
    if (tool.startingPrice !== null && tool.startingPrice !== undefined && typeof tool.startingPrice !== 'number') {
      issues.push({ code: 'TYPE_INVALID_STARTING_PRICE', message: `Tool "${id}" startingPrice must be a number or null.` });
    }
    if (tool.trialDays !== null && tool.trialDays !== undefined && (!Number.isInteger(tool.trialDays) || tool.trialDays < 0)) {
      issues.push({ code: 'TYPE_INVALID_TRIAL_DAYS', message: `Tool "${id}" trialDays must be a non-negative integer or null.` });
    }
    if (tool.apiAvailable !== null && tool.apiAvailable !== undefined && typeof tool.apiAvailable !== 'boolean') {
      issues.push({ code: 'TYPE_INVALID_API_AVAILABLE', message: `Tool "${id}" apiAvailable must be boolean or null.` });
    }

    // Platforms
    if (!Array.isArray(tool.platforms) || tool.platforms.length === 0) {
      issues.push({ code: 'PLATFORMS_INVALID', message: `Tool "${id}" platforms must be a non-empty array.` });
    } else {
      for (const p of tool.platforms) {
        if (!VALID_PLATFORMS.has(p)) {
          issues.push({ code: 'ENUM_INVALID_PLATFORM', message: `Tool "${id}" has invalid platform token "${p}".` });
        }
      }
    }

    // Target users (optional)
    if (tool.targetUsers && !VALID_TARGET_USERS.has(tool.targetUsers)) {
      issues.push({ code: 'ENUM_INVALID_TARGET_USERS', message: `Tool "${id}" has invalid targetUsers="${tool.targetUsers}".` });
    }

    // License type (optional)
    if (tool.licenseType !== null && tool.licenseType !== undefined && !VALID_LICENSE_TYPES.has(tool.licenseType)) {
      issues.push({ code: 'ENUM_INVALID_LICENSE_TYPE', message: `Tool "${id}" has invalid licenseType="${tool.licenseType}".` });
    }

    // Deployment modes (optional)
    if (tool.deploymentModes) {
      if (!Array.isArray(tool.deploymentModes)) {
        issues.push({ code: 'TYPE_INVALID_DEPLOYMENT_MODES', message: `Tool "${id}" deploymentModes must be an array.` });
      } else {
        for (const dm of tool.deploymentModes) {
          if (!VALID_DEPLOYMENT_MODES.has(dm)) {
            issues.push({ code: 'ENUM_INVALID_DEPLOYMENT_MODE', message: `Tool "${id}" has invalid deploymentMode token "${dm}".` });
          }
        }
      }
    }

    // L. Pricing Semantics & Arithmetic Consistency
    const pricingIssues = validatePricingSemantics(tool);
    issues.push(...pricingIssues);

    // M. Verification Sources & Evidence Structure
    if (!Array.isArray(tool.verificationSources) || tool.verificationSources.length === 0) {
      issues.push({ code: 'SOURCES_EMPTY', message: `Tool "${id}" must contain at least 1 verification source URL.` });
    } else {
      for (const url of tool.verificationSources) {
        if (typeof url !== 'string' || !url.startsWith('http')) {
          issues.push({ code: 'SOURCES_INVALID_URL', message: `Tool "${id}" verification source "${url}" must be valid HTTP/HTTPS URL.` });
        }
      }
    }

    // Evidence records validation
    if (!Array.isArray(tool.evidence) || tool.evidence.length === 0) {
      issues.push({ code: 'EVIDENCE_EMPTY', message: `Tool "${id}" must provide at least 1 official evidence record.` });
    } else {
      tool.evidence.forEach((ev, evIdx) => {
        if (!ev || typeof ev !== 'object') {
          issues.push({ code: 'EVIDENCE_NOT_OBJECT', message: `Tool "${id}" evidence[${evIdx}] must be an object.` });
          return;
        }
        if (!ev.evidenceId || !/^E\d{4}$/.test(ev.evidenceId)) {
          issues.push({ code: 'EVIDENCE_ID_INVALID', message: `Tool "${id}" evidence[${evIdx}] evidenceId must match "^E\\d{4}$" (got "${ev.evidenceId}").` });
        } else if (seenEvidenceIds.has(ev.evidenceId) && seenEvidenceIds.get(ev.evidenceId) !== id) {
          issues.push({
            code: 'EVIDENCE_ID_DUPLICATE',
            message: `Evidence ID "${ev.evidenceId}" in tool "${id}" is duplicated; already assigned to tool "${seenEvidenceIds.get(ev.evidenceId)}".`
          });
        } else {
          seenEvidenceIds.set(ev.evidenceId, id);
        }
        if (!ev.sourceURL || !ev.sourceURL.startsWith('http')) {
          issues.push({ code: 'EVIDENCE_SOURCE_URL_INVALID', message: `Tool "${id}" evidence[${evIdx}] sourceURL must be valid HTTP/HTTPS URL.` });
        }
        if (ev.method !== 'official_source_review') {
          issues.push({ code: 'EVIDENCE_METHOD_INVALID', message: `Tool "${id}" evidence[${evIdx}] method must be "official_source_review".` });
        }
        if (!ev.reviewedAt || !/^\d{4}-\d{2}-\d{2}$/.test(ev.reviewedAt)) {
          issues.push({ code: 'EVIDENCE_DATE_INVALID', message: `Tool "${id}" evidence[${evIdx}] reviewedAt must be ISO "YYYY-MM-DD" date.` });
        }
        if (!ev.finding || typeof ev.finding !== 'string' || ev.finding.trim().length < 20) {
          issues.push({ code: 'EVIDENCE_FINDING_TOO_SHORT', message: `Tool "${id}" evidence[${evIdx}] finding must be string >= 20 chars.` });
        }
      });
    }

    // N. Unresolved Evidence Flags Gate
    if (tool.pricingNeedsReview === true) {
      issues.push({
        code: 'PRICING_NEEDS_REVIEW_UNRESOLVED',
        message: `Tool "${id}" has pricingNeedsReview=true. Unresolved pricing evidence must be reconciled before batch acceptance.`
      });
    }
    if (tool.contentReviewRequired === true) {
      issues.push({
        code: 'CONTENT_REVIEW_REQUIRED_UNRESOLVED',
        message: `Tool "${id}" has contentReviewRequired=true. Unresolved content review flags must be cleared.`
      });
    }
  }

  return {
    isValid: issues.length === 0,
    errorCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings,
    summary: {
      batchId: payload.batchId,
      mode,
      targetCount: targetIds.length,
      toolsAudited: Object.keys(toolsObj).length
    }
  };
}

// ── CLI Runner ────────────────────────────────────────────────────────────

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    batchPath: null,
    mode: null,
    json: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--batch=')) {
      options.batchPath = arg.slice(8);
    } else if (arg === '--batch' && i + 1 < args.length) {
      options.batchPath = args[++i];
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.slice(7);
    } else if (arg === '--mode' && i + 1 < args.length) {
      options.mode = args[++i];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

export function main() {
  const options = parseCliArgs();

  if (!options.batchPath) {
    console.error('Usage: node scripts/enrich/validate-batch.mjs --batch=<path> --mode=<new|replay> [--json] [--verbose]');
    process.exit(1);
  }

  if (!options.mode || (options.mode !== 'new' && options.mode !== 'replay')) {
    console.error('[ERROR] Validation mode must be explicitly specified as either "--mode=new" or "--mode=replay".');
    process.exit(1);
  }

  const resolvedBatchPath = path.resolve(process.cwd(), options.batchPath);
  if (!fs.existsSync(resolvedBatchPath)) {
    console.error(`[ERROR] Batch file not found: ${resolvedBatchPath}`);
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(resolvedBatchPath, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Failed to parse JSON batch payload: ${err.message}`);
    process.exit(1);
  }

  const result = validateBatch(payload, {
    mode: options.mode,
    batchFilePath: resolvedBatchPath
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.isValid ? 0 : 1);
  }

  // Formatted Console Output
  console.log('======================================================');
  console.log('WHICHAIPICK EDITORIAL BATCH DRY-RUN VALIDATOR');
  console.log(`Directive: WhichAIPick MCD v2.0 | Mode: ${options.mode.toUpperCase()}`);
  console.log('======================================================');
  console.log(`Batch File:   ${path.relative(ROOT, resolvedBatchPath)}`);
  console.log(`Batch ID:     ${payload.batchId || 'UNKNOWN'}`);
  console.log(`Target Tools: ${result.summary.targetCount} tools declared`);
  console.log('------------------------------------------------------');

  if (result.isValid) {
    console.log(`✅ [PASS] Batch payload verified 100% compliant with editorial contract.`);
    console.log(`   Audited ${result.summary.targetCount} tools: schema, enums, workflows, evidence & anti-hype clean.`);
    console.log('======================================================');
    process.exit(0);
  } else {
    console.error(`❌ [FAIL] Batch payload failed validation with ${result.errorCount} error(s):\n`);
    result.issues.forEach((iss, idx) => {
      console.error(`  [${idx + 1}] [${iss.code}] ${iss.message}`);
    });
    console.error('\n======================================================');
    process.exit(1);
  }
}

// Run CLI when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
