import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DecisionEngine } from '../../js/decision-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '../..');
const INDEX_PATH = path.join(ROOT, 'data/comparison-index.json');

const tools = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));

if (tools.length !== 882) throw new Error(`Expected 882 tools, got ${tools.length}`);

const recEligible = tools.filter(t => t.recommendationEligible);
if (recEligible.length !== 879) throw new Error(`Expected 879 recommendation eligible, got ${recEligible.length}`);

const recIneligible = tools.filter(t => !t.recommendationEligible);
if (recIneligible.length !== 3) throw new Error(`Expected 3 recommendation ineligible, got ${recIneligible.length}`);

const engine = new DecisionEngine();

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`[FAIL] ${msg}: expected ${expected}, got ${actual}`);
    }
}

// Mocks
const mockToolA = { id: 'a', finderIntentIds: ['coding.code_generation'], experienceLevel: 'advanced', hasFreeTier: true, apiAvailable: true, openSource: false, selfHosted: false, recommendationEligible: true, primaryCategory: 'Coding' };
const mockToolB = { id: 'b', finderIntentIds: ['writing.generate_text'], experienceLevel: 'beginner', hasFreeTier: false, apiAvailable: false, openSource: true, selfHosted: true, recommendationEligible: true, primaryCategory: 'Writing' };
const mockToolC = { id: 'c', finderIntentIds: ['coding.debugging'], experienceLevel: 'all_levels', hasFreeTier: null, apiAvailable: null, openSource: null, selfHosted: null, recommendationEligible: true, primaryCategory: 'Coding' };
const mockToolD = { id: 'd', finderIntentIds: ['coding.code_generation', 'coding.debugging'], experienceLevel: 'intermediate', hasFreeTier: true, recommendationEligible: true, primaryCategory: 'Coding' };

// 1. Technical fields
assertEqual(engine.evaluateCriterion(mockToolA, 'technical', 'api'), 'CONFIRMED MATCH', 'API match');
assertEqual(engine.evaluateCriterion(mockToolB, 'technical', 'api'), 'CONFIRMED MISMATCH', 'API mismatch');
assertEqual(engine.evaluateCriterion(mockToolC, 'technical', 'api'), 'UNKNOWN', 'API unknown');

assertEqual(engine.evaluateCriterion(mockToolB, 'technical', 'open_source'), 'CONFIRMED MATCH', 'OS match');
assertEqual(engine.evaluateCriterion(mockToolA, 'technical', 'open_source'), 'CONFIRMED MISMATCH', 'OS mismatch');

assertEqual(engine.evaluateCriterion(mockToolB, 'technical', 'self_hosted'), 'CONFIRMED MATCH', 'SH match');
assertEqual(engine.evaluateCriterion(mockToolA, 'technical', 'self_hosted'), 'CONFIRMED MISMATCH', 'SH mismatch');

// 2. Experience matching
assertEqual(engine.evaluateCriterion(mockToolB, 'experience', 'Beginner'), 'CONFIRMED MATCH', 'Beginner matches beginner');
assertEqual(engine.evaluateCriterion(mockToolA, 'experience', 'Beginner'), 'CONFIRMED MISMATCH', 'Beginner rejects advanced');
assertEqual(engine.evaluateCriterion(mockToolC, 'experience', 'Beginner'), 'CONFIRMED MATCH', 'Beginner matches all_levels');
assertEqual(engine.evaluateCriterion(mockToolD, 'experience', 'Intermediate'), 'CONFIRMED MATCH', 'Intermediate matches intermediate');

// 3. Clear Match (2 tools)
let prefs = { goal: { value: 'coding.code_generation' } };
let res = engine.buildExplanationModel([mockToolA, mockToolB], prefs);
assertEqual(res.resultType, 'CLEAR MATCH', 'Clear match 2 tools');
assertEqual(res.recommendedToolId, 'a', 'Recommended tool is A');

// 4. Multiple fits / Tie (2 tools)
prefs = { budget: { value: 'free_plan' } };
const mockToolATie = { ...mockToolA, id: 'a2' };
res = engine.buildExplanationModel([mockToolA, mockToolATie], prefs);
assertEqual(res.resultType, 'CLOSE MATCH / MULTIPLE FITS', 'Tie resolution');
assertEqual(res.topCandidateIds.includes('a'), true, 'A is top');
assertEqual(res.topCandidateIds.includes('a2'), true, 'A2 is top');

// 5. 3 and 4 tools test
res = engine.buildExplanationModel([mockToolA, mockToolB, mockToolC, mockToolD], { goal: { value: 'coding.debugging' } });
assertEqual(res.resultType, 'CLOSE MATCH / MULTIPLE FITS', '3-tool close match');
assertEqual(res.topCandidateIds.includes('c'), true, 'C matches debugging');
assertEqual(res.topCandidateIds.includes('d'), true, 'D matches debugging');

// 6. Recommendation Eligible Logic (Restricted > Eligible)
const mockRestrictedBest = { id: 'restricted', finderIntentIds: ['coding.code_generation'], hasFreeTier: true, recommendationEligible: false };
const mockEligibleWorse = { id: 'eligible', finderIntentIds: ['coding.code_generation'], hasFreeTier: false, recommendationEligible: true };
res = engine.buildExplanationModel([mockRestrictedBest, mockEligibleWorse], { goal: { value: 'coding.code_generation' }, budget: { value: 'free_plan' } });
assertEqual(res.resultType, 'RECOMMENDATION RESTRICTED', 'Restricted wins cleanly');

// 7. Restricted == Eligible (Tie)
const mockEligibleEqual = { id: 'eligible2', finderIntentIds: ['coding.code_generation'], hasFreeTier: true, recommendationEligible: true };
res = engine.buildExplanationModel([mockRestrictedBest, mockEligibleEqual], { goal: { value: 'coding.code_generation' }, budget: { value: 'free_plan' } });
assertEqual(res.resultType, 'CLOSE MATCH / MULTIPLE FITS', 'Restricted and eligible tie');

// 8. Eligible > Restricted (Clear Match)
res = engine.buildExplanationModel([mockEligibleEqual, { ...mockRestrictedBest, hasFreeTier: false }], { goal: { value: 'coding.code_generation' }, budget: { value: 'free_plan' } });
assertEqual(res.resultType, 'CLEAR MATCH', 'Eligible beats restricted');
assertEqual(res.recommendedToolId, 'eligible2', 'Eligible is recommended');

// 9. Goal Fairness Tests (ChatGPT vs Claude)
const chatGPT = tools.find(t => t.id === 'chatgpt');
const claude = tools.find(t => t.id === 'claude');
if (!chatGPT || !claude) throw new Error("Could not find chatgpt or claude for fairness test");

let options1 = engine.buildGoalOptions([chatGPT, claude]);
let options2 = engine.buildGoalOptions([claude, chatGPT]);

// They should have the exact same options (order might vary, but set should be identical)
const set1 = new Set(options1);
const set2 = new Set(options2);
if (set1.size !== set2.size) throw new Error("Fairness test failed: different option sizes");
for (const opt of set1) {
    if (!set2.has(opt)) throw new Error(`Fairness test failed: option ${opt} not in both sets`);
}
assertEqual(set1.has('writing.creative') || set1.has('coding.code_generation') || set1.has('research.document_analysis'), true, 'Important intents included');

// 10. Real free plan test with Midjourney and Leonardo
const midjourney = tools.find(t => t.id === 'midjourney');
const leonardo = tools.find(t => t.id === 'leonardo-ai');

res = engine.buildExplanationModel([midjourney, leonardo], { budget: { value: 'free_plan' } });
assertEqual(res.resultType, 'CLEAR MATCH', 'Leonardo beats Midjourney on free plan');
assertEqual(res.recommendedToolId, 'leonardo-ai', 'Leonardo is recommended');

console.log("[PASS] decision-assistant-guard.mjs: All complex decision engine tests passed.");
