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

// No duplicate IDs
const ids = tools.map(t => t.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) throw new Error("Duplicate tool IDs found in index");

const engine = new DecisionEngine();

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`[FAIL] ${msg}: expected ${expected}, got ${actual}`);
    }
}

// 1. Intent match / mismatch
const mockToolA = { id: 'a', finderIntentIds: ['coding.code_generation'], recommendationEligible: true };
const mockToolB = { id: 'b', finderIntentIds: ['writing.generate_text'], recommendationEligible: true };

assertEqual(engine.evaluateCriterion(mockToolA, 'goal', 'coding.code_generation'), 'CONFIRMED MATCH', 'Intent match');
assertEqual(engine.evaluateCriterion(mockToolB, 'goal', 'coding.code_generation'), 'CONFIRMED MISMATCH', 'Intent mismatch');

// 2. Experience match (all_levels)
const mockBeginner = { id: 'beg', experienceLevel: 'beginner', recommendationEligible: true };
const mockAllLevels = { id: 'all', experienceLevel: 'all_levels', recommendationEligible: true };
const mockAdvanced = { id: 'adv', experienceLevel: 'advanced', recommendationEligible: true };

assertEqual(engine.evaluateCriterion(mockBeginner, 'experience', 'Beginner'), 'CONFIRMED MATCH', 'Beginner prefers beginner');
assertEqual(engine.evaluateCriterion(mockAllLevels, 'experience', 'Beginner'), 'CONFIRMED MATCH', 'Beginner prefers all_levels');
assertEqual(engine.evaluateCriterion(mockAdvanced, 'experience', 'Beginner'), 'CONFIRMED MISMATCH', 'Beginner rejects advanced');

// 3. Free plan requirement (true / false / null)
const mockFree = { id: 'free', hasFreeTier: true, recommendationEligible: true };
const mockPaid = { id: 'paid', hasFreeTier: false, recommendationEligible: true };
const mockNullPlan = { id: 'nullplan', hasFreeTier: null, recommendationEligible: true };

assertEqual(engine.evaluateCriterion(mockFree, 'budget', 'free_plan'), 'CONFIRMED MATCH', 'Free plan match');
assertEqual(engine.evaluateCriterion(mockPaid, 'budget', 'free_plan'), 'CONFIRMED MISMATCH', 'Free plan mismatch');
assertEqual(engine.evaluateCriterion(mockNullPlan, 'budget', 'free_plan'), 'UNKNOWN', 'Free plan unknown');

// 4. API requirement
const mockApiYes = { id: 'api-yes', apiAvailable: true, recommendationEligible: true };
const mockApiNo = { id: 'api-no', apiAvailable: false, recommendationEligible: true };
assertEqual(engine.evaluateCriterion(mockApiYes, 'technical', 'api'), 'CONFIRMED MATCH', 'API match');
assertEqual(engine.evaluateCriterion(mockApiNo, 'technical', 'api'), 'CONFIRMED MISMATCH', 'API mismatch');

// 5. Tie
const prefs = {
    goal: { value: 'coding.code_generation', label: 'Coding' }
};
const resTie = engine.buildExplanationModel([mockToolA, { ...mockToolA, id: 'a2' }], prefs);
assertEqual(resTie.resultType, 'CLOSE MATCH / MULTIPLE FITS', 'Tie resolution');

// 6. Clear match
const resClear = engine.buildExplanationModel([mockToolA, mockToolB], prefs);
assertEqual(resClear.resultType, 'CLEAR MATCH', 'Clear match resolution');
assertEqual(resClear.evaluations.find(e => e.tool.id === 'a').matches.length, 1, 'Tool A has match');

// 7. Unknown result (INSUFFICIENT CONFIRMED DATA)
const resUnknown = engine.buildExplanationModel([mockNullPlan], { budget: { value: 'free_plan', label: 'Free Plan' } });
assertEqual(resUnknown.resultType, 'INSUFFICIENT CONFIRMED DATA', 'Insufficient data resolution');

// 8. Recommendation-ineligible tool
const mockRestricted = { id: 'restricted', finderIntentIds: ['coding.code_generation'], recommendationEligible: false };
const resRestricted = engine.buildExplanationModel([mockRestricted, mockToolB], prefs);
assertEqual(resRestricted.resultType, 'RECOMMENDATION RESTRICTED', 'Restricted tool resolution');

console.log("[PASS] decision-assistant-guard.mjs: All decision engine tests passed.");
