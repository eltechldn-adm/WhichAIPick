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
        try {
            new URL(src.url);
        } catch(e) {
            console.error(`[ERROR] Invalid URL in source: ${src.sourceId}`);
            errors++;
        }
        sourceIds.add(src.sourceId);
    });

    const slugs = new Set();
    const claimIds = new Set();

    function checkSourceIds(slug, fieldName, sourceIdsArray, classification) {
        if (classification !== 'EDITORIAL INTERPRETATION' && (!sourceIdsArray || sourceIdsArray.length === 0)) {
            console.error(`[ERROR] ${slug} -> ${fieldName} lacks sources but is not an editorial interpretation`);
            errors++;
        }
        if (Array.isArray(sourceIdsArray)) {
            sourceIdsArray.forEach(sid => {
                if (!sourceIds.has(sid)) {
                    console.error(`[ERROR] ${slug} -> ${fieldName} references missing source: ${sid}`);
                    errors++;
                }
            });
        }
    }

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

        const compClaimIds = new Set();
        if (Array.isArray(comp.claims)) {
            comp.claims.forEach(claim => {
                if (claimIds.has(claim.claimId)) {
                    console.error(`[ERROR] Duplicate claimId globally: ${claim.claimId}`);
                    errors++;
                }
                claimIds.add(claim.claimId);
                compClaimIds.add(claim.claimId);

                if (!['HIGH', 'MEDIUM', 'LOW'].includes(claim.confidence)) {
                    console.error(`[ERROR] ${comp.slug} has invalid confidence value: ${claim.confidence}`);
                    errors++;
                }
                if (!claim.checkedAt) {
                    console.error(`[ERROR] ${comp.slug} claim ${claim.claimId} is missing checkedAt`);
                    errors++;
                }
                checkSourceIds(comp.slug, `claim ${claim.claimId}`, claim.sourceIds, claim.classification);
            });
        }

        // Validate quickAnswer
        if (Array.isArray(comp.quickAnswer)) {
            comp.quickAnswer.forEach((qa, i) => {
                checkSourceIds(comp.slug, `quickAnswer[${i}]`, qa.sourceIds, qa.classification);
            });
        }

        // Validate keyDifferences
        if (Array.isArray(comp.keyDifferences)) {
            comp.keyDifferences.forEach((kd, i) => {
                checkSourceIds(comp.slug, `keyDifferences[${i}]`, kd.sourceIds, kd.classification || 'OFFICIAL SOURCE FACT');
            });
        }

        // Validate useCaseDecisions
        if (Array.isArray(comp.useCaseDecisions)) {
            comp.useCaseDecisions.forEach((uc, i) => {
                checkSourceIds(comp.slug, `useCaseDecisions[${i}]`, uc.evidenceIds, 'OFFICIAL SOURCE FACT');
            });
        }

        // Validate chooseToolAIf / chooseToolBIf
        const validateChoose = (arr, name) => {
            if (Array.isArray(arr)) {
                arr.forEach((c, i) => {
                    if (c.claimId && !compClaimIds.has(c.claimId)) {
                        console.error(`[ERROR] ${comp.slug} -> ${name}[${i}] references undefined local claimId: ${c.claimId}`);
                        errors++;
                    }
                });
            }
        };
        validateChoose(comp.chooseToolAIf, 'chooseToolAIf');
        validateChoose(comp.chooseToolBIf, 'chooseToolBIf');

        // Validate faqCandidates
        if (Array.isArray(comp.faqCandidates)) {
            comp.faqCandidates.forEach((faq, i) => {
                checkSourceIds(comp.slug, `faqCandidates[${i}]`, faq.sourceIds, 'OFFICIAL SOURCE FACT');
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
