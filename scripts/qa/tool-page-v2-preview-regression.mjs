import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

import { buildToolPageViewModel } from '../tool-page-2/build-tool-page-view-model.mjs';
import { renderToolPageV2 } from '../tool-page-2/render-tool-page-v2.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));

// Test tool with real evidence
const toolWithEvidence = tools.find(t => Array.isArray(t.evidenceIds) && t.evidenceIds.length > 0);
assert(toolWithEvidence, 'Precondition failed: No tool with evidence found in tools.json');

const vmWithTrust = buildToolPageViewModel(toolWithEvidence, {
    evidenceReviewedAt: '2026-10-15'
});

// View model with trustLabel explicitly absent (simulating unreviewed/draft tool)
const vmWithoutTrust = JSON.parse(JSON.stringify(vmWithTrust));
vmWithoutTrust.trust.display.trustLabel = null;
vmWithoutTrust.trust.evidenceReviewedAt = null;

const prodOptions = {
    mode: 'production',
    canonicalUrl: `https://whichaipick.com/tools/${toolWithEvidence.id}/`,
    robots: 'index,follow',
    metaTitle: `${toolWithEvidence.name} — AI Tool | WhichAIPick`,
    metaDescription: 'Description for regression testing.',
    domain: 'https://whichaipick.com',
    headerHtml: '<header id="site-header">Header Mock</header>',
    footerHtml: '<footer id="site-footer">Footer Mock</footer>',
    consentHeadHtml: '<meta name="consent" content="mock">'
};

function countMatches(str, re) {
    return (str.match(re) || []).length;
}

function getMainContent(html) {
    const match = html.match(/<main[\s\S]*?<\/main>/);
    return match ? match[0] : html;
}

const failures = [];
function check(scenario, description, condition, actual) {
    if (!condition) {
        failures.push(`[${scenario}] FAIL: ${description}. Got: ${JSON.stringify(actual)}`);
    }
}

console.log('Running Tool Page V2 Preview & Production Regression Tests...');

// ==========================================
// SCENARIO A: Production with Trust Label
// ==========================================
const htmlProd = renderToolPageV2(vmWithTrust, prodOptions);
const mainProd = getMainContent(htmlProd);

check('A', 'Main contains exactly 1 Review Methodology link', countMatches(mainProd, /href="\/review-methodology\.html"/g) === 1, countMatches(mainProd, /href="\/review-methodology\.html"/g));
check('A', 'Main contains exactly 1 Request a Correction link', countMatches(mainProd, /href="\/corrections-policy\.html"/g) === 1, countMatches(mainProd, /href="\/corrections-policy\.html"/g));
check('A', 'Global footer present in production', htmlProd.includes('id="site-footer"'), false);
check('A', 'Global header present in production', htmlProd.includes('id="site-header"'), false);
check('A', 'Trust section present', htmlProd.includes('class="tool-v2-trust"'), false);
check('A', 'Trust label text present', htmlProd.includes('<p>Evidence reviewed</p>'), false);

// ==========================================
// SCENARIO B: Preview with Trust Label
// ==========================================
const htmlPreviewTrust = renderToolPageV2(vmWithTrust, null);

check('B', 'Preview contains exactly 1 Review Methodology link', countMatches(htmlPreviewTrust, /href="\/review-methodology\.html"/g) === 1, countMatches(htmlPreviewTrust, /href="\/review-methodology\.html"/g));
check('B', 'Preview contains exactly 1 Request a Correction link', countMatches(htmlPreviewTrust, /href="\/corrections-policy\.html"/g) === 1, countMatches(htmlPreviewTrust, /href="\/corrections-policy\.html"/g));
check('B', 'Trust section present in preview', htmlPreviewTrust.includes('class="tool-v2-trust"'), false);
check('B', 'Trust label text present in preview', htmlPreviewTrust.includes('<p>Evidence reviewed</p>'), false);
check('B', 'No site header in preview', !htmlPreviewTrust.includes('id="site-header"'), true);
check('B', 'No site footer in preview', !htmlPreviewTrust.includes('id="site-footer"'), true);

// ==========================================
// SCENARIO C: Preview WITHOUT Trust Label
// ==========================================
const htmlPreviewNoTrust = renderToolPageV2(vmWithoutTrust, null);

check('C', 'Preview without trustLabel contains exactly 1 Review Methodology link', countMatches(htmlPreviewNoTrust, /href="\/review-methodology\.html"/g) === 1, countMatches(htmlPreviewNoTrust, /href="\/review-methodology\.html"/g));
check('C', 'Preview without trustLabel contains exactly 1 Request a Correction link', countMatches(htmlPreviewNoTrust, /href="\/corrections-policy\.html"/g) === 1, countMatches(htmlPreviewNoTrust, /href="\/corrections-policy\.html"/g));
check('C', 'Trust section container preserved for fallback links', htmlPreviewNoTrust.includes('class="tool-v2-trust"'), false);

// ==========================================
// SCENARIO D: No obsolete tool-v2-footer
// ==========================================
check('D', 'No tool-v2-footer in Scenario A', !htmlProd.includes('tool-v2-footer'), true);
check('D', 'No tool-v2-footer in Scenario B', !htmlPreviewTrust.includes('tool-v2-footer'), true);
check('D', 'No tool-v2-footer in Scenario C', !htmlPreviewNoTrust.includes('tool-v2-footer'), true);

// ==========================================
// SCENARIO E: No fabricated trust verification text
// ==========================================
check('E', 'No "Evidence reviewed" when trustLabel is absent in preview', !htmlPreviewNoTrust.includes('Evidence reviewed'), true);
check('E', 'No "Last Reviewed:" when trustLabel is absent in preview', !htmlPreviewNoTrust.includes('Last Reviewed:'), true);

const htmlProdNoTrust = renderToolPageV2(vmWithoutTrust, prodOptions);
check('E', 'No "Evidence reviewed" when trustLabel is absent in production', !htmlProdNoTrust.includes('Evidence reviewed'), true);
check('E', 'No "Last Reviewed:" when trustLabel is absent in production', !htmlProdNoTrust.includes('Last Reviewed:'), true);
const mainProdNoTrust = getMainContent(htmlProdNoTrust);
check('E', 'Main without trustLabel retains exactly 1 Review Methodology link', countMatches(mainProdNoTrust, /href="\/review-methodology\.html"/g) === 1, countMatches(mainProdNoTrust, /href="\/review-methodology\.html"/g));
check('E', 'Main without trustLabel retains exactly 1 Request a Correction link', countMatches(mainProdNoTrust, /href="\/corrections-policy\.html"/g) === 1, countMatches(mainProdNoTrust, /href="\/corrections-policy\.html"/g));

// Summary and assertion
if (failures.length > 0) {
    console.error(`\n[REGRESSION TEST FAILED] ${failures.length} check(s) failed:`);
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
}

console.log('[REGRESSION TEST PASSED] All 17 regression checks passed (Scenarios A, B, C, D, E).');
