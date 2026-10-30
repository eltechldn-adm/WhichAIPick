import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { isCanaryRequested, resolveCanarySelection, CanarySelectionError } from '../tool-page-2/canary-selection.mjs';

/**
 * Verifies the FINAL generated /tools/{id}/index.html output (after the complete build),
 * not an intermediate generator result.
 *
 * Expected mode is derived from the same environment the build used:
 *   TOOL_PAGE_V2_CANARY unset -> 0 V2 pages, every tool V1.
 *   TOOL_PAGE_V2_CANARY=1     -> exactly the manifest IDs are V2, every other tool is V1.
 *
 * Optional: --json=<path> writes machine-readable evidence (classification + sha256 per route).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOMAIN = 'https://whichaipick.com';
const failures = [];
const fail = (message) => failures.push(message);

export function sanitizeExternalHttpUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        if (!parsed.hostname) return null;
        return trimmed;
    } catch {
        return null;
    }
}

export function auditV2OutboundLinks(id, html, record) {
    const errs = [];
    const safeAffiliateUrl = sanitizeExternalHttpUrl(record?.affiliate_url || record?.affiliateUrl);
    const safeWebsiteUrl = sanitizeExternalHttpUrl(record?.website_url || record?.websiteUrl);
    const hasAffiliate = Boolean(safeAffiliateUrl);
    const expectedOutboundUrl = safeAffiliateUrl || safeWebsiteUrl;

    if (expectedOutboundUrl) {
        const escapedUrl = expectedOutboundUrl.replace(/&/g, '&amp;');
        if (!html.includes(`href="${escapedUrl}"`)) {
            errs.push(`${id}: V2 primary outbound link missing (${expectedOutboundUrl})`);
        }
        if (hasAffiliate) {
            if (!html.includes('rel="sponsored noopener noreferrer"')) {
                errs.push(`${id}: V2 affiliate link missing rel="sponsored noopener noreferrer"`);
            }
            if (!html.includes('class="tool-v2-affiliate-note"')) {
                errs.push(`${id}: V2 affiliate page missing affiliate disclosure note`);
            }
        } else {
            if (!html.includes('rel="noopener noreferrer"')) {
                errs.push(`${id}: V2 outbound link missing rel="noopener noreferrer"`);
            }
            if (html.includes('class="tool-v2-affiliate-note"')) {
                errs.push(`${id}: Non-affiliate V2 page must not include affiliate disclosure note`);
            }
        }
    }
    if (safeWebsiteUrl) {
        const escapedSchema = `"url":"${safeWebsiteUrl}"`;
        const spacedSchema = `"url": "${safeWebsiteUrl}"`;
        if (!html.includes(escapedSchema) && !html.includes(spacedSchema)) {
            errs.push(`${id}: V2 JSON-LD schema canonical website URL missing (${safeWebsiteUrl})`);
        }
    }
    return errs;
}

// Unit verification of outbound link auditing logic (fail-closed test suite)
(() => {
    // 1. Non-affiliate tool passing
    const mockRecordNonAff = { website_url: 'https://example.com/' };
    const mockHtmlNonAff = '<a href="https://example.com/" target="_blank" rel="noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a><script type="application/ld+json">{"url":"https://example.com/"}</script>';
    const passNonAff = auditV2OutboundLinks('mock-non-aff', mockHtmlNonAff, mockRecordNonAff);
    if (passNonAff.length !== 0) throw new Error(`Unit test failed (non-affiliate valid): ${passNonAff.join('; ')}`);

    // 2. Non-affiliate missing href (negative)
    const failNonAffHref = auditV2OutboundLinks('mock-non-aff', '<div>No links</div>', mockRecordNonAff);
    if (!failNonAffHref.some(e => e.includes('outbound link missing'))) throw new Error('Unit test failed: did not catch missing non-affiliate link');

    // 3. Affiliate tool passing
    const mockRecordAff = { website_url: 'https://cursor.com/', affiliate_url: 'https://cursor.com/?ref=whichaipick' };
    const mockHtmlAff = '<a href="https://cursor.com/?ref=whichaipick" target="_blank" rel="sponsored noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a><p class="tool-v2-affiliate-note">Disclosure</p><script type="application/ld+json">{"url":"https://cursor.com/"}</script>';
    const passAff = auditV2OutboundLinks('cursor', mockHtmlAff, mockRecordAff);
    if (passAff.length !== 0) throw new Error(`Unit test failed (affiliate valid): ${passAff.join('; ')}`);

    // 4. Affiliate tool with raw link (negative)
    const mockHtmlAffRaw = '<a href="https://cursor.com/" target="_blank" rel="noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a><script type="application/ld+json">{"url":"https://cursor.com/"}</script>';
    const failAffRaw = auditV2OutboundLinks('cursor', mockHtmlAffRaw, mockRecordAff);
    if (!failAffRaw.some(e => e.includes('outbound link missing'))) throw new Error('Unit test failed: did not catch raw link when affiliate expected');

    // 5. Affiliate tool missing sponsored rel (negative)
    const mockHtmlAffNoRel = '<a href="https://cursor.com/?ref=whichaipick" target="_blank" rel="noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a><p class="tool-v2-affiliate-note">Disclosure</p><script type="application/ld+json">{"url":"https://cursor.com/"}</script>';
    const failAffRel = auditV2OutboundLinks('cursor', mockHtmlAffNoRel, mockRecordAff);
    if (!failAffRel.some(e => e.includes('missing rel="sponsored noopener noreferrer"'))) throw new Error('Unit test failed: did not catch missing sponsored rel');

    // 6. Affiliate tool missing disclosure note (negative)
    const mockHtmlAffNoNote = '<a href="https://cursor.com/?ref=whichaipick" target="_blank" rel="sponsored noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a><script type="application/ld+json">{"url":"https://cursor.com/"}</script>';
    const failAffNote = auditV2OutboundLinks('cursor', mockHtmlAffNoNote, mockRecordAff);
    if (!failAffNote.some(e => e.includes('missing affiliate disclosure note'))) throw new Error('Unit test failed: did not catch missing disclosure note');

    // 7. Non-affiliate tool incorrectly displaying affiliate disclosure note (negative)
    const mockHtmlNonAffWithNote = '<a href="https://example.com/" target="_blank" rel="noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a><p class="tool-v2-affiliate-note">Disclosure</p><script type="application/ld+json">{"url":"https://example.com/"}</script>';
    const failNonAffWithNote = auditV2OutboundLinks('mock-non-aff', mockHtmlNonAffWithNote, mockRecordNonAff);
    if (!failNonAffWithNote.some(e => e.includes('must not include affiliate disclosure note'))) throw new Error('Unit test failed: did not catch unexpected disclosure note on non-affiliate page');

    // 8. Invalid affiliate protocol e.g. javascript: falls back to safe website URL
    const mockRecordBadAff = { website_url: 'https://example.com/', affiliate_url: 'javascript:alert(1)' };
    const mockHtmlBadAff = '<a href="https://example.com/" target="_blank" rel="noopener noreferrer" class="tool-v2-btn-primary">Visit Website</a><script type="application/ld+json">{"url":"https://example.com/"}</script>';
    const passBadAff = auditV2OutboundLinks('mock-bad-aff', mockHtmlBadAff, mockRecordBadAff);
    if (passBadAff.length !== 0) throw new Error('Unit test failed: invalid affiliate protocol was not rejected');
})();

const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
const toolIds = tools.map(t => t.id);

let canaryRequested;
let expectedV2;
try {
    canaryRequested = isCanaryRequested();
    expectedV2 = resolveCanarySelection({ root: ROOT, tools });
} catch (error) {
    if (error instanceof CanarySelectionError) {
        console.error(error.message);
        process.exit(1);
    }
    throw error;
}
const expectedV2Set = new Set(expectedV2);
const mode = canaryRequested ? 'canary' : 'default';

// Directory inventory: no extras, none missing
const toolsDir = path.join(ROOT, 'tools');
const dirs = fs.readdirSync(toolsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
const missing = toolIds.filter(id => !dirs.includes(id));
const extra = dirs.filter(id => !toolIds.includes(id));
if (missing.length) fail(`Missing tool directories: ${missing.join(', ')}`);
if (extra.length) fail(`Unexpected tool directories: ${extra.join(', ')}`);

const routes = [];
const countOf = (html, re) => (html.match(re) || []).length;
const normalise = (s) => s.replace(/\s+/g, ' ').trim();

let v1Sample = null;
for (const id of toolIds) {
    const file = path.join(toolsDir, id, 'index.html');
    if (!fs.existsSync(file)) { fail(`${id}: index.html missing`); continue; }
    const html = fs.readFileSync(file, 'utf8');
    const isV2 = html.includes('class="tool-page-v2"');
    const isV1 = html.includes('class="tool-detail-page"');
    if (isV1 === isV2) { fail(`${id}: cannot classify template (v1=${isV1}, v2=${isV2})`); continue; }
    const template = isV2 ? 'v2' : 'v1';
    routes.push({ id, template, sha256: crypto.createHash('sha256').update(html).digest('hex') });
    if (isV1 && !v1Sample) v1Sample = html;

    const expected = expectedV2Set.has(id) ? 'v2' : 'v1';
    if (template !== expected) fail(`${id}: expected ${expected}, found ${template}`);

    // Applies to every tool page, V1 and V2: canonical must be the existing public URL.
    const canonicals = html.match(/<link rel="canonical" href="([^"]+)"/g) || [];
    if (canonicals.length !== 1 || !canonicals[0].includes(`href="${DOMAIN}/tools/${id}/"`)) {
        fail(`${id}: canonical incorrect (${canonicals.join(' | ') || 'none'})`);
    }
    if (html.includes('tool-page-v2-preview') || html.includes('pages.dev')) fail(`${id}: preview URL leaked into production output`);

    if (isV2) {
        const robots = (html.match(/<meta name="robots" content="([^"]+)"/) || [])[1];
        if (robots !== 'index,follow') fail(`${id}: V2 robots must be index,follow (found ${robots})`);
        if (countOf(html, /<h1[ >]/g) !== 1) fail(`${id}: V2 must have exactly one h1`);
        if (!html.includes('<div id="site-header">')) fail(`${id}: V2 missing site header shell`);
        if (!html.includes('<div id="site-footer">')) fail(`${id}: V2 missing site footer shell`);
        if (!html.includes("gtag('consent', 'default'")) fail(`${id}: V2 missing consent mode default`);
        if (!html.includes('name="google-adsense-account"')) fail(`${id}: V2 missing AdSense account meta`);
        if (!html.includes('/js/consent.js')) fail(`${id}: V2 missing consent.js`);
        if (!html.includes('/css/styles.css')) fail(`${id}: V2 missing site stylesheet`);
        if (!html.includes('/css/pages/tool-page-v2.css')) fail(`${id}: V2 missing V2 stylesheet`);
        if (html.includes('/css/global.css')) fail(`${id}: V2 must not load preview css/global.css`);
        if (!html.includes(`href="/compare#tools=${id}"`)) fail(`${id}: V2 missing compare link`);
        const record = tools.find(t => t.id === id);
        const linkErrors = auditV2OutboundLinks(id, html, record);
        for (const err of linkErrors) fail(err);
    }
}

if (mode === 'default') {
    if (routes.filter(r => r.template === 'v2').length !== 0) fail('Default build produced V2 production pages');
} else {
    const v2 = routes.filter(r => r.template === 'v2').map(r => r.id).sort();
    if (v2.length !== expectedV2.length) fail(`Canary build produced ${v2.length} V2 pages, expected ${expectedV2.length}`);
}

// V2 consent block must match the V1 consent block (whitespace-normalised)
if (v1Sample) {
    const consentRe = /gtag\('consent', 'default', \{[\s\S]*?\}\);/;
    const v1Consent = normalise((v1Sample.match(consentRe) || [''])[0]);
    for (const r of routes.filter(x => x.template === 'v2')) {
        const html = fs.readFileSync(path.join(toolsDir, r.id, 'index.html'), 'utf8');
        if (normalise((html.match(consentRe) || [''])[0]) !== v1Consent) fail(`${r.id}: V2 consent defaults differ from V1`);
    }
}

// Sitemap must list every indexable tool route exactly once and no preview URLs
const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    if (sitemap.includes('tool-page-v2-preview') || sitemap.includes('pages.dev')) fail('Sitemap contains preview URLs');
    const expectedUrls = tools.filter(t => !t.contentReviewRequired).map(t => `${DOMAIN}/tools/${t.id}/`);
    for (const url of expectedUrls) {
        if (countOf(sitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`, 'g')) !== 1) fail(`Sitemap membership wrong for ${url}`);
    }
}

const jsonArg = process.argv.find(a => a.startsWith('--json='));
const summary = {
    mode,
    toolRecords: toolIds.length,
    toolDirectories: dirs.length,
    v1Count: routes.filter(r => r.template === 'v1').length,
    v2Count: routes.filter(r => r.template === 'v2').length,
    v2Ids: routes.filter(r => r.template === 'v2').map(r => r.id).sort(),
    failures
};
if (jsonArg) {
    fs.writeFileSync(path.resolve(jsonArg.slice('--json='.length)), JSON.stringify({ ...summary, routes }, null, 2));
}

if (failures.length) {
    console.error(`[CANARY GUARD FAIL] mode=${mode}`);
    failures.slice(0, 40).forEach(f => console.error(`  - ${f}`));
    if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
    process.exit(1);
}
console.log(`[CANARY GUARD PASS] mode=${mode} tools=${summary.toolRecords} v1=${summary.v1Count} v2=${summary.v2Count}${summary.v2Count ? ` (${summary.v2Ids.join(', ')})` : ''}`);
