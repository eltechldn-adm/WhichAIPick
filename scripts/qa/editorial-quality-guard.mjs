import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const APPROVED_CATEGORIES = Object.freeze([
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

const PROHIBITED_HYPE_PATTERNS = Object.freeze([
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

const SUSPICIOUS_DUPLICATE_WORDS = Object.freeze([
  'the', 'in', 'with', 'for', 'to', 'and', 'is', 'that', 'tool', 'tier',
  'plan', 'pricing', 'users', 'data', 'model', 'models', 'a', 'an', 'of'
]);

const PLACEHOLDER_MARKERS = Object.freeze([
  '<!-- How it Works section will go here -->',
  '<!-- Key Features section will go here -->',
  '<!-- Strengths & Limitations section will go here -->',
  '<!-- Pricing section will go here -->',
  'lorem ipsum',
  'todo',
  'tbd',
  '[insert'
]);

// ── Check A: Tool identity and official URL ──────────────────────────────
export function checkToolIdentityAndURL(tool) {
  const issues = [];
  const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!tool.id || typeof tool.id !== 'string' || !idPattern.test(tool.id)) {
    issues.push({ code: 'A_INVALID_ID', message: `Tool id "${tool.id}" is missing or invalid slug format.` });
  }

  const name = tool.name || tool.canonicalName;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    issues.push({ code: 'A_MISSING_NAME', message: `Tool "${tool.id}" is missing name.` });
  }

  const category = tool.category || tool.primaryCategory;
  if (!category || !APPROVED_CATEGORIES.includes(category)) {
    issues.push({ code: 'A_INVALID_CATEGORY', message: `Tool "${tool.id}" has invalid category "${category}".` });
  }

  const url = tool.website_url;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    issues.push({ code: 'A_INVALID_URL_PROTOCOL', message: `Tool "${tool.id}" website_url must start with http/https.` });
  } else {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname || parsed.hostname.includes('localhost') || parsed.hostname === 'example.com') {
        issues.push({ code: 'A_INVALID_HOSTNAME', message: `Tool "${tool.id}" website_url has invalid hostname "${parsed.hostname}".` });
      }
    } catch {
      issues.push({ code: 'A_MALFORMED_URL', message: `Tool "${tool.id}" website_url cannot be parsed as valid URL.` });
    }
  }

  return issues;
}

// ── Check B: Free tier versus trial semantics ─────────────────────────────
export function checkFreeTierVsTrial(tool) {
  const issues = [];
  const hasFreeTier = tool.hasFreeTier ?? tool.has_free_tier;
  const hasFreeTrial = tool.hasFreeTrial;
  const pricingText = (tool.pricing_overview || tool.pricingEvidenceNotes || '');
  const descText = (tool.description || tool.shortDescription || '');
  const allText = `${pricingText} ${descText}`;

  // If claimed hasFreeTier is false, ensure text does not affirmatively claim it has a free plan
  if (hasFreeTier === false) {
    // Check for affirmative free tier claims while ignoring negations (e.g. "no permanent free tier")
    const affirmativeFreeMatch = allText.match(/(?:offers|includes|features|has|provides)\s+(?:a\s+)?(?:permanent\s+)?free\s+(?:plan|tier)/i);
    if (affirmativeFreeMatch) {
      const idx = affirmativeFreeMatch.index;
      const prefix = allText.slice(Math.max(0, idx - 15), idx).toLowerCase();
      if (!/(?:no|not|without|never)\s+$/.test(prefix)) {
        issues.push({
          code: 'B_CONTRADICTORY_FREE_TIER',
          message: `Tool "${tool.id}" has hasFreeTier=false but editorial copy affirmatively mentions a free plan/tier.`
        });
      }
    }
  }

  // If claimed hasFreeTier is true, ensure text does not state there is no free plan
  if (hasFreeTier === true) {
    if (/\b(?:no free plan|no free tier|paid only|requires a paid subscription to use at all)\b/i.test(allText)) {
      issues.push({
        code: 'B_CONTRADICTORY_PAID_ONLY',
        message: `Tool "${tool.id}" has hasFreeTier=true but editorial copy mentions "no free plan" or "paid only".`
      });
    }
  }

  // If hasFreeTrial is true and hasFreeTier is false, verify trial isn't framed as permanent free
  if (hasFreeTrial === true && hasFreeTier === false) {
    if (/\b(?:free forever|forever free)\b/i.test(allText)) {
      issues.push({
        code: 'B_TRIAL_CONFUSED_WITH_FREE',
        message: `Tool "${tool.id}" is a paid tool with trial only, but mentions "free forever".`
      });
    }
  }

  return issues;
}

// ── Check C: Monthly versus annual pricing clarity ────────────────────────
export function checkMonthlyVsAnnualPricing(tool) {
  const issues = [];
  const pricingHtml = tool.pricing_overview || '';
  if (!pricingHtml) return issues;

  // Search for currency amounts: $X.XX or $X
  const priceRegex = /\$(\d+(?:\.\d{1,4})?)/g;
  let match;

  while ((match = priceRegex.exec(pricingHtml)) !== null) {
    const fullPrice = match[0];
    const num = parseFloat(match[1]);
    if (num === 0) continue; // $0 is free

    const idx = match.index;
    const prefix = pricingHtml.slice(Math.max(0, idx - 40), idx);
    const suffix = pricingHtml.slice(idx + fullPrice.length, Math.min(pricingHtml.length, idx + fullPrice.length + 50));
    const windowText = `${prefix} ${fullPrice} ${suffix}`;

    // Valid price context indicators:
    // - Subscriptions: /mo, /month, /yr, /year, billed, monthly, annually
    // - Pay-per-unit / Metered: /hour, /hr, /min, /minute, /generation, /image, /credit, /token, /page, /seat, /user, /license
    // - Bundles / Packs: "5 hours for $11", "for $11 ($2.20/hour)", "pack", "credits valid for", "one-time"
    // - Ranges: "$0.05–$0.08+"
    const hasValidContext = /(?:\/|\bper\s+|\bfor\s+)(?:mo|month|yr|year|hour|hr|min|minute|sec|second|credit|token|generation|image|page|seat|user|license|styles?|vector)|\b(?:billed|annually|monthly|subscription|one-time|pack|bundle|credits?\b|hours?\b|tokens?\b|generations?\b|licenses?\b|years?\b)|[–\-\+]/i.test(suffix) ||
      /(?:\d+\s+(?:hours?|credits?|tokens?|generations?|images?|pages?|minutes?|licenses?)\s+(?:for|at)\s+|(?:starts?|starts?\s+around|starting\s+at|ranging\s+from|from|to|roughly|approx(?:imately)?)\s+)$/i.test(prefix);

    if (!hasValidContext) {
      issues.push({
        code: 'C_AMBIGUOUS_BILLING_PERIOD',
        message: `Tool "${tool.id}" pricing overview contains bare price "${fullPrice}" without clear billing frequency or unit in context: "${windowText.trim()}".`
      });
    }
  }

  return issues;
}

// ── Check D: Currency and billing frequency consistency ──────────────────
export function checkCurrencyAndBillingFrequency(tool) {
  const issues = [];
  const currency = tool.priceCurrency;
  const startingPrice = tool.startingPrice;
  const billingPeriod = tool.billingPeriod;
  const validCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];
  const validPeriods = ['month', 'month_billed_annually', 'one_time', 'monthly', 'annual', 'usage', 'free'];

  // Check currency validity whenever currency is provided
  if (currency && !validCurrencies.includes(currency)) {
    issues.push({
      code: 'D_INVALID_CURRENCY',
      message: `Tool "${tool.id}" has unsupported priceCurrency="${currency}".`
    });
  }

  // Check billing period validity whenever billingPeriod is provided
  if (billingPeriod && !validPeriods.includes(billingPeriod)) {
    issues.push({
      code: 'D_INVALID_BILLING_PERIOD',
      message: `Tool "${tool.id}" has invalid billingPeriod="${billingPeriod}".`
    });
  }

  // If a non-zero starting price is specified, currency and period must be present
  if (typeof startingPrice === 'number' && startingPrice > 0) {
    if (!currency || !validCurrencies.includes(currency)) {
      issues.push({
        code: 'D_INVALID_CURRENCY',
        message: `Tool "${tool.id}" has startingPrice=${startingPrice} but missing/unsupported priceCurrency="${currency}".`
      });
    }
    if (!billingPeriod || !validPeriods.includes(billingPeriod)) {
      issues.push({
        code: 'D_INVALID_BILLING_PERIOD',
        message: `Tool "${tool.id}" has startingPrice=${startingPrice} but invalid billingPeriod="${billingPeriod}".`
      });
    }
  }

  return issues;
}

// ── Check E: Pricing source and review date presence ──────────────────────
export function checkPricingSourceAndReviewDate(tool, ledger = []) {
  const issues = [];
  const sources = tool.verificationSources || [];
  const reviewedAt = tool.reviewedAt;

  const ledgerEntries = ledger.filter(e => e.id === tool.id);

  if (sources.length === 0 && ledgerEntries.length === 0) {
    issues.push({
      code: 'E_MISSING_VERIFICATION_SOURCES',
      message: `Tool "${tool.id}" has no verificationSources in catalog and no entries in evidence ledger.`
    });
  }

  const effectiveReviewDate = reviewedAt || (ledgerEntries[0] && ledgerEntries[0].reviewedAt);
  if (!effectiveReviewDate || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveReviewDate)) {
    issues.push({
      code: 'E_INVALID_REVIEW_DATE',
      message: `Tool "${tool.id}" has missing or non-ISO review date "${effectiveReviewDate}".`
    });
  }

  return issues;
}

// ── Check F: Unsupported absolute claims / hype phrases ──────────────────
export function checkUnsupportedAbsoluteClaims(tool) {
  const issues = [];
  const textsToScan = [
    { field: 'how_it_works', text: tool.how_it_works },
    { field: 'pricing_overview', text: tool.pricing_overview },
    { field: 'comparison_summary', text: tool.comparison_summary },
    { field: 'sourceSummary', text: tool.sourceSummary },
    { field: 'bestFor', text: tool.bestFor },
    { field: 'notIdealFor', text: tool.notIdealFor },
    { field: 'pros', text: Array.isArray(tool.pros) ? tool.pros.join(' ') : '' },
    { field: 'cons', text: Array.isArray(tool.cons) ? tool.cons.join(' ') : '' }
  ];

  if (Array.isArray(tool.feature_groups)) {
    for (const group of tool.feature_groups) {
      textsToScan.push({ field: `feature_group:${group.title}`, text: `${group.title} ${(group.features || []).join(' ')}` });
    }
  }

  for (const item of textsToScan) {
    if (!item.text || typeof item.text !== 'string') continue;
    for (const { pattern, label } of PROHIBITED_HYPE_PATTERNS) {
      if (pattern.test(item.text)) {
        issues.push({
          code: 'F_PROHIBITED_HYPE_PHRASE',
          message: `Tool "${tool.id}" contains prohibited hype phrase "${label}" in ${item.field}.`
        });
      }
    }
  }

  return issues;
}

// ── Check G: Duplicate words and obvious editorial mistakes ───────────────
export function checkDuplicateWordsAndTypos(tool) {
  const issues = [];
  const textsToScan = [
    { field: 'how_it_works', text: tool.how_it_works },
    { field: 'pricing_overview', text: tool.pricing_overview },
    { field: 'comparison_summary', text: tool.comparison_summary },
    { field: 'sourceSummary', text: tool.sourceSummary }
  ];

  if (Array.isArray(tool.pros)) {
    tool.pros.forEach((p, i) => textsToScan.push({ field: `pros[${i}]`, text: p }));
  }
  if (Array.isArray(tool.cons)) {
    tool.cons.forEach((c, i) => textsToScan.push({ field: `cons[${i}]`, text: c }));
  }

  for (const item of textsToScan) {
    if (!item.text || typeof item.text !== 'string') continue;
    // Strip HTML tags for clean word checking
    const clean = item.text.replace(/<[^>]+>/g, ' ');

    // Check duplicate words
    for (const word of SUSPICIOUS_DUPLICATE_WORDS) {
      const dupRegex = new RegExp(`\\b${word}\\s+${word}\\b`, 'i');
      if (dupRegex.test(clean)) {
        issues.push({
          code: 'G_DUPLICATE_WORD',
          message: `Tool "${tool.id}" has duplicate word "${word} ${word}" in ${item.field}.`
        });
      }
    }

    // Check raw entity leaks
    if (/&amp;amp;|&amp;lt;|&amp;gt;|&amp;#39;/i.test(item.text)) {
      issues.push({
        code: 'G_RAW_ENTITY_LEAK',
        message: `Tool "${tool.id}" has double-encoded HTML entity in ${item.field}.`
      });
    }

    // Check unbalanced parentheses
    const openParen = (clean.match(/\(/g) || []).length;
    const closeParen = (clean.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      issues.push({
        code: 'G_UNBALANCED_PARENTHESES',
        message: `Tool "${tool.id}" has unbalanced parentheses (${openParen} open vs ${closeParen} close) in ${item.field}.`
      });
    }
  }

  return issues;
}

// ── Check H: Missing or generic sections ─────────────────────────────────
export function checkSubstantiveEditorialSections(tool) {
  const issues = [];

  // 1. how_it_works
  if (!tool.how_it_works || typeof tool.how_it_works !== 'string' || tool.how_it_works.trim().length < 60) {
    issues.push({ code: 'H_MISSING_HOW_IT_WORKS', message: `Tool "${tool.id}" missing substantive how_it_works (>= 60 chars).` });
  }

  // 2. feature_groups
  if (!Array.isArray(tool.feature_groups) || tool.feature_groups.length < 2) {
    issues.push({ code: 'H_INSUFFICIENT_FEATURE_GROUPS', message: `Tool "${tool.id}" must have at least 2 feature_groups.` });
  } else {
    for (let i = 0; i < tool.feature_groups.length; i++) {
      const fg = tool.feature_groups[i];
      const title = fg.group || fg.title;
      const items = fg.items || fg.features;
      if (!title || !Array.isArray(items) || items.length < 2) {
        issues.push({ code: 'H_INCOMPLETE_FEATURE_GROUP', message: `Tool "${tool.id}" feature_group #${i + 1} lacks title/group or has fewer than 2 items/features.` });
      }
    }
  }

  // 3. pros & cons
  if (!Array.isArray(tool.pros) || tool.pros.length < 2) {
    issues.push({ code: 'H_INSUFFICIENT_PROS', message: `Tool "${tool.id}" must have at least 2 pros.` });
  }
  if (!Array.isArray(tool.cons) || tool.cons.length < 2) {
    issues.push({ code: 'H_INSUFFICIENT_CONS', message: `Tool "${tool.id}" must have at least 2 cons.` });
  }

  // 4. pricing_overview
  if (!tool.pricing_overview || typeof tool.pricing_overview !== 'string' || tool.pricing_overview.trim().length < 40) {
    issues.push({ code: 'H_MISSING_PRICING_OVERVIEW', message: `Tool "${tool.id}" missing substantive pricing_overview (>= 40 chars).` });
  }

  // 5. bestFor & notIdealFor
  const bestFor = tool.bestFor || tool.best_for;
  if (!bestFor || (typeof bestFor === 'string' && bestFor.trim().length < 20)) {
    issues.push({ code: 'H_MISSING_BEST_FOR', message: `Tool "${tool.id}" missing substantive bestFor.` });
  }
  const notIdealFor = tool.notIdealFor || tool.not_ideal_for;
  if (!notIdealFor || (typeof notIdealFor === 'string' && notIdealFor.trim().length < 20)) {
    issues.push({ code: 'H_MISSING_NOT_IDEAL_FOR', message: `Tool "${tool.id}" missing substantive notIdealFor.` });
  }

  // 6. Check for placeholder markers
  const fullContent = JSON.stringify(tool).toLowerCase();
  for (const marker of PLACEHOLDER_MARKERS) {
    if (fullContent.includes(marker.toLowerCase())) {
      issues.push({ code: 'H_PLACEHOLDER_MARKER_DETECTED', message: `Tool "${tool.id}" contains placeholder marker "${marker}".` });
    }
  }

  return issues;
}

// ── Check I: Invalid comparison references ────────────────────────────────
export function checkComparisonReferences(tool, allToolIds) {
  const issues = [];
  const compSummary = tool.comparison_summary || '';
  if (!compSummary) return issues;

  // Extract /tools/{slug} link references
  const toolLinkMatches = compSummary.match(/\/tools\/([a-z0-9-]+)\/?/gi);
  if (toolLinkMatches) {
    for (const link of toolLinkMatches) {
      const slugMatch = link.match(/\/tools\/([a-z0-9-]+)/i);
      if (slugMatch) {
        const slug = slugMatch[1].toLowerCase();
        if (!allToolIds.has(slug)) {
          issues.push({
            code: 'I_INVALID_COMPARISON_REFERENCE',
            message: `Tool "${tool.id}" references non-existent tool link "/tools/${slug}/".`
          });
        }
      }
    }
  }

  return issues;
}

// ── Check J: Unexpected non-target changes ────────────────────────────────
export function checkNonTargetInvariance(targetToolIds, baselineTools, currentTools) {
  const issues = [];
  const targetSet = new Set(targetToolIds);

  const baselineMap = new Map(baselineTools.map(t => [t.id, t]));
  const currentMap = new Map(currentTools.map(t => [t.id, t]));

  // Invariant 1: Total counts must match
  if (baselineTools.length !== currentTools.length) {
    issues.push({
      code: 'J_TOOL_COUNT_MISMATCH',
      message: `Tool count changed: baseline=${baselineTools.length}, current=${currentTools.length}.`
    });
  }

  // Invariant 2: Non-target tools must remain 100% invariant
  for (const [id, baseTool] of baselineMap.entries()) {
    if (targetSet.has(id)) continue; // Target tools are expected to change

    const curTool = currentMap.get(id);
    if (!curTool) {
      issues.push({ code: 'J_NON_TARGET_REMOVED', message: `Non-target tool "${id}" was removed.` });
      continue;
    }

    const baseStr = JSON.stringify(baseTool);
    const curStr = JSON.stringify(curTool);
    if (baseStr !== curStr) {
      issues.push({
        code: 'J_UNEXPECTED_NON_TARGET_MUTATION',
        message: `Non-target tool "${id}" was modified without authorization.`
      });
    }
  }

  return issues;
}

// ── Check K: Evidence ledger completeness ─────────────────────────────────
export function checkEvidenceLedgerCompleteness(tool, ledger = []) {
  const issues = [];
  const entries = ledger.filter(e => e.id === tool.id);

  if (entries.length === 0) {
    issues.push({
      code: 'K_MISSING_EVIDENCE_RECORD',
      message: `Tool "${tool.id}" has no corresponding record in data/evidence/phase11-evidence-ledger.json.`
    });
  } else {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.sourceURL || !entry.sourceURL.startsWith('http')) {
        issues.push({
          code: 'K_INVALID_EVIDENCE_SOURCE_URL',
          message: `Tool "${tool.id}" evidence #${i + 1} has invalid sourceURL.`
        });
      }
      if (!entry.reviewedAt || !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedAt)) {
        issues.push({
          code: 'K_INVALID_EVIDENCE_DATE',
          message: `Tool "${tool.id}" evidence #${i + 1} has invalid reviewedAt date "${entry.reviewedAt}".`
        });
      }
      if (!entry.finding || typeof entry.finding !== 'string' || entry.finding.trim().length < 20) {
        issues.push({
          code: 'K_INSUFFICIENT_EVIDENCE_FINDING',
          message: `Tool "${tool.id}" evidence #${i + 1} has insufficient finding note.`
        });
      }
    }
  }

  return issues;
}

// ── Check L: Generated-page consistency ──────────────────────────────────
export function checkGeneratedPageConsistency(toolId, root = ROOT, htmlOverride = null) {
  const issues = [];
  let html = htmlOverride;

  if (html === null) {
    const filePath = path.join(root, 'tools', toolId, 'index.html');
    if (!fs.existsSync(filePath)) {
      issues.push({ code: 'L_PAGE_MISSING', message: `Generated static page missing: ${filePath}` });
      return issues;
    }
    html = fs.readFileSync(filePath, 'utf8');
  }

  // Check 1: H1 count
  const h1Matches = html.match(/<h1[ >]/g) || [];
  if (h1Matches.length !== 1) {
    issues.push({ code: 'L_INVALID_H1_COUNT', message: `Page for "${toolId}" has ${h1Matches.length} <h1> tags (expected 1).` });
  }

  // Check 2: Canonical link
  const canonicalExpected = `https://whichaipick.com/tools/${toolId}/`;
  if (!html.includes(`rel="canonical" href="${canonicalExpected}"`)) {
    issues.push({ code: 'L_INCORRECT_CANONICAL', message: `Page for "${toolId}" missing canonical "${canonicalExpected}".` });
  }

  // Check 3: Robots meta
  if (!html.includes('<meta name="robots" content="index,follow">')) {
    issues.push({ code: 'L_INVALID_ROBOTS', message: `Page for "${toolId}" missing index,follow robots meta.` });
  }

  // Check 4: Substantive sections rendered
  const requiredHeadings = ['How It Works', 'Key Features', 'Strengths & Limitations', 'Pricing'];
  for (const heading of requiredHeadings) {
    if (!html.includes(heading)) {
      issues.push({ code: 'L_MISSING_HTML_HEADING', message: `Page for "${toolId}" lacks rendered heading "${heading}".` });
    }
  }

  // Check 5: No raw template tokens
  if (/\{\{|\}\}|<!-- [A-Za-z0-9 ]+ section will go here -->/.test(html)) {
    issues.push({ code: 'L_TEMPLATE_TOKEN_LEAK', message: `Page for "${toolId}" contains template leak tokens.` });
  }

  return issues;
}

// ── Master Verification Runner ───────────────────────────────────────────
export function auditToolProfile(tool, options = {}) {
  const {
    ledger = [],
    allToolIds = new Set(),
    root = ROOT,
    checkStaticHtml = false
  } = options;

  const results = {
    toolId: tool.id,
    checks: {
      A_identity_url: checkToolIdentityAndURL(tool),
      B_free_tier_trial: checkFreeTierVsTrial(tool),
      C_monthly_annual: checkMonthlyVsAnnualPricing(tool),
      D_currency_freq: checkCurrencyAndBillingFrequency(tool),
      E_pricing_source_date: checkPricingSourceAndReviewDate(tool, ledger),
      F_absolute_claims: checkUnsupportedAbsoluteClaims(tool),
      G_typos_duplicates: checkDuplicateWordsAndTypos(tool),
      H_substantive_sections: checkSubstantiveEditorialSections(tool),
      I_comparison_references: checkComparisonReferences(tool, allToolIds),
      K_evidence_ledger: checkEvidenceLedgerCompleteness(tool, ledger)
    }
  };

  if (checkStaticHtml) {
    results.checks.L_generated_page = checkGeneratedPageConsistency(tool.id, root);
  }

  const allIssues = Object.values(results.checks).flat();
  results.valid = allIssues.length === 0;
  results.issueCount = allIssues.length;
  results.issues = allIssues;

  return results;
}

export function runEditorialQualityGuard(options = {}) {
  const {
    root = ROOT,
    targetToolIds = null,
    baselineTools = null,
    checkHtml = true,
    verbose = true
  } = options;

  const tools = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tools.json'), 'utf8'));
  const allToolIds = new Set(tools.map(t => t.id));

  const ledgerPath = path.join(root, 'data', 'evidence', 'phase11-evidence-ledger.json');
  const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : [];

  let invarianceIssues = [];
  let totalIssues = 0;

  // Validation 1: Check for unknown target IDs when targetToolIds is supplied
  if (targetToolIds && targetToolIds.length > 0) {
    const unknownIds = targetToolIds.filter(id => !allToolIds.has(id));
    if (unknownIds.length > 0) {
      const issue = {
        code: 'A_UNKNOWN_TARGET_ID',
        message: `Unknown target tool ID(s) specified: ${unknownIds.join(', ')}.`
      };
      invarianceIssues.push(issue);
      totalIssues += unknownIds.length;
      if (verbose) {
        console.error(`❌ [FAIL] ${issue.message}`);
      }
    }

    // Validation 2: Check for duplicate target IDs
    const seen = new Set();
    const duplicates = [];
    for (const id of targetToolIds) {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    if (duplicates.length > 0) {
      const issue = {
        code: 'A_DUPLICATE_TARGET_ID',
        message: `Duplicate target tool ID(s) specified: ${duplicates.join(', ')}.`
      };
      invarianceIssues.push(issue);
      totalIssues += duplicates.length;
      if (verbose) {
        console.error(`❌ [FAIL] ${issue.message}`);
      }
    }

    // Validation 3: When targetToolIds is supplied, baselineTools is mandatory
    if (!baselineTools || !Array.isArray(baselineTools) || baselineTools.length === 0) {
      const issue = {
        code: 'J_MISSING_BASELINE',
        message: 'Mandatory baselineTools was not provided or is invalid for target cohort verification.'
      };
      invarianceIssues.push(issue);
      totalIssues += 1;
      if (verbose) {
        console.error(`❌ [FAIL] ${issue.message}`);
      }
    } else {
      // Check J: Invariance on non-targets against baseline
      const checkJIssues = checkNonTargetInvariance(targetToolIds, baselineTools, tools);
      if (checkJIssues.length > 0) {
        totalIssues += checkJIssues.length;
        invarianceIssues.push(...checkJIssues);
        if (verbose) {
          console.log(`\n  ❌ [INVARIANCE FAIL] Non-target mutation(s) detected:`);
          checkJIssues.forEach(i => console.log(`      [${i.code}] ${i.message}`));
        }
      } else if (verbose) {
        console.log(`\n  ✅ [PASS] Non-target catalogue records 100% invariant`);
      }
    }
  }

  const targets = targetToolIds
    ? tools.filter(t => targetToolIds.includes(t.id))
    : tools.filter(t => [
        'ollama', 'recraft', 'upscayl', 'docsbot', 'macwhisper', 'sitegpt', 'novelcrafter',
        'browse-ai', 'chatpdf', 'capacities', 'diffit', 'cleanvoice', 'anythingllm', 'flair-ai'
      ].includes(t.id));

  if (verbose) {
    console.log('======================================================');
    console.log('WHICHAIPICK EDITORIAL QUALITY GUARD');
    console.log(`Auditing ${targets.length} target profiles (Checks A - L)`);
    console.log('======================================================\n');
  }

  const auditReports = [];

  for (const tool of targets) {
    const report = auditToolProfile(tool, { ledger, allToolIds, root, checkStaticHtml: checkHtml });
    auditReports.push(report);
    totalIssues += report.issueCount;

    if (verbose) {
      if (report.valid) {
        console.log(`  ✅ [PASS] ${tool.id} — All editorial checks satisfied`);
      } else {
        console.log(`  ❌ [FAIL] ${tool.id} — ${report.issueCount} issue(s) detected:`);
        report.issues.forEach(i => console.log(`      [${i.code}] ${i.message}`));
      }
    }
  }

  if (verbose) {
    console.log('\n------------------------------------------------------');
    console.log(`Total Target Profiles Audited: ${targets.length}`);
    console.log(`Total Issues Detected:         ${totalIssues}`);
    console.log(`Final Verdict:                 ${totalIssues === 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('======================================================\n');
  }

  return {
    success: totalIssues === 0,
    totalIssues,
    reports: auditReports,
    invarianceIssues
  };
}

// Direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let targetToolIds = null;
  let targetsExplicitlySupplied = false;
  let baseRef = 'origin/main';
  let checkHtml = true;

  for (const arg of args) {
    if (arg.startsWith('--targets=')) {
      targetsExplicitlySupplied = true;
      const raw = arg.slice('--targets='.length).trim();
      targetToolIds = raw.length > 0 ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    } else if (arg.startsWith('--base=')) {
      baseRef = arg.slice('--base='.length).trim();
    } else if (arg === '--no-html' || arg === '--check-html=false') {
      checkHtml = false;
    }
  }

  // 1. Empty target list must fail when explicitly supplied
  if (targetsExplicitlySupplied && (!targetToolIds || targetToolIds.length === 0)) {
    console.error('❌ [CRITICAL ERROR] --targets was explicitly supplied but target list is empty.');
    process.exit(1);
  }

  // 2. Reject duplicate target IDs
  if (targetToolIds && targetToolIds.length > 0) {
    const seen = new Set();
    const duplicates = [];
    for (const id of targetToolIds) {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    if (duplicates.length > 0) {
      console.error(`❌ [CRITICAL ERROR] Duplicate target tool ID(s) provided: ${duplicates.join(', ')}`);
      process.exit(1);
    }
  }

  // 3. When --targets is supplied, baseline retrieval is mandatory
  let baselineTools = null;
  if (targetToolIds && targetToolIds.length > 0) {
    try {
      const { execSync } = await import('child_process');
      const raw = execSync(`git show ${baseRef}:data/tools.json`, {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      baselineTools = JSON.parse(raw);
      if (!Array.isArray(baselineTools) || baselineTools.length === 0) {
        throw new Error('Baseline data/tools.json is empty or not an array');
      }
    } catch (err) {
      console.error(`❌ [CRITICAL ERROR] Mandatory baseline data/tools.json could not be loaded from "${baseRef}": ${err.message}`);
      process.exit(1);
    }
  }

  const result = runEditorialQualityGuard({ targetToolIds, baselineTools, checkHtml });
  if (!result.success) {
    process.exit(1);
  }
}
