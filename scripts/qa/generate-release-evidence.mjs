import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

export function runCmd(cmd, options = {}) {
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, WHICHAIPICK_EVIDENCE_RUNNING: '1', ...options.env },
      ...options
    });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      stdout: (error.stdout || '').toString().trim(),
      stderr: (error.stderr || '').toString().trim()
    };
  }
}

export function evaluateQuarantineStatus(exitCode) {
  if (exitCode === 1) {
    return {
      excluded: true,
      status: 'VERIFIED',
      message: 'Quarantined commit is not an ancestor (exit 1: excluded)'
    };
  }
  if (exitCode === 0) {
    return {
      excluded: false,
      status: 'FAILED',
      message: 'Quarantined commit IS an ancestor of HEAD (exit 0: ancestor violation)'
    };
  }
  return {
    excluded: false,
    status: 'FAILED',
    message: `Quarantine verification check failed unexpectedly with exit code ${exitCode}`
  };
}

export function verifyPreviewDeployment(deploymentId, expectedCommitSha) {
  if (!deploymentId) {
    return {
      id: null,
      status: 'NOT TESTED',
      message: 'No preview deployment ID provided for verification'
    };
  }

  // Cloudflare Pages subdomain: first 8 hex characters of deployment UUID or full short ID / branch alias
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deploymentId);
  const subdomain = isUuid ? deploymentId.slice(0, 8) : deploymentId;
  const url = `https://${subdomain}.whichaipick.pages.dev/build-info.json`;

  const curlRes = runCmd(`curl -s -f -m 10 "${url}"`);
  if (curlRes.exitCode !== 0) {
    return {
      id: deploymentId,
      url,
      status: 'FAILED',
      message: `Preview deployment is not reachable at ${url} (curl exit code ${curlRes.exitCode})`
    };
  }

  try {
    const buildInfo = JSON.parse(curlRes.stdout);
    if (expectedCommitSha && buildInfo.commitHash !== expectedCommitSha) {
      return {
        id: deploymentId,
        url,
        status: 'FAILED',
        actualCommitSha: buildInfo.commitHash,
        expectedCommitSha,
        message: `Preview deployment commit mismatch: found ${buildInfo.commitHash}, expected ${expectedCommitSha}`
      };
    }
    return {
      id: deploymentId,
      url,
      status: 'VERIFIED',
      buildInfo
    };
  } catch (err) {
    return {
      id: deploymentId,
      url,
      status: 'FAILED',
      message: `Failed to parse build-info.json from preview: ${err.message}`
    };
  }
}

export function generateReleaseEvidence(options = {}) {
  const {
    baseRef = 'origin/main',
    targetToolIds = [],
    runSuites = true,
    injectFailingSuite = false,
    previewDeploymentId = null,
    verbose = true,
    forceSuites = false
  } = options;

  // Protect against recursion fork cascades and memory exhaustion
  const isEvidenceRunning = process.env.WHICHAIPICK_EVIDENCE_RUNNING === '1';
  let shouldRunSuites = runSuites;
  let nestedRecursionBlocked = false;

  if (isEvidenceRunning && !forceSuites) {
    if (runSuites && !injectFailingSuite) {
      // Fail-closed handling of unexpected nested invocations:
      // If a nested invocation attempts to execute test suites while an evidence run is already active,
      // block execution and fail the gate to prevent runaway child process cascades.
      shouldRunSuites = false;
      nestedRecursionBlocked = true;
    }
  }

  // 1. Exact Git metadata queried directly via CLI (NEVER reconstructed)
  const headShaResult = runCmd('git rev-parse HEAD');
  const baseShaResult = runCmd(`git rev-parse ${baseRef}`);
  const remoteUrlResult = runCmd('git config --get remote.origin.url');
  const branchResult = runCmd('git branch --show-current');
  const statusResult = runCmd('git status --porcelain');
  const diffFilesResult = runCmd(`git diff --name-only ${baseRef}...HEAD`);

  const headSha = headShaResult.stdout;
  const baseSha = baseShaResult.stdout;
  const baseShaValid = baseShaResult.exitCode === 0 && baseSha && /^[0-9a-f]{40}$/i.test(baseSha);
  const remoteUrl = remoteUrlResult.stdout;
  const branch = branchResult.stdout;
  const uncommittedChanges = statusResult.stdout ? statusResult.stdout.split('\n') : [];
  const changedFiles = diffFilesResult.stdout ? diffFilesResult.stdout.split('\n').filter(Boolean) : [];

  // Excluded mass-noindex check with strict exit-code semantics
  const noindexAncestorResult = runCmd('git merge-base --is-ancestor da25a00f57cd863f4d659544d81bbe83326d256f HEAD');
  const quarantineCheck = evaluateQuarantineStatus(noindexAncestorResult.exitCode);
  const noindexExcluded = quarantineCheck.excluded;

  // 2. Tool Catalogue Diffs vs Base (Strict Verification)
  let toolMutations = {
    comparisonExecuted: false,
    diffError: null,
    totalChanged: 0,
    changedIds: [],
    nonTargetChangedIds: [],
    addedIds: [],
    deletedIds: []
  };

  if (!baseShaValid) {
    toolMutations.diffError = `Base Git ref "${baseRef}" cannot be resolved to a valid commit SHA: ${baseShaResult.stderr || 'unresolvable ref'}`;
  } else {
    try {
      const baseToolsRes = runCmd(`git show ${baseRef}:data/tools.json`);
      if (baseToolsRes.exitCode !== 0 || !baseToolsRes.stdout || baseToolsRes.stdout.trim().length === 0) {
        toolMutations.diffError = `Failed to retrieve baseline data/tools.json from "${baseRef}": ${baseToolsRes.stderr || 'git show returned empty content'}`;
      } else {
        const baseTools = JSON.parse(baseToolsRes.stdout);
        if (!Array.isArray(baseTools) || baseTools.length === 0) {
          toolMutations.diffError = `Baseline data/tools.json from "${baseRef}" is empty or not an array`;
        } else {
          const currentTools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));

          const baseMap = new Map(baseTools.map(t => [t.id, t]));
          const currentMap = new Map(currentTools.map(t => [t.id, t]));

          const targetSet = new Set(targetToolIds);
          const changed = [];
          const nonTargetChanged = [];

          for (const [id, cur] of currentMap.entries()) {
            const base = baseMap.get(id);
            if (!base) {
              toolMutations.addedIds.push(id);
            } else if (JSON.stringify(base) !== JSON.stringify(cur)) {
              changed.push(id);
              if (targetToolIds.length > 0 && !targetSet.has(id)) {
                nonTargetChanged.push(id);
              }
            }
          }

          for (const id of baseMap.keys()) {
            if (!currentMap.has(id)) {
              toolMutations.deletedIds.push(id);
            }
          }

          toolMutations.totalChanged = changed.length;
          toolMutations.changedIds = changed;
          toolMutations.nonTargetChangedIds = nonTargetChanged;
          toolMutations.comparisonExecuted = true;
        }
      }
    } catch (err) {
      toolMutations.diffError = `Invalid baseline JSON in ${baseRef}:data/tools.json: ${err.message}`;
    }
  }

  // 3. Catalogue Invariants
  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
  const canaryJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json'), 'utf8'));
  const sitemapRaw = fs.existsSync(path.join(ROOT, 'sitemap.xml')) ? fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8') : '';
  const sitemapUrls = (sitemapRaw.match(/<loc>/g) || []).length;
  const redirectsRaw = fs.existsSync(path.join(ROOT, '_redirects')) ? fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8') : '';
  const redirectRules = redirectsRaw.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length;

  const invariants = {
    totalTools: { expected: 882, actual: tools.length, status: tools.length === 882 ? 'VERIFIED' : 'FAILED' },
    eligibleTools: {
      expected: 879,
      actual: tools.filter(t => t.recommendationEligible === true).length,
      status: tools.filter(t => t.recommendationEligible === true).length === 879 ? 'VERIFIED' : 'FAILED'
    },
    ineligibleTools: {
      expected: 3,
      actual: tools.filter(t => t.recommendationEligible === false).length,
      status: tools.filter(t => t.recommendationEligible === false).length === 3 ? 'VERIFIED' : 'FAILED'
    },
    v2CanaryTools: {
      expected: 46,
      actual: canaryJson.approvedToolIds.length,
      status: canaryJson.approvedToolIds.length === 46 ? 'VERIFIED' : 'FAILED'
    },
    sitemapUrls: {
      expected: 959,
      actual: sitemapUrls,
      status: sitemapUrls === 959 ? 'VERIFIED' : 'FAILED'
    },
    redirectRules: {
      expected: 59,
      actual: redirectRules,
      status: redirectRules === 59 ? 'VERIFIED' : 'FAILED'
    }
  };

  // 4. Evidence Ledger & Pricing Evidence Audit
  const ledgerPath = path.join(ROOT, 'data', 'evidence', 'phase11-evidence-ledger.json');
  const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : [];
  const ledgerIdMap = new Map();
  for (const entry of ledger) {
    if (!ledgerIdMap.has(entry.id)) ledgerIdMap.set(entry.id, []);
    ledgerIdMap.get(entry.id).push(entry);
  }

  const auditedEvidence = [];
  const targetCohort = targetToolIds.length > 0
    ? targetToolIds
    : ['ollama', 'recraft', 'upscayl', 'docsbot', 'macwhisper', 'sitegpt', 'novelcrafter', 'browse-ai', 'chatpdf', 'capacities', 'diffit', 'cleanvoice', 'anythingllm', 'flair-ai'];

  for (const id of targetCohort) {
    const tool = tools.find(t => t.id === id);
    const entries = ledgerIdMap.get(id) || [];
    const hasVendorSources = tool && Array.isArray(tool.verificationSources) && tool.verificationSources.length > 0;
    const hasLedgerSources = entries.length > 0;

    auditedEvidence.push({
      toolId: id,
      toolName: tool ? (tool.name || tool.canonicalName) : 'UNKNOWN',
      reviewedAt: tool ? tool.reviewedAt : (entries[0] && entries[0].reviewedAt),
      verificationSourcesCount: hasVendorSources ? tool.verificationSources.length : 0,
      evidenceLedgerEntriesCount: entries.length,
      pricingOverviewPresent: !!(tool && tool.pricing_overview && tool.pricing_overview.length > 40),
      status: (hasVendorSources || hasLedgerSources) && tool && tool.pricing_overview ? 'VERIFIED' : 'UNVERIFIED'
    });
  }

  // 5. Suite Execution
  const suiteResults = [];
  if (injectFailingSuite) {
    // When injecting a failure for integration testing, execute ONLY the failing command.
    // This prevents recursive suite execution and excessive RAM allocation.
    const res = runCmd('node -e "console.error(\\\"Intentional suite failure for integration test\\\"); process.exit(42);"');
    suiteResults.push({
      suite: 'Injected Failing Suite',
      command: 'node -e "console.error(\\\"Intentional suite failure for integration test\\\"); process.exit(42);"',
      exitCode: res.exitCode,
      status: 'FAILED',
      summary: `FAIL (${res.exitCode}): ${res.stderr.slice(0, 100)}`
    });
  } else if (shouldRunSuites) {
    const suites = [
      { name: 'Backlog Reconciler', cmd: 'node scripts/reconcile-content-backlog.mjs' },
      { name: 'Editorial Regression Fixtures (14 tools)', cmd: 'node scripts/qa/editorial-quality-guard.mjs' }
    ];

    // If targetToolIds is supplied, add the target batch editorial guard suite
    if (targetToolIds && targetToolIds.length > 0) {
      suites.push({
        name: `Editorial Quality Guard (Batch Targets: ${targetToolIds.join(',')})`,
        cmd: `node scripts/qa/editorial-quality-guard.mjs --targets=${targetToolIds.join(',')} --base=${baseRef}`
      });
    }

    suites.push(
      { name: 'Editorial Fixture Suite', cmd: 'node scripts/qa/test-editorial-quality-guard.mjs' },
      { name: 'Source-of-Truth Invariance', cmd: 'node scripts/qa/test-source-of-truth-invariance.mjs' },
      { name: 'Catalogue Data Validation', cmd: 'npm run validate:data' },
      { name: 'SEO Health Audit', cmd: 'npm run validate:seo' },
      { name: 'Sitemap Validation', cmd: 'npm run validate:sitemap' },
      { name: 'Schema Audit', cmd: 'npm run audit:schema' },
      { name: 'Site Template & Placeholder Guards', cmd: 'npm run qa:guards' },
      { name: 'Canary Config Guard', cmd: 'npm run qa:canary:config' },
      { name: 'Canary Output Guard (46 V2)', cmd: 'TOOL_PAGE_V2_CANARY=1 npm run qa:canary:output' }
    );

    for (const s of suites) {
      const res = runCmd(s.cmd);
      suiteResults.push({
        suite: s.name,
        command: s.cmd,
        exitCode: res.exitCode,
        status: res.exitCode === 0 ? 'VERIFIED' : 'FAILED',
        summary: res.exitCode === 0 ? 'PASS (0)' : `FAIL (${res.exitCode}): ${res.stderr.slice(0, 100)}`
      });
    }
  }

  // 6. Preview Deployment Verification
  const previewCheck = verifyPreviewDeployment(previewDeploymentId, headSha);

  // 7. Overall Fail-Closed Release Gate Evaluation
  let isOverallValid = true;
  const failureReasons = [];

  if (nestedRecursionBlocked) {
    isOverallValid = false;
    failureReasons.push('Unexpected nested evidence generation detected under active WHICHAIPICK_EVIDENCE_RUNNING (fail-closed recursion protection)');
  }

  if (headShaResult.exitCode !== 0 || !headSha) {
    isOverallValid = false;
    failureReasons.push('Invalid or unresolvable HEAD commit SHA');
  }
  if (!baseShaValid) {
    isOverallValid = false;
    failureReasons.push(`Base Git ref "${baseRef}" cannot be resolved to a valid commit SHA`);
  }
  if (!remoteUrl || !remoteUrl.includes('WhichAIPick')) {
    isOverallValid = false;
    failureReasons.push(`Invalid remote repository URL: ${remoteUrl}`);
  }
  if (!quarantineCheck.excluded || quarantineCheck.status !== 'VERIFIED') {
    isOverallValid = false;
    failureReasons.push(`Quarantine check failure: ${quarantineCheck.message}`);
  }

  if (toolMutations.diffError || toolMutations.comparisonExecuted !== true) {
    isOverallValid = false;
    failureReasons.push(`Catalogue baseline comparison failed or skipped: ${toolMutations.diffError || 'Catalogue comparison not executed'}`);
  }
  if (toolMutations.nonTargetChangedIds.length > 0) {
    isOverallValid = false;
    failureReasons.push(`Unauthorised non-target tool modification(s) detected: ${toolMutations.nonTargetChangedIds.join(', ')}`);
  }
  if (toolMutations.deletedIds.length > 0) {
    isOverallValid = false;
    failureReasons.push(`Tool deletions detected against baseline: ${toolMutations.deletedIds.join(', ')}`);
  }

  for (const [key, inv] of Object.entries(invariants)) {
    if (inv.status !== 'VERIFIED') {
      isOverallValid = false;
      failureReasons.push(`Catalogue invariant violation: ${key} actual=${inv.actual}, expected=${inv.expected}`);
    }
  }

  if (runSuites) {
    for (const s of suiteResults) {
      if (s.exitCode !== 0 || s.status !== 'VERIFIED') {
        isOverallValid = false;
        failureReasons.push(`Required QA suite failed: ${s.suite} (exit code ${s.exitCode})`);
      }
    }
  }

  if (previewDeploymentId && previewCheck.status === 'FAILED') {
    isOverallValid = false;
    failureReasons.push(`Preview deployment verification failed: ${previewCheck.message}`);
  }

  const evidenceReport = {
    generatedAt: new Date().toISOString(),
    success: isOverallValid,
    failureReasons,
    gitIdentity: {
      headCommitSha: headSha,
      baseCommitSha: baseShaValid ? baseSha : null,
      remoteUrl: remoteUrl,
      branch: branch,
      cleanWorktree: uncommittedChanges.length === 0,
      uncommittedChangeCount: uncommittedChanges.length,
      changedFilesCount: changedFiles.length,
      changedFiles: changedFiles,
      massNoindexExcluded: quarantineCheck.excluded,
      quarantineStatus: quarantineCheck.status,
      quarantineMessage: quarantineCheck.message,
      status: (headSha && baseShaValid && remoteUrl.includes('WhichAIPick') && quarantineCheck.excluded) ? 'VERIFIED' : 'FAILED'
    },
    previewDeployment: previewCheck,
    catalogueDiff: {
      baseRef: baseRef,
      baseSha: baseShaValid ? baseSha : null,
      targetToolIds: targetToolIds,
      comparisonExecuted: toolMutations.comparisonExecuted === true,
      totalToolsChanged: toolMutations.totalChanged,
      changedToolIds: toolMutations.changedIds,
      nonTargetModificationsCount: toolMutations.nonTargetChangedIds.length,
      nonTargetModifiedToolIds: toolMutations.nonTargetChangedIds,
      status: (toolMutations.comparisonExecuted === true && toolMutations.nonTargetChangedIds.length === 0 && !toolMutations.diffError) ? 'VERIFIED' : 'FAILED',
      error: toolMutations.diffError || null
    },
    catalogueInvariants: invariants,
    evidenceVerification: {
      targetCohortSize: auditedEvidence.length,
      verifiedCount: auditedEvidence.filter(e => e.status === 'VERIFIED').length,
      evidenceList: auditedEvidence
    },
    testSuites: suiteResults
  };

  if (verbose) {
    console.log('======================================================');
    console.log('WHICHAIPICK MACHINE-GENERATED RELEASE EVIDENCE');
    console.log('======================================================\n');
    console.log(`[GIT IDENTITY]`);
    console.log(`- HEAD SHA:        ${evidenceReport.gitIdentity.headCommitSha}`);
    console.log(`- Base SHA:        ${evidenceReport.gitIdentity.baseCommitSha || 'UNRESOLVED'}`);
    console.log(`- Remote URL:      ${evidenceReport.gitIdentity.remoteUrl}`);
    console.log(`- Branch:          ${evidenceReport.gitIdentity.branch}`);
    console.log(`- Clean Worktree:  ${evidenceReport.gitIdentity.cleanWorktree ? 'YES' : 'NO'}`);
    console.log(`- Noindex Excluded:${evidenceReport.gitIdentity.massNoindexExcluded ? 'YES' : 'NO'} (${evidenceReport.gitIdentity.quarantineStatus})`);
    console.log(`- Status:          [${evidenceReport.gitIdentity.status}]`);

    console.log(`\n[PREVIEW DEPLOYMENT]`);
    console.log(`- Deployment ID:   ${evidenceReport.previewDeployment.id || 'NONE'}`);
    console.log(`- Status:          [${evidenceReport.previewDeployment.status}]`);
    if (evidenceReport.previewDeployment.message) {
      console.log(`- Note:            ${evidenceReport.previewDeployment.message}`);
    }

    console.log(`\n[CATALOGUE DIFF vs BASELINE]`);
    console.log(`- Base Ref:        ${baseRef}`);
    console.log(`- Comparison Run:  ${toolMutations.comparisonExecuted ? 'YES' : 'NO'}`);
    console.log(`- Non-Target Diff: ${toolMutations.nonTargetChangedIds.length} modification(s) [${evidenceReport.catalogueDiff.status}]`);
    if (toolMutations.diffError) {
      console.log(`- Error:           ${toolMutations.diffError}`);
    }

    console.log(`\n[CATALOGUE INVARIANTS]`);
    for (const [k, v] of Object.entries(invariants)) {
      console.log(`- ${k.padEnd(18)}: ${String(v.actual).padEnd(6)} (expected ${v.expected}) [${v.status}]`);
    }

    if (runSuites) {
      console.log(`\n[TEST SUITES EXECUTION]`);
      for (const s of suiteResults) {
        console.log(`- ${s.suite.padEnd(45)}: exit=${s.exitCode} [${s.status}]`);
      }
    }

    console.log(`\n[TARGET PROFILES EVIDENCE]`);
    for (const e of auditedEvidence) {
      console.log(`- ${e.toolId.padEnd(16)}: sources=${e.verificationSourcesCount}, ledger=${e.evidenceLedgerEntriesCount}, reviewedAt=${e.reviewedAt} [${e.status}]`);
    }

    console.log(`\n[OVERALL GATE VERDICT]`);
    console.log(`- Success:         ${evidenceReport.success ? '✅ PASS' : '❌ FAIL'}`);
    if (!evidenceReport.success) {
      console.log(`- Failure Reasons:`);
      failureReasons.forEach(r => console.log(`    * ${r}`));
    }
    console.log('\n======================================================\n');
  }

  return evidenceReport;
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let baseRef = 'origin/main';
  let targetToolIds = [];
  let previewDeploymentId = null;
  let injectFailingSuite = false;
  let runSuites = true;
  let forceSuites = false;

  for (const arg of args) {
    if (arg.startsWith('--targets=')) {
      const raw = arg.slice('--targets='.length).trim();
      targetToolIds = raw.length > 0 ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    } else if (arg.startsWith('--base=')) {
      baseRef = arg.slice('--base='.length).trim();
    } else if (arg.startsWith('--preview-id=')) {
      previewDeploymentId = arg.slice('--preview-id='.length).trim();
    } else if (arg === '--inject-failing-suite') {
      injectFailingSuite = true;
    } else if (arg === '--no-suites') {
      runSuites = false;
    } else if (arg === '--force-suites') {
      forceSuites = true;
    }
  }

  const report = generateReleaseEvidence({
    baseRef,
    targetToolIds,
    previewDeploymentId,
    injectFailingSuite,
    runSuites,
    forceSuites
  });
  const outPath = path.join(ROOT, 'reports', 'stage-7h-9f-release-evidence.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Evidence report written to: ${outPath}`);

  if (!report.success) {
    console.error('\n❌ [FAIL-CLOSED RELEASE GATE] Critical failures detected:');
    report.failureReasons.forEach(r => console.error(`   - ${r}`));
    process.exitCode = 1;
  }
}
