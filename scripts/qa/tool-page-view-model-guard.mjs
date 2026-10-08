import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { buildToolPageViewModel } from '../tool-page-2/build-tool-page-view-model.mjs';

const STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
if (!fs.existsSync(STAGED_PATH)) {
    console.error(`File not found: ${STAGED_PATH}`);
    process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));
const stagedMap = new Map();
for (const t of rawData) stagedMap.set(t.id, t);

const fixtures = ['chatgpt', 'midjourney', 'cursor', 'zapier-ai', 'aider', 'amazon-codewhisperer'];

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

for (const id of fixtures) {
  if (!stagedMap.has(id)) {
    console.error(`Missing fixture: ${id}`);
    process.exit(1);
  }
}

// 1. ChatGPT assertions
const chatgptRaw = stagedMap.get('chatgpt');
const chatgptClone = deepClone(chatgptRaw);
const chatgptVm = buildToolPageViewModel(chatgptRaw);
assert.strictEqual(chatgptVm.identity.id, 'chatgpt');
assert.strictEqual(chatgptVm.identity.name, 'ChatGPT');
assert.ok(chatgptVm.platforms.interfaces.includes('web'));
assert.ok(chatgptVm.platforms.operatingSystems.includes('ios'));
assert.ok(chatgptVm.platforms.operatingSystems.includes('android'));
// Check immutability
assert.deepStrictEqual(chatgptRaw, chatgptClone, 'Immutability failed for chatgpt');
// Check determinism
const chatgptVm2 = buildToolPageViewModel(chatgptRaw);
assert.deepStrictEqual(chatgptVm, chatgptVm2, 'Determinism failed for chatgpt');

// 2. Midjourney assertions
const mjRaw = stagedMap.get('midjourney');
const mjVm = buildToolPageViewModel(mjRaw);
assert.ok(mjVm.platforms.interfaces.includes('web'));
assert.ok(mjVm.platforms.interfaces.includes('discord'));
assert.ok(!mjVm.platforms.operatingSystems.includes('discord'));
assert.ok(!mjVm.schemaSafe.operatingSystems.includes('discord'));
assert.strictEqual(mjVm.platforms.requiresDiscord, undefined);

// 3. Cursor assertions
const cursorRaw = stagedMap.get('cursor');
const cursorVm = buildToolPageViewModel(cursorRaw);
assert.ok(cursorVm.platforms.operatingSystems.includes('windows'));
assert.ok(cursorVm.platforms.operatingSystems.includes('macos'));
assert.ok(cursorVm.platforms.operatingSystems.includes('linux'));
assert.ok(cursorVm.platforms.technicalAccess.includes('cli'));
assert.ok(cursorVm.platforms.technicalAccess.includes('api'));
assert.ok(!cursorVm.platforms.operatingSystems.includes('api'));
assert.ok(!cursorVm.platforms.operatingSystems.includes('cli'));

// 4. Zapier AI assertions
const zapierRaw = stagedMap.get('zapier-ai');
const zapierVm = buildToolPageViewModel(zapierRaw);
assert.ok(zapierVm.platforms.interfaces.includes('web'));
assert.ok(zapierVm.platforms.technicalAccess.includes('api'));
assert.ok(!zapierVm.platforms.operatingSystems.includes('api'));

// 5. Aider assertions
const aiderRaw = stagedMap.get('aider');
const aiderVm = buildToolPageViewModel(aiderRaw);
assert.ok(aiderVm.platforms.operatingSystems.includes('windows'));
assert.ok(aiderVm.platforms.operatingSystems.includes('macos'));
assert.ok(aiderVm.platforms.operatingSystems.includes('linux'));
assert.ok(aiderVm.platforms.technicalAccess.includes('cli'));
assert.ok(!aiderVm.platforms.interfaces.includes('web'));
assert.strictEqual(aiderVm.capabilities.openSource, aiderRaw.openSource);
assert.strictEqual(aiderVm.capabilities.selfHosted, aiderRaw.selfHosted);

// 6. Amazon CodeWhisperer assertions
const amazonRaw = stagedMap.get('amazon-codewhisperer');
const amazonVm = buildToolPageViewModel(amazonRaw);
assert.strictEqual(amazonVm.identity.id, 'amazon-codewhisperer');
assert.strictEqual(amazonVm.identity.name, 'Amazon Q Developer');
assert.strictEqual(amazonVm.eligibility.directoryEligible, true);
assert.strictEqual(amazonVm.eligibility.recommendationEligible, false);
assert.deepStrictEqual(amazonVm.identity.aliases, amazonRaw.aliases);

// 7. Tri-state Unit Fixtures
const triStateFields = ['hasFreeTier', 'hasFreeTrial', 'apiAvailable', 'openSource', 'selfHosted'];
const states = [true, false, null];

for (const state of states) {
  const dummy = {};
  triStateFields.forEach(f => dummy[f] = state);
  const vm = buildToolPageViewModel(dummy);
  assert.strictEqual(vm.pricing.hasFreeTier, state);
  assert.strictEqual(vm.pricing.hasFreeTrial, state);
  assert.strictEqual(vm.capabilities.apiAvailable, state);
  assert.strictEqual(vm.capabilities.openSource, state);
  assert.strictEqual(vm.capabilities.selfHosted, state);
}

// 8. Price Unit Fixtures
// Case A
const vmCaseA = buildToolPageViewModel({ hasFreeTier: true, startingPrice: null });
assert.strictEqual(vmCaseA.pricing.startingPrice, null);
assert.strictEqual(vmCaseA.pricing.display.startingPriceLabel, null);

// Case B
const vmCaseB = buildToolPageViewModel({ startingPrice: 20, priceCurrency: 'USD' });
assert.strictEqual(vmCaseB.pricing.startingPrice, 20);
assert.strictEqual(vmCaseB.pricing.display.startingPriceLabel, '$20');

// Case C
const vmCaseC = buildToolPageViewModel({ startingPrice: null, pricingModel: 'enterprise' });
assert.strictEqual(vmCaseC.pricing.display.startingPriceLabel, null);
assert.notStrictEqual(vmCaseC.pricing.display.startingPriceLabel, 'Contact sales');

// Immutability on all fixtures
for (const id of fixtures) {
  const raw = stagedMap.get(id);
  const clone = deepClone(raw);
  buildToolPageViewModel(raw);
  assert.deepStrictEqual(raw, clone, `Immutability failed for ${id}`);
}

console.log('PASS');
