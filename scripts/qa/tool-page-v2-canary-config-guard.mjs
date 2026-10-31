import assert from 'assert';
import {
    resolveCanarySelection,
    isCanaryRequested,
    CanarySelectionError,
    MAX_CANARY_TOOLS
} from '../tool-page-2/canary-selection.mjs';

/** Unit checks for fail-closed canary configuration. Pure: no filesystem or build access. */

const tools = [
    { id: 'aider', directoryEligible: true },
    { id: 'akiflow', directoryEligible: true },
    { id: 'hidden-tool', directoryEligible: false },
    { id: 'needs-review', directoryEligible: true, contentReviewRequired: true }
];
const good = { expectedCount: 2, approvedToolIds: ['aider', 'akiflow'] };
const run = (env, manifest) => resolveCanarySelection({ root: '/x', tools, env, manifestReader: () => manifest });
const throwsCanary = (fn, label) => assert.throws(fn, (e) => e instanceof CanarySelectionError, label);
let checks = 0;
const check = (fn) => { fn(); checks++; };

check(() => assert.deepStrictEqual(run({}, good), [], 'unset env selects nothing (default V1)'));
check(() => assert.deepStrictEqual(run({ TOOL_PAGE_V2_CANARY: '' }, good), [], 'empty env selects nothing'));
check(() => assert.deepStrictEqual(run({ TOOL_PAGE_V2_CANARY: '1' }, good), ['aider', 'akiflow'], 'env=1 selects approved IDs in order'));
for (const bad of ['true', 'all', '0', 'yes', '2', ' 1']) {
    check(() => throwsCanary(() => isCanaryRequested({ TOOL_PAGE_V2_CANARY: bad }), `env "${bad}" rejected`));
}
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 2, approvedToolIds: ['aider', 'aider'] }), 'duplicate ID'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 2, approvedToolIds: ['aider', 'nonexistent'] }), 'unknown ID'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 2, approvedToolIds: ['aider', 'hidden-tool'] }), 'not directoryEligible'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 2, approvedToolIds: ['aider', 'needs-review'] }), 'content review required'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 3, approvedToolIds: ['aider', 'akiflow'] }), 'expectedCount mismatch'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 0, approvedToolIds: [] }), 'empty allowlist'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 1 }), 'missing approvedToolIds'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 2, approvedToolIds: ['aider', 'Bad ID!'] }), 'malformed ID'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, { expectedCount: 2, approvedToolIds: ['aider', 7] }), 'non-string ID'));
check(() => throwsCanary(() => run({ TOOL_PAGE_V2_CANARY: '1' }, null), 'null manifest'));
const many45 = Array.from({ length: 45 }, (_, i) => `tool-${i}`);
const many46 = Array.from({ length: 46 }, (_, i) => `tool-${i}`);
const many47 = Array.from({ length: 47 }, (_, i) => `tool-${i}`);
const manyTools = [...tools, ...many47.map(id => ({ id, directoryEligible: true }))];
check(() => assert.strictEqual(MAX_CANARY_TOOLS, 46, 'MAX_CANARY_TOOLS is exactly 46 for Wave C migration'));
check(() => assert.deepStrictEqual(
    resolveCanarySelection({ root: '/x', tools: manyTools, env: { TOOL_PAGE_V2_CANARY: '1' }, manifestReader: () => ({ expectedCount: 45, approvedToolIds: many45 }) }),
    many45,
    '45 valid IDs accepted'
));
check(() => assert.deepStrictEqual(
    resolveCanarySelection({ root: '/x', tools: manyTools, env: { TOOL_PAGE_V2_CANARY: '1' }, manifestReader: () => ({ expectedCount: 46, approvedToolIds: many46 }) }),
    many46,
    '46 valid IDs accepted (exact Wave C migration cap)'
));
check(() => throwsCanary(
    () => resolveCanarySelection({ root: '/x', tools: manyTools, env: { TOOL_PAGE_V2_CANARY: '1' }, manifestReader: () => ({ expectedCount: 47, approvedToolIds: many47 }) }),
    '47 IDs rejected (cap prevents exceeding MAX_CANARY_TOOLS=46)'
));
check(() => throwsCanary(() => resolveCanarySelection({ root: '/nonexistent-root', tools, env: { TOOL_PAGE_V2_CANARY: '1' } }), 'missing manifest file'));

console.log(`[CANARY CONFIG GUARD PASS] ${checks} checks`);
