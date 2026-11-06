#!/usr/bin/env node

/**
 * scripts/enrich/apply-enrichment.mjs
 *
 * Reusable Enrichment Engine for WhichAIPick Editorial Batches.
 * Enforces declarative batch contracts, authoritative workbook synchronization,
 * evidence ledger reconciliation, and atomic rollback under WhichAIPick MCD v2.0.
 *
 * Usage:
 *   node scripts/enrich/apply-enrichment.mjs --batch=<path> --mode=<new|replay> [--dry-run|--apply] [--workspace-root=<path>] [--json] [--verbose]
 *
 * Hard Rules:
 *   - Strictly fail closed: aborts and rolls back on any validation, calculation, or parity failure.
 *   - Explicit mode required: '--mode=new' (strictly skeletal backlog) or '--mode=replay' (historical regression).
 *   - Explicit action required: exactly one of '--dry-run' or '--apply'.
 *   - Replay mode is strictly read-only shadow check: '--apply' is forbidden in replay mode.
 *   - Zero repository mutation in '--dry-run' mode.
 *   - Workbook remains authoritative for its existing fields.
 *   - Whitelisted nested editorial fields survive imports via legacy merging.
 *   - Evidence ledger records and comparison index are deterministically updated.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import XLSX from 'xlsx';

import { validateBatch } from './validate-batch.mjs';

const require = createRequire(import.meta.url);
const NODE_MODULES_PATH = path.dirname(path.dirname(require.resolve('xlsx')));
const EXEC_ENV = {
  ...process.env,
  NODE_PATH: process.env.NODE_PATH ? `${process.env.NODE_PATH}:${NODE_MODULES_PATH}` : NODE_MODULES_PATH
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');

// Approved disclosure regex used by static generator
export const DISCLOSURE_RENDER_REGEX = /(?:research-based profile|source-researched|researched from|based on (?:published|bland ai|[a-z0-9 -]+ official))/i;

// Whitelisted nested fields preserved from tools.json during workbook import
export const WHITELIST_FIELDS = Object.freeze([
  'affiliate_url',
  'tags',
  'how_it_works',
  'workflows',
  'feature_groups',
  'pros',
  'cons',
  'pricing_overview',
  'comparison_summary'
]);

/**
 * Perform backup of critical files for atomic rollback
 */
function backupFiles(filePaths, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      const destPath = path.join(backupDir, path.basename(filePath));
      fs.copyFileSync(filePath, destPath);
    }
  }
}

/**
 * Restore files from backup directory
 */
function restoreFiles(filePaths, backupDir) {
  for (const filePath of filePaths) {
    const srcPath = path.join(backupDir, path.basename(filePath));
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, filePath);
    }
  }
}

/**
 * Remove backup directory cleanly
 */
function removeBackup(backupDir) {
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
}

/**
 * Main programmatic engine API
 */
export async function applyEnrichment(options = {}) {
  const {
    batchPath,
    mode,
    dryRun = false,
    apply = false,
    workspaceRoot = DEFAULT_ROOT,
    verbose = false,
    logger = console.log
  } = options;

  // 1. Argument & Action Preflight
  if (!batchPath) {
    throw new Error('[ENGINE ERROR] Missing required argument: batchPath');
  }
  if (!mode || (mode !== 'new' && mode !== 'replay')) {
    throw new Error(`[ENGINE ERROR] Invalid mode "${mode}". Mode must be explicitly specified as "new" or "replay".`);
  }
  if ((dryRun && apply) || (!dryRun && !apply)) {
    throw new Error('[ENGINE ERROR] Ambiguous action flags. Exactly one of --dry-run or --apply must be specified.');
  }
  if (mode === 'replay' && apply) {
    throw new Error('[ENGINE ERROR] Replay mode is strictly read-only shadow validation. The --apply flag is forbidden in replay mode.');
  }

  // 2. Resolve Paths
  const resolvedBatchPath = path.resolve(workspaceRoot, batchPath);
  if (!fs.existsSync(resolvedBatchPath)) {
    throw new Error(`[ENGINE ERROR] Batch payload file not found: ${resolvedBatchPath}`);
  }

  const toolsJsonPath = path.join(workspaceRoot, 'data', 'tools.json');
  const stagedJsonPath = path.join(workspaceRoot, 'data', 'tools.phase11.staged.json');
  const workbookPath = path.join(workspaceRoot, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
  const ledgerPath = path.join(workspaceRoot, 'data', 'evidence', 'phase11-evidence-ledger.json');
  const comparisonIndexPath = path.join(workspaceRoot, 'data', 'comparison-index.json');
  const backlogPath = path.join(workspaceRoot, 'data', 'content-enrichment-backlog.json');

  const requiredFiles = [
    toolsJsonPath,
    stagedJsonPath,
    workbookPath,
    ledgerPath,
    comparisonIndexPath,
    backlogPath
  ];

  for (const rf of requiredFiles) {
    if (!fs.existsSync(rf)) {
      throw new Error(`[ENGINE ERROR] Required pipeline asset missing: ${rf}`);
    }
  }

  // 3. Parse Batch Payload
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(resolvedBatchPath, 'utf8'));
  } catch (err) {
    throw new Error(`[ENGINE ERROR] Failed to parse batch JSON: ${err.message}`);
  }

  // 4. Load Pipeline State
  const toolsCatalog = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf8'));
  const backlogManifest = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
  const evidenceLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  // 5. Preflight Phase A: Declarative Contract Validation
  const validationResult = validateBatch(payload, {
    mode,
    batchFilePath: resolvedBatchPath,
    toolsCatalog,
    backlogManifest
  });

  if (!validationResult.isValid) {
    const errorDetails = validationResult.issues.map(i => `[${i.code}] ${i.message}`).join('; ');
    throw new Error(`[ENGINE PREFLIGHT REJECTED] Contract validation failed with ${validationResult.errorCount} error(s): ${errorDetails}`);
  }

  const targetToolIds = payload.targetToolIds;

  // 6. Preflight Phase B: Transparency / Provenance Disclosure Compatibility Check
  for (const toolId of targetToolIds) {
    const toolData = payload.tools[toolId];
    const sourceSummary = (toolData.sourceSummary || '').trim();
    if (!DISCLOSURE_RENDER_REGEX.test(sourceSummary)) {
      throw new Error(
        `[ENGINE PREFLIGHT REJECTED] Tool "${toolId}" sourceSummary failed disclosure rendering compatibility check. ` +
        `Static generator regex will not recognise its disclosure wording, causing transparency notes to silently disappear.`
      );
    }

    if (!Array.isArray(toolData.workflows) || toolData.workflows.length === 0) {
      throw new Error(`[ENGINE PREFLIGHT REJECTED] Tool "${toolId}" workflows must be a non-empty array.`);
    }
    for (let wIdx = 0; wIdx < toolData.workflows.length; wIdx++) {
      const w = toolData.workflows[wIdx];
      if (!w || typeof w !== 'object' || !w.title || !w.description) {
        throw new Error(`[ENGINE PREFLIGHT REJECTED] Tool "${toolId}" workflow[${wIdx}] missing title or description.`);
      }
    }
  }

  // 7. Preflight Phase C: Evidence Ledger Cross-Tool Collision Check
  const ledgerMap = new Map();
  for (const entry of evidenceLedger) {
    ledgerMap.set(entry.evidenceId, entry);
  }

  for (const toolId of targetToolIds) {
    const toolData = payload.tools[toolId];
    if (Array.isArray(toolData.evidence)) {
      for (const ev of toolData.evidence) {
        const existingEntry = ledgerMap.get(ev.evidenceId);
        if (existingEntry && existingEntry.id !== toolId) {
          throw new Error(
            `[ENGINE PREFLIGHT REJECTED] Evidence ID collision: "${ev.evidenceId}" is already assigned to tool "${existingEntry.id}", ` +
            `cannot be assigned to "${toolId}".`
          );
        }
      }
    }
  }

  // 8. In-Memory Calculation & Planned Transformations
  const plannedToolUpdates = new Map();
  const plannedWorkbookRows = new Map();
  const plannedLedgerEntries = [];
  const plannedEvidenceIdsByTool = new Map();

  for (const toolId of targetToolIds) {
    const sourceData = payload.tools[toolId];
    const existingTool = toolsCatalog.find(t => t.id === toolId);
    if (!existingTool) {
      throw new Error(`[ENGINE ERROR] Target tool "${toolId}" missing from catalogue.`);
    }

    // Determine evidence IDs
    const newEvidenceIds = Array.isArray(sourceData.evidence)
      ? sourceData.evidence.map(e => e.evidenceId)
      : [];
    const mergedEvidenceIds = Array.from(new Set([...(existingTool.evidenceIds || []), ...newEvidenceIds]));
    plannedEvidenceIdsByTool.set(toolId, mergedEvidenceIds);

    // Build updated catalogue tool object
    const updatedTool = { ...existingTool };
    updatedTool.shortDescription = sourceData.shortDescription;
    updatedTool.sourceSummary = sourceData.sourceSummary;
    updatedTool.description = sourceData.sourceSummary || sourceData.shortDescription;
    updatedTool.long_description = sourceData.long_description;
    updatedTool.bestFor = sourceData.bestFor;
    updatedTool.best_for = sourceData.bestFor;
    updatedTool.notIdealFor = sourceData.notIdealFor;
    updatedTool.workflows = sourceData.workflows;
    updatedTool.how_it_works = sourceData.how_it_works;
    updatedTool.feature_groups = sourceData.feature_groups;
    updatedTool.pros = sourceData.pros;
    updatedTool.cons = sourceData.cons;
    updatedTool.pricing_overview = sourceData.pricing_overview;
    updatedTool.comparison_summary = sourceData.comparison_summary;
    updatedTool.pricingModel = sourceData.pricingModel;
    updatedTool.pricing_model = sourceData.pricingModel;
    updatedTool.hasFreeTier = sourceData.hasFreeTier;
    updatedTool.has_free_tier = sourceData.hasFreeTier;
    updatedTool.hasFreeTrial = sourceData.hasFreeTrial;
    updatedTool.startingPrice = sourceData.startingPrice;
    updatedTool.priceCurrency = sourceData.priceCurrency;
    updatedTool.billingPeriod = sourceData.billingPeriod;
    updatedTool.startingPlan = sourceData.startingPlan;
    updatedTool.trialDays = sourceData.trialDays;
    updatedTool.apiAvailable = sourceData.apiAvailable;
    updatedTool.platforms = sourceData.platforms;

    if (sourceData.targetUsers !== undefined) updatedTool.targetUsers = sourceData.targetUsers;
    if (sourceData.freeAccessType !== undefined) updatedTool.freeAccessType = sourceData.freeAccessType;
    if (sourceData.freeTierScope !== undefined) updatedTool.freeTierScope = sourceData.freeTierScope;
    if (sourceData.pricingScope !== undefined) updatedTool.pricingScope = sourceData.pricingScope;
    if (sourceData.licenseType !== undefined) updatedTool.licenseType = sourceData.licenseType;
    if (sourceData.licenseName !== undefined) updatedTool.licenseName = sourceData.licenseName;
    if (sourceData.deploymentModes !== undefined) updatedTool.deploymentModes = sourceData.deploymentModes;

    updatedTool.verificationSources = sourceData.verificationSources;
    updatedTool.reviewedAt = payload.researchDate || sourceData.reviewedAt || existingTool.reviewedAt;
    updatedTool.editorialStatus = 'source_based_summary';
    updatedTool.evidenceIds = mergedEvidenceIds;

    // Determine paidPlanAvailable
    if (sourceData.pricingModel === 'paid' || sourceData.pricingModel === 'freemium' || (typeof sourceData.startingPrice === 'number' && sourceData.startingPrice > 0)) {
      updatedTool.paidPlanAvailable = true;
    } else if (sourceData.pricingModel === 'free') {
      updatedTool.paidPlanAvailable = false;
    }

    plannedToolUpdates.set(toolId, updatedTool);

    // Build evidence ledger records
    if (Array.isArray(sourceData.evidence)) {
      for (const ev of sourceData.evidence) {
        let fieldScope = ev.fieldScope;
        if (!fieldScope) {
          const existingLedgerRecord = ledgerMap.get(ev.evidenceId);
          if (existingLedgerRecord && existingLedgerRecord.fieldScope) {
            fieldScope = existingLedgerRecord.fieldScope;
          } else {
            fieldScope = JSON.stringify([
              'targetUsers', 'pricingModel', 'hasFreeTier', 'hasFreeTrial', 'paidPlanAvailable',
              'startingPrice', 'priceCurrency', 'billingPeriod', 'startingPlan', 'trialDays',
              'platforms', 'apiAvailable', 'deploymentModes', 'bestFor', 'notIdealFor',
              'freeAccessType', 'canonicalName', 'website_url', 'operationalStatus', 'sourceSummary',
              'pricingScope', 'freeTierScope', 'capabilityScope', 'audienceTags', 'primaryCategory',
              'primaryUseCases', 'targetUserDetails', 'long_description', 'shortDescription'
            ]);
          }
        } else if (typeof fieldScope !== 'string') {
          fieldScope = JSON.stringify(fieldScope);
        }

        plannedLedgerEntries.push({
          evidenceId: ev.evidenceId,
          id: toolId,
          fieldScope,
          sourceURL: ev.sourceURL,
          reviewedAt: ev.reviewedAt || payload.researchDate,
          method: ev.method,
          finding: ev.finding
        });
      }
    }
  }

  // 9. Replay Mode Shadow Verification
  if (mode === 'replay') {
    let replayDifferences = 0;
    const diffLog = [];

    for (const toolId of targetToolIds) {
      const computed = plannedToolUpdates.get(toolId);
      const baseline = toolsCatalog.find(t => t.id === toolId);

      const fieldsToCheck = [
        'shortDescription', 'sourceSummary', 'long_description', 'how_it_works',
        'feature_groups', 'bestFor', 'notIdealFor', 'workflows', 'pros', 'cons',
        'pricing_overview', 'comparison_summary', 'pricingModel', 'hasFreeTier',
        'hasFreeTrial', 'startingPrice', 'priceCurrency', 'billingPeriod',
        'startingPlan', 'trialDays', 'apiAvailable', 'platforms'
      ];

      for (const field of fieldsToCheck) {
        const compVal = JSON.stringify(computed[field] ?? null);
        const baseVal = JSON.stringify(baseline[field] ?? null);
        if (compVal !== baseVal) {
          replayDifferences++;
          diffLog.push(`[DIFF on ${toolId}.${field}] computed=${compVal} vs baseline=${baseVal}`);
        }
      }
    }

    if (replayDifferences > 0) {
      throw new Error(`[ENGINE REPLAY FAILED] Replay against baseline detected ${replayDifferences} field drift(s):\n${diffLog.join('\n')}`);
    }

    if (verbose) {
      logger(`[REPLAY PASS] 100% parity verified across all ${targetToolIds.length} target tool records with 0 drift.`);
    }

    return {
      success: true,
      mode: 'replay',
      dryRun: true,
      batchId: payload.batchId,
      targetToolIds,
      auditedToolsCount: targetToolIds.length,
      driftCount: 0,
      message: 'Replay shadow check passed with 100% baseline parity.'
    };
  }

  // 10. Dry-Run Reporting (NEW mode)
  if (dryRun) {
    if (verbose) {
      logger('======================================================');
      logger(`WHICHAIPICK ENRICHMENT ENGINE — DRY-RUN SUMMARY`);
      logger('======================================================');
      logger(`Batch ID:      ${payload.batchId}`);
      logger(`Mode:          ${mode.toUpperCase()}`);
      logger(`Target Tools:  ${targetToolIds.length} (${targetToolIds.join(', ')})`);
      logger(`Ledger Entries to Sync: ${plannedLedgerEntries.length}`);
      logger(`Writes to disk: NONE (Zero mutation)`);
      logger('======================================================');
    }

    return {
      success: true,
      mode: 'new',
      dryRun: true,
      batchId: payload.batchId,
      targetToolIds,
      plannedMutations: {
        toolCount: targetToolIds.length,
        ledgerEntriesCount: plannedLedgerEntries.length
      },
      message: 'Dry-run validation and shadow calculation completed successfully with zero disk writes.'
    };
  }

  // 11. Atomic Staging & Application Transaction (NEW mode + --apply)
  const backupTimestamp = Date.now();
  const backupDir = path.join(workspaceRoot, `.enrichment-backup-${backupTimestamp}`);

  const transactionFiles = [
    toolsJsonPath,
    stagedJsonPath,
    workbookPath,
    ledgerPath,
    comparisonIndexPath,
    backlogPath
  ];

  if (verbose) {
    logger(`[ENGINE TRANSACTION] Creating safety backup in ${backupDir}...`);
  }
  backupFiles(transactionFiles, backupDir);

  try {
    // Step 1: Update tools.json with all fields (whitelisted fields + flat fields)
    if (verbose) logger('[TRANSACTION 1/6] Staging tools.json in memory...');
    const updatedToolsCatalog = toolsCatalog.map(tool => {
      if (plannedToolUpdates.has(tool.id)) {
        return plannedToolUpdates.get(tool.id);
      }
      return tool;
    });

    fs.writeFileSync(toolsJsonPath, JSON.stringify(updatedToolsCatalog, null, 2), 'utf8');

    // Step 2: Synchronize Excel Workbook Catalog sheet
    if (verbose) logger(`[TRANSACTION 2/6] Synchronizing Excel workbook at ${workbookPath}...`);
    const wb = XLSX.readFile(workbookPath);
    const catalogSheet = wb.Sheets['Catalog'];
    if (!catalogSheet) {
      throw new Error('Workbook missing "Catalog" sheet.');
    }

    const rows = XLSX.utils.sheet_to_json(catalogSheet, { defval: null });
    let updatedWorkbookRows = 0;

    rows.forEach(row => {
      const toolId = row.id;
      if (plannedToolUpdates.has(toolId)) {
        const data = payload.tools[toolId];
        const mergedEvIds = plannedEvidenceIdsByTool.get(toolId) || [];

        row.bestFor = JSON.stringify(data.bestFor);
        row.notIdealFor = JSON.stringify(data.notIdealFor);
        row.platforms = JSON.stringify(data.platforms);
        row.apiAvailable = data.apiAvailable === true ? 'TRUE' : (data.apiAvailable === false ? 'FALSE' : null);
        row.long_description = data.long_description;
        row.sourceSummary = data.sourceSummary;
        row.shortDescription = data.shortDescription;
        row.editorialStatus = 'source_based_summary';
        row.pricingModel = data.pricingModel;
        row.hasFreeTier = data.hasFreeTier === true ? 'TRUE' : (data.hasFreeTier === false ? 'FALSE' : null);
        row.hasFreeTrial = data.hasFreeTrial === true ? 'TRUE' : (data.hasFreeTrial === false ? 'FALSE' : null);
        row.startingPrice = data.startingPrice;
        row.priceCurrency = data.priceCurrency;
        row.billingPeriod = data.billingPeriod;
        row.startingPlan = data.startingPlan;
        row.trialDays = data.trialDays;

        if (data.targetUsers !== undefined) row.targetUsers = data.targetUsers;
        if (data.freeAccessType !== undefined) row.freeAccessType = data.freeAccessType;
        if (data.freeTierScope !== undefined) row.freeTierScope = data.freeTierScope;
        if (data.pricingScope !== undefined) row.pricingScope = data.pricingScope;
        if (data.licenseType !== undefined) row.licenseType = data.licenseType;
        if (data.licenseName !== undefined) row.licenseName = data.licenseName;
        if (data.deploymentModes !== undefined) row.deploymentModes = JSON.stringify(data.deploymentModes);

        row.verificationSources = JSON.stringify(data.verificationSources);
        row.reviewedAt = payload.researchDate || data.reviewedAt;
        if (mergedEvIds.length > 0) {
          row.evidenceIds = JSON.stringify(mergedEvIds);
        }

        updatedWorkbookRows++;
      }
    });

    if (updatedWorkbookRows !== targetToolIds.length) {
      throw new Error(`Expected to update ${targetToolIds.length} workbook rows, updated ${updatedWorkbookRows}.`);
    }

    const newCatalogSheet = XLSX.utils.json_to_sheet(rows);
    wb.Sheets['Catalog'] = newCatalogSheet;
    XLSX.writeFile(wb, workbookPath);

    // Step 3: Run canonical import-phase11-workbook.mjs
    if (verbose) logger('[TRANSACTION 3/6] Running canonical import-phase11-workbook.mjs...');
    execSync('node scripts/import-phase11-workbook.mjs', { cwd: workspaceRoot, env: EXEC_ENV, stdio: 'pipe' });

    // Step 4: Copy staged catalogue to tools.json (ensuring 100% byte-for-byte parity)
    if (verbose) logger('[TRANSACTION 4/6] Copying tools.phase11.staged.json to tools.json for 100% parity...');
    fs.copyFileSync(stagedJsonPath, toolsJsonPath);

    // Step 5: Update Evidence Ledger
    if (verbose) logger('[TRANSACTION 5/6] Updating evidence ledger...');
    const currentLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const isLedgerArray = Array.isArray(currentLedger);
    const ledgerList = isLedgerArray ? currentLedger : Object.values(currentLedger);

    for (const newEntry of plannedLedgerEntries) {
      const existingIdx = ledgerList.findIndex(e => e.evidenceId === newEntry.evidenceId);
      if (existingIdx >= 0) {
        ledgerList[existingIdx] = { ...ledgerList[existingIdx], ...newEntry };
      } else {
        ledgerList.push(newEntry);
      }
    }

    fs.writeFileSync(ledgerPath, JSON.stringify(ledgerList, null, 2), 'utf8');

    // Step 6: Regenerate comparison index and reconcile backlog
    if (verbose) logger('[TRANSACTION 6/6] Regenerating comparison-index and reconciling backlog...');
    execSync('node scripts/generate-comparison-index.mjs', { cwd: workspaceRoot, env: EXEC_ENV, stdio: 'pipe' });
    execSync('node scripts/reconcile-content-backlog.mjs', { cwd: workspaceRoot, env: EXEC_ENV, stdio: 'pipe' });

    // Post-Mutation Integrity Checks
    const postTools = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf8'));
    const postStaged = JSON.parse(fs.readFileSync(stagedJsonPath, 'utf8'));
    const postIndex = JSON.parse(fs.readFileSync(comparisonIndexPath, 'utf8'));

    if (postTools.length !== 882) {
      throw new Error(`Post-mutation catalogue count invalid: expected 882, got ${postTools.length}`);
    }
    if (postStaged.length !== 882) {
      throw new Error(`Post-mutation staged catalogue count invalid: expected 882, got ${postStaged.length}`);
    }
    if (postIndex.length !== 882) {
      throw new Error(`Post-mutation comparison index count invalid: expected 882, got ${postIndex.length}`);
    }

    // Verify non-targets are completely unchanged
    const backupTools = JSON.parse(fs.readFileSync(path.join(backupDir, 'tools.json'), 'utf8'));
    const targetSet = new Set(targetToolIds);
    for (const tool of postTools) {
      if (!targetSet.has(tool.id)) {
        const orig = backupTools.find(t => t.id === tool.id);
        if (JSON.stringify(tool) !== JSON.stringify(orig)) {
          throw new Error(`Non-target tool "${tool.id}" was mutated during enrichment transaction.`);
        }
      }
    }

    // Clean up backup directory on success
    removeBackup(backupDir);

    if (verbose) {
      logger('======================================================');
      logger('✅ [SUCCESS] BATCH ENRICHMENT TRANSACTION COMMITTED SAFELY');
      logger(`   Batch ID:     ${payload.batchId}`);
      logger(`   Target Tools: ${targetToolIds.length} enriched (${targetToolIds.join(', ')})`);
      logger(`   Parity:       tools.json and tools.phase11.staged.json 100% synchronized`);
      logger('======================================================');
    }

    return {
      success: true,
      mode: 'new',
      dryRun: false,
      batchId: payload.batchId,
      targetToolIds,
      enrichedCount: targetToolIds.length,
      message: 'Batch enrichment transaction committed cleanly with full source-of-truth parity.'
    };

  } catch (txErr) {
    // Automatic Rollback
    if (verbose) {
      logger(`[ENGINE TRANSACTION FAILURE] ${txErr.message}`);
      logger(`[ROLLBACK] Restoring original assets from ${backupDir}...`);
    }
    restoreFiles(transactionFiles, backupDir);
    removeBackup(backupDir);

    throw new Error(`[ENGINE TRANSACTION ABORTED & ROLLED BACK] ${txErr.message}`);
  }
}

// ── CLI Runner ────────────────────────────────────────────────────────────

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    batchPath: null,
    mode: null,
    dryRun: false,
    apply: false,
    workspaceRoot: DEFAULT_ROOT,
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
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg.startsWith('--workspace-root=')) {
      options.workspaceRoot = path.resolve(process.cwd(), arg.slice(17));
    } else if (arg === '--workspace-root' && i + 1 < args.length) {
      options.workspaceRoot = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

export async function main() {
  const options = parseCliArgs();

  try {
    const result = await applyEnrichment(options);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    console.log('======================================================');
    console.log('WHICHAIPICK EDITORIAL ENRICHMENT ENGINE');
    console.log(`Directive: WhichAIPick MCD v2.0 | Mode: ${options.mode?.toUpperCase()}`);
    console.log('======================================================');
    console.log(`Batch ID:      ${result.batchId}`);
    console.log(`Action:        ${options.dryRun ? 'DRY-RUN (Zero Writes)' : 'APPLIED (Transaction Committed)'}`);
    console.log(`Target Tools:  ${result.targetToolIds.length} (${result.targetToolIds.join(', ')})`);
    console.log(`Result:        ✅ ${result.message}`);
    console.log('======================================================');
    process.exit(0);
  } catch (err) {
    if (options.json) {
      console.error(JSON.stringify({ success: false, error: err.message }, null, 2));
      process.exit(1);
    }

    console.error('======================================================');
    console.error('❌ WHICHAIPICK ENRICHMENT ENGINE ERROR');
    console.error('======================================================');
    console.error(err.message);
    console.error('======================================================');
    process.exit(1);
  }
}

// Run CLI when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
