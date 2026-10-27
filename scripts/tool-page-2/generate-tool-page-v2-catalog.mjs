import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildToolPageViewModel } from './build-tool-page-view-model.mjs';
import { renderToolPageV2 } from './render-tool-page-v2.mjs';

const STAGED_PATH = path.resolve('data/tools.phase11.staged.json');
const LEDGER_PATH = path.resolve('data/evidence/phase11-evidence-ledger.json');
const OUT_DIR = path.resolve('tool-page-v2-preview/catalog');

if (!fs.existsSync(STAGED_PATH)) {
    console.error(`[FATAL] Catalogue file not found: ${STAGED_PATH}`);
    process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(STAGED_PATH, 'utf8'));

let ledgerData = [];
if (fs.existsSync(LEDGER_PATH)) {
    ledgerData = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

// Build fast ledger lookup map
const ledgerMap = new Map();
for (const row of ledgerData) {
    if (row.evidenceId && row.id) {
        ledgerMap.set(`${row.evidenceId}::${row.id}`, row);
    }
}

// Existing verified comparison relationships
const comparisonsMap = {
    'chatgpt': [
        { title: 'ChatGPT vs Claude', url: '/compare/chatgpt-vs-claude/' },
        { title: 'ChatGPT vs Gemini', url: '/compare/chatgpt-vs-gemini/' },
        { title: 'ChatGPT vs Perplexity', url: '/compare/chatgpt-vs-perplexity/' },
        { title: 'Midjourney vs ChatGPT Images', url: '/compare/midjourney-vs-chatgpt-images/' }
    ],
    'claude': [
        { title: 'ChatGPT vs Claude', url: '/compare/chatgpt-vs-claude/' }
    ],
    'google-gemini': [
        { title: 'ChatGPT vs Gemini', url: '/compare/chatgpt-vs-gemini/' }
    ],
    'midjourney': [
        { title: 'Midjourney vs Leonardo AI', url: '/compare/midjourney-vs-leonardo-ai/' },
        { title: 'Midjourney vs ChatGPT Images', url: '/compare/midjourney-vs-chatgpt-images/' }
    ],
    'leonardo-ai': [
        { title: 'Midjourney vs Leonardo AI', url: '/compare/midjourney-vs-leonardo-ai/' }
    ],
    'cursor': [
        { title: 'Cursor vs GitHub Copilot', url: '/compare/cursor-vs-github-copilot/' }
    ],
    'github-copilot': [
        { title: 'Cursor vs GitHub Copilot', url: '/compare/cursor-vs-github-copilot/' }
    ],
    'lovable': [
        { title: 'Lovable vs Bolt.new', url: '/compare/lovable-vs-bolt/' },
        { title: 'Replit vs Lovable', url: '/compare/replit-vs-lovable/' }
    ],
    'bolt': [
        { title: 'Lovable vs Bolt.new', url: '/compare/lovable-vs-bolt/' }
    ],
    'replit': [
        { title: 'Replit vs Lovable', url: '/compare/replit-vs-lovable/' }
    ]
};

function resolveEvidenceDate(tool) {
    if (!Array.isArray(tool.evidenceIds) || tool.evidenceIds.length === 0) {
        return null;
    }
    let latestDate = null;
    for (const evId of tool.evidenceIds) {
        const row = ledgerMap.get(`${evId}::${tool.id}`);
        if (row && row.reviewedAt) {
            const rowDate = new Date(row.reviewedAt);
            if (!latestDate || rowDate > latestDate) {
                latestDate = rowDate;
            }
        }
    }
    return latestDate ? latestDate.toISOString().split('T')[0] : null;
}

export function generateCatalogue() {
    const startTime = process.hrtime.bigint();
    console.log(`[START] Generating Tool Page V2 Full Catalogue...`);
    console.log(`Source records: ${rawData.length}`);

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    // Sort records deterministically by ID
    const sortedTools = [...rawData].sort((a, b) => a.id.localeCompare(b.id));

    const manifest = {
        totalRecords: sortedTools.length,
        generatedCount: 0,
        excludedCount: 0,
        quarantinedCount: 0,
        tools: []
    };

    let totalBytes = 0;
    const categoryGroups = {};

    for (const tool of sortedTools) {
        const evidenceReviewedAt = resolveEvidenceDate(tool);
        const featuredComparisons = comparisonsMap[tool.id] || [];

        const viewModel = buildToolPageViewModel(tool, {
            evidenceReviewedAt,
            featuredComparisons
        });

        const html = renderToolPageV2(viewModel);
        const htmlBuffer = Buffer.from(html, 'utf8');
        const hash = crypto.createHash('sha256').update(htmlBuffer).digest('hex');

        const toolDir = path.join(OUT_DIR, tool.id);
        if (!fs.existsSync(toolDir)) {
            fs.mkdirSync(toolDir, { recursive: true });
        }

        const outPath = path.join(toolDir, 'index.html');
        fs.writeFileSync(outPath, htmlBuffer);

        totalBytes += htmlBuffer.length;
        manifest.generatedCount++;

        const cat = tool.primaryCategory || 'Uncategorized';
        if (!categoryGroups[cat]) categoryGroups[cat] = [];
        categoryGroups[cat].push({
            id: tool.id,
            name: tool.canonicalName || tool.name,
            pricingModel: tool.pricingModel || 'Not specified',
            lifecycleStatus: tool.lifecycleStatus || 'active'
        });

        manifest.tools.push({
            id: tool.id,
            name: tool.canonicalName || tool.name,
            category: tool.primaryCategory,
            pricingModel: tool.pricingModel,
            operationalStatus: tool.operationalStatus,
            lifecycleStatus: tool.lifecycleStatus,
            directoryEligible: tool.directoryEligible,
            recommendationEligible: tool.recommendationEligible,
            evidenceReviewedAt,
            hasFeaturedComparisons: featuredComparisons.length > 0,
            outputPath: `tool-page-v2-preview/catalog/${tool.id}/index.html`,
            sizeBytes: htmlBuffer.length,
            sha256: hash
        });
    }

    // Generate isolated Catalogue Preview Index HTML
    const escapeHtml = (unsafe) => {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    let indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tool Page V2 Catalogue Preview | WhichAIPick</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/pages/tool-page-v2.css">
    <style>
        .catalog-index-header { padding: 2.5rem 0 1.5rem; border-bottom: 1px solid var(--border-color, #2D3748); margin-bottom: 2rem; }
        .catalog-meta-pill { display: inline-block; padding: 0.35rem 0.85rem; background: rgba(196,82,41,0.15); color: #c45229; border: 1px solid rgba(196,82,41,0.3); border-radius: 4px; font-weight: 600; font-size: 0.875rem; margin-bottom: 1rem; }
        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 3rem; }
        .catalog-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border-color, #2D3748); border-radius: 6px; padding: 1rem 1.25rem; transition: border-color 0.15s, background-color 0.15s; }
        .catalog-card:hover { border-color: #c45229; background: rgba(255,255,255,0.06); }
        .catalog-card a { font-weight: 600; color: #ffffff; text-decoration: none; font-size: 1.05rem; }
        .catalog-card a:hover { color: #FF6B35; text-decoration: underline; }
        .catalog-card-details { font-size: 0.8125rem; color: var(--text-secondary, #A0AEC0); margin-top: 0.35rem; display: flex; justify-content: space-between; }
        .category-heading { font-size: 1.5rem; color: #ffffff; border-left: 3px solid #c45229; padding-left: 0.75rem; margin: 2rem 0 1rem; }
    </style>
</head>
<body>
    <div class="tool-page-v2">
        <div class="container">
            <div class="tool-v2-breadcrumb">
                <a href="/">Home</a> &gt; <a href="/tool-page-v2-preview/chatgpt/">V2 Preview</a> &gt; Full Catalogue Index
            </div>
            <div class="catalog-index-header">
                <span class="catalog-meta-pill">STAGING PREVIEW &bull; NOINDEX</span>
                <h1>Tool Page V2 Catalogue Preview</h1>
                <p class="tool-v2-description">Deterministic rendering of all ${manifest.generatedCount} authoritative catalogue records in isolated V2 template preview.</p>
            </div>
`;

    const sortedCategories = Object.keys(categoryGroups).sort();
    for (const cat of sortedCategories) {
        indexHtml += `            <h2 class="category-heading">${escapeHtml(cat)} (${categoryGroups[cat].length})</h2>\n`;
        indexHtml += `            <div class="catalog-grid">\n`;
        for (const item of categoryGroups[cat]) {
            indexHtml += `                <div class="catalog-card">
                    <a href="/tool-page-v2-preview/catalog/${item.id}/">${escapeHtml(item.name)}</a>
                    <div class="catalog-card-details">
                        <span>Pricing: ${escapeHtml(item.pricingModel)}</span>
                        ${item.lifecycleStatus !== 'active' ? `<span style="color:#f6ad55;">${escapeHtml(item.lifecycleStatus)}</span>` : ''}
                    </div>
                </div>\n`;
        }
        indexHtml += `            </div>\n`;
    }

    indexHtml += `            <footer class="tool-v2-footer">
                <a href="/review-methodology.html">Review Methodology</a> &middot; <a href="/corrections-policy.html">Request a Correction</a>
            </footer>
        </div>
    </div>
</body>
</html>`;

    const indexBuffer = Buffer.from(indexHtml, 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexBuffer);
    totalBytes += indexBuffer.length;

    // Save manifest
    fs.writeFileSync(path.join(OUT_DIR, 'generation-manifest.json'), JSON.stringify(manifest, null, 2));

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    console.log(`[SUCCESS] Generated ${manifest.generatedCount} tool pages + 1 catalog index.`);
    console.log(`Total output size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB (${totalBytes} bytes).`);
    console.log(`Generation duration: ${durationMs.toFixed(2)} ms (avg ${(durationMs / manifest.generatedCount).toFixed(2)} ms/page).`);

    return manifest;
}

if (process.argv[1] && process.argv[1].endsWith('generate-tool-page-v2-catalog.mjs')) {
    generateCatalogue();
}
