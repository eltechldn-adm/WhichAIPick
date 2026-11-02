import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import {
  PROTECTED_BRAND_SKELETONS,
  PROTECTED_V2_CANARIES,
  PROTECTED_V2_CANARY_QUALITY_RISKS,
  isToolIndexable,
  getToolRobotsDirective,
  loadIndexingManifest
} from '../seo/indexing-policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const DOMAIN = 'https://whichaipick.com';

console.log('======================================================');
console.log('STAGE 7H.8B: SELECTIVE INDEXING REGRESSION TEST SUITE');
console.log('======================================================\n');

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function check(condition, message, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failures.push(`${message} ${detail ? `(${detail})` : ''}`);
    console.error(`  ❌ FAIL: ${message} ${detail ? `(${detail})` : ''}`);
  }
}

// ─── 1. Policy & Manifest Validation ─────────────────────────────────────────
console.log('--- 1. POLICY & MANIFEST INTEGRITY ---');
const manifest = loadIndexingManifest();
check(manifest.schemaVersion === 1, 'Manifest has schemaVersion 1');
check(manifest.expectedTotalCount === 882, 'Manifest expectedTotalCount is 882', `actual=${manifest.expectedTotalCount}`);
check(manifest.expectedIndexableCount === 314, 'Manifest expectedIndexableCount is 314', `actual=${manifest.expectedIndexableCount}`);
check(manifest.expectedNoindexCount === 568, 'Manifest expectedNoindexCount is 568', `actual=${manifest.expectedNoindexCount}`);
check(manifest.approvedNoindexToolIds.length === 568, 'approvedNoindexToolIds contains exactly 568 IDs', `actual=${manifest.approvedNoindexToolIds.length}`);

// Set checks for uniqueness
const noindexSet = new Set(manifest.approvedNoindexToolIds);
check(noindexSet.size === 568, 'approvedNoindexToolIds contains zero duplicate IDs');

// Verify Protected Brand Skeletons
check(manifest.protectedBrandSkeletonIds.length === 7, 'protectedBrandSkeletonIds contains exactly 7 tools');
for (const id of PROTECTED_BRAND_SKELETONS) {
  check(manifest.protectedBrandSkeletonIds.includes(id), `Protected brand skeleton ${id} included in manifest`);
  check(!noindexSet.has(id), `Protected brand skeleton ${id} is NOT in noindex list`);
  check(isToolIndexable(id), `isToolIndexable(${id}) returns true`);
  check(getToolRobotsDirective(id) === 'index,follow', `getToolRobotsDirective(${id}) is index,follow`);
}

// Verify Protected V2 Canaries
check(manifest.protectedV2CanaryIds.length === 3, 'protectedV2CanaryIds contains exactly 3 tools');
for (const id of PROTECTED_V2_CANARIES) {
  check(manifest.protectedV2CanaryIds.includes(id), `Protected V2 canary ${id} included in manifest`);
  check(!noindexSet.has(id), `Protected V2 canary ${id} is NOT in noindex list`);
  check(isToolIndexable(id), `isToolIndexable(${id}) returns true`);
  check(getToolRobotsDirective(id) === 'index,follow', `getToolRobotsDirective(${id}) is index,follow`);
  check(Array.isArray(PROTECTED_V2_CANARY_QUALITY_RISKS[id]) && PROTECTED_V2_CANARY_QUALITY_RISKS[id].length > 0, `Quality risks recorded for canary ${id}`);
}

// ─── 2. Tool Page HTML Robots Directive Audit ────────────────────────────────
console.log('\n--- 2. GENERATED HTML ROBOTS DIRECTIVE AUDIT (ALL 882 TOOLS) ---');
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
check(tools.length === 882, 'data/tools.json contains exactly 882 tools', `actual=${tools.length}`);

let countRenderedNoindex = 0;
let countRenderedIndex = 0;
let countMatchingCanonical = 0;

for (const t of tools) {
  const pagePath = path.join(ROOT, 'tools', t.id, 'index.html');
  if (!fs.existsSync(pagePath)) {
    check(false, `Tool page exists for ${t.id}`, 'File missing');
    continue;
  }
  const html = fs.readFileSync(pagePath, 'utf8');
  const robotsMatch = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
  const robotsContent = robotsMatch ? robotsMatch[1] : '';

  const expectedRobots = noindexSet.has(t.id) ? 'noindex,follow' : 'index,follow';
  if (robotsContent === expectedRobots) {
    if (expectedRobots === 'noindex,follow') countRenderedNoindex++;
    else countRenderedIndex++;
  } else {
    check(false, `Robots directive matches policy for ${t.id}`, `expected=${expectedRobots}, actual=${robotsContent}`);
  }

  // Canonical check
  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const expectedCanonical = `https://whichaipick.com/tools/${t.id}/`;
  if (canonicalMatch && canonicalMatch[1] === expectedCanonical) {
    countMatchingCanonical++;
  } else {
    check(false, `Canonical URL matches https://whichaipick.com/tools/${t.id}/`, `actual=${canonicalMatch ? canonicalMatch[1] : 'none'}`);
  }
}

check(countRenderedNoindex === 568, 'Exactly 568 tool pages render meta robots="noindex,follow"', `actual=${countRenderedNoindex}`);
check(countRenderedIndex === 314, 'Exactly 314 tool pages render meta robots="index,follow"', `actual=${countRenderedIndex}`);
check(countMatchingCanonical === 882, 'All 882 tool pages render exact matching canonical URLs', `actual=${countMatchingCanonical}`);

// ─── 3. Sitemap Synchronization Audit ────────────────────────────────────────
console.log('\n--- 3. SITEMAP SYNCHRONIZATION AUDIT ---');
const sitemapPath = path.join(ROOT, 'sitemap.xml');
check(fs.existsSync(sitemapPath), 'sitemap.xml exists on disk');

const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
const locMatches = [...sitemapContent.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
check(locMatches.length === 391, 'sitemap.xml contains exactly 391 URLs (959 baseline - 568 noindex stubs)', `actual=${locMatches.length}`);

// Unique check
const uniqueLocs = new Set(locMatches);
check(uniqueLocs.size === locMatches.length, 'sitemap.xml contains zero duplicate URLs');

// Leak check
check(!sitemapContent.includes('tool-page-v2-preview'), 'sitemap.xml contains no preview routes');
check(!sitemapContent.includes('pages.dev'), 'sitemap.xml contains no Cloudflare preview domain URLs');

// Tool URL counts in sitemap
const toolLocs = locMatches.filter(l => l.startsWith(`${DOMAIN}/tools/`) && l !== `${DOMAIN}/tools/`);
check(toolLocs.length === 314, 'sitemap.xml contains exactly 314 tool pages (46 V2 + 261 Rich V1 + 7 Protected Brand Skeletons)', `actual=${toolLocs.length}`);

// Verify zero noindex URLs leaked into sitemap
let noindexLeaks = 0;
for (const id of manifest.approvedNoindexToolIds) {
  if (uniqueLocs.has(`${DOMAIN}/tools/${id}/`)) {
    noindexLeaks++;
    console.error(`  ❌ SITEMAP LEAK: Noindex tool ${id} found in sitemap.xml!`);
  }
}
check(noindexLeaks === 0, 'Zero noindex tool pages are present in sitemap.xml');

// Verify all 314 indexable tools are in sitemap
let missingIndexable = 0;
for (const t of tools) {
  if (!noindexSet.has(t.id)) {
    const expectedUrl = `${DOMAIN}/tools/${t.id}/`;
    if (!uniqueLocs.has(expectedUrl)) {
      missingIndexable++;
      console.error(`  ❌ SITEMAP MISSING: Indexable tool ${t.id} missing from sitemap.xml!`);
    }
  }
}
check(missingIndexable === 0, 'All 314 indexable tool pages are present in sitemap.xml');

// ─── 4. Non-Disallow Robots.txt Verification ────────────────────────────────
console.log('\n--- 4. ROBOTS.TXT CRAWLABILITY AUDIT ---');
const robotsTxtPath = path.join(ROOT, 'robots.txt');
check(fs.existsSync(robotsTxtPath), 'robots.txt exists');
const robotsTxt = fs.readFileSync(robotsTxtPath, 'utf8');
check(!robotsTxt.includes('Disallow: /tools/'), 'robots.txt does NOT disallow /tools/ (Googlebot can crawl noindex tags)');
check(robotsTxt.includes('Sitemap: https://whichaipick.com/sitemap.xml'), 'robots.txt points to canonical sitemap.xml');

// ─── 5. Quiz Routing Preservation ───────────────────────────────────────────
console.log('\n--- 5. QUIZ ROUTING PRESERVATION AUDIT ---');
const findJsPath = path.join(ROOT, 'js', 'find.js');
const findJs = fs.readFileSync(findJsPath, 'utf8');
check(!findJs.includes('/tool.html?id='), 'js/find.js contains zero legacy /tool.html?id= references');
check(findJs.includes('const toolUrl = `/tools/${encodeURIComponent(tool.id)}/`;'), 'js/find.js builds canonical /tools/<id>/ URLs');

// ─── Summary & Exit Code ─────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${failures.length}`);

if (failures.length > 0) {
  console.error('\n❌ SELECTIVE INDEXING REGRESSION SUITE FAILED WITH ERRORS:');
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
} else {
  console.log('🎉 ALL SELECTIVE INDEXING REGRESSION CHECKS PASSED WITH ZERO DEFECTS!');
  console.log('======================================================\n');
  process.exit(0);
}
