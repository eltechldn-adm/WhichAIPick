import fs from 'fs';

function runGuard() {
    const toolsData = JSON.parse(fs.readFileSync('data/tools.phase11.staged.json', 'utf8'));
    const comparisons = JSON.parse(fs.readFileSync('data/seo/comparisons-v2.research.json', 'utf8'));
    const sources = JSON.parse(fs.readFileSync('data/seo/comparison-sources.json', 'utf8'));

    let errors = 0;
    const toolIds = new Set(toolsData.filter(t => t.directoryEligible).map(t => t.id));
    const sourceIds = new Set();

    sources.forEach(src => {
        if (sourceIds.has(src.sourceId)) {
            console.error(`[ERROR] Duplicate sourceId: ${src.sourceId}`);
            errors++;
        }
        sourceIds.add(src.sourceId);
    });

    const slugs = new Set();

    comparisons.forEach(comp => {
        if (slugs.has(comp.slug)) {
            console.error(`[ERROR] Duplicate slug: ${comp.slug}`);
            errors++;
        }
        slugs.add(comp.slug);

        if (!Array.isArray(comp.tools) || comp.tools.length !== 2) {
            console.error(`[ERROR] ${comp.slug} must have exactly 2 tools.`);
            errors++;
        } else {
            comp.tools.forEach(tid => {
                if (!toolIds.has(tid)) {
                    console.error(`[ERROR] ${comp.slug} uses invalid or retired tool ID: ${tid}`);
                    errors++;
                }
            });
        }

        if (Array.isArray(comp.alternatives)) {
            comp.alternatives.forEach(alt => {
                if (!toolIds.has(alt)) {
                    console.error(`[ERROR] ${comp.slug} uses invalid alternative tool ID: ${alt}`);
                    errors++;
                }
            });
        }

        if (Array.isArray(comp.claims)) {
            comp.claims.forEach(claim => {
                if (!['HIGH', 'MEDIUM', 'LOW'].includes(claim.confidence)) {
                    console.error(`[ERROR] ${comp.slug} has invalid confidence value: ${claim.confidence}`);
                    errors++;
                }
                if (!claim.checkedAt) {
                    console.error(`[ERROR] ${comp.slug} claim ${claim.claimId} is missing checkedAt`);
                    errors++;
                }
                if (Array.isArray(claim.sourceIds)) {
                    claim.sourceIds.forEach(sid => {
                        if (!sourceIds.has(sid)) {
                            console.error(`[ERROR] ${comp.slug} claim ${claim.claimId} references missing source: ${sid}`);
                            errors++;
                        }
                    });
                }
                if (comp.status === 'research-ready' || comp.status === 'publish-ready') {
                    if (claim.classification !== 'EDITORIAL INTERPRETATION' && (!claim.sourceIds || claim.sourceIds.length === 0)) {
                        console.error(`[ERROR] ${comp.slug} claim ${claim.claimId} lacks sources but is not an editorial interpretation`);
                        errors++;
                    }
                }
            });
        }
    });

    if (errors > 0) {
        console.error(`\n[FAIL] comparison-editorial-data-guard.mjs found ${errors} errors.`);
        process.exit(1);
    } else {
        console.log(`[PASS] comparison-editorial-data-guard.mjs: Editorial data validated successfully.`);
    }
}

runGuard();
