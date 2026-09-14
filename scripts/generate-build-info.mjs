/**
 * generate-build-info.mjs
 *
 * Generates /build-info.json at build time for deployment traceability.
 * Consumed by the review process to verify which data version is live
 * and to confirm the Cloudflare build succeeded.
 *
 * Fields:
 *   buildTime      - ISO 8601 UTC timestamp of when this build ran
 *   schemaVersion  - The decision-data schema version (4A.1, 4B, etc.)
 *   branch         - Git branch name (from CF_PAGES_BRANCH or fallback)
 *   commitHash     - Git commit SHA (from CF_PAGES_COMMIT_SHA or fallback)
 *   toolCount      - Number of tools in the published database
 *   eligibleCount  - Number of tools with recommendationEligible=true
 *   contentReviewCount - Number of tools flagged for editorial review
 *   dataFile       - Relative path to the source data file
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS_FILE = path.join(__dirname, '../data/tools.json');
const OUTPUT_FILE = path.join(__dirname, '../build-info.json');

// ─── Resolve git metadata ─────────────────────────────────────────────────────
function getGitValue(envVar, gitCommand, fallback = 'unknown') {
    if (process.env[envVar]) return process.env[envVar];
    try {
        return execSync(gitCommand, { encoding: 'utf8' }).trim();
    } catch {
        return fallback;
    }
}

const branch     = getGitValue('CF_PAGES_BRANCH',     'git rev-parse --abbrev-ref HEAD');
const commitHash = getGitValue('CF_PAGES_COMMIT_SHA',  'git rev-parse HEAD');

// ─── Load tools.json ──────────────────────────────────────────────────────────
if (!fs.existsSync(TOOLS_FILE)) {
    console.error('[ERROR] data/tools.json not found. Run build:data first.');
    process.exit(1);
}

const tools = JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8'));
const toolCount          = tools.length;
const eligibleCount      = tools.filter(t => t.recommendationEligible === true).length;
const contentReviewCount = tools.filter(t => t.contentReviewRequired  === true).length;

// ─── Write build-info.json ────────────────────────────────────────────────────
const buildInfo = {
    buildTime:          new Date().toISOString(),
    schemaVersion:      '4A.1',
    branch,
    commitHash,
    toolCount,
    eligibleCount,
    contentReviewCount,
    dataFile:           'data/tools.json',
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(buildInfo, null, 2), 'utf8');

console.log('📦 build-info.json written:');
console.log(`   Branch:         ${branch}`);
console.log(`   Commit:         ${commitHash.slice(0, 8)}`);
console.log(`   Schema:         ${buildInfo.schemaVersion}`);
console.log(`   Tools:          ${toolCount} (${eligibleCount} eligible, ${contentReviewCount} need review)`);
console.log(`   Build time:     ${buildInfo.buildTime}`);
