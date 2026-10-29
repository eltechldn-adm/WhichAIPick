import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { renderProductionToolPageV2 } from '../tool-page-2/render-production-tool-page-v2.mjs';
import { MAX_CANARY_TOOLS } from '../tool-page-2/canary-selection.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const DOMAIN = 'https://whichaipick.com';

const WORKBOOK_PATH = path.join(ROOT, 'data', 'WhichAIPick_Catalog_PHASE11_ANTIGRAVITY_IMPORT_CONTRACT_COMPLETE_2026-10-01.xlsx');
const STAGED_PATH = path.join(ROOT, 'data', 'tools.phase11.staged.json');
const TOOLS_PATH = path.join(ROOT, 'data', 'tools.json');
const COMP_INDEX_PATH = path.join(ROOT, 'data', 'comparison-index.json');
const LEDGER_PATH = path.join(ROOT, 'data', 'evidence', 'phase11-evidence-ledger.json');
const CANARY_PATH = path.join(ROOT, 'data', 'release', 'tool-page-v2-canary.json');

let passed = 0;
function check(label, condition, detail = '') {
    if (!condition) {
        console.error(`  ❌ FAIL: ${label}${detail ? ` (${detail})` : ''}`);
        process.exit(1);
    }
    passed++;
}

console.log('======================================================');
console.log('WHICHAIPICK — STAGE 7F.3A WAVE B CATALOGUE QA SUITE');
console.log('======================================================\n');

const wb = XLSX.readFile(WORKBOOK_PATH);
const catalogRows = XLSX.utils.sheet_to_json(wb.Sheets['Catalog'], { defval: null });
const wbMap = new Map(catalogRows.map(r => [r.id, r]));

const stagedTools = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));
const tools = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
const compIndex = JSON.parse(fs.readFileSync(COMP_INDEX_PATH, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
const canaryManifest = JSON.parse(fs.readFileSync(CANARY_PATH, 'utf8'));

const stagedMap = new Map(stagedTools.map(t => [t.id, t]));
const toolsMap = new Map(tools.map(t => [t.id, t]));
const compMap = new Map(compIndex.map(t => [t.id, t]));
const ledgerMap = new Map(ledger.map(r => [r.evidenceId, r]));

// 1. Canary Cohort Lock & Allowlist Verification
check('Canary manifest expectedCount >= 16', canaryManifest.expectedCount >= 16);
check('Canary manifest approvedToolIds length >= 16', Array.isArray(canaryManifest.approvedToolIds) && canaryManifest.approvedToolIds.length >= 16);
check('MAX_CANARY_TOOLS >= 16', MAX_CANARY_TOOLS >= 16);
check('cursor is not added to V2 canary manifest', !canaryManifest.approvedToolIds.includes('cursor'));
for (const waveBId of ['clearscope', 'buffer-ai-assistant', 'brisk-teaching', 'readai']) {
    check(`${waveBId} is approved in V2 canary manifest in Wave B`, canaryManifest.approvedToolIds.includes(waveBId));
}

// 2. Clearscope Verification
const clearWb = wbMap.get('clearscope');
const clearTool = toolsMap.get('clearscope');
const clearComp = compMap.get('clearscope');
check('clearscope workbook startingPrice is 129', clearWb.startingPrice === 129);
check('clearscope workbook priceCurrency is USD', clearWb.priceCurrency === 'USD');
check('clearscope workbook billingPeriod is month', clearWb.billingPeriod === 'month');
check('clearscope workbook startingPlan is Essentials', clearWb.startingPlan === 'Essentials');
check('clearscope tools.json startingPrice is 129', clearTool.startingPrice === 129 && clearTool.priceCurrency === 'USD' && clearTool.billingPeriod === 'month' && clearTool.startingPlan === 'Essentials');
check('clearscope comparison-index startingPrice is 129', clearComp.startingPrice === 129 && clearComp.priceCurrency === 'USD');
check('clearscope pricing_overview matches $129 Essentials and 14-day trial', clearTool.pricing_overview.includes('$129 per month') && clearTool.pricing_overview.includes('14-day free trial') && clearTool.pricing_overview.includes('unlimited user seats'));
check('clearscope workbook trialDays is 14', clearWb.trialDays === 14);
check('clearscope tools.json trialDays is 14', clearTool.trialDays === 14);
check('clearscope E0059 reviewedAt updated to 2026-10-29', ledgerMap.get('E0059')?.reviewedAt === '2026-10-29');

// 3. Buffer AI Assistant Verification
const bufWb = wbMap.get('buffer-ai-assistant');
const bufTool = toolsMap.get('buffer-ai-assistant');
const bufComp = compMap.get('buffer-ai-assistant');
check('buffer-ai-assistant workbook website_url is https://buffer.com/ai-assistant', bufWb.website_url === 'https://buffer.com/ai-assistant');
check('buffer-ai-assistant tools.json website_url is https://buffer.com/ai-assistant', bufTool.website_url === 'https://buffer.com/ai-assistant');
check('buffer-ai-assistant comparison-index website_url is https://buffer.com/ai-assistant', bufComp.website_url === 'https://buffer.com/ai-assistant');
check('buffer-ai-assistant startingPrice remains null to avoid standalone price misrepresentation', bufTool.startingPrice === null && bufComp.startingPrice === null);
check('buffer-ai-assistant pricing_overview explains unlimited AI credits on Free and per-channel paid plans', bufTool.pricing_overview.includes('unlimited AI generation credits') && bufTool.pricing_overview.includes('$6 per channel per month') && bufTool.pricing_overview.includes('$5 per channel per month when billed annually at $60/year'));
check('buffer-ai-assistant E0051 & E0052 reviewedAt updated to 2026-10-29', ledgerMap.get('E0051')?.reviewedAt === '2026-10-29' && ledgerMap.get('E0052')?.reviewedAt === '2026-10-29');

// 4. Brisk Teaching Verification
const briskWb = wbMap.get('brisk-teaching');
const briskTool = toolsMap.get('brisk-teaching');
check('brisk-teaching workbook and tools.json long_description match', briskWb.long_description === briskTool.long_description);
check('brisk-teaching grammar defect "operational overwhelming burden" removed', !briskTool.long_description.includes('operational overwhelming burden'));
check('brisk-teaching grammar defect "an highly frictionless" removed', !briskTool.long_description.includes('an highly frictionless'));
check('brisk-teaching grammar defect "an uploaded specific rubric" removed', !briskTool.how_it_works.includes('an uploaded specific rubric'));
const briskEditorialText = JSON.stringify([briskTool.long_description, briskTool.how_it_works, briskTool.pros, briskTool.cons, briskTool.pricing_overview, briskTool.comparison_summary]);
check('brisk-teaching does not describe FERPA as an educational standard', !/educational standards? such as FERPA/i.test(briskEditorialText));
check('brisk-teaching FERPA wording attributes compliance to the vendor statement', briskTool.pros.includes('Publishes student data privacy commitments and states that it complies with student privacy laws such as FERPA'));
check('brisk-teaching does not claim certified FERPA compliance', !/FERPA[- ]certified|certified (as )?FERPA/i.test(briskEditorialText));

// 5. Read.ai Verification
const readWb = wbMap.get('readai');
const readTool = toolsMap.get('readai');
check('readai workbook and tools.json long_description match', readWb.long_description === readTool.long_description);
const readAllText = JSON.stringify([readTool.long_description, readTool.how_it_works, readTool.pros, readTool.cons, readTool.pricing_overview, readTool.comparison_summary, readTool.workflows, readTool.feature_groups]);
for (const banned of [
    'merciless dashboard',
    'Corporate Behavioral Psychologist',
    'dystopian',
    'resting angry face',
    'toxic corporate culture',
    'efficiency-obsessed',
    'secretly causing large-scale organizational disengagement',
    'alongside large-scale leader like',
    'grueling job',
    'brutally exposes'
]) {
    check(`readai sensationalist/broken phrase "${banned}" removed`, !readAllText.includes(banned));
}

// 6. Cursor Verification (Stage 7G.2 Pricing Accuracy Remediation & Invariants)
const cursorWb = wbMap.get('cursor');
const cursorTool = toolsMap.get('cursor');
const cursorComp = compMap.get('cursor');

check('cursor affiliate_url preserved', cursorTool.affiliate_url === 'https://cursor.com/?ref=whichaipick');
check('cursor primaryCategory preserved as Development', cursorTool.primaryCategory === 'Development');
check('cursor workbook startingPrice is 8', cursorWb.startingPrice === 8);
check('cursor workbook startingPlan is Plus', cursorWb.startingPlan === 'Plus');
check('cursor workbook priceCurrency is USD', cursorWb.priceCurrency === 'USD');
check('cursor workbook billingPeriod is month', cursorWb.billingPeriod === 'month');
check('cursor tools.json startingPrice is 8 and startingPlan is Plus', cursorTool.startingPrice === 8 && cursorTool.startingPlan === 'Plus' && cursorTool.priceCurrency === 'USD' && cursorTool.billingPeriod === 'month');
check('cursor comparison-index startingPrice is 8', cursorComp.startingPrice === 8 && cursorComp.priceCurrency === 'USD');
check('cursor pricing_overview distinguishes Plus, Premium, separate third-party billing, and legacy Pro',
    cursorTool.pricing_overview.includes('Plus plan at $8 per month') &&
    cursorTool.pricing_overview.includes('Premium plan at $30 per month') &&
    cursorTool.pricing_overview.includes('Third-party frontier models are not included in subscription allowances') &&
    cursorTool.pricing_overview.includes('API list price') &&
    cursorTool.pricing_overview.includes('prepaid credit') &&
    cursorTool.pricing_overview.includes('legacy Pro plan ($20 per month)'));
check('cursor pricing_overview does NOT claim included third-party model quota',
    !cursorTool.pricing_overview.includes('third-party model quota') &&
    !cursorTool.pricing_overview.includes('frontier model quota'));
check('cursor pricing_overview does NOT claim a 14-day trial',
    !cursorTool.pricing_overview.includes('14-day') &&
    !cursorTool.pricing_overview.includes('trial of advanced'));
check('cursor freeTierScope does NOT claim a 14-day trial',
    !cursorTool.freeTierScope.includes('14-day') &&
    !cursorTool.freeTierScope.includes('trial'));
check('cursor hasFreeTrial is null (unconfirmed for new accounts)', cursorTool.hasFreeTrial === null);
check('cursor trialDays is null', cursorTool.trialDays === null);
check('cursor pricingEvidenceNotes documents The X Subscription, separate third-party billing, and legacy tier',
    cursorTool.pricingEvidenceNotes.includes('Plus is USD 8/month') &&
    cursorTool.pricingEvidenceNotes.includes('Premium is USD 30/month') &&
    cursorTool.pricingEvidenceNotes.includes('third-party models are not included in subscription allowances') &&
    cursorTool.pricingEvidenceNotes.includes('Legacy Pro plan is USD 20/month'));
check('cursor E0086 reviewedAt updated to 2026-10-29', ledgerMap.get('E0086')?.reviewedAt === '2026-10-29');
check('cursor E0086 finding mentions The X Subscription and legacy tier', ledgerMap.get('E0086')?.finding?.includes('The X Subscription'));

// 7. In-Memory Production-Equivalent V2 Rendering Verification for all 5 Wave B Tools
const header = `<div id="site-header">\n${fs.readFileSync(path.join(ROOT, 'partials', 'header.html'), 'utf8').trim()}\n</div>`;
const footer = `<div id="site-footer">\n${fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8').trim()}\n</div>`;
const consentHeadHtml = `    <meta name="google-adsense-account" content="ca-pub-7088331504377019">\n    <script src="/js/consent.js" defer></script>`;
const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const truncate = (str, max = 160) => (!str || str.length <= max) ? (str || '') : (str.slice(0, max - 1).trimEnd() + '…');

for (const id of ['clearscope', 'buffer-ai-assistant', 'brisk-teaching', 'readai', 'cursor']) {
    const tool = toolsMap.get(id);
    const html = renderProductionToolPageV2(tool, {
        root: ROOT,
        domain: DOMAIN,
        headerHtml: header,
        footerHtml: footer,
        consentHeadHtml,
        featuredComparisons: [],
        stripHtml,
        truncate
    });
    check(`${id} V2 render contains tool-page-v2 root`, html.includes('class="tool-page-v2"'));
    check(`${id} V2 render has canonical https://whichaipick.com/tools/${id}/`, html.includes(`<link rel="canonical" href="https://whichaipick.com/tools/${id}/">`));
    check(`${id} V2 render has robots index,follow`, html.includes('<meta name="robots" content="index,follow">'));
    check(`${id} V2 render has zero double-encoded HTML entities`, !/&amp;(amp|quot|#39|apos|lt|gt|ndash|mdash);/i.test(html));
    check(`${id} V2 render has zero external favicon trackers`, !/google\.com\/s2\/favicons|icons\.duckduckgo\.com|clearbit\.com|faviconkit\.com/i.test(html));

    const expectedHref = tool.affiliate_url || tool.website_url;
    check(`${id} V2 render uses expected primary CTA href (${expectedHref})`, html.includes(`href="${expectedHref}"`));
    if (tool.affiliate_url) {
        check(`${id} V2 render includes affiliate disclosure and sponsored rel`, html.includes('class="tool-v2-affiliate-note"') && html.includes('rel="sponsored noopener noreferrer"'));
    } else {
        check(`${id} V2 render omits affiliate disclosure and sponsored rel`, !html.includes('class="tool-v2-affiliate-note"') && html.includes('rel="noopener noreferrer"'));
    }
}

console.log(`✅ WAVE B CATALOGUE QA SUITE PASSED: ${passed}/${passed} checks succeeded.`);
