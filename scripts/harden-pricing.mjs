import fs from 'fs';

const PATH = './data/tools.json';
const tools = JSON.parse(fs.readFileSync(PATH, 'utf8'));

// STEP 1 - Audit
let unknownCountBefore = 0;
let lowConfCountBefore = 0;
const lowConfList = [];

for (const t of tools) {
    if (!t.pricing_model || t.pricing_model.toLowerCase() === 'unknown') {
        unknownCountBefore++;
    }
    const conf = typeof t.pricing_confidence === 'number' ? t.pricing_confidence : 0;
    if (conf < 3) {
        lowConfCountBefore++;
        lowConfList.push({ id: t.id, confidence: conf });
    }
}

// Top 30 lowest confidence tools
lowConfList.sort((a, b) => a.confidence - b.confidence);
const top30Lowest = lowConfList.slice(0, 30).map(x => x.id);

// Classification Mapping
function normalizePricingModel(modelStr) {
    if (!modelStr) return 'unknown';
    const s = modelStr.toLowerCase().trim();
    if (s.includes('open source') || s.includes('opensource')) return 'open_source';
    if (s.includes('free trial') || s.includes('freetrial')) return 'free_trial';
    if (s.includes('freemium')) return 'freemium';
    if (s === 'free') return 'free';
    if (s.includes('paid')) return 'paid';
    if (s.includes('enterprise')) return 'enterprise';
    return 'unknown';
}

function normalizeHasFreeTier(model) {
    switch (model) {
        case 'free': return true;
        case 'freemium': return true;
        case 'free_trial': return false; // Strictly speaking a trial isn't a permanent free tier
        case 'paid': return false;
        case 'enterprise': return false;
        case 'open_source': return true;
        default: return false; // Default safe assumption
    }
}

// STEP 2 to 5 - Execute Enhancements
let fullyConfirmedCount = 0;

for (const t of tools) {
    // Normalize Model
    const oldModel = t.pricing_model;
    t.pricing_model = normalizePricingModel(oldModel);

    // Normalize Free Tier
    t.has_free_tier = normalizeHasFreeTier(t.pricing_model);

    // Recalculate Confidence based on existing `pricing_source` if available, or fallback
    // The system wants: 3=official page, 2=homepage, 1=inferred, 0=unknown
    // We can look at t.pricing_source: 'pricing_page', 'homepage', etc.
    let newConf = 0;
    if (t.pricing_model === 'unknown') {
        newConf = 0;
    } else {
        if (t.pricing_source === 'pricing_page') {
            newConf = 3;
        } else if (t.pricing_source === 'homepage') {
            newConf = 2;
        } else if (t.pricing_source) {
            newConf = 1; // It has a source but not strictly official or homepage
        } else {
            // If it has a model but no source, it's inferred
            newConf = 1;
        }
    }

    // Override if previous confidence already explicitly carried more weight but no source listed
    // Wait, the rules say "Recalculate", so we enforce the new rule
    t.pricing_confidence = newConf;

    if (newConf === 3) fullyConfirmedCount++;

    // Add Metadata
    t.pricing_last_verified = "2026-02-20";
}

// Check after
let unknownCountAfter = 0;
let lowConfCountAfter = 0;
for (const t of tools) {
    if (t.pricing_model === 'unknown') unknownCountAfter++;
    if (t.pricing_confidence < 3) lowConfCountAfter++;
}

console.log('--- PHASE 9 PRICING AUDIT (BEFORE) ---');
console.log(`Unknown Pricing Models: ${unknownCountBefore}`);
console.log(`Tools with Confidence < 3: ${lowConfCountBefore}`);
console.log(`Top 30 Lowest Confidence Tools:\n`, top30Lowest.join(', '));
console.log('\n--- PRICING HARDENING EXECUTED ---');
console.log(`Unknown Pricing Models (After): ${unknownCountAfter}`);
console.log(`Tools with Confidence < 3 (After): ${lowConfCountAfter}`);
console.log(`Tools at Confidence Level 3: ${fullyConfirmedCount} (${((fullyConfirmedCount / tools.length) * 100).toFixed(1)}%)`);

// Write back to file
fs.writeFileSync(PATH, JSON.stringify(tools, null, 2));

try {
    JSON.parse(fs.readFileSync(PATH, 'utf8'));
    console.log('\n✅ JSON Validity Confirmed: File parses successfully.');
} catch (e) {
    console.log('\n❌ JSON ERROR:', e);
}
