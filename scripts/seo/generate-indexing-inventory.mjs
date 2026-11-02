import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import {
  PROTECTED_BRAND_SKELETONS,
  PROTECTED_V2_CANARIES,
  PROTECTED_V2_CANARY_QUALITY_RISKS,
  classifyToolEligibility
} from './indexing-policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const TOOLS_PATH = path.join(ROOT, 'data', 'tools.json');
const CANARY_PATH = path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');

const MANIFEST_PATH = path.join(ROOT, 'data', 'seo', 'tool-indexing-manifest.json');
const INVENTORY_JSON_PATH = path.join(ROOT, 'data', 'seo', 'tool-indexing-inventory.json');
const INVENTORY_CSV_PATH = path.join(ROOT, 'data', 'seo', 'tool-indexing-inventory.csv');

console.log('======================================================');
console.log('WHICHAIPICK — STAGE 7H.8B INDEXING INVENTORY GENERATOR');
console.log('======================================================\n');

const tools = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
const canaryJson = JSON.parse(fs.readFileSync(CANARY_PATH, 'utf8'));
const canarySet = new Set(canaryJson.approvedToolIds);
const sitemapContent = fs.existsSync(SITEMAP_PATH) ? fs.readFileSync(SITEMAP_PATH, 'utf8') : '';

console.log(`Loaded ${tools.length} tools from data/tools.json`);
console.log(`Loaded ${canarySet.size} approved V2 canary tools`);

const inventory = [];
const noindexIds = [];
const indexableIds = [];

const counts = {
  total: tools.length,
  v2: 0,
  v1: 0,
  richV1: 0,
  skeletonV1: 0,
  protectedBrandSkeletons: 0,
  protectedV2Canaries: 0,
  noindexStubs: 0,
  indexableTotal: 0
};

// Histogram data
const histStrict = {
  under50: 0,
  r50to99: 0,
  r100to149: 0,
  r150to299: 0,
  r300to499: 0,
  over500: 0
};

const histMain = {
  under50: 0,
  r50to99: 0,
  r100to149: 0,
  r150to299: 0,
  r300to499: 0,
  over500: 0
};

for (const tool of tools) {
  const pagePath = path.join(ROOT, 'tools', tool.id, 'index.html');
  if (!fs.existsSync(pagePath)) {
    throw new Error(`[FATAL] Tool page missing from filesystem: ${pagePath}`);
  }
  const html = fs.readFileSync(pagePath, 'utf8');
  const $ = cheerio.load(html);

  const isV2 = html.includes('tool-page-v2') || $('link[href*="tool-page-v2.css"]').length > 0;
  const classification = classifyToolEligibility(tool, canarySet);

  // Section checks in HTML
  const hasHow = html.includes('<h2>How It Works</h2>') && $('.tool-body-text').text().trim().length > 30;
  const hasFeatures = html.includes('<h2>Key Features</h2>') || $('.tool-v2-feature-groups').length > 0;
  const hasPros = $('.tool-pros-list, .tool-v2-pros-list').length > 0 && $('.tool-pros-list li, .tool-v2-pros-list li').length > 0;
  const hasCons = $('.tool-cons-list, .tool-v2-cons-list').length > 0 && $('.tool-cons-list li, .tool-v2-cons-list li').length > 0;
  const hasStrengths = hasPros || hasCons || (html.includes('<h2>Strengths & Limitations</h2>') && !html.includes('<!-- Strengths & Limitations section will go here -->'));
  const hasPricing = (html.includes('<h2>Pricing</h2>') && !html.includes('<!-- Pricing section will go here -->')) || $('h2:contains("Pricing & Access")').length > 0;
  const hasCompares = html.includes('<h2>How It Compares</h2>') || $('h2:contains("How It Compares")').length > 0 || html.includes('<h2>Featured comparisons</h2>');

  // Word count: Strict body content (excluding nav, footer, header, scripts, styles, disclosures, breadcrumbs)
  const $strict = cheerio.load(html);
  $strict('header, footer, nav, script, style, .tool-affiliate-note, .tool-page-nav, .tool-breadcrumbs, .site-header, .site-footer').remove();
  const strictText = $strict('main, .tool-container, body').text().replace(/\s+/g, ' ').trim();
  const strictWords = strictText ? strictText.split(' ').filter(Boolean).length : 0;

  // Word count: Main selector (Stage 7H.7 calculation method)
  const mainText = $('main').text().replace(/\s+/g, ' ').trim();
  const mainWords = mainText ? mainText.split(' ').filter(Boolean).length : 0;

  // Track histograms
  const addHist = (h, w) => {
    if (w < 50) h.under50++;
    else if (w < 100) h.r50to99++;
    else if (w < 150) h.r100to149++;
    else if (w < 300) h.r150to299++;
    else if (w < 500) h.r300to499++;
    else h.over500++;
  };
  addHist(histStrict, strictWords);
  addHist(histMain, mainWords);

  // Boilerplate indicators
  const boilerplateMarkers = [
    '<!-- How it Works section will go here -->',
    '<!-- Key Features section will go here -->',
    '<!-- Strengths & Limitations section will go here -->',
    '<!-- Pricing section will go here -->'
  ];
  let boilerplateCount = 0;
  for (const marker of boilerplateMarkers) {
    if (html.includes(marker)) boilerplateCount++;
  }

  const currentRobots = $('meta[name="robots"]').attr('content') || 'index,follow';
  const sitemapPresent = sitemapContent.includes(`https://whichaipick.com/tools/${tool.id}/`);

  if (isV2) {
    counts.v2++;
    if (PROTECTED_V2_CANARIES.includes(tool.id)) {
      counts.protectedV2Canaries++;
    }
  } else {
    counts.v1++;
    if (classification.tier === 'INDEXABLE_RICH_V1') {
      counts.richV1++;
    } else {
      counts.skeletonV1++;
      if (PROTECTED_BRAND_SKELETONS.includes(tool.id)) {
        counts.protectedBrandSkeletons++;
      } else {
        counts.noindexStubs++;
      }
    }
  }

  if (classification.indexable) {
    counts.indexableTotal++;
    indexableIds.push(tool.id);
  } else {
    noindexIds.push(tool.id);
  }

  inventory.push({
    toolId: tool.id,
    toolName: tool.name,
    category: tool.category,
    templateVersion: isV2 ? 'V2' : 'V1',
    editorialSections: {
      overview: true,
      howItWorks: hasHow,
      features: hasFeatures,
      strengths: hasStrengths,
      limitations: hasCons,
      pricing: hasPricing,
      comparisons: hasCompares
    },
    words: {
      strictVisibleWords: strictWords,
      mainSelectorWords: mainWords
    },
    boilerplateMarkerCount: boilerplateCount,
    currentRobotsDirective: currentRobots,
    currentSitemapPresence: sitemapPresent,
    candidateDecision: classification.tier,
    targetRobotsDirective: classification.robots,
    targetSitemapPresence: classification.indexable,
    qualityRisks: classification.qualityRisks || (classification.reason ? [classification.reason] : [])
  });
}

// Sort arrays deterministically
noindexIds.sort();
indexableIds.sort();

console.log('\n--- AUDIT CLASSIFICATION RESULTS ---');
console.log(`Total Tools: ${counts.total}`);
console.log(`V2 Tools: ${counts.v2} (Standard: ${counts.v2 - counts.protectedV2Canaries}, Protected Canaries: ${counts.protectedV2Canaries})`);
console.log(`V1 Tools: ${counts.v1} (Rich: ${counts.richV1}, Skeleton: ${counts.skeletonV1})`);
console.log(`Protected Brand Skeletons: ${counts.protectedBrandSkeletons}`);
console.log(`Approved Low-Value Noindex Stubs: ${counts.noindexStubs}`);
console.log(`Total Indexable Tools: ${counts.indexableTotal}`);
console.log(`Total Noindex Tools: ${noindexIds.length}`);

console.log('\n--- WORD COUNT HISTOGRAMS ---');
console.log('Strict Visible Content Histogram (excludes all chrome):', histStrict);
console.log('Main Selector Histogram (Stage 7H.7 methodology):', histMain);

// Create the Indexing Manifest
const manifest = {
  schemaVersion: 1,
  description: 'WhichAIPick Tool Indexing Policy Manifest. Configures selective indexing for low-value V1 skeleton pages.',
  expectedTotalCount: counts.total,
  expectedIndexableCount: counts.indexableTotal,
  expectedNoindexCount: noindexIds.length,
  protectedBrandSkeletonIds: [...PROTECTED_BRAND_SKELETONS],
  protectedV2CanaryIds: [...PROTECTED_V2_CANARIES],
  approvedNoindexToolIds: noindexIds
};

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\nWritten manifest to: ${MANIFEST_PATH}`);

// Write JSON inventory
fs.writeFileSync(INVENTORY_JSON_PATH, JSON.stringify(inventory, null, 2), 'utf8');
console.log(`Written detailed JSON inventory to: ${INVENTORY_JSON_PATH}`);

// Write CSV inventory
const csvHeader = [
  'tool_id',
  'tool_name',
  'category',
  'template_version',
  'how_it_works',
  'features',
  'strengths',
  'pricing',
  'strict_visible_words',
  'main_selector_words',
  'boilerplate_count',
  'current_robots',
  'current_sitemap',
  'candidate_decision',
  'target_robots',
  'target_sitemap'
].join(',');

const csvRows = inventory.map(item => [
  `"${item.toolId}"`,
  `"${item.toolName.replace(/"/g, '""')}"`,
  `"${item.category}"`,
  item.templateVersion,
  item.editorialSections.howItWorks ? 'YES' : 'NO',
  item.editorialSections.features ? 'YES' : 'NO',
  item.editorialSections.strengths ? 'YES' : 'NO',
  item.editorialSections.pricing ? 'YES' : 'NO',
  item.words.strictVisibleWords,
  item.words.mainSelectorWords,
  item.boilerplateMarkerCount,
  item.currentRobotsDirective,
  item.currentSitemapPresence ? 'YES' : 'NO',
  item.candidateDecision,
  item.targetRobotsDirective,
  item.targetSitemapPresence ? 'YES' : 'NO'
].join(','));

fs.writeFileSync(INVENTORY_CSV_PATH, [csvHeader, ...csvRows].join('\n'), 'utf8');
console.log(`Written CSV inventory to: ${INVENTORY_CSV_PATH}`);

console.log('\nInventory generation complete!');
