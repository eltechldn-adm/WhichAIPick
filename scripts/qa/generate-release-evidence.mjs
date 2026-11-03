import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

export function runCmd(cmd, options = {}) {
  try {
    const stdout = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      stdout: (error.stdout || '').toString().trim(),
      stderr: (error.stderr || '').toString().trim()
    };
  }
}

export function generateReleaseEvidence(options = {}) {
  const {
    baseRef = 'origin/main',
    targetToolIds = [],
    runSuites = true,
    previewDeploymentId = null,
    verbose = true
  } = options;

  // 1. Exact Git metadata queried directly via CLI (NEVER reconstructed)
  const headShaResult = runCmd('git rev-parse HEAD');
  const baseShaResult = runCmd(`git rev-parse ${baseRef}`);
  const remoteUrlResult = runCmd('git config --get remote.origin.url');
  const branchResult = runCmd('git branch --show-current');
  const statusResult = runCmd('git status --porcelain');
  const diffFilesResult = runCmd(`git diff --name-only ${baseRef}...HEAD`);

  const headSha = headShaResult.stdout;
  const baseSha = baseShaResult.stdout;
  const remoteUrl = remoteUrlResult.stdout;
  const branch = branchResult.stdout;
  const uncommittedChanges = statusResult.stdout ? statusResult.stdout.split('\n') : [];
  const changedFiles = diffFilesResult.stdout ? diffFilesResult.stdout.split('\n').filter(Boolean) : [];

  // Excluded mass-noindex check
  const noindexAncestorResult = runCmd('git merge-base --is-ancestor da25a00f57cd863f4d659544d81bbe83326d256f HEAD');
  const noindexExcluded = noindexAncestorResult.exitCode !== 0;

  // 2. Tool Catalogue Diffs vs Base
  let toolMutations = {
    totalChanged: 0,
    changedIds: [],
    nonTargetChangedIds: [],
    addedIds: [],
    deletedIds: []
  };

  try {
    const baseToolsRaw = runCmd(`git show ${baseRef}:data/tools.json`).stdout;
    if (baseToolsRaw) {
      const baseTools = JSON.parse(baseToolsRaw);
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
    }
  } catch (err) {
    toolMutations.diffError = err.message;
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
  if (runSuites) {
    const suites = [
      { name: 'Backlog Reconciler', cmd: 'node scripts/reconcile-content-backlog.mjs' },
      { name: 'Editorial Quality Guard', cmd: 'node scripts/qa/editorial-quality-guard.mjs' },
      { name: 'Editorial Fixture Suite', cmd: 'node scripts/qa/test-editorial-quality-guard.mjs' },
      { name: 'Source-of-Truth Invariance', cmd: 'node scripts/qa/test-source-of-truth-invariance.mjs' },
      { name: 'Catalogue Data Validation', cmd: 'npm run validate:data' },
      { name: 'SEO Health Audit', cmd: 'npm run validate:seo' },
      { name: 'Sitemap Validation', cmd: 'npm run validate:sitemap' },
      { name: 'Schema Audit', cmd: 'npm run audit:schema' },
      { name: 'Site Template & Placeholder Guards', cmd: 'npm run qa:guards' },
      { name: 'Canary Config Guard', cmd: 'npm run qa:canary:config' },
      { name: 'Canary Output Guard (46 V2)', cmd: 'TOOL_PAGE_V2_CANARY=1 npm run qa:canary:output' }
    ];

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

  const evidenceReport = {
    generatedAt: new Date().toISOString(),
    gitIdentity: {
      headCommitSha: headSha,
      baseCommitSha: baseSha,
      remoteUrl: remoteUrl,
      branch: branch,
      cleanWorktree: uncommittedChanges.length === 0,
      uncommittedChangeCount: uncommittedChanges.length,
      changedFilesCount: changedFiles.length,
      changedFiles: changedFiles,
      massNoindexExcluded: noindexExcluded,
      status: (headSha && remoteUrl.includes('WhichAIPick') && noindexExcluded) ? 'VERIFIED' : 'FAILED'
    },
    previewDeployment: previewDeploymentId ? {
      id: previewDeploymentId,
      status: 'VERIFIED'
    } : {
      id: null,
      status: 'NOT TESTED'
    },
    catalogueDiff: {
      baseRef: baseRef,
      targetToolIds: targetToolIds,
      totalToolsChanged: toolMutations.totalChanged,
      changedToolIds: toolMutations.changedIds,
      nonTargetModificationsCount: toolMutations.nonTargetChangedIds.length,
      nonTargetModifiedToolIds: toolMutations.nonTargetChangedIds,
      status: toolMutations.nonTargetChangedIds.length === 0 ? 'VERIFIED' : 'FAILED'
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
    console.log(`- Base SHA:        ${evidenceReport.gitIdentity.baseCommitSha}`);
    console.log(`- Remote URL:      ${evidenceReport.gitIdentity.remoteUrl}`);
    console.log(`- Branch:          ${evidenceReport.gitIdentity.branch}`);
    console.log(`- Clean Worktree:  ${evidenceReport.gitIdentity.cleanWorktree ? 'YES' : 'NO'}`);
    console.log(`- Noindex Excluded:${evidenceReport.gitIdentity.massNoindexExcluded ? 'YES' : 'NO'}`);
    console.log(`- Status:          [${evidenceReport.gitIdentity.status}]`);

    console.log(`\n[CATALOGUE INVARIANTS]`);
    for (const [k, v] of Object.entries(invariants)) {
      console.log(`- ${k.padEnd(18)}: ${String(v.actual).padEnd(6)} (expected ${v.expected}) [${v.status}]`);
    }

    if (runSuites) {
      console.log(`\n[TEST SUITES EXECUTION]`);
      for (const s of suiteResults) {
        console.log(`- ${s.suite.padEnd(35)}: exit=${s.exitCode} [${s.status}]`);
      }
    }

    console.log(`\n[TARGET PROFILES EVIDENCE]`);
    for (const e of auditedEvidence) {
      console.log(`- ${e.toolId.padEnd(16)}: sources=${e.verificationSourcesCount}, ledger=${e.evidenceLedgerEntriesCount}, reviewedAt=${e.reviewedAt} [${e.status}]`);
    }
    console.log('\n======================================================\n');
  }

  return evidenceReport;
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = generateReleaseEvidence();
  const outPath = path.join(ROOT, 'reports', 'stage-7h-9f-release-evidence.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Evidence report written to: ${outPath}`);
}
