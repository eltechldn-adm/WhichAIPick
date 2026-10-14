import fs from 'fs';
import path from 'path';
import { buildToolPageViewModel } from './build-tool-page-view-model.mjs';
import { renderToolPageV2 } from './render-tool-page-v2.mjs';

/**
 * Production adapter for the existing Tool Page V2 renderer.
 * Builds the same view model used by the staging catalogue and renders it inside the
 * production shell. SEO metadata deliberately mirrors the V1 page so titles, descriptions,
 * canonical URLs and robots behaviour do not change when a route switches templates.
 */

let ledgerMap = null;

function loadLedger(root) {
    if (ledgerMap) return ledgerMap;
    ledgerMap = new Map();
    const ledgerPath = path.join(root, 'data', 'evidence', 'phase11-evidence-ledger.json');
    if (fs.existsSync(ledgerPath)) {
        for (const row of JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))) {
            if (row.evidenceId && row.id) ledgerMap.set(`${row.evidenceId}::${row.id}`, row);
        }
    }
    return ledgerMap;
}

function resolveEvidenceDate(tool, map) {
    if (!Array.isArray(tool.evidenceIds) || tool.evidenceIds.length === 0) return null;
    let latest = null;
    for (const evidenceId of tool.evidenceIds) {
        const row = map.get(`${evidenceId}::${tool.id}`);
        if (row && row.reviewedAt) {
            const date = new Date(row.reviewedAt);
            if (!latest || date > latest) latest = date;
        }
    }
    return latest ? latest.toISOString().split('T')[0] : null;
}

export function renderProductionToolPageV2(tool, { root, domain, headerHtml, footerHtml, consentHeadHtml, featuredComparisons = [], stripHtml, truncate }) {
    const name = tool.name || tool.id;
    const category = tool.category || 'AI Tools';
    const rawDescription = stripHtml(tool.long_description || '');
    const metaDescription = truncate(
        rawDescription || `${name} is an AI tool in the ${category} category. Discover features, pricing, pros, and alternatives on WhichAIPick.`,
        160
    );

    const viewModel = buildToolPageViewModel(tool, {
        evidenceReviewedAt: resolveEvidenceDate(tool, loadLedger(root)),
        featuredComparisons
    });

    return renderToolPageV2(viewModel, {
        mode: 'production',
        canonicalUrl: `${domain}/tools/${tool.id}/`,
        robots: tool.contentReviewRequired ? 'noindex,follow' : 'index,follow',
        metaTitle: `${name} — AI ${category} Tool | WhichAIPick`,
        metaDescription,
        domain,
        headerHtml,
        footerHtml,
        consentHeadHtml
    });
}
