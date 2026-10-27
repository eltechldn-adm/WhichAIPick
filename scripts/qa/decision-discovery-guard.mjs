import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DecisionEngine } from '../../js/decision-engine.js';

globalThis.window = {};
const { DecisionAssistant } = await import('../../js/decision-assistant.js');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/comparison-index.json'), 'utf-8'));
const engine = new DecisionEngine();

function assertEqual(actual, expected, msg) {
    if (actual !== expected) throw new Error(`[FAIL] ${msg}: expected ${expected}, got ${actual}`);
}
function assertTrue(cond, msg) {
    if (!cond) throw new Error(`[FAIL] ${msg}`);
}
const ids = (r) => r.results.map(x => x.tool.id);
const byId = Object.fromEntries(tools.map(t => [t.id, t]));
const RESTRICTED = ['amazon-codewhisperer', 'appgyver', 'descript-overdub'];
const P = (goal, extra = {}) => ({ goal: { value: goal, label: goal }, ...extra });
const free = { budget: { value: 'free_plan', label: 'Confirmed free plan' } };

// 66. Catalogue counts
assertEqual(tools.length, 882, 'tools');
assertEqual(tools.filter(t => t.recommendationEligible === true).length, 879, 'recommendationEligible');
assertEqual(tools.filter(t => t.recommendationEligible !== true).length, 3, 'restricted');
assertEqual(tools.filter(t => !t.recommendationEligible).map(t => t.id).sort().join(','), RESTRICTED.join(','), 'restricted ids');

// Synthetic fixtures
const mk = (id, over = {}) => ({
    id, canonicalName: id, primaryCategory: 'Coding', finderIntentIds: ['coding.code_generation'],
    primaryUseCases: [], experienceLevel: 'all_levels', hasFreeTier: true, apiAvailable: true,
    openSource: true, selfHosted: true, directoryEligible: true, recommendationEligible: true,
    operationalStatus: 'active', lifecycleStatus: 'active', successorToolId: null, aliases: [], ...over
});
const goal = 'coding.code_generation';

// 67. Excluded selected IDs (real catalogue)
let r = engine.discoverMatchingTools({ tools, preferences: P('writing.generate_text'), excludeIds: ['chatgpt', 'claude'], limit: 6 });
assertTrue(r.results.length > 0, 'writing discovery returns results');
assertTrue(!ids(r).includes('chatgpt') && !ids(r).includes('claude'), 'selected tools excluded');
r = engine.discoverMatchingTools({ tools: [mk('chatgpt'), mk('other')], preferences: P(goal), excludeIds: ['chatgpt'], limit: 6 });
assertEqual(ids(r).join(','), 'other', 'excludeIds respected');

// 68 + 38 + 81. Restricted never proactive, even when perfect
const restrictedFixtures = RESTRICTED.map(id => mk(id, { recommendationEligible: false }));
r = engine.discoverMatchingTools({ tools: [...restrictedFixtures, mk('ok')], preferences: P(goal, free), excludeIds: [], limit: 6 });
assertEqual(ids(r).join(','), 'ok', 'restricted fixtures excluded');
for (const id of RESTRICTED) {
    const t = byId[id];
    for (const intent of t.finderIntentIds) {
        const res = engine.discoverMatchingTools({ tools, preferences: P(intent), excludeIds: [], limit: 1000 });
        assertTrue(!ids(res).includes(id), `${id} never proactive (${intent})`);
    }
}
const cw = byId['amazon-codewhisperer'];
const strong = { ...P('coding.code_generation', free), technical: { value: 'api', label: 'API access' } };
assertTrue(!ids(engine.discoverMatchingTools({ tools, preferences: strong, excludeIds: [], limit: 1000 })).includes(cw.id), 'CodeWhisperer absent for strong match');

// 12/39/40. Lifecycle, directory and alias safety
r = engine.discoverMatchingTools({
    tools: [mk('retired', { lifecycleStatus: 'retired' }), mk('succ', { successorToolId: 'ok' }), mk('off', { directoryEligible: false }),
        mk('down', { operationalStatus: 'inactive' }), mk('old-name'), mk('ok', { aliases: ['old-name'] })],
    preferences: P(goal), excludeIds: [], limit: 6
});
assertEqual(ids(r).join(','), 'ok', 'lifecycle / directory / alias filtering');

// 69. Goal relevance floor
r = engine.discoverMatchingTools({
    tools: [mk('wrong-goal', { finderIntentIds: ['image.generate'], primaryCategory: 'Design' }), mk('right')],
    preferences: P(goal, { ...free, technical: { value: 'api', label: 'API access' } }), excludeIds: [], limit: 6
});
assertEqual(ids(r).join(','), 'right', 'wrong goal excluded despite perfect budget/technical');

// 70-73. Hard constraints
const triple = (field, value) => [mk('t', { [field]: true }), mk('f', { [field]: false }), mk('n', { [field]: null })];
const hard = [
    ['free plan', free, 'hasFreeTier'],
    ['API', { technical: { value: 'api', label: 'API access' } }, 'apiAvailable'],
    ['open source', { technical: { value: 'open_source', label: 'Open source' } }, 'openSource'],
    ['self-hosting', { technical: { value: 'self_hosted', label: 'Self-hosting' } }, 'selfHosted']
];
for (const [name, extra, field] of hard) {
    r = engine.discoverMatchingTools({ tools: triple(field), preferences: P(goal, extra), excludeIds: [], limit: 6 });
    assertEqual(ids(r).join(','), 't', `${name} hard constraint admits only true`);
    // null remains UNKNOWN, not false
    const crit = field === 'hasFreeTier' ? ['budget', 'free_plan'] : ['technical', extra.technical.value];
    assertEqual(engine.evaluateCriterion(mk('n', { [field]: null }), crit[0], crit[1]), 'UNKNOWN', `${name} null stays UNKNOWN`);
}

// 74. Experience ordering without exclusion
r = engine.discoverMatchingTools({
    tools: [mk('a-mismatch', { experienceLevel: 'advanced' }), mk('b-exact', { experienceLevel: 'beginner' }), mk('c-all', { experienceLevel: 'all_levels' })],
    preferences: P(goal, { experience: { value: 'Beginner', label: 'Beginner' } }), excludeIds: [], limit: 6
});
assertEqual(ids(r).join(','), 'b-exact,c-all,a-mismatch', 'exact / all_levels before mismatch, mismatch retained');
r = engine.discoverMatchingTools({ tools: [mk('x', { experienceLevel: 'advanced' })], preferences: P(goal, { experience: { value: 'no_preference' } }), excludeIds: [], limit: 6 });
assertEqual(r.results[0].mismatches.length + r.results[0].unknowns.length, 0, 'no-preference experience adds no criterion');

// 42. Explicit intent outranks fallback text/category match
r = engine.discoverMatchingTools({
    tools: [mk('by-category', { finderIntentIds: [], primaryCategory: goal }), mk('by-usecase', { finderIntentIds: [], primaryUseCases: [goal] }), mk('by-intent')],
    preferences: P(goal), excludeIds: [], limit: 6
});
assertEqual(ids(r).join(','), 'by-intent,by-usecase,by-category', 'intent > use case > category');

// 75/76. Determinism and order invariance (real catalogue)
const prefs = P('coding.code_generation', free);
const base = ids(engine.discoverMatchingTools({ tools, preferences: prefs, excludeIds: ['cursor'], limit: 6 })).join(',');
for (let i = 0; i < 5; i++) assertEqual(ids(engine.discoverMatchingTools({ tools, preferences: prefs, excludeIds: ['cursor'], limit: 6 })).join(','), base, 'determinism');
assertEqual(ids(engine.discoverMatchingTools({ tools: [...tools].reverse(), preferences: prefs, excludeIds: ['cursor'], limit: 6 })).join(','), base, 'reverse order invariance');
const shuffled = [...tools].sort((a, b) => (a.id.length * 31 + a.id.charCodeAt(1)) - (b.id.length * 31 + b.id.charCodeAt(1)) || (a.id < b.id ? 1 : -1));
assertEqual(ids(engine.discoverMatchingTools({ tools: shuffled, preferences: prefs, excludeIds: ['cursor'], limit: 6 })).join(','), base, 'shuffled order invariance');

// 77. Limit
assertTrue(engine.discoverMatchingTools({ tools, preferences: prefs, excludeIds: [], limit: 3 }).results.length <= 3, 'limit 3');
assertEqual(engine.discoverMatchingTools({ tools, preferences: prefs, excludeIds: [], limit: 3 }).results.length, 3, 'limit 3 returns 3 when available');

// 15/46. No-preference goal scope
const chatgpt = byId.chatgpt, claude = byId.claude;
r = engine.discoverMatchingTools({ tools, preferences: P('no_preference'), excludeIds: ['chatgpt', 'claude'], limit: 6, selectedTools: [byId.midjourney, byId['zapier-ai']] });
assertEqual(r.resultType, 'INSUFFICIENT SCOPE', 'no shared intents => insufficient scope');
r = engine.discoverMatchingTools({ tools, preferences: P('no_preference'), excludeIds: [], limit: 6 });
assertEqual(r.resultType, 'INSUFFICIENT SCOPE', 'no selected tools => insufficient scope');
r = engine.discoverMatchingTools({ tools: [mk('s1'), mk('s2'), mk('in-scope'), mk('out', { finderIntentIds: ['image.generate'] })], preferences: P('no_preference'), excludeIds: ['s1', 's2'], limit: 6, selectedTools: [mk('s1'), mk('s2')] });
assertEqual(ids(r).join(','), 'in-scope', 'no-preference goal stays within shared-intent scope');

// 78. Real: image generation + free plan
r = engine.discoverMatchingTools({ tools, preferences: P('image.generate', free), excludeIds: ['midjourney', 'leonardo-ai'], limit: 6 });
assertEqual(r.resultType, 'MATCHES FOUND', 'image + free matches');
for (const x of r.results) {
    assertEqual(x.tool.recommendationEligible, true, `${x.tool.id} recommendationEligible`);
    assertTrue(x.tool.finderIntentIds.includes('image.generate'), `${x.tool.id} goal relevance`);
    assertEqual(x.tool.hasFreeTier, true, `${x.tool.id} confirmed free`);
    assertTrue(!['midjourney', 'leonardo-ai', ...RESTRICTED].includes(x.tool.id), `${x.tool.id} not excluded`);
    assertTrue(x.matches.length > 0, 'has reasons');
}
console.log('image+free:', ids(r).join(', '));

// 79. Real: coding + self-hosting
r = engine.discoverMatchingTools({ tools, preferences: P('coding.code_generation', { technical: { value: 'self_hosted', label: 'Self-hosting' } }), excludeIds: [], limit: 6 });
assertEqual(r.resultType, 'MATCHES FOUND', 'coding + self-hosting matches');
for (const x of r.results) {
    assertEqual(x.tool.selfHosted, true, `${x.tool.id} selfHosted`);
    assertTrue(x.tool.finderIntentIds.includes('coding.code_generation'), `${x.tool.id} coding goal`);
}
console.log('coding+self-hosted:', ids(r).join(', '));

// 80. Real: no result (valid, impossible combination)
const impossible = engine.discoverMatchingTools({
    tools,
    preferences: P('sales.outreach', { ...free, technical: { value: 'self_hosted', label: 'Self-hosting' } }),
    excludeIds: [], limit: 6
});
assertEqual(impossible.resultType, 'NO MATCHES FOUND', 'impossible requirements');
assertEqual(impossible.results.length, 0, 'no fallback results');

// 85. XSS: malicious catalogue fixture renders harmlessly
const assistant = new DecisionAssistant();
assistant.selectedToolIds = ['a', 'b', 'c', 'd'];
assistant.toolsData = ['a', 'b', 'c', 'd'].map(i => mk(i, { canonicalName: `<img src=x onerror=alert(1)>${i}` }));
const evil = mk('evil', { canonicalName: '<script>alert(1)</script>', primaryCategory: '"><script>alert(2)</script>' });
const html = assistant.renderDiscoveryCard({ tool: evil, matches: [{ type: 'goal', text: '<script>alert(3)</script>', intentIds: [] }], mismatches: [], unknowns: [{ type: 'technical', text: '<b onmouseover=1>' }] }, { scopeIntents: [] }, 0, true);
assertTrue(!/<script/i.test(html) && !/<img|<b /i.test(html), 'XSS: no raw tags in rendered card');
assertTrue(html.includes('&lt;script&gt;'), 'XSS: escaped output present');

// 83/37. Affiliate neutrality: engine discovery code must not consume monetisation fields
const engineSrc = fs.readFileSync(path.join(ROOT, 'js/decision-engine.js'), 'utf-8');
const discoverySrc = engineSrc.slice(engineSrc.indexOf('discoverMatchingTools('), engineSrc.indexOf('buildGoalOptions(selectedTools) {'));
for (const word of ['affiliate', 'monetis', 'monetiz', 'sponsor', 'commission', 'popular', 'traffic', 'score', 'rating']) {
    assertTrue(!new RegExp(word, 'i').test(engineSrc.replace(/no global score/gi, '')), `engine must not reference "${word}"`);
}
assertTrue(discoverySrc.length > 500, 'discovery source located');
const uiSrc = fs.readFileSync(path.join(ROOT, 'js/decision-assistant.js'), 'utf-8');
for (const word of ['affiliate', 'sponsored_', 'commission']) {
    assertTrue(!new RegExp(word, 'i').test(uiSrc), `assistant must not reference "${word}"`);
}

// 59/90. No indexable discovery state
for (const f of ['sitemap.xml', 'robots.txt']) {
    if (fs.existsSync(path.join(ROOT, f))) {
        assertTrue(!/discover|recommendations\?/i.test(fs.readFileSync(path.join(ROOT, f), 'utf-8').replace(/Sitemap:.*/g, '')), `${f} has no discovery URLs`);
    }
}

// 9/57. Dataset: discovery must use only the comparison index
assertTrue(!/tools\.json|tools-database/.test(uiSrc), 'assistant does not load full catalogue');

// Perf: 879-tool evaluation
const t0 = performance.now();
for (let i = 0; i < 20; i++) engine.discoverMatchingTools({ tools, preferences: P('writing.generate_text', free), excludeIds: [], limit: 6 });
const ms = (performance.now() - t0) / 20;
assertTrue(ms < 50, `discovery should be fast (${ms.toFixed(2)}ms)`);
console.log(`discovery avg: ${ms.toFixed(2)}ms`);

console.log('[PASS] decision-discovery-guard.mjs: All catalogue discovery tests passed.');
