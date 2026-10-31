/**
 * scripts/qa/category-hydration-guard.mjs
 *
 * Level A Fast Static QA Guard:
 * - Validates all 10 category pages without requiring a browser or Chromium binary.
 * - Confirms window.BROWSE_CONFIG is safely serialized and contains the exact unescaped category literal (e.g. "Video & Audio").
 * - Guards against accidental HTML entity escaping (e.g. &amp;, &#39;, &quot;) in script tags.
 * - Guards against script breakout vectors (e.g. </script>).
 * - Confirms pre-rendered static tool card counts match data/tools.json.
 * - Confirms canonical URL and indexable robots directives.
 * - Executes automated negative tests verifying faulty fixtures are caught.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

export const CATEGORY_MAP = {
  'Automation': 'automation',
  'Business': 'business',
  'Content Creation': 'content-creation',
  'Design': 'design',
  'Development': 'development',
  'Education': 'education',
  'Marketing': 'marketing',
  'Productivity': 'productivity',
  'Research': 'research',
  'Video & Audio': 'video-audio'
};

/**
 * Validates a single category HTML string.
 * Returns an array of error messages (empty array if valid).
 */
export function validateCategoryHtml(html, expectedCategory, expectedCount, slug) {
  const errors = [];

  // 1. Check window.BROWSE_CONFIG script tag presence
  const scriptRegex = /<script>[\s\S]*?window\.BROWSE_CONFIG\s*=\s*\{\s*category:\s*([\s\S]*?)\s*\};[\s\S]*?<\/script>/i;
  const scriptMatch = html.match(scriptRegex);

  if (!scriptMatch) {
    errors.push(`${slug}: Missing or malformed window.BROWSE_CONFIG script block`);
    return errors;
  }

  const rawConfigValue = scriptMatch[1].trim();

  // 2. Reject HTML entity escaping in the script block
  if (/&(?:amp|quot|#39|#x27|lt|gt);/i.test(rawConfigValue)) {
    errors.push(`${slug}: BROWSE_CONFIG contains forbidden HTML entity escaping: ${rawConfigValue}`);
  }

  // 3. Reject unescaped closing script tags or breakout sequences
  if (/<\/script/i.test(rawConfigValue) || rawConfigValue.includes('<')) {
    errors.push(`${slug}: BROWSE_CONFIG contains unescaped script breakout character: ${rawConfigValue}`);
  }

  // 4. Safely parse the value in JavaScript context
  let parsedCategory;
  try {
    parsedCategory = JSON.parse(rawConfigValue);
  } catch {
    try {
      // Fallback for single-quoted string evaluation
      if (rawConfigValue.startsWith("'") && rawConfigValue.endsWith("'")) {
        parsedCategory = rawConfigValue.slice(1, -1);
      } else {
        parsedCategory = eval(rawConfigValue);
      }
    } catch (e) {
      errors.push(`${slug}: Unable to evaluate BROWSE_CONFIG value: ${rawConfigValue} (${e.message})`);
    }
  }

  if (parsedCategory !== expectedCategory) {
    errors.push(`${slug}: Category mismatch. Expected ${JSON.stringify(expectedCategory)}, got ${JSON.stringify(parsedCategory)}`);
  }

  // 5. Canonical URL check
  const canonicalTag = `<link rel="canonical" href="https://whichaipick.com/category/${slug}/">`;
  if (!html.includes(canonicalTag)) {
    errors.push(`${slug}: Missing or incorrect canonical link tag: ${canonicalTag}`);
  }

  // 6. Robots check (must not be noindexed)
  if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) {
    errors.push(`${slug}: Unexpected noindex robots directive found`);
  }

  // 7. Static pre-rendered tool cards count
  const cardMatches = html.match(/class="tool-card"/g) || [];
  if (cardMatches.length !== expectedCount) {
    errors.push(`${slug}: Static tool card count mismatch. Found ${cardMatches.length}, expected ${expectedCount}`);
  }

  return errors;
}

/**
 * Runs built-in negative regression fixtures.
 */
export function runNegativeTests() {
  const negativeFixtures = [
    {
      name: 'HTML entity escaping in BROWSE_CONFIG (&amp;)',
      html: `
        <!DOCTYPE html><html><head>
          <link rel="canonical" href="https://whichaipick.com/category/video-audio/">
        </head><body>
          <div class="tool-card"></div>
          <script>window.BROWSE_CONFIG = { category: 'Video &amp; Audio' };</script>
        </body></html>
      `,
      expectedCategory: 'Video & Audio',
      expectedCount: 1,
      slug: 'video-audio',
      expectedErrorSnippet: 'contains forbidden HTML entity escaping'
    },
    {
      name: 'Double-quoted HTML entity escaping in BROWSE_CONFIG ("Video &amp; Audio")',
      html: `
        <!DOCTYPE html><html><head>
          <link rel="canonical" href="https://whichaipick.com/category/video-audio/">
        </head><body>
          <div class="tool-card"></div>
          <script>window.BROWSE_CONFIG = { category: "Video &amp; Audio" };</script>
        </body></html>
      `,
      expectedCategory: 'Video & Audio',
      expectedCount: 1,
      slug: 'video-audio',
      expectedErrorSnippet: 'contains forbidden HTML entity escaping'
    },
    {
      name: 'Unescaped script breakout payload',
      html: `
        <!DOCTYPE html><html><head>
          <link rel="canonical" href="https://whichaipick.com/category/video-audio/">
        </head><body>
          <div class="tool-card"></div>
          <script>window.BROWSE_CONFIG = { category: "</script><script>alert(1)</script>" };</script>
        </body></html>
      `,
      expectedCategory: 'Video & Audio',
      expectedCount: 1,
      slug: 'video-audio',
      expectedErrorSnippet: 'contains unescaped script breakout character'
    },
    {
      name: 'Pre-rendered card count mismatch',
      html: `
        <!DOCTYPE html><html><head>
          <link rel="canonical" href="https://whichaipick.com/category/video-audio/">
        </head><body>
          <div class="tool-card"></div>
          <script>window.BROWSE_CONFIG = { category: "Video & Audio" };</script>
        </body></html>
      `,
      expectedCategory: 'Video & Audio',
      expectedCount: 101,
      slug: 'video-audio',
      expectedErrorSnippet: 'Static tool card count mismatch'
    },
    {
      name: 'Missing canonical URL tag',
      html: `
        <!DOCTYPE html><html><head>
        </head><body>
          <div class="tool-card"></div>
          <script>window.BROWSE_CONFIG = { category: "Video & Audio" };</script>
        </body></html>
      `,
      expectedCategory: 'Video & Audio',
      expectedCount: 1,
      slug: 'video-audio',
      expectedErrorSnippet: 'Missing or incorrect canonical link tag'
    }
  ];

  for (const fix of negativeFixtures) {
    const errs = validateCategoryHtml(fix.html, fix.expectedCategory, fix.expectedCount, fix.slug);
    assert.ok(errs.length > 0, `Negative fixture "${fix.name}" unexpectedly passed without errors!`);
    assert.ok(
      errs.some(e => e.includes(fix.expectedErrorSnippet)),
      `Negative fixture "${fix.name}" produced wrong error: ${JSON.stringify(errs)}`
    );
  }
}

// ── Main Execution ───────────────────────────────────────────────────────────
export function runCategoryHydrationGuard() {
  console.log('[CATEGORY GUARD] Starting Level A Fast Static Validation...');

  // 1. Run negative tests first
  runNegativeTests();
  console.log('  ✓ Negative tests failed correctly (rejected HTML entity escaping, script breakout, count & canonical mismatches).');

  // 2. Load catalogue data
  const toolsPath = path.join(ROOT, 'data', 'tools.json');
  assert.ok(fs.existsSync(toolsPath), `data/tools.json missing at ${toolsPath}`);
  const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));

  let totalFailures = 0;

  for (const [catName, slug] of Object.entries(CATEGORY_MAP)) {
    const catHtmlPath = path.join(ROOT, 'category', slug, 'index.html');
    if (!fs.existsSync(catHtmlPath)) {
      console.error(`  ✗ [FAIL] Missing category page: ${catHtmlPath}`);
      totalFailures++;
      continue;
    }

    const html = fs.readFileSync(catHtmlPath, 'utf8');
    const catTools = tools.filter(t => t.category === catName);
    const errors = validateCategoryHtml(html, catName, catTools.length, slug);

    if (errors.length > 0) {
      console.error(`  ✗ [FAIL] ${catName} (${slug}):`);
      errors.forEach(e => console.error(`      - ${e}`));
      totalFailures += errors.length;
    } else {
      console.log(`  ✓ [PASS] ${catName.padEnd(18)} (${slug}): BROWSE_CONFIG "${catName}", ${catTools.length} static cards, canonical OK`);
    }
  }

  if (totalFailures > 0) {
    console.error(`\n[FATAL] Category hydration guard failed with ${totalFailures} error(s).`);
    process.exit(1);
  }

  console.log('\n[CATEGORY GUARD PASS] All 10 category pages verified static-safe and hydration-ready.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCategoryHydrationGuard();
}
