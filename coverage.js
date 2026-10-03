const fs = require('fs');
const tools = JSON.parse(fs.readFileSync('data/tools.json', 'utf8'));

const fieldsToAnalyze = [
    'id', 'name', 'category', 'website_url', 'logo_url',
    'pricing_model', 'has_free_tier', 'has_free_trial', 'starting_price',
    'best_for', 'not_ideal_for', 'experience_level', 'primary_use_cases', 'target_users',
    'platforms', 'technical_capabilities', 'integrations',
    'pros', 'cons', 'features', 'pricing_overview',
    'finder_intent_ids', 'evidence_ids', 'contentReviewRequired', 'pricingNeedsReview', 'reviewed_at',
    // also check camelCase versions since the schema is moving towards camelCase or mix
    'primaryUseCases', 'targetUsers'
];

let coverage = {};

fieldsToAnalyze.forEach(f => {
    let count = 0, nullCount = 0, falseCount = 0, emptyArrayCount = 0;
    tools.forEach(t => {
        let val = t[f];
        if (val === undefined || val === null) {
            nullCount++;
        } else if (val === false) {
            falseCount++;
            count++; // false is a value for booleans
        } else if (Array.isArray(val) && val.length === 0) {
            emptyArrayCount++;
        } else if (val === '') {
            nullCount++;
        } else {
            count++;
        }
    });
    coverage[f] = {
        populated: count,
        nulls: nullCount,
        falses: falseCount,
        emptyArrays: emptyArrayCount,
        percent: ((count / tools.length) * 100).toFixed(1) + '%'
    };
});

console.log(JSON.stringify(coverage, null, 2));
