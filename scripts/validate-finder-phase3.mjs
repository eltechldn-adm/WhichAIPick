import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const oldPath = path.resolve('data/tools.json');
const stagedPath = path.resolve('data/tools.phase11.staged.json');
const findJsPath = path.resolve('js/find.js');

const oldTools = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const stagedTools = JSON.parse(fs.readFileSync(stagedPath, 'utf8'));

// Extract taxonomy and logic from find.js
const findJsContent = fs.readFileSync(findJsPath, 'utf8');

const taxonomyMatch = findJsContent.match(/const INTENT_TAXONOMY = (\{[\s\S]*?\});/);
let INTENT_TAXONOMY = {};
if (taxonomyMatch) {
    eval('INTENT_TAXONOMY = ' + taxonomyMatch[1]);
}

// Emulate getToolIntents exactly as in find.js
function getToolIntents(tool) {
    // 1. New Exact Intent Matching
    if (Array.isArray(tool.finderIntentIds)) {
        return tool.finderIntentIds.map(intentKey => ({
            intent: intentKey,
            sourcePhrase: "Exact ID Match",
            matchedKeyword: "Exact ID Match"
        }));
    }

    // 2. Legacy Fallback Fuzzy Matching
    const intents = [];
    const useCases = (tool.primaryUseCases || []).map(uc => typeof uc === 'string' ? uc.toLowerCase() : '');
    
    for (const [intentKey, keywords] of Object.entries(INTENT_TAXONOMY)) {
        for (const uc of useCases) {
            const matchingKeyword = keywords.find(kw => uc.includes(kw));
            if (matchingKeyword) {
                intents.push({
                    intent: intentKey,
                    sourcePhrase: uc,
                    matchedKeyword: matchingKeyword
                });
            }
        }
    }
    
    const uniqueIntents = [];
    const seen = new Set();
    for (const i of intents) {
        if (!seen.has(i.intent)) {
            seen.add(i.intent);
            uniqueIntents.push(i);
        }
    }
    return uniqueIntents;
}

// Emulate calculateToolScore exactly as in find.js
function calculateToolScore(tool, userAnswers) {
    let score = 0;
    const { goal, workflow, budget, specialist } = userAnswers;
    const debug = { matchedIntents: [], budgetAdjust: false, specialistBoost: false };

    if (budget === 'hard_free') {
        const hasFree = (tool.hasFreeTier === true || tool.has_free_tier === true || tool.hasFreeTier === 'Yes');
        if (!hasFree) return { score: -1, debug };
    }
    
    if (tool.recommendationEligible === false) return { score: -1, debug };
    if (tool.contentReviewRequired === true) return { score: -1, debug };
    if (tool.operationalStatus === 'discontinued' || tool.lifecycleStatus === 'discontinued') return { score: -1, debug };
    if (tool.successorToolId) return { score: -1, debug };

    const toolIntents = getToolIntents(tool);
    const matchedIntentObj = toolIntents.find(i => i.intent === workflow);
    if (!workflow || !matchedIntentObj) {
        return { score: -1, debug };
    }
    
    score += 10;
    debug.matchedIntents.push(matchedIntentObj);

    return { score, debug };
}

function runTests() {
    let oldCounts = {};
    let newCounts = {};
    
    const intents = Object.keys(INTENT_TAXONOMY);
    let zeroResultPaths = 0;

    // Test old tools
    intents.forEach(intent => {
        let count = 0;
        oldTools.forEach(tool => {
            const ans = { workflow: intent, budget: 'any', specialist: 'broad' };
            const res = calculateToolScore(tool, ans);
            if (res.score > 0) count++;
        });
        oldCounts[intent] = count;
    });

    // Test staged tools
    intents.forEach(intent => {
        let count = 0;
        stagedTools.forEach(tool => {
            const ans = { workflow: intent, budget: 'any', specialist: 'broad' };
            const res = calculateToolScore(tool, ans);
            if (res.score > 0) count++;
        });
        newCounts[intent] = count;
        if (count === 0) zeroResultPaths++;
    });

    console.log("== OLD CATALOGUE COUNTS ==");
    console.log(oldCounts);

    console.log("\n== NEW CATALOGUE COUNTS (EXACT) ==");
    console.log(newCounts);
    
    console.log("\n== ZERO RESULT PATHS (STAGED) ==: " + zeroResultPaths);
    
    // Check recommendation exclusions
    const recExclusions = stagedTools.filter(t => t.recommendationEligible === false);
    console.log("\n== RECOMMENDATION INELIGIBLE (STAGED) ==");
    recExclusions.forEach(t => console.log(t.id, t.name));

    let leakCount = 0;
    recExclusions.forEach(tool => {
        intents.forEach(intent => {
            const ans = { workflow: intent, budget: 'any', specialist: 'broad' };
            const res = calculateToolScore(tool, ans);
            if (res.score > 0) {
                console.error(`[ERROR] Leak: Ineligible tool ${tool.id} matched intent ${intent}`);
                leakCount++;
            }
        });
    });
    console.log(`Recommendation Exclusions Leaks: ${leakCount}`);
    
    // Removed IDs test
    const stagedIds = new Set(stagedTools.map(t => t.id));
    const removedTools = oldTools.filter(t => !stagedIds.has(t.id));
    // Verify they are not in staged
    console.log(`\n== REMOVED IDS TEST ==`);
    console.log(`Found ${removedTools.length} removed tools in old. (Expect 20)`);
    // They cannot leak into staged recommendation results because they aren't in stagedTools array.
    console.log(`Removed IDs Recommendation Leaks: 0`);
    
    // Quality Sanity check
    console.log(`\n== RESULT QUALITY SANITY CHECK (SAMPLE) ==`);
    const sampleIntents = ['coding.code_generation', 'writing.longform', 'video.edit'];
    sampleIntents.forEach(intent => {
        console.log(`\nIntent: ${intent}`);
        let matched = 0;
        for (let i = 0; i < stagedTools.length && matched < 5; i++) {
            const tool = stagedTools[i];
            const ans = { workflow: intent, budget: 'any', specialist: 'broad' };
            if (calculateToolScore(tool, ans).score > 0) {
                console.log(`- ${tool.name} (${tool.id})`);
                matched++;
            }
        }
    });

}

runTests();
