import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');
const REPORT_FILE = path.join(__dirname, '../reports/catalog-diff.json');

const currentTools = JSON.parse(fs.readFileSync(TOOLS_JSON_FILE, 'utf8'));
let baselineTools = [];

const args = process.argv.slice(2);
const baselineArgIndex = args.indexOf('--baseline');

const baselineCommitIndex = args.indexOf('--baseline-commit');

if (baselineArgIndex !== -1 && args[baselineArgIndex + 1]) {
    baselineTools = JSON.parse(fs.readFileSync(path.resolve(args[baselineArgIndex + 1]), 'utf8'));
} else if (baselineCommitIndex !== -1 && args[baselineCommitIndex + 1]) {
    try {
        const commit = args[baselineCommitIndex + 1];
        const gitOutput = execSync(`git show ${commit}:data/tools.json`, { encoding: 'utf8' });
        baselineTools = JSON.parse(gitOutput);
    } catch (e) {
        console.warn(`Could not read data/tools.json from git commit ${args[baselineCommitIndex + 1]}. Using empty baseline.`);
    }
} else {
    try {
        const gitOutput = execSync('git show HEAD:data/tools.json', { encoding: 'utf8' });
        baselineTools = JSON.parse(gitOutput);
    } catch (e) {
        console.warn('Could not read data/tools.json from git HEAD. Using empty baseline.');
    }
}

const baselineMap = new Map(baselineTools.map(t => [t.id, t]));
const currentMap = new Map(currentTools.map(t => [t.id, t]));

const added = [];
const removed = [];
const modified = [];

// Check for additions and modifications
for (const [id, curr] of currentMap.entries()) {
    if (!baselineMap.has(id)) {
        added.push(id);
    } else {
        const base = baselineMap.get(id);
        const changes = [];
        
        if (curr.operationalStatus !== base.operationalStatus) {
            changes.push(`Status: ${base.operationalStatus} -> ${curr.operationalStatus}`);
        }
        if (curr.website_url !== base.website_url) {
            changes.push(`URL: ${base.website_url} -> ${curr.website_url}`);
        }
        if (curr.affiliate_url !== base.affiliate_url) {
            changes.push(`Affiliate: ${base.affiliate_url} -> ${curr.affiliate_url}`);
        }
        if (curr.pricingModel !== base.pricingModel) {
            changes.push(`Pricing: ${base.pricingModel} -> ${curr.pricingModel}`);
        }
        if (curr.recommendationEligible !== base.recommendationEligible) {
            changes.push(`Recommendation Eligible: ${base.recommendationEligible} -> ${curr.recommendationEligible}`);
        }
        
        if (changes.length > 0) {
            modified.push({ id, name: curr.name, changes });
        }
    }
}

// Check for removals
for (const id of baselineMap.keys()) {
    if (!currentMap.has(id)) {
        removed.push(id);
    }
}

console.log(`\nCatalog Change Detection Complete.`);
console.log(`[DETECTED CHANGE] Added tools: ${added.length}`);
console.log(`[DETECTED CHANGE] Removed tools: ${removed.length}`);
console.log(`[DETECTED CHANGE] Modified tools: ${modified.length}`);

const report = {
    added,
    removed,
    modified
};

fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

console.log(`Change report written to ${REPORT_FILE}`);
