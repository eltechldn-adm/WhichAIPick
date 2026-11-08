#!/usr/bin/env node

/**
 * scripts/qa/test-batch-acceptance-harness.mjs
 *
 * Negative Defect Injection Test Suite for the Generic Acceptance Harness.
 * Injects 8 specific structural and content defects into isolated temporary copies
 * of generated HTML to verify that the harness fails closed, identifies the exact tool ID,
 * and produces precise, actionable diagnostic error messages.
 *
 * Directive: WhichAIPick MCD v2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import { runBatchAcceptance } from './test-batch-acceptance.mjs';

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

async function runNegativeHarnessSuite() {
  console.log('======================================================');
  console.log('WHICHAIPICK BATCH ACCEPTANCE HARNESS NEGATIVE TEST SUITE');
  console.log('Testing Defect Injection, Precision & Fail-Closed Behavior');
  console.log('======================================================\n');

  // Load Batch 4C fixture to extract a valid single-tool payload for 'clay'
  const b4cPath = path.join(ROOT, 'data', 'enrichment', 'fixtures', 'batch-4c-valid.json');
  const b4c = JSON.parse(fs.readFileSync(b4cPath, 'utf8'));

  const clayPayload = {
    batchId: 'batch-neg-test',
    researchDate: '2026-11-06',
    description: 'Negative harness test payload for Clay',
    mode: 'replay',
    targetToolIds: ['clay'],
    tools: {
      clay: b4c.tools.clay
    }
  };

  // Setup isolated temporary workspace
  const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'whichaipick-harness-negative-'));
  fs.mkdirSync(path.join(tmpWorkspace, 'tools', 'clay'), { recursive: true });
  fs.mkdirSync(path.join(tmpWorkspace, 'data'), { recursive: true });

  // Copy tools.json for metadata resolution
  fs.copyFileSync(path.join(ROOT, 'data', 'tools.json'), path.join(tmpWorkspace, 'data', 'tools.json'));

  // Symlink static asset directories so browser renders without 404 console errors
  for (const dir of ['css', 'js', 'assets', 'images', 'favicons']) {
    const srcDir = path.join(ROOT, dir);
    if (fs.existsSync(srcDir)) {
      fs.symlinkSync(srcDir, path.join(tmpWorkspace, dir), 'dir');
    }
  }

  // Read clean baseline HTML
  const cleanHtmlPath = path.join(ROOT, 'tools', 'clay', 'index.html');
  const originalHtml = fs.readFileSync(cleanHtmlPath, 'utf8');

  try {
    // ── BASELINE SANITY CHECK ────────────────────────────────
    console.log('--- PART 1: Baseline Sanity Check on Clean HTML ---');
    fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), originalHtml, 'utf8');

    const baselineResult = await runBatchAcceptance({
      batchPayload: clayPayload,
      workspaceRoot: tmpWorkspace,
      verbose: false
    });

    assert(baselineResult.success === true, 'Clean baseline HTML passes all generic harness assertions');
    assert(baselineResult.failedChecks === 0, 'Clean baseline HTML has 0 failed checks');

    // ── DEFECT INJECTIONS (8 SCENARIOS) ──────────────────────
    console.log('\n--- PART 2: Injected Defect Detection Tests (8 Cases) ---');

    // Defect 1: Missing Practical Workflows Section
    console.log('\n[Case 1] Missing Practical Workflows Section');
    {
      const mutatedHtml = originalHtml.replace(
        /<!-- Practical Workflows -->[\s\S]*?<\/div>\s*<\/div>/i,
        '<!-- Workflows removed for negative testing -->'
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 1 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 1 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('Practical Workflows') || i.message.includes('ol.tool-workflow-list')), 'Defect 1 flagged missing Practical Workflows section');
    }

    // Defect 2: Missing sourceSummary Disclosure
    console.log('\n[Case 2] Missing Editorial Transparency Disclosure (.tool-source-summary)');
    {
      const mutatedHtml = originalHtml.replace(
        /<p class="tool-source-summary"[\s\S]*?<\/p>/i,
        ''
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 2 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 2 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('tool-source-summary')), 'Defect 2 flagged missing .tool-source-summary disclosure');
    }

    // Defect 3: Incorrect Canonical URL
    console.log('\n[Case 3] Incorrect Production Canonical URL');
    {
      const mutatedHtml = originalHtml.replace(
        /<link\s+rel="canonical"\s+href="https:\/\/whichaipick\.com\/tools\/clay\/"/i,
        '<link rel="canonical" href="https://whichaipick.com/tools/wrong-canonical-slug/"'
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 3 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 3 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('Canonical URL matches production')), 'Defect 3 flagged canonical URL mismatch');
    }

    // Defect 4: Wrong Tool H1 Heading
    console.log('\n[Case 4] Wrong Tool H1 Heading');
    {
      const mutatedHtml = originalHtml.replace(
        /<h1[^>]*>Clay<\/h1>/i,
        '<h1>Clay Automated B2B Prospecting Engine</h1>'
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 4 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 4 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('Desktop H1 matches')), 'Defect 4 flagged desktop H1 mismatch');
    }

    // Defect 5: Missing Feature Group
    console.log('\n[Case 5] Missing Feature Group');
    {
      const mutatedHtml = originalHtml.replace(
        /<div class="tool-feature-group">[\s\S]*?<\/div>/i,
        '<!-- Feature group removed -->'
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 5 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 5 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('Feature groups count') || i.message.includes('Feature group h4')), 'Defect 5 flagged missing feature group');
    }

    // Defect 6: Incorrect Pricing Disclosure Content
    console.log('\n[Case 6] Incorrect Pricing Disclosure Content');
    {
      const mutatedHtml = originalHtml.replace(
        /<h2[^>]*>Pricing<\/h2>[\s\S]*?<\/div>\s*<\/div>/i,
        '<h2>Pricing</h2><div class="tool-body-text"><p>Standard plan information without specific tier details.</p></div></div>'
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 6 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 6 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('Pricing body contains expected snippet')), 'Defect 6 flagged missing expected pricing snippet');
    }

    // Defect 7: Invalid or Broken Primary Tool CTA Link
    console.log('\n[Case 7] Invalid or Broken Primary Tool CTA Link');
    {
      const mutatedHtml = originalHtml.replace(
        /class="btn btn-primary btn-lg tool-cta"/g,
        'class="btn btn-secondary"'
      ).replace(
        /href="https:\/\/www\.clay\.com\/"/g,
        'href=""'
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 7 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 7 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('CTA button') || i.message.includes('valid destination link')), 'Defect 7 flagged invalid primary CTA button link');
    }

    // Defect 8: Missing Required Comparison Section
    console.log('\n[Case 8] Missing Required Comparison Section');
    {
      const mutatedHtml = originalHtml.replace(
        /<h2[^>]*>How It Compares<\/h2>[\s\S]*?<\/div>\s*<\/div>/i,
        '<!-- Comparison section removed -->'
      );
      fs.writeFileSync(path.join(tmpWorkspace, 'tools', 'clay', 'index.html'), mutatedHtml, 'utf8');

      const res = await runBatchAcceptance({ batchPayload: clayPayload, workspaceRoot: tmpWorkspace, verbose: false });
      assert(res.success === false, 'Defect 8 rejected cleanly (nonzero harness result)');
      assert(res.issues.some(i => i.toolId === 'clay'), 'Defect 8 correctly identified toolId "clay"');
      assert(res.issues.some(i => i.message.includes('How It Compares')), 'Defect 8 flagged missing "How It Compares" section');
    }

  } finally {
    // Clean up temporary workspace
    if (fs.existsSync(tmpWorkspace)) {
      fs.rmSync(tmpWorkspace, { recursive: true, force: true });
    }
  }

  // ── REPOSITORY INTEGRITY CHECK ───────────────────────────
  console.log('\n--- PART 3: Tracked Repository Cleanliness Check ---');
  const gitStatus = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
  const trackedDirty = gitStatus.split('\n').filter(l => l && !l.startsWith('??'));
  assert(trackedDirty.length === 0, 'Zero tracked repository files modified during harness negative tests');

  console.log('\n======================================================');
  console.log(`TOTAL HARNESS NEGATIVE TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  if (failedTests === 0) {
    console.log('🎉 ALL BATCH ACCEPTANCE HARNESS NEGATIVE TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error('❌ HARNESS NEGATIVE TESTS FAILED!');
    console.log('======================================================\n');
    process.exit(1);
  }
}

// Direct execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runNegativeHarnessSuite().catch(err => {
    console.error('[FATAL HARNESS TEST ERROR]', err);
    process.exit(1);
  });
}
