import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');

const toolsJson = JSON.parse(fs.readFileSync(TOOLS_JSON_FILE, 'utf8'));

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

const validPricingModels = new Set(['free', 'freemium', 'paid', 'enterprise', 'unknown']);
const validExperienceLevels = new Set(['beginner', 'intermediate', 'advanced', 'unknown']);
const validTargetUsers = new Set(['individual', 'team', 'enterprise', 'unknown']);

const seenIds = new Set();
const seenUrls = new Set();
const verificationDates = {};

toolsJson.forEach((tool, index) => {
    // ERRORS: Strict failures
    if (!tool.id || tool.id.trim() === '') {
        console.error(`[ERROR] Tool at index ${index} is missing an ID.`);
        errors++;
    } else {
        if (seenIds.has(tool.id)) {
            console.error(`[ERROR] Duplicate tool ID found: ${tool.id}`);
            errors++;
        }
        seenIds.add(tool.id);
    }

    if (!tool.name || tool.name.trim() === '') {
        console.error(`[ERROR] Tool ${tool.id || index} is missing a name.`);
        errors++;
    }

    if (!tool.website_url || (!tool.website_url.startsWith('http://') && !tool.website_url.startsWith('https://'))) {
        console.error(`[ERROR] Tool ${tool.id} has malformed or missing official URL: ${tool.website_url}`);
        errors++;
    } else {
        // Only warn on exact duplicates if it's not null.
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

    // Decision Data Validation (Warnings only for unknown/invalid during transition)
    if (tool.pricingModel && !validPricingModels.has(tool.pricingModel)) {
        console.warn(`[WARNING] Tool ${tool.id} has invalid pricingModel: ${tool.pricingModel}`);
        warnings++;
    }
    if (tool.experienceLevel && !validExperienceLevels.has(tool.experienceLevel)) {
        console.warn(`[WARNING] Tool ${tool.id} has invalid experienceLevel: ${tool.experienceLevel}`);
        warnings++;
    }
    if (tool.targetUsers && !validTargetUsers.has(tool.targetUsers)) {
        console.warn(`[WARNING] Tool ${tool.id} has invalid targetUsers: ${tool.targetUsers}`);
        warnings++;
    }

    // Deep text inspection
    const stringified = JSON.stringify(tool).toLowerCase();

    // ERROR: Template corruption ($2 artefacts, but allow valid prices like $20, $1M)
    // Matches letters followed by $ and a digit (e.g. accurate$2)
    const corruptionRegex = /[a-z]\$\d/i;
    if (corruptionRegex.test(stringified)) {
        console.error(`[ERROR] Tool ${tool.id} contains suspicious template corruption (e.g. $2 artefact inside word).`);
        errors++;
    }

    // WARNINGS: Content Quality Indicators
    aiBoilerplate.forEach(phrase => {
        if (stringified.includes(phrase)) {
            console.warn(`[WARNING] Tool ${tool.id} contains suspicious AI boilerplate or placeholder: "${phrase}"`);
            warnings++;
        }
    });
    // Collect verification dates
    if (tool.lastVerifiedAt && tool.lastVerifiedAt.trim() !== '') {
        verificationDates[tool.lastVerifiedAt] = (verificationDates[tool.lastVerifiedAt] || 0) + 1;
    }
});

// Check for mass-assignment of lastVerifiedAt
const totalTools = toolsJson.length;
for (const [date, count] of Object.entries(verificationDates)) {
    if (count > totalTools * 0.5) { // If more than 50% of tools share the exact same date
        console.error(`[ERROR] Mass-assignment detected: ${count} tools have lastVerifiedAt set to ${date}. Dates must reflect genuine manual verification.`);
        errors++;
    }
}

console.log(`\nValidation Complete. Errors: ${errors}, Warnings: ${warnings}`);
if (errors > 0) {
    console.error(`\n[FATAL] Data validation failed. Fix the ${errors} errors before deploying.`);
    process.exit(1);
} else {
    console.log(`\n[SUCCESS] Data validation passed.`);
    process.exit(0);
}
