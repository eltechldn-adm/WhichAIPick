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
const chatgptVm = buildToolPageViewModel(chatgptRaw);
assert.strictEqual(chatgptVm.identity.id, 'chatgpt');
assert.strictEqual(chatgptVm.identity.name, 'ChatGPT');
assert.ok(chatgptVm.platforms.interfaces.includes('web'));
assert.ok(chatgptVm.platforms.operatingSystems.includes('ios'));
assert.ok(chatgptVm.platforms.operatingSystems.includes('android'));

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
assert.ok(!aiderVm.platforms.operatingSystems.includes('cli')); // Explict negative for Aider CLI
assert.ok(!aiderVm.platforms.interfaces.includes('web'));
assert.strictEqual(aiderVm.capabilities.openSource, aiderRaw.openSource);
assert.strictEqual(aiderVm.capabilities.selfHosted, aiderRaw.selfHosted);

// 6. Amazon CodeWhisperer assertions
const amazonRaw = stagedMap.get('amazon-codewhisperer');
const amazonVm = buildToolPageViewModel(amazonRaw);
assert.strictEqual(amazonVm.identity.id, 'amazon-codewhisperer');
assert.strictEqual(amazonVm.identity.name, 'Amazon Q Developer');
assert.deepStrictEqual(amazonVm.identity.aliases, amazonRaw.aliases);

// 7. Tri-state Unit Fixtures
const triStateFields = [
  'hasFreeTier', 'hasFreeTrial', 'apiAvailable', 'openSource', 'selfHosted',
  'directoryEligible', 'recommendationEligible', 'pricingNeedsReview',
  'metadataReviewRequired', 'contentReviewRequired', 'seoEligible'
];
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
  assert.strictEqual(vm.eligibility.directoryEligible, state);
  assert.strictEqual(vm.eligibility.recommendationEligible, state);
  assert.strictEqual(vm.trust.pricingNeedsReview, state);
  assert.strictEqual(vm.trust.metadataReviewRequired, state);
  assert.strictEqual(vm.trust.contentReviewRequired, state);
  assert.strictEqual(vm.seo.seoEligible, state);
}

// 8. Legacy separation test
const legacySepVm = buildToolPageViewModel({
  sourceSummary: "Canonical summary",
  long_description: "Legacy description"
});
assert.strictEqual(legacySepVm.summary.shortDescription, "Canonical summary");
assert.strictEqual(legacySepVm.schemaSafe.descriptionCandidate, "Canonical summary");
assert.strictEqual(legacySepVm.editorial.longDescription.value, "Legacy description");
assert.strictEqual(legacySepVm.editorial.longDescription.authority, "legacy_editorial");

// 9. Canonical fact wins test
const canonFactVm = buildToolPageViewModel({
  apiAvailable: false,
  long_description: "This tool comes with an amazing API."
});
assert.strictEqual(canonFactVm.capabilities.apiAvailable, false);
assert.strictEqual(canonFactVm.editorial.longDescription.value, "This tool comes with an amazing API.");

// 10. Currency Tests
// Case A — known price + known currency
const vmCurrencyA = buildToolPageViewModel({ startingPrice: 20, priceCurrency: 'USD' });
assert.strictEqual(vmCurrencyA.pricing.currency, 'USD');
assert.strictEqual(vmCurrencyA.pricing.display.startingPriceLabel, '$20');

// Case B — known price + unknown currency
const vmCurrencyB = buildToolPageViewModel({ startingPrice: 20, priceCurrency: null });
assert.strictEqual(vmCurrencyB.pricing.currency, null);
assert.strictEqual(vmCurrencyB.pricing.startingPrice, 20);
assert.strictEqual(vmCurrencyB.pricing.display.startingPriceLabel, null);

// Case C — unknown price + unknown currency
const vmCurrencyC = buildToolPageViewModel({ startingPrice: null, priceCurrency: null });
assert.strictEqual(vmCurrencyC.pricing.currency, null);
assert.strictEqual(vmCurrencyC.pricing.display.startingPriceLabel, null);

// Case D — free tier but unknown price
const vmCurrencyD = buildToolPageViewModel({ hasFreeTier: true, startingPrice: null, priceCurrency: null });
assert.strictEqual(vmCurrencyD.pricing.display.freeTierLabel, 'Free tier available');
assert.strictEqual(vmCurrencyD.pricing.display.startingPriceLabel, null);

// 11. Immutability and Determinism on all six fixtures
for (const id of fixtures) {
  const raw = stagedMap.get(id);
  const clone = deepClone(raw);
  const vm1 = buildToolPageViewModel(raw);
  assert.deepStrictEqual(raw, clone, `Immutability failed for ${id}`);

  const vm2 = buildToolPageViewModel(raw);
  assert.deepStrictEqual(vm1, vm2, `Determinism failed for ${id}`);
}

// 12. Static NO-HTML and NO-NETWORK guard
const vmPath = path.resolve('scripts/tool-page-2/build-tool-page-view-model.mjs');
const vmSource = fs.readFileSync(vmPath, 'utf8');

assert.ok(!vmSource.includes('<h1'), 'View model contains HTML <h1');
assert.ok(!vmSource.includes('<div'), 'View model contains HTML <div');
assert.ok(!vmSource.includes('<section'), 'View model contains HTML <section');
assert.ok(!vmSource.includes('fetch('), 'View model contains network fetch');
assert.ok(!vmSource.includes('axios'), 'View model contains network axios');
assert.ok(!vmSource.includes('http.request'), 'View model contains network http.request');
assert.ok(!vmSource.includes('https.request'), 'View model contains network https.request');

console.log('PASS');
