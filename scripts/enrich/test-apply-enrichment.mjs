#!/usr/bin/env node

/**
 * scripts/enrich/test-apply-enrichment.mjs
 *
 * Comprehensive Test Suite for the Reusable Enrichment Engine.
 * Tests historical replay, isolated synthetic transactions, idempotency,
 * disclosure rendering compatibility, and all failure injection scenarios.
 *
 * Directive: WhichAIPick MCD v2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import XLSX from 'xlsx';

import { applyEnrichment, DISCLOSURE_RENDER_REGEX } from './apply-enrichment.mjs';

const require = createRequire(import.meta.url);
const NODE_MODULES_PATH = path.dirname(path.dirname(require.resolve('xlsx')));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

/**
 * Helper to create an isolated temporary workspace for testing mutations
 */
function createIsolatedWorkspace() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whichaipick-engine-test-'));

  // Create required subdirectories
  fs.mkdirSync(path.join(tmpDir, 'data', 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'data', 'release'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'scripts'), { recursive: true });

  // Copy data assets
  fs.copyFileSync(path.join(ROOT, 'data', 'tools.json'), path.join(tmpDir, 'data', 'tools.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'tools.phase11.staged.json'), path.join(tmpDir, 'data', 'tools.phase11.staged.json'));
  fs.copyFileSync(
    path.join(ROOT, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx'),
    path.join(tmpDir, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx')
  );
  fs.copyFileSync(path.join(ROOT, 'data', 'evidence', 'phase11-evidence-ledger.json'), path.join(tmpDir, 'data', 'evidence', 'phase11-evidence-ledger.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'comparison-index.json'), path.join(tmpDir, 'data', 'comparison-index.json'));
  fs.copyFileSync(path.join(ROOT, 'data', 'content-enrichment-backlog.json'), path.join(tmpDir, 'data', 'content-enrichment-backlog.json'));

  if (fs.existsSync(path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json'))) {
    fs.copyFileSync(
      path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json'),
      path.join(tmpDir, 'data', 'release', 'tool-page-v2-canary.json')
    );
  }

  // Copy scripts used by the pipeline
  fs.copyFileSync(path.join(ROOT, 'scripts', 'import-phase11-workbook.mjs'), path.join(tmpDir, 'scripts', 'import-phase11-workbook.mjs'));
  fs.copyFileSync(path.join(ROOT, 'scripts', 'generate-comparison-index.mjs'), path.join(tmpDir, 'scripts', 'generate-comparison-index.mjs'));
  fs.copyFileSync(path.join(ROOT, 'scripts', 'reconcile-content-backlog.mjs'), path.join(tmpDir, 'scripts', 'reconcile-content-backlog.mjs'));

  // Copy package.json so type: module is preserved
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(tmpDir, 'package.json'));

  // Symlink node_modules so dependencies like xlsx are available
  try {
    fs.symlinkSync(NODE_MODULES_PATH, path.join(tmpDir, 'node_modules'), 'dir');
  } catch (e) {
    // If symlink fails, ignore if node can resolve from parent
  }

  return tmpDir;
}

/**
 * Clean up isolated workspace
 */
function cleanupWorkspace(tmpDir) {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Create a valid synthetic batch payload for testing
 */
function createSyntheticBatchPayload(toolId = 'ai-studios', overrides = {}) {
  const defaultPayload = {
    batchId: 'batch-synthetic-test',
    researchDate: '2026-11-06',
    description: 'Synthetic editorial enrichment test payload for isolated verification.',
    targetToolIds: [toolId],
    tools: {
      [toolId]: {
        shortDescription: 'AI Studios provides generative AI video creation tools for converting scripts into presenter videos using synthetic avatars.',
        sourceSummary: "Research-based profile using AI Studios official product and pricing documentation reviewed on 6 November 2026. Features and plan limits are vendor-stated; no independent rendering quality or latency benchmarks are claimed.",
        long_description: '<p>AI Studios by DeepBrain AI is a video generation platform that enables users to create presenter-led videos from text scripts. It provides customizable virtual avatars, text-to-speech narration across multiple languages, and integrated video templates for corporate training, marketing, and education.</p><p>Users can select avatar models, adjust pronunciation and pacing, and upload custom presentation assets to produce finished video presentations without studio recording equipment.</p><p>The platform offers tiered subscription plans based on monthly video generation credits, alongside enterprise options for custom avatar creation and team collaboration.</p>',
        how_it_works: '<p>Users enter a text script, select an avatar and voice, and choose a presentation template. The platform synthesizes speech and synchronizes lip movements and expressions to generate the final video file.</p><p>Completed videos can be edited with captions, transitions, and branding elements before exporting to standard video formats.</p><p>Higher-tier plans increase generation duration allowances and unlock custom avatar training capabilities.</p>',
        feature_groups: [
          {
            group: 'Avatar Generation',
            items: [
              'Customizable digital presenter avatars with lip-sync.',
              'Text-to-speech narration in multiple languages.',
              'Custom avatar creation options for enterprise accounts.'
            ]
          },
          {
            group: 'Video Production',
            items: [
              'Pre-built video templates for corporate communications.',
              'Subtitle generation and multi-language translation.',
              'Timeline editing controls for visual assets and pacing.'
            ]
          },
          {
            group: 'Workflow and Integration',
            items: [
              'API access for automated batch video generation.',
              'Shared team workspaces for collaborative video editing.',
              'Direct export to common digital video formats.'
            ]
          }
        ],
        bestFor: [
          'Corporate training teams creating presenter-led instructional videos.',
          'Marketing teams producing multi-language product walkthroughs.',
          'Support teams generating standardized onboarding content.'
        ],
        notIdealFor: [
          'Filmmakers requiring complex cinematic camera movements.',
          'Users needing an open-source or self-hosted video generator.',
          'Teams requiring unlimited rendering on entry subscription tiers.'
        ],
        workflows: [
          {
            title: 'Training video generation',
            description: 'Convert documentation into an instructional video using a digital avatar presenter.'
          },
          {
            title: 'Multi-language announcement',
            description: 'Create localized marketing videos in multiple languages from a single English script.'
          },
          {
            title: 'Product feature demonstration',
            description: 'Combine screen recordings with an avatar narration to produce product onboarding videos.'
          }
        ],
        pros: [
          'Streamlines video production without cameras or actors.',
          'Supports wide variety of languages and avatar styles.',
          'Offers customizable branding and presentation templates.',
          'Provides developer API access on eligible plans.'
        ],
        cons: [
          'Video generation allowances are credit-limited on entry tiers.',
          'Avatar expressions may lack full natural variation in long videos.',
          'Enterprise custom avatar training requires separate setup fees.',
          'Self-hosted deployment options are not supported.'
        ],
        pricing_overview: '<p>AI Studios offers subscription tiers based on monthly video duration allowances, with Starter plans for individual creators and Pro or Enterprise plans for higher volume production.</p>',
        comparison_summary: '<p>Choose <strong>AI Studios</strong> for rapid avatar-based presentation creation. Consider <strong>Synthesia</strong> or <strong>HeyGen</strong> for comparable enterprise presenter features, or <strong>Runway</strong> for generative scene animation.</p>',
        pricingModel: 'freemium',
        hasFreeTier: false,
        hasFreeTrial: true,
        freeAccessType: 'trial_only',
        startingPrice: 29,
        priceCurrency: 'USD',
        billingPeriod: 'month',
        startingPlan: 'Starter',
        trialDays: 7,
        apiAvailable: true,
        platforms: ['web', 'api'],
        verificationSources: [
          'https://www.deepbrain.io/aistudios',
          'https://www.deepbrain.io/pricing'
        ],
        evidence: [
          {
            evidenceId: 'E9991',
            sourceURL: 'https://www.deepbrain.io/pricing',
            method: 'official_source_review',
            reviewedAt: '2026-11-06',
            finding: 'Official AI Studios product and pricing documentation reviewed 6 November 2026: Starter plan at $29/mo with 7-day trial verified.'
          }
        ]
      }
    }
  };

  return { ...defaultPayload, ...overrides };
}

async function runTestSuite() {
  console.log('======================================================');
  console.log('WHICHAIPICK REUSABLE ENRICHMENT ENGINE TEST SUITE');
  console.log('Directive: WhichAIPick MCD v2.0');
  console.log('======================================================\n');

  // ── SUITE 1: Historical Batch 4C Replay (Shadow Check) ────────────────────
  console.log('--- SUITE 1: Historical Batch 4C Shadow Replay ---');
  try {
    const replayResult = await applyEnrichment({
      batchPath: 'data/enrichment/fixtures/batch-4c-valid.json',
      mode: 'replay',
      dryRun: true,
      workspaceRoot: ROOT,
      verbose: false
    });

    assert(replayResult.success === true, 'Historical replay returns success=true');
    assert(replayResult.mode === 'replay', 'Replay mode reported correctly');
    assert(replayResult.dryRun === true, 'Replay executes in dry-run mode');
    assert(replayResult.auditedToolsCount === 5, 'Audited all 5 Batch 4C tools');
    assert(replayResult.driftCount === 0, 'Zero field drift detected against baseline catalogue');

    // Verify tracked repository files remain untouched
    const gitStatus = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
    const trackedModified = gitStatus.split('\n').filter(l => l && !l.startsWith('??'));
    assert(trackedModified.length === 0, 'Historical replay did NOT mutate any tracked repository files');

  } catch (err) {
    assert(false, `Historical replay failed with unexpected error: ${err.message}`);
  }

  // ── SUITE 2: Isolated Synthetic NEW-Mode Transaction ──────────────────────
  console.log('\n--- SUITE 2: Isolated Synthetic NEW-Mode Transaction ---');
  const tmpWorkspace = createIsolatedWorkspace();

  try {
    const syntheticPayload = createSyntheticBatchPayload('ai-studios');
    const payloadPath = path.join(tmpWorkspace, 'batch-synthetic.json');
    fs.writeFileSync(payloadPath, JSON.stringify(syntheticPayload, null, 2), 'utf8');

    // Snapshot pre-state
    const preTools = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'tools.json'), 'utf8'));
    const preBacklog = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'content-enrichment-backlog.json'), 'utf8'));
    const preLedger = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'evidence', 'phase11-evidence-ledger.json'), 'utf8'));

    // 2.1 Dry-Run Test
    const dryRunResult = await applyEnrichment({
      batchPath: 'batch-synthetic.json',
      mode: 'new',
      dryRun: true,
      workspaceRoot: tmpWorkspace,
      verbose: false
    });

    assert(dryRunResult.success === true, 'Dry-run returns success=true');
    assert(dryRunResult.dryRun === true, 'Dry-run reported as true');

    const postDryTools = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'tools.json'), 'utf8'));
    assert(JSON.stringify(preTools) === JSON.stringify(postDryTools), 'Dry-run caused ZERO writes to tools.json');

    // 2.2 Apply Transaction Test
    const applyResult = await applyEnrichment({
      batchPath: 'batch-synthetic.json',
      mode: 'new',
      apply: true,
      workspaceRoot: tmpWorkspace,
      verbose: false
    });

    assert(applyResult.success === true, 'Apply transaction returns success=true');
    assert(applyResult.enrichedCount === 1, 'Exactly 1 tool enriched in transaction');

    // Verify post-mutation assets in temporary workspace
    const postTools = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'tools.json'), 'utf8'));
    const postStaged = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'tools.phase11.staged.json'), 'utf8'));
    const postLedger = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'evidence', 'phase11-evidence-ledger.json'), 'utf8'));
    const postBacklog = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'content-enrichment-backlog.json'), 'utf8'));
    const postIndex = JSON.parse(fs.readFileSync(path.join(tmpWorkspace, 'data', 'comparison-index.json'), 'utf8'));

    // 100% Byte-for-byte staged vs published parity
    const toolsRaw = fs.readFileSync(path.join(tmpWorkspace, 'data', 'tools.json'), 'utf8');
    const stagedRaw = fs.readFileSync(path.join(tmpWorkspace, 'data', 'tools.phase11.staged.json'), 'utf8');
    assert(toolsRaw === stagedRaw, 'Published tools.json and staged catalogue have 100% byte-for-byte parity');

    // Target tool fields updated
    const enrichedTool = postTools.find(t => t.id === 'ai-studios');
    assert(enrichedTool.editorialStatus === 'source_based_summary', 'Target tool editorialStatus updated to source_based_summary');
    assert(enrichedTool.workflows?.length === 3, 'Target tool workflows attached correctly (3 workflows)');
    assert(enrichedTool.how_it_works?.length > 100, 'Target tool how_it_works attached correctly');
    assert(enrichedTool.startingPrice === 29, 'Target tool startingPrice updated to 29');
    assert(enrichedTool.evidenceIds.includes('E9991'), 'Target tool evidenceIds includes new E9991');

    // Authoritative Workbook updated
    const wb = XLSX.readFile(path.join(tmpWorkspace, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx'));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Catalog']);
    const wbRow = rows.find(r => r.id === 'ai-studios');
    assert(wbRow.editorialStatus === 'source_based_summary', 'Excel row editorialStatus updated');
    assert(wbRow.startingPrice === 29, 'Excel row startingPrice updated to 29');
    assert(wbRow.evidenceIds.includes('E9991'), 'Excel row evidenceIds synchronized');

    // Evidence ledger updated
    const newLedgerRecord = postLedger.find(e => e.evidenceId === 'E9991');
    assert(newLedgerRecord !== undefined, 'Evidence record E9991 successfully inserted into ledger');
    assert(newLedgerRecord?.id === 'ai-studios', 'Evidence record linked to correct tool id');
    assert(postLedger.length === preLedger.length + 1, 'Evidence ledger count incremented by exactly 1');

    // Comparison index updated
    assert(postIndex.length === 881, 'Comparison index preserves 881 tools');
    const indexTool = postIndex.find(t => t.id === 'ai-studios');
    assert(indexTool !== undefined, 'Enriched tool present in comparison index');

    // Backlog reconciled
    assert(postBacklog.counts.totalTools === 881, 'Backlog preserves total 881 tools');
    assert(postBacklog.counts.skeletalV1 === preBacklog.counts.skeletalV1 - 1, 'Skeletal backlog count decreased by 1');
    assert(postBacklog.counts.richV1 === preBacklog.counts.richV1 + 1, 'Rich V1 count increased by 1');

    // Non-target invariant: 880 tools unchanged
    let nonTargetMismatches = 0;
    for (const tool of postTools) {
      if (tool.id !== 'ai-studios') {
        const orig = preTools.find(t => t.id === tool.id);
        if (JSON.stringify(tool) !== JSON.stringify(orig)) {
          nonTargetMismatches++;
        }
      }
    }
    assert(nonTargetMismatches === 0, 'All 880 non-target tools remained 100% untouched');

    // 2.3 Idempotency & Re-application Protection
    let secondRunError = null;
    try {
      await applyEnrichment({
        batchPath: 'batch-synthetic.json',
        mode: 'new',
        apply: true,
        workspaceRoot: tmpWorkspace,
        verbose: false
      });
    } catch (err) {
      secondRunError = err.message;
    }
    assert(secondRunError !== null, 'Second application of same batch in mode=new is rejected (fail closed)');
    assert(secondRunError?.includes('TARGET_NOT_SKELETAL_V1'), 'Rejection error specifies TARGET_NOT_SKELETAL_V1');

  } catch (err) {
    assert(false, `Isolated synthetic transaction failed: ${err.message}`);
  } finally {
    cleanupWorkspace(tmpWorkspace);
  }

  // ── SUITE 3: Failure Injections & Rollback Verification ───────────────────
  console.log('\n--- SUITE 3: Failure Injections & Rollback Verification ---');

  // Test 3.1: Invalid JSON
  const tmpFail = createIsolatedWorkspace();
  try {
    const badJsonPath = path.join(tmpFail, 'bad.json');
    fs.writeFileSync(badJsonPath, '{ invalid json syntax ...', 'utf8');

    let errCaught = false;
    try {
      await applyEnrichment({ batchPath: 'bad.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      errCaught = true;
    }
    assert(errCaught, 'Invalid JSON syntax rejected cleanly');

    // Test 3.2: Target ID mismatch
    const badTargetPayload = createSyntheticBatchPayload('ai-studios', {
      targetToolIds: ['ai-studios', 'mismatched-tool-id']
    });
    fs.writeFileSync(path.join(tmpFail, 'bad-target.json'), JSON.stringify(badTargetPayload), 'utf8');
    let targetMismatchErr = false;
    try {
      await applyEnrichment({ batchPath: 'bad-target.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      targetMismatchErr = true;
    }
    assert(targetMismatchErr, 'Target ID mismatch rejected cleanly');

    // Test 3.3: Missing evidence
    const noEvidencePayload = createSyntheticBatchPayload('ai-studios');
    noEvidencePayload.tools['ai-studios'].evidence = [];
    fs.writeFileSync(path.join(tmpFail, 'no-evidence.json'), JSON.stringify(noEvidencePayload), 'utf8');
    let noEvidenceErr = false;
    try {
      await applyEnrichment({ batchPath: 'no-evidence.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      noEvidenceErr = e.message.includes('EVIDENCE_EMPTY');
    }
    assert(noEvidenceErr, 'Missing evidence array rejected cleanly (EVIDENCE_EMPTY)');

    // Test 3.4: Invalid pricing model
    const badPricingPayload = createSyntheticBatchPayload('ai-studios');
    badPricingPayload.tools['ai-studios'].pricingModel = 'super_cheap';
    fs.writeFileSync(path.join(tmpFail, 'bad-pricing.json'), JSON.stringify(badPricingPayload), 'utf8');
    let badPricingErr = false;
    try {
      await applyEnrichment({ batchPath: 'bad-pricing.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      badPricingErr = e.message.includes('ENUM_INVALID_PRICING_MODEL') || e.message.includes('PRICING_MODEL');
    }
    assert(badPricingErr, 'Invalid pricing model rejected cleanly (ENUM_INVALID_PRICING_MODEL)');

    // Test 3.5: Missing workflow description
    const badWorkflowPayload = createSyntheticBatchPayload('ai-studios');
    badWorkflowPayload.tools['ai-studios'].workflows[0] = { title: 'Workflow without description' };
    fs.writeFileSync(path.join(tmpFail, 'bad-workflow.json'), JSON.stringify(badWorkflowPayload), 'utf8');
    let badWorkflowErr = false;
    try {
      await applyEnrichment({ batchPath: 'bad-workflow.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      badWorkflowErr = e.message.includes('WORKFLOW_') || e.message.includes('missing title or description');
    }
    assert(badWorkflowErr, 'Malformed workflow item rejected cleanly');

    // Test 3.6: Incompatible disclosure wording
    const badDisclosurePayload = createSyntheticBatchPayload('ai-studios');
    badDisclosurePayload.tools['ai-studios'].sourceSummary = 'A simple description with no disclosure or vendor attribution.';
    fs.writeFileSync(path.join(tmpFail, 'bad-disclosure.json'), JSON.stringify(badDisclosurePayload), 'utf8');
    let badDisclosureErr = false;
    try {
      await applyEnrichment({ batchPath: 'bad-disclosure.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      badDisclosureErr = e.message.includes('DISCLOSURE_') || e.message.includes('disclosure rendering compatibility');
    }
    assert(badDisclosureErr, 'Incompatible sourceSummary disclosure wording rejected before static generation');

    // Test 3.7: Cross-tool evidence collision
    const collisionPayload = createSyntheticBatchPayload('ai-studios');
    collisionPayload.tools['ai-studios'].evidence = [
      {
        evidenceId: 'E0001', // Already belongs to 10web in the ledger
        sourceURL: 'https://www.deepbrain.io/pricing',
        method: 'official_source_review',
        reviewedAt: '2026-11-06',
        finding: 'Synthetic collision test finding.'
      }
    ];
    fs.writeFileSync(path.join(tmpFail, 'collision.json'), JSON.stringify(collisionPayload), 'utf8');
    let collisionErr = false;
    try {
      await applyEnrichment({ batchPath: 'collision.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      collisionErr = e.message.includes('collision') || e.message.includes('EVIDENCE_ID_ALREADY_EXISTS');
    }
    assert(collisionErr, 'Cross-tool evidence ID collision rejected in preflight');

    // Test 3.8: Prohibited hype language
    const hypePayload = createSyntheticBatchPayload('ai-studios');
    hypePayload.tools['ai-studios'].shortDescription = 'This game changer tool creates crazy powerful videos for everyone.';
    fs.writeFileSync(path.join(tmpFail, 'hype.json'), JSON.stringify(hypePayload), 'utf8');
    let hypeErr = false;
    try {
      await applyEnrichment({ batchPath: 'hype.json', mode: 'new', dryRun: true, workspaceRoot: tmpFail });
    } catch (e) {
      hypeErr = e.message.includes('TEXT_PROHIBITED_HYPE') || e.message.includes('HYPE');
    }
    assert(hypeErr, 'Prohibited hype language rejected in preflight');

    // Test 3.9: Ambiguous CLI flags
    let flagErr = false;
    try {
      await applyEnrichment({ batchPath: 'batch-synthetic.json', mode: 'new', dryRun: true, apply: true, workspaceRoot: tmpFail });
    } catch (e) {
      flagErr = e.message.includes('Ambiguous action flags');
    }
    assert(flagErr, 'Mutually exclusive --dry-run and --apply rejected');

    // Test 3.10: Forbidden replay with apply
    let replayApplyErr = false;
    try {
      await applyEnrichment({ batchPath: 'batch-synthetic.json', mode: 'replay', apply: true, workspaceRoot: tmpFail });
    } catch (e) {
      replayApplyErr = e.message.includes('forbidden in replay mode');
    }
    assert(replayApplyErr, 'Replay mode with --apply forbidden');

    // Test 3.11: Atomic Rollback on Mid-Transaction Failure
    const preRollbackHash = fs.readFileSync(path.join(tmpFail, 'data', 'tools.json'), 'utf8');
    // Corrupt the workbook path temporarily to simulate write failure
    const realWorkbook = path.join(tmpFail, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
    const corruptWorkbook = realWorkbook + '.corrupt';
    fs.renameSync(realWorkbook, corruptWorkbook);

    let rollbackTriggered = false;
    try {
      await applyEnrichment({
        batchPath: 'batch-synthetic.json',
        mode: 'new',
        apply: true,
        workspaceRoot: tmpFail
      });
    } catch (e) {
      rollbackTriggered = true;
    }
    assert(rollbackTriggered, 'Transaction aborted on simulated infrastructure error');

    // Restore real workbook
    if (fs.existsSync(corruptWorkbook)) {
      fs.renameSync(corruptWorkbook, realWorkbook);
    }

  } finally {
    cleanupWorkspace(tmpFail);
  }

  // ── SUITE 4: Final Clean Repository Status Verification ───────────────────
  console.log('\n--- SUITE 4: Clean Repository Integrity Check ---');
  const finalGitStatus = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
  const trackedDirty = finalGitStatus.split('\n').filter(l => l && !l.startsWith('??'));
  assert(trackedDirty.length === 0, 'Zero tracked repository files modified during test execution');

  console.log('\n======================================================');
  console.log(`TOTAL ENGINE TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  if (failedTests === 0) {
    console.log('🎉 ALL REUSABLE ENRICHMENT ENGINE TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error('❌ ENGINE TESTS FAILED!');
    console.log('======================================================\n');
    process.exit(1);
  }
}

// Direct execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runTestSuite().catch(err => {
    console.error('FATAL TEST RUNNER ERROR:', err);
    process.exit(1);
  });
}
