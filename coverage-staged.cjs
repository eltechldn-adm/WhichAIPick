const fs = require('fs');
const tools = JSON.parse(fs.readFileSync('data/tools.phase11.staged.json', 'utf8'));

const fields = [
    'id', 'canonicalName', 'primaryCategory', 'website_url', 
    'pricingModel', 'hasFreeTier', 'hasFreeTrial', 'startingPrice', 
    'priceCurrency', 'bestFor', 'notIdealFor', 'primaryUseCases', 
    'platforms', 'finderIntentIds', 'deploymentModes', 'audienceTags', 
    'evidenceIds', 'apiAvailable', 'openSource', 'selfHosted', 
    'recommendationEligible', 'directoryEligible', 'pricingNeedsReview', 
    'contentReviewRequired', 'operationalStatus', 'name', 'category', 'pricing_model', 'has_free_tier', 'description'
];

let coverage = {};

fields.forEach(f => {
    let tCount = 0, fCount = 0, nullCount = 0, emptyArrCount = 0, arrCount = 0, strCount = 0, numCount = 0, missingCount = 0;
    tools.forEach(t => {
        if (!(f in t)) {
            missingCount++;
            return;
        }
        let val = t[f];
        if (val === true) tCount++;
        else if (val === false) fCount++;
        else if (val === null || val === undefined) nullCount++;
        else if (Array.isArray(val)) {
            if (val.length === 0) emptyArrCount++;
            else arrCount++;
        }
        else if (typeof val === 'string') strCount++;
        else if (typeof val === 'number') numCount++;
    });
    
    let populated = tools.length - missingCount - nullCount;
    if (populated < 0) populated = 0; // fallback if anything is weird

    coverage[f] = {
        'true': tCount,
        'false': fCount,
        'null': nullCount,
        'empty array': emptyArrCount,
        'non-empty array': arrCount,
        'string': strCount,
        'number': numCount,
        'missing property': missingCount,
        'coverage %': ((populated / tools.length) * 100).toFixed(1) + '%'
    };
});

console.log(JSON.stringify(coverage, null, 2));
