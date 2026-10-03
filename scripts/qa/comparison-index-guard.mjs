import fs from 'fs';

function runQA() {
    const data = JSON.parse(fs.readFileSync('data/comparison-index.json', 'utf8'));

    let errors = 0;

    // records = 882
    if (data.length !== 882) {
        console.error(`[ERROR] Expected 882 records, found ${data.length}`);
        errors++;
    }

    // IDs unique
    const ids = new Set();
    data.forEach(t => {
        if (ids.has(t.id)) {
            console.error(`[ERROR] Duplicate ID found: ${t.id}`);
            errors++;
        }
        ids.add(t.id);
    });

    data.forEach(t => {
        // all IDs canonical / no legacy / no retired. We check directoryEligible
        if (t.directoryEligible !== true) {
            console.error(`[ERROR] Tool ${t.id} is not directoryEligible`);
            errors++;
        }

        // Check required fields structurally valid
        const requiredStringFields = ['id', 'canonicalName', 'primaryCategory'];
        requiredStringFields.forEach(f => {
            if (typeof t[f] !== 'string' || t[f].trim() === '') {
                console.error(`[ERROR] Tool ${t.id} has invalid or missing required field: ${f}`);
                errors++;
            }
        });

        const arrayFields = ['bestFor', 'notIdealFor', 'primaryUseCases', 'platforms', 'finderIntentIds', 'aliases'];
        arrayFields.forEach(f => {
            if (!Array.isArray(t[f])) {
                console.error(`[ERROR] Tool ${t.id} has invalid array field: ${f}`);
                errors++;
            }
        });

        // null semantics preserved (boolean or null, number or null, string or null)
        const booleanOrNullFields = ['hasFreeTier', 'hasFreeTrial', 'apiAvailable', 'openSource', 'selfHosted'];
        booleanOrNullFields.forEach(f => {
            if (t[f] !== true && t[f] !== false && t[f] !== null) {
                console.error(`[ERROR] Tool ${t.id} field ${f} violates boolean/null semantics (value: ${t[f]})`);
                errors++;
            }
        });

        if (t.startingPrice !== null && typeof t.startingPrice !== 'number') {
            console.error(`[ERROR] Tool ${t.id} startingPrice violates number/null semantics (value: ${t.startingPrice})`);
            errors++;
        }
        
        if (t.priceCurrency !== null && typeof t.priceCurrency !== 'string') {
            console.error(`[ERROR] Tool ${t.id} priceCurrency violates string/null semantics`);
            errors++;
        }
    });

    if (errors > 0) {
        console.error(`\n[FAIL] comparison-index-guard.mjs found ${errors} errors.`);
        process.exit(1);
    } else {
        console.log(`[PASS] comparison-index-guard.mjs: Index validated successfully.`);
    }
}

runQA();
