import fs from 'fs';

function runGuard() {
    const toolsData = JSON.parse(fs.readFileSync('data/tools.phase11.staged.json', 'utf8'));
    const comparisons = JSON.parse(fs.readFileSync('data/seo/comparisons-v2.research.json', 'utf8'));
    const sources = JSON.parse(fs.readFileSync('data/seo/comparison-sources.json', 'utf8'));

    let errors = 0;
    const toolIds = new Set(toolsData.filter(t => t.directoryEligible).map(t => t.id));
    const sourceIds = new Set();
    const sourceMap = new Map();

    const domainAllowlist = {
        'OpenAI': ['openai.com', 'help.openai.com'],
        'Anthropic': ['anthropic.com', 'support.anthropic.com', 'docs.anthropic.com'],
        'GitHub': ['github.com', 'docs.github.com'],
        'Google': ['google.com', 'support.google.com', 'gemini.google.com'],
        'Midjourney': ['midjourney.com', 'docs.midjourney.com', 'help.midjourney.com'],
        'Perplexity': ['perplexity.ai'],
        'Cursor': ['cursor.com', 'docs.cursor.com'],
        'Replit': ['replit.com', 'docs.replit.com'],
        'Lovable': ['lovable.dev', 'docs.lovable.dev'],
        'StackBlitz': ['bolt.new', 'stackblitz.com'],
        'Leonardo AI': ['leonardo.ai', 'docs.leonardo.ai']
    };

    sources.forEach(src => {
        if (sourceIds.has(src.sourceId)) {
            console.error(`[ERROR] Duplicate sourceId: ${src.sourceId}`);
            errors++;
        }
        try {
            const url = new URL(src.url);
            if (url.protocol !== 'https:') {
                console.error(`[ERROR] Source URL must be HTTPS: ${src.sourceId}`);
                errors++;
            }
            if (src.sourceType.startsWith('Official')) {
                const allowedDomains = domainAllowlist[src.publisher];
                if (!allowedDomains || !allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) {
                    console.error(`[ERROR] Source ${src.sourceId} has publisher ${src.publisher} but URL hostname ${url.hostname} is not allowed.`);
                    errors++;
                }
            }
        } catch(e) {
            console.error(`[ERROR] Invalid URL in source: ${src.sourceId}`);
            errors++;
        }
        sourceIds.add(src.sourceId);
        sourceMap.set(src.sourceId, src);
    });

    const slugs = new Set();
    const claimIds = new Set();

    function checkSourceIds(slug, fieldName, sourceIdsArray) {
        let hasErrors = false;
        if (!sourceIdsArray || sourceIdsArray.length === 0) {
            console.error(`[ERROR] ${slug} -> ${fieldName} lacks sources. Material editorial interpretation must have >= 1 source.`);
            errors++;
            hasErrors = true;
        }
        if (Array.isArray(sourceIdsArray)) {
            sourceIdsArray.forEach(sid => {
                if (!sourceIds.has(sid)) {
                    console.error(`[ERROR] ${slug} -> ${fieldName} references missing source: ${sid}`);
                    errors++;
                    hasErrors = true;
                }
            });
        }
        return !hasErrors;
    }

    const validatePricing = (slug, pRes, toolKey) => {
        let hasErrors = false;
        if (!pRes || !pRes[toolKey]) return false;
        const p = pRes[toolKey];
        if (![true, false, null].includes(p.freePlan)) { console.error(`[ERROR] ${slug} -> pricingResearch.${toolKey}.freePlan must be true/false/null`); errors++; hasErrors = true; }
        if (![true, false, null].includes(p.trial)) { console.error(`[ERROR] ${slug} -> pricingResearch.${toolKey}.trial must be true/false/null`); errors++; hasErrors = true; }
        if (typeof p.entryPaidPlan !== 'number' && p.entryPaidPlan !== null) { console.error(`[ERROR] ${slug} -> pricingResearch.${toolKey}.entryPaidPlan must be number/null`); errors++; hasErrors = true; }
        if (typeof p.currency !== 'string' && p.currency !== null) { console.error(`[ERROR] ${slug} -> pricingResearch.${toolKey}.currency must be string/null`); errors++; hasErrors = true; }
        if (typeof p.billingBasis !== 'string' && p.billingBasis !== null) { console.error(`[ERROR] ${slug} -> pricingResearch.${toolKey}.billingBasis must be string/null`); errors++; hasErrors = true; }
        if (typeof p.checkedAt !== 'string') { console.error(`[ERROR] ${slug} -> pricingResearch.${toolKey}.checkedAt missing`); errors++; hasErrors = true; }
        if (p.sourceId && !sourceIds.has(p.sourceId)) { console.error(`[ERROR] ${slug} -> pricingResearch.${toolKey} references missing source: ${p.sourceId}`); errors++; hasErrors = true; }
        return !hasErrors;
    };

    comparisons.forEach(comp => {
        if (slugs.has(comp.slug)) {
            console.error(`[ERROR] Duplicate slug: ${comp.slug}`);
            errors++;
        }
        slugs.add(comp.slug);

        let toolsValid = true;
        if (!Array.isArray(comp.tools) || comp.tools.length !== 2) {
            console.error(`[ERROR] ${comp.slug} must have exactly 2 tools.`);
            errors++;
            toolsValid = false;
        } else {
            comp.tools.forEach(tid => {
                if (!toolIds.has(tid)) {
                    console.error(`[ERROR] ${comp.slug} uses invalid or retired tool ID: ${tid}`);
                    errors++;
                    toolsValid = false;
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

        let claimsSourced = true;
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
                if (!checkSourceIds(comp.slug, `claim ${claim.claimId}`, claim.sourceIds)) claimsSourced = false;
            });
        }

        let qaValid = true;
        if (Array.isArray(comp.quickAnswer)) {
            comp.quickAnswer.forEach((qa, i) => {
                if (!checkSourceIds(comp.slug, `quickAnswer[${i}]`, qa.sourceIds)) qaValid = false;
            });
        }

        let kdValid = true;
        if (Array.isArray(comp.keyDifferences)) {
            comp.keyDifferences.forEach((kd, i) => {
                if (!checkSourceIds(comp.slug, `keyDifferences[${i}]`, kd.sourceIds)) kdValid = false;
            });
        }

        let ucValid = true;
        if (Array.isArray(comp.useCaseDecisions)) {
            comp.useCaseDecisions.forEach((uc, i) => {
                if (!checkSourceIds(comp.slug, `useCaseDecisions[${i}]`, uc.evidenceIds)) ucValid = false;
            });
        }

        let chooseValid = true;
        const validateChoose = (arr, name) => {
            if (Array.isArray(arr)) {
                arr.forEach((c, i) => {
                    if (c.claimId && !compClaimIds.has(c.claimId)) {
                        console.error(`[ERROR] ${comp.slug} -> ${name}[${i}] references undefined local claimId: ${c.claimId}`);
                        errors++;
                        chooseValid = false;
                    }
                });
            }
        };
        validateChoose(comp.chooseToolAIf, 'chooseToolAIf');
        validateChoose(comp.chooseToolBIf, 'chooseToolBIf');

        let faqValid = true;
        if (Array.isArray(comp.faqCandidates)) {
            comp.faqCandidates.forEach((faq, i) => {
                if (!checkSourceIds(comp.slug, `faqCandidates[${i}]`, faq.sourceIds)) faqValid = false;
            });
        }

        let pricingValid = validatePricing(comp.slug, comp.pricingResearch, 'toolA') && validatePricing(comp.slug, comp.pricingResearch, 'toolB');

        if (comp.status === 'research-ready') {
            const isReady = qaValid && kdValid && ucValid && chooseValid && faqValid && pricingValid && toolsValid && claimsSourced && comp.evidenceAuditPassed;
            if (!isReady) {
                console.error(`[ERROR] ${comp.slug} marked research-ready but fails readiness gate checks.`);
                errors++;
            }
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
