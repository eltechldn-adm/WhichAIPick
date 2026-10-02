import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKBOOK_PATH = path.resolve('data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const LEGACY_JSON_PATH = path.resolve('data/tools.json');
const OUT_PATH = path.resolve('data/tools.phase11.staged.json');

const WHITELIST_FIELDS = [
  'affiliate_url', 'tags', 'how_it_works', 'workflows', 'feature_groups',
  'pros', 'cons', 'pricing_overview', 'comparison_summary'
];

const JSON_FIELDS = [
  'primaryUseCases', 'platforms', 'aliases', 'verificationSources',
  'finderIntentIds', 'deploymentModes', 'useCaseIds', 'audienceTags',
  'evidenceIds', 'recurringFreeIntentIds',
  'dataProvenance', 'fieldProvenance', 'bestFor', 'notIdealFor'
];

function run() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    console.error(`[ERROR] Workbook not found: ${WORKBOOK_PATH}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(WORKBOOK_PATH);
  
  if (!workbook.Sheets['Catalog']) {
    console.error('[ERROR] Missing Catalog sheet.');
    process.exit(1);
  }

  const catalogRaw = XLSX.utils.sheet_to_json(workbook.Sheets['Catalog'], { defval: null });
  
  if (catalogRaw.length === 0) {
    console.error('[ERROR] Catalog sheet is empty.');
    process.exit(1);
  }

  const schemaVersion = catalogRaw[0].schemaVersion;
  if (schemaVersion !== 'catalog-2.0-rc4') {
    console.error(`[ERROR] Wrong schema version. Expected catalog-2.0-rc4, got ${schemaVersion}`);
    process.exit(1);
  }

  if (catalogRaw.length !== 882) {
    console.error(`[ERROR] Unexpected record count. Expected 882, got ${catalogRaw.length}`);
    process.exit(1);
  }

  // Check unique IDs
  const seenIds = new Set();
  catalogRaw.forEach((row, i) => {
    if (!row.id) {
      console.error(`[ERROR] Missing ID at row ${i + 2}`);
      process.exit(1);
    }
    if (seenIds.has(row.id)) {
      console.error(`[ERROR] Duplicate ID: ${row.id}`);
      process.exit(1);
    }
    seenIds.add(row.id);
  });

  const legacyData = {};
  if (fs.existsSync(LEGACY_JSON_PATH)) {
    const oldTools = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf8'));
    oldTools.forEach(t => {
      legacyData[t.id] = t;
    });
  }

  const stagedTools = catalogRaw.map(row => {
    const staged = { ...row };

    // Clean up strings to null if they are literally "null" or empty
    for (const key of Object.keys(staged)) {
      if (staged[key] === 'null' || staged[key] === '') {
        staged[key] = null;
      }
    }

    // Process JSON array fields
    JSON_FIELDS.forEach(field => {
      if (typeof staged[field] === 'string') {
        try {
          staged[field] = JSON.parse(staged[field]);
        } catch(e) {
          console.error(`[ERROR] Failed to parse JSON array for ${field} on ${staged.id}`);
          process.exit(1);
        }
      } else if (staged[field] === null) {
        staged[field] = [];
      }
    });

    // Ensure Booleans are Booleans, preserve nulls
    const booleanFields = [
      'hasFreeTier', 'hasFreeTrial', 'apiAvailable', 'openSource', 'selfHosted',
      'contentReviewRequired', 'categoryReviewRequired', 'pricingNeedsReview',
      'metadataReviewRequired', 'recommendationEligible', 'directoryEligible',
      'seoEligible', 'paidPlanAvailable', 'criticalHold', 'legacyIdException'
    ];
    
    booleanFields.forEach(field => {
      if (staged[field] === 'TRUE' || staged[field] === 'true' || staged[field] === true) staged[field] = true;
      else if (staged[field] === 'FALSE' || staged[field] === 'false' || staged[field] === false) staged[field] = false;
      else if (staged[field] !== null) {
        console.error(`[ERROR] Invalid boolean value for ${field} on ${staged.id}: ${staged[field]}`);
        process.exit(1);
      }
    });

    // Merge legacy whitelist fields
    const oldT = legacyData[staged.id];
    if (oldT) {
      WHITELIST_FIELDS.forEach(f => {
        if (oldT[f] !== undefined) {
          staged[f] = oldT[f];
        }
      });
      // Store legacy primaryUseCases for migration diagnostic fallback
      if (oldT.primaryUseCases !== undefined) {
        staged.legacyPrimaryUseCases = oldT.primaryUseCases;
      }
      
      // Preserve long_description if rich old data exists
      if (oldT.long_description && (!staged.long_description || oldT.long_description.length > staged.long_description.length)) {
        staged.long_description = oldT.long_description;
      }
      
      // Legacy best_for
      if (oldT.best_for && !staged.bestFor) {
        staged.best_for = oldT.best_for;
      } else if (staged.bestFor) {
        staged.best_for = staged.bestFor;
      }
    } else {
      if (staged.bestFor) staged.best_for = staged.bestFor;
    }

    // Compatibility aliases
    staged.name = staged.canonicalName;
    staged.category = staged.primaryCategory;
    staged.pricing_model = staged.pricingModel;
    staged.has_free_tier = staged.hasFreeTier;
    staged.description = staged.sourceSummary || staged.shortDescription || '';

    return staged;
  });

  // Sort deterministically by id
  stagedTools.sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(OUT_PATH, JSON.stringify(stagedTools, null, 2));
  console.log(`[SUCCESS] Staged catalog written to ${OUT_PATH}`);
}

run();
