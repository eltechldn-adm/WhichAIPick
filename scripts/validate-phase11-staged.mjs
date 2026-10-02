import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const WORKBOOK_PATH = path.resolve('data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
const OLD_PATH = path.resolve('data/tools.json');

const WHITELIST_FIELDS = [
  'affiliate_url', 'tags', 'how_it_works', 'workflows', 'feature_groups',
  'pros', 'cons', 'pricing_overview', 'comparison_summary'
];

function run() {
  if (!fs.existsSync(STAGED_PATH)) {
    console.error(`[ERROR] Staged file not found: ${STAGED_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(WORKBOOK_PATH)) {
    console.error(`[ERROR] Workbook not found: ${WORKBOOK_PATH}`);
    process.exit(1);
  }

  const stagedTools = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));
  const workbook = XLSX.readFile(WORKBOOK_PATH);
  
  // Extract taxonomy valid sets
  const intentRaw = XLSX.utils.sheet_to_json(workbook.Sheets['Finder Intent Taxonomy'] || {length: 0}, {header: 1});
  const intentHeaderIdx = intentRaw.findIndex(r => r[0] === 'intentId');
  let intentSet = new Set();
  if (intentHeaderIdx !== -1) {
    const records = intentRaw.slice(intentHeaderIdx + 1).filter(r => r.length > 0 && r[0]);
    intentSet = new Set(records.map(r => r[0]));
  }
  
  let errors = 0;
  const logError = (msg) => { console.error(`[ERROR] ${msg}`); errors++; };

  // Core counts
  if (stagedTools.length !== 882) logError(`Expected 882 records, got ${stagedTools.length}`);
  
  let dirEligible = 0;
  let recEligible = 0;
  let opActive = 0;
  let criticalHold = 0;
  let dupOfId = 0;
  
  const idSet = new Set();
  const urlSet = new Set();
  
  let freeTrialTrue = 0;
  let freeTrialFalse = 0;
  let freeTrialNull = 0;
  
  let priceNumber = 0;
  let priceNull = 0;
  
  const recIneligibleIds = [];

  stagedTools.forEach((tool, i) => {
    // Identity
    if (!tool.id) {
      logError(`Missing ID at index ${i}`);
    } else {
      if (idSet.has(tool.id)) logError(`Duplicate ID: ${tool.id}`);
      idSet.add(tool.id);
    }
    
    if (tool.website_url) {
      if (urlSet.has(tool.website_url)) logError(`Duplicate canonical URL on ${tool.id}: ${tool.website_url}`);
      urlSet.add(tool.website_url);
    }

    // Schema
    if (tool.schemaVersion !== 'catalog-2.0-rc4') logError(`Invalid schemaVersion on ${tool.id}: ${tool.schemaVersion}`);
    
    // Lifecycle
    if (tool.directoryEligible) dirEligible++;
    if (tool.recommendationEligible) recEligible++;
    else recIneligibleIds.push(tool.id);
    
    if (tool.operationalStatus === 'active') opActive++;
    if (tool.criticalHold === true) criticalHold++;
    if (tool.duplicateOfId) dupOfId++;
    
    // Taxonomy Validation
    // CatSet from Catalog primaryCategory mapping (since Categories sheet might be different)
    // Actually, just check against known 10 categories
    const validCats = ["Development", "Automation", "Business", "Marketing", "Design", "Video & Audio", "Content Creation", "Productivity", "Education", "Research"];
    if (!validCats.includes(tool.primaryCategory)) logError(`Invalid category on ${tool.id}: ${tool.primaryCategory}`);
    
    if (Array.isArray(tool.finderIntentIds) && intentSet.size > 0) {
      tool.finderIntentIds.forEach(id => {
        if (!intentSet.has(id)) logError(`Invalid finderIntentId on ${tool.id}: ${id}`);
      });
    }

    // JSON fields
    const arrayFields = ['primaryUseCases', 'bestFor', 'notIdealFor', 'finderIntentIds', 'useCaseIds', 'platforms', 'deploymentModes', 'aliases', 'audienceTags', 'verificationSources', 'evidenceIds'];
    arrayFields.forEach(field => {
      if (tool[field] !== null && tool[field] !== undefined && !Array.isArray(tool[field])) {
        logError(`${field} is not an array on ${tool.id}: type is ${typeof tool[field]}`);
      }
    });
    
    // Boolean fields check
    const boolFields = ['hasFreeTier', 'apiAvailable', 'openSource', 'selfHosted'];
    boolFields.forEach(bf => {
      if (tool[bf] !== true && tool[bf] !== false && tool[bf] !== null) logError(`Invalid boolean for ${bf} on ${tool.id}: ${tool[bf]}`);
    });
    
    // Null semantics
    if (tool.hasFreeTrial === true) freeTrialTrue++;
    else if (tool.hasFreeTrial === false) freeTrialFalse++;
    else if (tool.hasFreeTrial === null) freeTrialNull++;
    else logError(`Invalid hasFreeTrial on ${tool.id}: ${tool.hasFreeTrial}`);
    
    if (typeof tool.startingPrice === 'number') {
      priceNumber++;
      // Dependencies
      if (!tool.priceCurrency) logError(`Missing priceCurrency for startingPrice on ${tool.id}`);
      // if (!tool.billingPeriod) logError(`Missing billingPeriod for startingPrice on ${tool.id}`);
    } else if (tool.startingPrice === null) {
      priceNull++;
    } else {
      logError(`Invalid startingPrice on ${tool.id}: ${tool.startingPrice}`);
    }
  });

  if (dirEligible !== 882) logError(`directoryEligible count is ${dirEligible}, expected 882`);
  if (recEligible !== 879) logError(`recommendationEligible count is ${recEligible}, expected 879`);
  if (opActive !== 882) logError(`operationalStatus=active count is ${opActive}, expected 882`);
  if (criticalHold !== 0) logError(`criticalHold count is ${criticalHold}, expected 0`);
  if (dupOfId !== 0) logError(`duplicateOfId populated count is ${dupOfId}, expected 0`);

  if (freeTrialTrue !== 272 || freeTrialFalse !== 16 || freeTrialNull !== 594) {
    logError(`hasFreeTrial counts wrong. Expected 272/16/594. Got ${freeTrialTrue}/${freeTrialFalse}/${freeTrialNull}`);
  }
  if (priceNumber !== 67 || priceNull !== 815) {
    logError(`startingPrice counts wrong. Expected 67/815. Got ${priceNumber}/${priceNull}`);
  }
  
  // References check
  stagedTools.forEach(tool => {
    if (tool.successorToolId && !idSet.has(tool.successorToolId)) {
      logError(`successorToolId ${tool.successorToolId} not found in staged tools for ${tool.id}`);
    }
    if (tool.relatedToolId && !idSet.has(tool.relatedToolId)) {
      logError(`relatedToolId ${tool.relatedToolId} not found in staged tools for ${tool.id}`);
    }
  });

  // Removed IDs check
  const oldTools = JSON.parse(fs.readFileSync(OLD_PATH, 'utf8'));
  const removedIds = oldTools.map(t => t.id).filter(id => !idSet.has(id));
  if (removedIds.length !== 20) logError(`Expected 20 removed IDs, found ${removedIds.length}`);
  
  // Whitelist stats
  const wlStats = {};
  WHITELIST_FIELDS.forEach(f => wlStats[f] = 0);
  stagedTools.forEach(t => {
    WHITELIST_FIELDS.forEach(f => {
      if (t[f]) wlStats[f]++;
    });
  });

  // Verification against workbook for authoritative protection
  const catalogRaw = XLSX.utils.sheet_to_json(workbook.Sheets['Catalog'], { defval: null });
  const wbMap = new Map(catalogRaw.map(r => [r.id, r]));
  let authErrors = 0;
  
  stagedTools.forEach(tool => {
    const orig = wbMap.get(tool.id);
    if (!orig) return; // handled by ID check
    
    if (tool.canonicalName !== orig.canonicalName) { logError(`canonicalName overwritten on ${tool.id}`); authErrors++; }
    if (tool.primaryCategory !== orig.primaryCategory) { logError(`primaryCategory overwritten on ${tool.id}`); authErrors++; }
    if (orig.website_url !== 'null' && orig.website_url !== null && orig.website_url !== '' && tool.website_url !== orig.website_url) { 
        logError(`website_url overwritten on ${tool.id}`); authErrors++; 
    }
    if (tool.pricingModel !== orig.pricingModel) { logError(`pricingModel overwritten on ${tool.id}`); authErrors++; }
  });

  if (errors > 0) {
    console.error(`\n[FAIL] Validation failed with ${errors} errors.`);
    process.exit(1);
  }

  console.log(`[SUCCESS] Validation passed.`);
  console.log(`Recommendation Ineligible Records (3):`, recIneligibleIds);
  console.log(`Legacy Whitelist Stats:`, wlStats);
}

run();
