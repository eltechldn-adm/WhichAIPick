import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');
const TAXONOMY_FILE = path.join(__dirname, '../data/category-taxonomy.json');

const toolsJson = JSON.parse(fs.readFileSync(TOOLS_JSON_FILE, 'utf8'));
const allowedCategories = fs.existsSync(TAXONOMY_FILE)
    ? new Set(JSON.parse(fs.readFileSync(TAXONOMY_FILE, 'utf8')))
    : new Set();

let errors = 0;
let warnings = 0;

const aiBoilerplate = [
    'as an ai language model',
    'this tool is',
    'in conclusion',
    'it is important to note',
    'lorem ipsum',
    'todo',
    'fixme'
];

// Documented Machine-Readable Enums
const validPricingModels      = new Set(['free', 'freemium', 'paid', 'enterprise', 'unknown']);
const validExperienceLevels   = new Set(['beginner', 'intermediate', 'advanced', 'mixed', 'unknown']);
const validTargetUsers        = new Set(['individual', 'team', 'enterprise', 'mixed', 'unknown']);
// 4A.1: operationalStatus and transitionType replace the monolithic lifecycleStatus
const validOperationalStatuses = new Set(['active', 'discontinued', 'unavailable']);
const validTransitionTypes     = new Set(['none', 'rebranded', 'acquired', 'merged']);
// lifecycleStatus is now DERIVED; keep enum for backwards-compat check only
const validLifecycleStatuses  = new Set(['active', 'rebranded', 'acquired', 'merged', 'discontinued', 'unavailable', 'needs_review']);
const allowedPlatformTokens   = new Set(['web', 'macos', 'windows', 'linux', 'ios', 'android', 'api', 'cli', 'extension', 'cloud', 'discord']);

const seenIds = new Set();
const seenUrls = new Set();
const verificationDates = {};

// Coverage counters
const coverage = {
    operationalStatus:    { known: 0, unknown: 0, details: {} },
    transitionType:       { known: 0, unknown: 0, details: {} },
    lifecycleStatus:      { known: 0, unknown: 0, details: {} },   // derived, backwards-compat
    recommendationEligible: { eligible: 0, ineligible: 0 },
    contentReviewRequired:  { flagged: 0, clean: 0 },
    successorToolId:      { set: 0, unset: 0 },
    aliases:              { populated: 0, empty: 0 },
    previousName:         { populated: 0, empty: 0 },
    pricingModel:         { known: 0, unknown: 0, details: {} },
    hasFreeTier:          { known: 0, unknown: 0, details: {} },
    hasFreeTrial:         { known: 0, unknown: 0, details: {} },
    experienceLevel:      { known: 0, unknown: 0, details: {} },
    targetUsers:          { known: 0, unknown: 0, details: {} },
    platforms:            { known: 0, unknown: 0 },
    apiAvailable:         { known: 0, unknown: 0 },
    openSource:           { known: 0, unknown: 0 },
    selfHosted:           { known: 0, unknown: 0 },
    primaryUseCases:      { populated: 0, empty: 0 },
    bestFor:              { populated: 0, empty: 0 },
    notIdealFor:          { populated: 0, empty: 0 },
    lastVerifiedAt:       { verified: 0, unverified: 0 }
};

toolsJson.forEach((tool, index) => {
    // 1. ID VALIDATION
    if (!tool.id || typeof tool.id !== 'string' || tool.id.trim() === '') {
        console.error(`[ERROR] Tool at index ${index} is missing a valid ID.`);
        errors++;
    } else {
        if (!/^[a-z0-9';]+(-[a-z0-9';]+)*$/.test(tool.id)) {
            console.error(`[ERROR] Tool ID "${tool.id}" contains invalid characters.`);
            errors++;
        }
        if (seenIds.has(tool.id)) {
            console.error(`[ERROR] Duplicate tool ID found: ${tool.id}`);
            errors++;
        }
        seenIds.add(tool.id);
    }

    // 2. NAME VALIDATION
    if (!tool.name || typeof tool.name !== 'string' || tool.name.trim() === '') {
        console.error(`[ERROR] Tool ${tool.id || index} is missing a valid name.`);
        errors++;
    }

    // 3. OFFICIAL & AFFILIATE URL VALIDATION
    if (!tool.website_url || (!tool.website_url.startsWith('http://') && !tool.website_url.startsWith('https://'))) {
        console.error(`[ERROR] Tool ${tool.id} has malformed or missing official URL: ${tool.website_url}`);
        errors++;
    } else {
        if (seenUrls.has(tool.website_url)) {
            console.warn(`[WARNING] Duplicate official URL found for ${tool.id}: ${tool.website_url}`);
            warnings++;
        }
        seenUrls.add(tool.website_url);
    }

    if (tool.affiliate_url && (!tool.affiliate_url.startsWith('http://') && !tool.affiliate_url.startsWith('https://'))) {
        console.error(`[ERROR] Tool ${tool.id} has malformed affiliate URL: ${tool.affiliate_url}`);
        errors++;
    }

    // 4. CATEGORY TAXONOMY VALIDATION
    if (!tool.category || !allowedCategories.has(tool.category)) {
        console.error(`[ERROR] Tool ${tool.id} has invalid or unauthorized category: "${tool.category}"`);
        errors++;
    }

    // 5. MERGE INTEGRITY (Ensure rich editorial fields are not corrupted/wiped out)
    if (!tool.long_description || tool.long_description.trim().length < 20) {
        console.error(`[ERROR] Tool ${tool.id} missing rich long_description (corrupted merge detected).`);
        errors++;
    }
    if (!Array.isArray(tool.best_for) || tool.best_for.length === 0) {
        console.warn(`[WARNING] Tool ${tool.id} is missing best_for editorial guidance.`);
        warnings++;
    }

    // 6. DECISION ATTRIBUTE ENUM VALIDATION (4A.1 Schema)

    // ─ operationalStatus (primary field) ─────────────────────────────────────────────────
    if (tool.operationalStatus !== undefined && tool.operationalStatus !== null) {
        if (!validOperationalStatuses.has(tool.operationalStatus)) {
            console.error(`[ERROR] Tool ${tool.id} has invalid operationalStatus enum: "${tool.operationalStatus}"`);
            errors++;
        } else {
            coverage.operationalStatus.known++;
            coverage.operationalStatus.details[tool.operationalStatus] =
                (coverage.operationalStatus.details[tool.operationalStatus] || 0) + 1;
        }
    } else {
        console.error(`[ERROR] Tool ${tool.id} is missing required operationalStatus.`);
        errors++;
        coverage.operationalStatus.unknown++;
    }

    // ─ transitionType (primary field) ──────────────────────────────────────────────────
    if (tool.transitionType !== undefined && tool.transitionType !== null) {
        if (!validTransitionTypes.has(tool.transitionType)) {
            console.error(`[ERROR] Tool ${tool.id} has invalid transitionType enum: "${tool.transitionType}"`);
            errors++;
        } else {
            coverage.transitionType.known++;
            coverage.transitionType.details[tool.transitionType] =
                (coverage.transitionType.details[tool.transitionType] || 0) + 1;
        }
    } else {
        console.error(`[ERROR] Tool ${tool.id} is missing required transitionType.`);
        errors++;
        coverage.transitionType.unknown++;
    }

    // ─ recommendationEligible (must be boolean) ─────────────────────────────────
    if (tool.recommendationEligible === undefined || tool.recommendationEligible === null) {
        console.error(`[ERROR] Tool ${tool.id} is missing derived field recommendationEligible.`);
        errors++;
    } else if (typeof tool.recommendationEligible !== 'boolean') {
        console.error(`[ERROR] Tool ${tool.id} recommendationEligible must be boolean, got: ${typeof tool.recommendationEligible}`);
        errors++;
    } else {
        if (tool.recommendationEligible) coverage.recommendationEligible.eligible++;
        else coverage.recommendationEligible.ineligible++;
    }

    // ─ successorToolId (tracked; referential integrity check is deferred – see post-loop) ─
    if (tool.successorToolId) {
        coverage.successorToolId.set++;
    } else {
        coverage.successorToolId.unset++;
    }

    // ─ contentReviewRequired (boolean) ─────────────────────────────────────────
    if (typeof tool.contentReviewRequired === 'boolean') {
        if (tool.contentReviewRequired) coverage.contentReviewRequired.flagged++;
        else coverage.contentReviewRequired.clean++;
    }

    // ─ lifecycleStatus (DERIVED — backwards-compat only, not primary) ─────────────
    if (tool.lifecycleStatus !== undefined && tool.lifecycleStatus !== null) {
        if (!validLifecycleStatuses.has(tool.lifecycleStatus)) {
            console.error(`[ERROR] Tool ${tool.id} has invalid derived lifecycleStatus: "${tool.lifecycleStatus}"`);
            errors++;
        } else {
            coverage.lifecycleStatus.known++;
            coverage.lifecycleStatus.details[tool.lifecycleStatus] =
                (coverage.lifecycleStatus.details[tool.lifecycleStatus] || 0) + 1;
        }
    }

    // 7. BOOLEAN / NULL ATTRIBUTE TYPE CHECKS
    const booleanFields = ['hasFreeTier', 'hasFreeTrial', 'apiAvailable', 'openSource', 'selfHosted'];
    booleanFields.forEach(field => {
        const val = tool[field];
        if (val !== null && val !== undefined && typeof val !== 'boolean') {
            console.error(`[ERROR] Tool ${tool.id} has invalid non-boolean value for ${field}: ${val}`);
            errors++;
        }
    });

    // Track boolean coverage
    if (typeof tool.hasFreeTier === 'boolean') {
        coverage.hasFreeTier.known++;
        coverage.hasFreeTier.details[String(tool.hasFreeTier)] = (coverage.hasFreeTier.details[String(tool.hasFreeTier)] || 0) + 1;
    } else {
        coverage.hasFreeTier.unknown++;
    }

    if (typeof tool.hasFreeTrial === 'boolean') {
        coverage.hasFreeTrial.known++;
        coverage.hasFreeTrial.details[String(tool.hasFreeTrial)] = (coverage.hasFreeTrial.details[String(tool.hasFreeTrial)] || 0) + 1;
    } else {
        coverage.hasFreeTrial.unknown++;
    }

    if (typeof tool.apiAvailable === 'boolean') coverage.apiAvailable.known++;
    else coverage.apiAvailable.unknown++;

    if (typeof tool.openSource === 'boolean') coverage.openSource.known++;
    else coverage.openSource.unknown++;

    if (typeof tool.selfHosted === 'boolean') coverage.selfHosted.known++;
    else coverage.selfHosted.unknown++;

    // 6b. Remaining enum checks (pricingModel, experienceLevel, targetUsers)
    if (tool.pricingModel !== undefined && tool.pricingModel !== null) {
        if (!validPricingModels.has(tool.pricingModel)) {
            console.error(`[ERROR] Tool ${tool.id} has invalid pricingModel enum: "${tool.pricingModel}"`);
            errors++;
        } else if (tool.pricingModel === 'unknown') {
            coverage.pricingModel.unknown++;
        } else {
            coverage.pricingModel.known++;
            coverage.pricingModel.details[tool.pricingModel] = (coverage.pricingModel.details[tool.pricingModel] || 0) + 1;
        }
    } else {
        coverage.pricingModel.unknown++;
    }

    if (tool.experienceLevel !== undefined && tool.experienceLevel !== null) {
        if (!validExperienceLevels.has(tool.experienceLevel)) {
            console.error(`[ERROR] Tool ${tool.id} has invalid experienceLevel enum: "${tool.experienceLevel}"`);
            errors++;
        } else if (tool.experienceLevel === 'unknown') {
            coverage.experienceLevel.unknown++;
        } else {
            coverage.experienceLevel.known++;
            coverage.experienceLevel.details[tool.experienceLevel] = (coverage.experienceLevel.details[tool.experienceLevel] || 0) + 1;
        }
    } else {
        coverage.experienceLevel.unknown++;
    }

    if (tool.targetUsers !== undefined && tool.targetUsers !== null) {
        if (!validTargetUsers.has(tool.targetUsers)) {
            console.error(`[ERROR] Tool ${tool.id} has invalid targetUsers enum: "${tool.targetUsers}"`);
            errors++;
        } else if (tool.targetUsers === 'unknown') {
            coverage.targetUsers.unknown++;
        } else {
            coverage.targetUsers.known++;
            coverage.targetUsers.details[tool.targetUsers] = (coverage.targetUsers.details[tool.targetUsers] || 0) + 1;
        }
    } else {
        coverage.targetUsers.unknown++;
    }


    const arrayFields = ['aliases', 'platforms', 'primaryUseCases', 'bestFor', 'notIdealFor', 'verificationSources'];
    arrayFields.forEach(field => {
        if (tool[field] !== undefined && !Array.isArray(tool[field])) {
            console.error(`[ERROR] Tool ${tool.id} attribute "${field}" must be an array.`);
            errors++;
        }
    });

    if (Array.isArray(tool.aliases) && tool.aliases.length > 0) {
        coverage.aliases.populated++;
    } else {
        coverage.aliases.empty++;
    }

    if (tool.previousName && typeof tool.previousName === 'string') {
        coverage.previousName.populated++;
    } else {
        coverage.previousName.empty++;
    }

    if (Array.isArray(tool.platforms) && tool.platforms.length > 0) {
        tool.platforms.forEach(p => {
            if (!allowedPlatformTokens.has(p)) {
                console.error(`[ERROR] Tool ${tool.id} has invalid platform token: "${p}"`);
                errors++;
            }
        });
        coverage.platforms.known++;
    } else {
        coverage.platforms.unknown++;
    }

    if (Array.isArray(tool.primaryUseCases) && tool.primaryUseCases.length > 0) {
        coverage.primaryUseCases.populated++;
    } else {
        coverage.primaryUseCases.empty++;
    }

    if (Array.isArray(tool.bestFor) && tool.bestFor.length > 0) {
        coverage.bestFor.populated++;
    } else {
        coverage.bestFor.empty++;
    }

    if (Array.isArray(tool.notIdealFor) && tool.notIdealFor.length > 0) {
        coverage.notIdealFor.populated++;
    } else {
        coverage.notIdealFor.empty++;
    }

    // 9. VERIFICATION DATE & SOURCE CHECKS
    if (tool.lastVerifiedAt !== null && tool.lastVerifiedAt !== undefined && tool.lastVerifiedAt !== '') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tool.lastVerifiedAt)) {
            console.error(`[ERROR] Tool ${tool.id} has malformed lastVerifiedAt date: "${tool.lastVerifiedAt}" (must be YYYY-MM-DD).`);
            errors++;
        } else {
            verificationDates[tool.lastVerifiedAt] = (verificationDates[tool.lastVerifiedAt] || 0) + 1;
            coverage.lastVerifiedAt.verified++;
        }
    } else {
        coverage.lastVerifiedAt.unverified++;
    }

    // 10. CONTENT INTEGRITY CHECKS
    const stringified = JSON.stringify(tool).toLowerCase();

    // Template corruption check ($2 inside words)
    const corruptionRegex = /[a-z]\$\d/i;
    if (corruptionRegex.test(stringified)) {
        console.error(`[ERROR] Tool ${tool.id} contains suspicious template corruption (e.g. $2 artefact inside word).`);
        errors++;
    }

    // Boilerplate warnings
    aiBoilerplate.forEach(phrase => {
        if (stringified.includes(phrase)) {
            console.warn(`[WARNING] Tool ${tool.id} contains suspicious boilerplate: "${phrase}"`);
            warnings++;
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Post-loop checks
// ─────────────────────────────────────────────────────────────────────────────

// Mass-assignment check for lastVerifiedAt
const totalTools = toolsJson.length;
for (const [date, count] of Object.entries(verificationDates)) {
    if (count > totalTools * 0.5) {
        console.error(`[ERROR] Mass-assignment detected: ${count} tools have lastVerifiedAt set to ${date}. Dates must reflect genuine manual verification.`);
        errors++;
    }
}

// successorToolId referential integrity
const allToolIds = new Set(toolsJson.map(t => t.id));
toolsJson.forEach(tool => {
    if (tool.successorToolId) {
        if (!allToolIds.has(tool.successorToolId)) {
            console.error(`[ERROR] Tool ${tool.id} has successorToolId "${tool.successorToolId}" which does not exist in the database.`);
            errors++;
        }
    }
});

// contentReviewRequired — list flagged records as warnings
toolsJson.filter(t => t.contentReviewRequired).forEach(t => {
    console.warn(`[WARNING] Tool ${t.id} ("${t.name}") is flagged contentReviewRequired=true. Editorial review needed.`);
    warnings++;
});

// PRINT DATA COVERAGE REPORT
const totalEligible = coverage.recommendationEligible.eligible;
const totalIneligible = coverage.recommendationEligible.ineligible;

console.log(`\n==================================================`);
console.log(`WHICHAIPICK DECISION DATA COVERAGE REPORT (4A.1)`);
console.log(`Total Tools: ${totalTools}`);
console.log(`Recommendation Eligible: ${totalEligible} | Ineligible: ${totalIneligible}`);
console.log(`Content Review Required: ${coverage.contentReviewRequired.flagged}`);
console.log(`==================================================`);

const reportRow = (name, known, unknown, details = '') => {
    const pct = ((known / totalTools) * 100).toFixed(1);
    console.log(`${name.padEnd(24)} | Known: ${String(known).padStart(3)} (${pct}%) | Unknown: ${String(unknown).padStart(3)} ${details ? '| ' + details : ''}`);
};

console.log('\n── Primary Status Fields (4A.1) ──────────────────────────────────────────');
reportRow('Operational Status',    coverage.operationalStatus.known, coverage.operationalStatus.unknown, JSON.stringify(coverage.operationalStatus.details));
reportRow('Transition Type',       coverage.transitionType.known, coverage.transitionType.unknown, JSON.stringify(coverage.transitionType.details));
reportRow('Successor Tool ID',     coverage.successorToolId.set, coverage.successorToolId.unset);
reportRow('Lifecycle (derived)',   coverage.lifecycleStatus.known, 0, JSON.stringify(coverage.lifecycleStatus.details));

console.log('\n── Pricing & Accessibility ───────────────────────────────────────────────');
reportRow('Pricing Model',         coverage.pricingModel.known, coverage.pricingModel.unknown, JSON.stringify(coverage.pricingModel.details));
reportRow('Free Tier',             coverage.hasFreeTier.known, coverage.hasFreeTier.unknown, `true:${coverage.hasFreeTier.details['true'] || 0}, false:${coverage.hasFreeTier.details['false'] || 0}`);
reportRow('Free Trial',            coverage.hasFreeTrial.known, coverage.hasFreeTrial.unknown, `true:${coverage.hasFreeTrial.details['true'] || 0}`);
reportRow('API Available',         coverage.apiAvailable.known, coverage.apiAvailable.unknown);
reportRow('Open Source',           coverage.openSource.known, coverage.openSource.unknown);
reportRow('Self Hosted',           coverage.selfHosted.known, coverage.selfHosted.unknown);

console.log('\n── Use Case & Editorial ──────────────────────────────────────────────────');
reportRow('Primary Use Cases',     coverage.primaryUseCases.populated, coverage.primaryUseCases.empty);
reportRow('Best For',              coverage.bestFor.populated, coverage.bestFor.empty);
reportRow('Not Ideal For',         coverage.notIdealFor.populated, coverage.notIdealFor.empty);
reportRow('Target Users',          coverage.targetUsers.known, coverage.targetUsers.unknown, JSON.stringify(coverage.targetUsers.details));
reportRow('Experience Level',      coverage.experienceLevel.known, coverage.experienceLevel.unknown);

console.log('\n── Identity & Provenance ─────────────────────────────────────────────────');
reportRow('Aliases / Rebrands',    coverage.aliases.populated, coverage.aliases.empty);
reportRow('Previous Name',         coverage.previousName.populated, coverage.previousName.empty);
reportRow('Platforms',             coverage.platforms.known, coverage.platforms.unknown);
reportRow('Verification Date',     coverage.lastVerifiedAt.verified, coverage.lastVerifiedAt.unverified);
console.log(`==================================================\n`);


console.log(`Validation Complete. Errors: ${errors}, Warnings: ${warnings}`);
if (errors > 0) {
    console.error(`\n[FATAL] Data validation failed. Fix the ${errors} errors before deploying.`);
    process.exit(1);
} else {
    console.log(`\n[SUCCESS] Data validation passed.`);
    process.exit(0);
}
