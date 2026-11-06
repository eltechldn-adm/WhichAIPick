#!/usr/bin/env node

/**
 * scripts/enrich/test-validate-batch.mjs
 *
 * Comprehensive Test Harness for WhichAIPick Editorial Batch Dry-Run Validator.
 * Verifies positive fixtures, all 10 negative defect fixtures, mode boundaries,
 * and proves strict non-mutation of all protected catalogue & static site assets.
 *
 * Directive: WhichAIPick MCD v2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { validateBatch } from './validate-batch.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const FIXTURES_DIR = path.join(ROOT, 'data/enrichment/fixtures');

// ── Protected Files for Non-Mutation Verification ─────────────────────────
const PROTECTED_FILES = [
  'data/WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx',
  'data/tools.json',
  'data/tools.phase11.staged.json',
  'data/evidence/phase11-evidence-ledger.json',
  'data/comparison-index.json',
  'data/content-enrichment-backlog.json',
  'tools/clay/index.html',
  'tools/photoroom/index.html',
  'tools/10web/index.html',
  'category/development/index.html',
  'sitemap.xml'
];

function computeFileHash(filePath) {
  const fullPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return 'FILE_NOT_FOUND';
  const content = fs.readFileSync(fullPath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function captureProtectedHashes() {
  const hashes = {};
  for (const f of PROTECTED_FILES) {
    hashes[f] = computeFileHash(f);
  }
  return hashes;
}

// ── Test Runner ───────────────────────────────────────────────────────────

export function runValidationSuite() {
  console.log('======================================================');
  console.log('WHICHAIPICK BATCH VALIDATOR VERIFICATION SUITE');
  console.log('Testing Positive, Negative Fixtures & Zero Mutation');
  console.log('======================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(name, condition, errorDetail = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      failedTests++;
      console.error(`  ❌ [FAIL] ${name}: ${errorDetail}`);
    }
  }

  // ── 1. Capture Pre-Test Hashes ──────────────────────────────────────────
  const preHashes = captureProtectedHashes();

  // ── 2. Test Positive Historical Batch 4C Fixture (Replay Mode) ──────────
  console.log('--- PART 1: Positive Historical Fixtures ---');
  const validBatchPath = path.join(FIXTURES_DIR, 'batch-4c-valid.json');
  const validPayload = JSON.parse(fs.readFileSync(validBatchPath, 'utf8'));

  const validResult = validateBatch(validPayload, { mode: 'replay', batchFilePath: validBatchPath });
  assert('Batch 4C historical valid fixture passes in mode=replay', validResult.isValid === true, JSON.stringify(validResult.issues));
  assert('Valid fixture has 0 errors', validResult.errorCount === 0);
  assert('Valid fixture audited 5 tools', validResult.summary.toolsAudited === 5);

  // Mode boundary: In mode=new, Batch 4C must fail with TARGET_NOT_SKELETAL_V1
  const modeNewResult = validateBatch(validPayload, { mode: 'new', batchFilePath: validBatchPath });
  assert('Batch 4C fails in mode=new (tools are not skeletal)', modeNewResult.isValid === false);
  const allNotSkeletal = modeNewResult.issues.every(iss => iss.code === 'TARGET_NOT_SKELETAL_V1');
  assert('All 5 tools flagged with TARGET_NOT_SKELETAL_V1 in mode=new', allNotSkeletal && modeNewResult.issues.length === 5);

  // Missing or invalid mode rejected
  const noModeResult = validateBatch(validPayload, { mode: 'invalid_mode' });
  assert('Invalid mode rejected with MODE_INVALID', noModeResult.isValid === false && noModeResult.issues.some(i => i.code === 'MODE_INVALID'));

  // ── 3. Test Negative Defect Fixtures (10 Failure Cases) ──────────────────
  console.log('\n--- PART 2: Injected Defect Detection Tests (10 Cases) ---');

  const negativeCases = [
    {
      file: 'negative-invalid-tool-id.json',
      expectedCode: 'TOOL_NOT_IN_CATALOGUE',
      desc: 'Invalid non-existent tool ID slug rejected'
    },
    {
      file: 'negative-duplicate-tool-id.json',
      expectedCode: 'TARGET_ID_DUPLICATE',
      desc: 'Duplicate tool ID in targetToolIds rejected'
    },
    {
      file: 'negative-missing-source-evidence.json',
      expectedCode: 'SOURCES_EMPTY',
      desc: 'Missing verification sources rejected'
    },
    {
      file: 'negative-invalid-feature-groups.json',
      expectedCode: 'FEATURE_GROUPS_COUNT',
      desc: 'Feature groups with count != 3 rejected'
    },
    {
      file: 'negative-missing-workflow-description.json',
      expectedCode: 'WORKFLOW_INVALID_DESCRIPTION',
      desc: 'Workflow with empty description rejected'
    },
    {
      file: 'negative-incorrect-enum.json',
      expectedCode: 'ENUM_INVALID_PRICING_MODEL',
      desc: 'Unauthorized pricingModel enum value rejected'
    },
    {
      file: 'negative-contradictory-pricing.json',
      expectedCode: 'PRICING_CONTRADICTORY_FREE_TIER',
      desc: 'Affirmative free tier claim when hasFreeTier=false rejected'
    },
    {
      file: 'negative-unknown-metadata-field.json',
      expectedCode: 'TOOL_UNKNOWN_KEY',
      desc: 'Unauthorized unknown metadata field rejected'
    },
    {
      file: 'negative-placeholder-content.json',
      expectedCode: 'TEXT_PLACEHOLDER_MARKER',
      desc: 'Placeholder markers (TODO, lorem ipsum) rejected'
    },
    {
      file: 'negative-missing-editorial-provenance.json',
      expectedCode: 'DISCLOSURE_MISSING_BASIS',
      desc: 'Source summary lacking research basis/boundaries rejected'
    }
  ];

  for (const nCase of negativeCases) {
    const fPath = path.join(FIXTURES_DIR, nCase.file);
    if (!fs.existsSync(fPath)) {
      assert(`Fixture exists: ${nCase.file}`, false, 'File does not exist on disk');
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const res = validateBatch(payload, { mode: 'replay', batchFilePath: fPath });

    const matched = res.issues.some(iss => iss.code === nCase.expectedCode);
    assert(
      `Defect detected: ${nCase.desc} (${nCase.expectedCode})`,
      res.isValid === false && matched,
      `Expected ${nCase.expectedCode}, got issues: ${res.issues.map(i => i.code).join(', ')}`
    );
  }

  // ── 4. Cohort Size Boundary Tests ───────────────────────────────────────
  console.log('\n--- PART 3: Cohort Size Boundaries (1 to 20 tools) ---');
  const emptyBatch = JSON.parse(JSON.stringify(validPayload));
  emptyBatch.targetToolIds = [];
  emptyBatch.tools = {};
  const emptyRes = validateBatch(emptyBatch, { mode: 'replay' });
  assert('Batch size < 1 rejected with BATCH_SIZE_OUT_OF_BOUNDS', emptyRes.isValid === false && emptyRes.issues.some(i => i.code === 'BATCH_SIZE_OUT_OF_BOUNDS'));

  const oversizedBatch = JSON.parse(JSON.stringify(validPayload));
  oversizedBatch.targetToolIds = Array.from({ length: 21 }, (_, i) => `tool-${i}`);
  const overRes = validateBatch(oversizedBatch, { mode: 'replay' });
  assert('Batch size > 20 rejected with BATCH_SIZE_OUT_OF_BOUNDS', overRes.isValid === false && overRes.issues.some(i => i.code === 'BATCH_SIZE_OUT_OF_BOUNDS'));

  // ── 5. Non-Mutation Verification ────────────────────────────────────────
  console.log('\n--- PART 4: Strict Non-Mutation Verification ---');
  const postHashes = captureProtectedHashes();
  let mutationDetected = false;

  for (const f of PROTECTED_FILES) {
    const before = preHashes[f];
    const after = postHashes[f];
    const matches = before === after;
    if (!matches) {
      mutationDetected = true;
      console.error(`  ❌ MUTATION DETECTED in ${f}! (before: ${before}, after: ${after})`);
    }
    assert(`Zero byte modification to ${f}`, matches);
  }

  console.log('\n======================================================');
  console.log(`TOTAL TEST ASSERTIONS: ${totalTests}`);
  console.log(`Passed: ${passedTests} | Failed: ${failedTests}`);

  if (failedTests === 0 && !mutationDetected) {
    console.log('🎉 ALL DRY-RUN VALIDATOR & NON-MUTATION TESTS PASSED!');
    console.log('======================================================\n');
    return true;
  } else {
    console.error('❌ VALIDATION TEST SUITE FAILED!');
    console.log('======================================================\n');
    return false;
  }
}

// Run CLI when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const success = runValidationSuite();
  process.exit(success ? 0 : 1);
}
