/**
 * generate-build-info.mjs
 *
 * Generates /build-info.json at build time for deployment traceability.
 * Consumed by the review process to verify which data version is live
 * and to confirm the Cloudflare build succeeded.
 *
 * Fields:
 *   environment    - 'preview' (Cloudflare) | 'local' (local build)
 *   buildTime      - ISO 8601 UTC timestamp of when this build ran
 *   schemaVersion  - The decision-data schema version (4A.2, 4B, etc.)
 *   branch         - Git branch name (from CF_PAGES_BRANCH or fallback)
 *   commitHash     - Git commit SHA. Fallback order:
 *                    1. CF_PAGES_COMMIT_SHA (set by Cloudflare during build)
 *                    2. git rev-parse HEAD (local development)
 *                    Note: If Cloudflare Pages is configured with no build command,
 *                    this will be the local git HEAD at predeploy time, not the
 *                    deployed commit. Set Build Command = "npm run build:cloudflare"
 *                    in Cloudflare Pages settings to get the correct commit hash.
 *   toolCount      - Number of tools in the published database
 *   eligibleCount  - Number of tools with recommendationEligible=true
 *   contentReviewCount - Number of tools flagged for editorial review
 *   pricingNeedsReviewCount - Number of tools with pricingNeedsReview=true
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
const toolCount                = tools.length;
const eligibleCount            = tools.filter(t => t.recommendationEligible === true).length;
const contentReviewCount       = tools.filter(t => t.contentReviewRequired  === true).length;
const pricingNeedsReviewCount  = tools.filter(t => t.pricingNeedsReview     === true).length;

// Determine environment: Cloudflare sets CF_PAGES_COMMIT_SHA during its build step
const environment = process.env.CF_PAGES_COMMIT_SHA ? 'preview' : 'local';

// ─── Preview Safety Checks ────────────────────────────────────────────────────
const headersPath = path.join(__dirname, '../_headers');
let headersContent = '';
if (fs.existsSync(headersPath)) {
    headersContent = fs.readFileSync(headersPath, 'utf8');
}

const previewRobotsTag = '  X-Robots-Tag: noindex, follow\n';
const legacyRobotsTag = '  X-Robots-Tag: noindex, nofollow\n';

// Clean up any legacy tag
if (headersContent.includes(legacyRobotsTag)) {
    headersContent = headersContent.replace(legacyRobotsTag, '');
}

if (branch !== 'main' && branch !== 'production') {
    if (!headersContent.includes('X-Robots-Tag: noindex, follow')) {
        if (headersContent.includes('/*')) {
            headersContent = headersContent.replace('/*', '/*\n' + previewRobotsTag);
        } else {
            headersContent += `\n/*\n${previewRobotsTag}`;
        }
        fs.writeFileSync(headersPath, headersContent, 'utf8');
    }
    console.log('🔒 Preview Environment Detected. Appended noindex to _headers.');
} else {
    if (headersContent.includes(previewRobotsTag)) {
        headersContent = headersContent.replace(previewRobotsTag, '');
    }
    if (headersContent.trim() !== '') {
        fs.writeFileSync(headersPath, headersContent, 'utf8');
    } else if (fs.existsSync(headersPath)) {
        fs.unlinkSync(headersPath);
    }
    console.log('🌐 Production Environment Detected. Ensured no preview robots tag in _headers.');
}

// ─── Write build-info.json ────────────────────────────────────────────────────
const buildInfo = {
    environment,
    buildTime:              new Date().toISOString(),
    schemaVersion:          '9G',
    branch,
    commitHash,
    toolCount,
    eligibleCount,
    contentReviewCount,
    pricingNeedsReviewCount,
    dataFile:               'data/tools.json',
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(buildInfo, null, 2), 'utf8');

console.log('📦 build-info.json written:');
console.log(`   Environment:    ${environment}`);
console.log(`   Branch:         ${branch}`);
console.log(`   Commit:         ${commitHash.slice(0, 8)}`);
console.log(`   Schema:         ${buildInfo.schemaVersion}`);
console.log(`   Tools:          ${toolCount} (${eligibleCount} eligible, ${contentReviewCount} need review, ${pricingNeedsReviewCount} pricing review)`);
console.log(`   Build time:     ${buildInfo.buildTime}`);
