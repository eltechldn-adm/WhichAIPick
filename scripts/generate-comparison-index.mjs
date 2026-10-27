import fs from 'fs/promises';
import path from 'path';

async function generateComparisonIndex() {
    const toolsPath = path.resolve('data/tools.phase11.staged.json');
    const ledgerPath = path.resolve('data/evidence/phase11-evidence-ledger.json');
    const outPath = path.resolve('data/comparison-index.json');

    console.log(`Loading tools from ${toolsPath}`);
    const toolsRaw = await fs.readFile(toolsPath, 'utf8');
    const tools = JSON.parse(toolsRaw);

    console.log(`Loading evidence ledger from ${ledgerPath}`);
    const ledgerRaw = await fs.readFile(ledgerPath, 'utf8');
    const ledger = JSON.parse(ledgerRaw);

    // Build evidence map by evidenceId
    const evidenceMap = new Map();
    for (const record of ledger) {
        if (!record.evidenceId || !record.id || !record.reviewedAt) continue;
        evidenceMap.set(record.evidenceId, record);
    }

    const index = [];

    for (const t of tools) {
        if (t.directoryEligible !== true) continue;

        const record = {
            id: t.id,
            canonicalName: t.canonicalName,
            primaryCategory: t.primaryCategory,
            website_url: t.website_url ?? null,

            pricingModel: t.pricingModel ?? null,
            hasFreeTier: t.hasFreeTier ?? null,
            hasFreeTrial: t.hasFreeTrial ?? null,
            startingPrice: t.startingPrice ?? null,
            priceCurrency: t.priceCurrency ?? null,

            experienceLevel: t.experienceLevel ?? null,

            bestFor: Array.isArray(t.bestFor) ? t.bestFor : [],
            notIdealFor: Array.isArray(t.notIdealFor) ? t.notIdealFor : [],
            primaryUseCases: Array.isArray(t.primaryUseCases) ? t.primaryUseCases : [],
            platforms: Array.isArray(t.platforms) ? t.platforms : [],
            finderIntentIds: Array.isArray(t.finderIntentIds) ? t.finderIntentIds : [],
            aliases: Array.isArray(t.aliases) ? t.aliases : [],

            apiAvailable: t.apiAvailable ?? null,
            openSource: t.openSource ?? null,
            selfHosted: t.selfHosted ?? null,

            directoryEligible: t.directoryEligible,
            recommendationEligible: t.recommendationEligible === true,
            pricingNeedsReview: t.pricingNeedsReview === true,

            operationalStatus: t.operationalStatus || null,
            lifecycleStatus: t.lifecycleStatus || null,
            successorToolId: t.successorToolId || null
        };

        let latestDate = null;
        if (Array.isArray(t.evidenceIds)) {
            for (const eid of t.evidenceIds) {
                const evRecord = evidenceMap.get(eid);
                // Ensure the evidence explicitly belongs to this tool ID
                if (evRecord && evRecord.id === t.id) {
                    if (!latestDate || evRecord.reviewedAt > latestDate) {
                        latestDate = evRecord.reviewedAt;
                    }
                }
            }
        }

        record.evidenceReviewedAt = latestDate;

        index.push(record);
    }

    const jsonStr = JSON.stringify(index);
    await fs.writeFile(outPath, jsonStr, 'utf8');

    // Also read tools.json to get size comparison
    const toolsJsonPath = path.resolve('data/tools.json');
    let toolsJsonRaw = '';
    try {
        toolsJsonRaw = await fs.readFile(toolsJsonPath, 'utf8');
    } catch (e) {
        toolsJsonRaw = toolsRaw;
    }

    console.log(`Successfully generated ${outPath} with ${index.length} tools.`);
    console.log(`Original tools.json size: ${(toolsJsonRaw.length / 1024).toFixed(2)} KB`);
    console.log(`New comparison-index.json size: ${(jsonStr.length / 1024).toFixed(2)} KB`);
    console.log(`Reduction: ${((1 - (jsonStr.length / toolsJsonRaw.length)) * 100).toFixed(1)}%`);
}

generateComparisonIndex().catch(err => {
    console.error("Error generating comparison index:", err);
    process.exit(1);
});
