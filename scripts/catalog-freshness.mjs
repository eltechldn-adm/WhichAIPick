import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_JSON_FILE = path.join(__dirname, '../data/tools.json');
const REPORT_FILE = path.join(__dirname, '../reports/stale-tools.json');

const STALE_THRESHOLD_DAYS = 90;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

const toolsJson = JSON.parse(fs.readFileSync(TOOLS_JSON_FILE, 'utf8'));

const now = new Date();

const staleTools = [];
let totalStale = 0;
let totalMissingDate = 0;

toolsJson.forEach(tool => {
    if (tool.operationalStatus !== 'active') return; // Don't care if discontinued/unavailable tools are stale

    if (!tool.lastVerifiedAt) {
        totalMissingDate++;
        staleTools.push({
            id: tool.id,
            name: tool.name,
            reason: 'missing_date',
            recommendationEligible: tool.recommendationEligible
        });
        return;
    }

    const verifiedDate = new Date(tool.lastVerifiedAt);
    const diffMs = now - verifiedDate;
    const diffDays = Math.floor(diffMs / MILLISECONDS_PER_DAY);

    if (diffDays > STALE_THRESHOLD_DAYS) {
        totalStale++;
        staleTools.push({
            id: tool.id,
            name: tool.name,
            reason: 'stale',
            days_since_verified: diffDays,
            recommendationEligible: tool.recommendationEligible
        });
    }
});

// Sort by recommendationEligible first (true > false), then by days_since_verified (descending)
staleTools.sort((a, b) => {
    if (a.recommendationEligible !== b.recommendationEligible) {
        return a.recommendationEligible ? -1 : 1;
    }
    if (a.reason === 'missing_date' && b.reason === 'missing_date') return 0;
    if (a.reason === 'missing_date') return -1;
    if (b.reason === 'missing_date') return 1;
    return b.days_since_verified - a.days_since_verified;
});

console.log(`\nCatalog Freshness Audit Complete.`);
console.log(`Found ${totalMissingDate} active tools missing a verification date.`);
console.log(`Found ${totalStale} active tools older than ${STALE_THRESHOLD_DAYS} days.`);

fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(staleTools, null, 2), 'utf8');

console.log(`Report written to ${REPORT_FILE}`);
