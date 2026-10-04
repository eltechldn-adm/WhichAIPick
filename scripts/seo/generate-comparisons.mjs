import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import shared rendering logic
import { renderComparisonTableRows, escapeHTML } from '../../js/comparison-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '../..');
const TOOLS_JSON_PATH = path.join(ROOT, 'data/tools.json');
const RESEARCH_PATH = path.join(ROOT, 'data/seo/comparisons-v2.research.json');
const MANIFEST_PATH = path.join(ROOT, 'data/seo/comparisons-v2.publish.json');
const SOURCES_PATH = path.join(ROOT, 'data/seo/comparison-sources.json');
const DIST_DIR = path.join(ROOT, 'compare');
const TEMPLATE_PATH = path.join(ROOT, 'category.html');
const SEO_HERO_PATH = path.join(ROOT, 'partials/seo-hero.html');

const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf-8'));
const publishManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
const researchData = JSON.parse(fs.readFileSync(RESEARCH_PATH, 'utf-8'));
const allSources = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf-8'));
let baseTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const seoHeroTemplate = fs.readFileSync(SEO_HERO_PATH, 'utf-8');

function generateBreadcrumbs(title, slug) {
    return `<span><a href="/">Home</a></span> 
            <span class="separator">/</span> 
            <span><a href="/compare/">Compare</a></span> 
            <span class="separator">/</span> 
            <span style="color: var(--text-color);">${escapeHTML(title)}</span>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://whichaipick.com/"
              },{
                "@type": "ListItem",
                "position": 2,
                "name": "Compare",
                "item": "https://whichaipick.com/compare/"
              },{
                "@type": "ListItem",
                "position": 3,
                "name": "${escapeHTML(title)}",
                "item": "https://whichaipick.com/compare/${escapeHTML(slug)}/"
              }]
            }
            </script>`;
}

function resolveSource(sourceId) {
    const source = allSources.find(s => s.sourceId === sourceId);
    if (!source) throw new Error(`Missing source ID: ${sourceId}`);
    return source;
}

function resolveClaim(claimId, def) {
    const claim = def.claims?.find(c => c.claimId === claimId);
    if (!claim) throw new Error(`Missing claim ID: ${claimId} in ${def.slug}`);
    return claim;
}

function buildPage(def) {
    if (!publishManifest.approvedSlugs.includes(def.slug)) return;
    if (def.status !== 'research-ready' || !def.evidenceAuditPassed) {
        throw new Error(`Comparison ${def.slug} is in manifest but not ready/audited.`);
    }

    const toolA = tools.find(t => t.id === def.tools[0]);
    const toolB = tools.find(t => t.id === def.tools[1]);

    if (!toolA || !toolB) {
        throw new Error(`[WARNING] Missing tool for comparison ${def.slug}.`);
    }

    const usedSourceIds = new Set();
    const addSources = (ids) => { if (ids) ids.forEach(id => usedSourceIds.add(id)); };

    const dirPath = path.join(DIST_DIR, def.slug);
    fs.mkdirSync(dirPath, { recursive: true });

    let hero = seoHeroTemplate
        .replace('{{BREADCRUMBS}}', generateBreadcrumbs(def.title, def.slug))
        .replace('{{TITLE}}', escapeHTML(def.title))
        .replace('{{SUBTITLE}}', escapeHTML(def.metaDescription) + `<div style="margin-top: 1rem; font-size: 0.9rem; color: var(--color-gray-400);">Research checked: ${escapeHTML(def.checkedAt)}</div>`)
        .replace('{{CTA_BLOCK}}', '')
        .replace('{{STATS_BLOCK}}', '');

    let contentHTML = `
        ${hero}
        <div class="container curated-comparison" style="padding-top: 2rem; max-width: 900px; margin: 0 auto;">
    `;

    // Quick Answer
    if (def.quickAnswer?.length > 0) {
        contentHTML += `
            <section class="compare-section quick-answer-section" style="margin-bottom: 3rem; background: var(--bg-surface); padding: 2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <h2 style="margin-top: 0;">Quick Answer</h2>
                <ul style="list-style: none; padding-left: 0;">
        `;
        def.quickAnswer.forEach(qa => {
            addSources(qa.sourceIds);
            contentHTML += `<li style="margin-bottom: 1rem; padding-left: 1.5rem; position: relative;">
                <span style="position: absolute; left: 0; top: 0; color: var(--accent-cyan);">→</span>
                ${escapeHTML(qa.text)} <span style="font-size: 0.8rem; color: var(--color-gray-400);">(Source-backed)</span>
            </li>`;
        });
        contentHTML += `</ul></section>`;
    }

    // Key Differences
    if (def.keyDifferences?.length > 0) {
        contentHTML += `
            <section class="compare-section key-differences-section" style="margin-bottom: 3rem;">
                <h2>Key Differences</h2>
                <div class="differences-grid" style="display: flex; flex-direction: column; gap: 1rem;">
        `;
        def.keyDifferences.forEach(kd => {
            addSources(kd.sourceIds);
            contentHTML += `
                <div class="difference-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--accent-cyan);">
                    <h3 style="margin-top: 0; font-size: 1.2rem;">${escapeHTML(kd.topic)}</h3>
                    <p style="margin-bottom: 0;">${escapeHTML(kd.description)}</p>
                </div>
            `;
        });
        contentHTML += `</div></section>`;
    }

    // Interactive Comparison (Reuse comparison-core)
    contentHTML += `
        <section class="compare-section interactive-compare-section" style="margin-bottom: 3rem;">
            <h2>Interactive Comparison</h2>
            <div class="compare-table-wrapper" style="overflow-x: auto; background: var(--bg-surface); border-radius: 12px; padding: 1rem;">
                <table class="compare-table" style="width: 100%; border-collapse: collapse; text-align: left; --tool-count: 2;">
                    <thead>
                        <tr>
                            <th scope="col" class="compare-factor-col"></th>
                            <th scope="col" style="padding: 1rem; width: 40%;"><h3 style="margin: 0;">${escapeHTML(toolA.canonicalName)}</h3></th>
                            <th scope="col" style="padding: 1rem; width: 40%;"><h3 style="margin: 0;">${escapeHTML(toolB.canonicalName)}</h3></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderComparisonTableRows([toolA, toolB])}
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 1.5rem; text-align: center;">
                <a href="/compare#tools=${escapeHTML(toolA.id)},${escapeHTML(toolB.id)}" class="btn btn-primary">Open interactive comparison</a>
            </div>
        </section>
    `;

    // Use Case Decisions
    if (def.useCaseDecisions?.length > 0) {
        contentHTML += `
            <section class="compare-section use-cases-section" style="margin-bottom: 3rem;">
                <h2>Which Is Better for Different Use Cases?</h2>
                <div class="table-responsive">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <th style="padding: 1rem;">Use case</th>
                                <th style="padding: 1rem;">${escapeHTML(toolA.canonicalName)}</th>
                                <th style="padding: 1rem;">${escapeHTML(toolB.canonicalName)}</th>
                                <th style="padding: 1rem;">What matters</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        def.useCaseDecisions.forEach(uc => {
            addSources(uc.evidenceIds);
            contentHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 1rem; font-weight: bold;">${escapeHTML(uc.useCase)}</td>
                    <td style="padding: 1rem;">${escapeHTML(uc.toolAFit)}</td>
                    <td style="padding: 1rem;">${escapeHTML(uc.toolBFit)}</td>
                    <td style="padding: 1rem; font-size: 0.9rem; color: var(--color-gray-300);">${escapeHTML(uc.reason)}</td>
                </tr>
            `;
        });
        contentHTML += `</tbody></table></div></section>`;
    }

    // Choose X If...
    contentHTML += `
        <section class="compare-section choose-if-section" style="margin-bottom: 3rem;">
            <h2>Decision Support</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
    `;

    // Choose Tool A
    if (def.chooseToolAIf?.length > 0) {
        contentHTML += `
            <div class="choose-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: 8px;">
                <h3 style="margin-top: 0; color: var(--accent-cyan);">Choose ${escapeHTML(toolA.canonicalName)} if...</h3>
                <ul style="padding-left: 1.5rem;">
        `;
        def.chooseToolAIf.forEach(c => {
            const claim = resolveClaim(c.claimId, def);
            addSources(claim.sourceIds);
            contentHTML += `<li>${escapeHTML(c.condition)}</li>`;
        });
        contentHTML += `</ul></div>`;
    }

    // Choose Tool B
    if (def.chooseToolBIf?.length > 0) {
        contentHTML += `
            <div class="choose-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: 8px;">
                <h3 style="margin-top: 0; color: var(--accent-cyan);">Choose ${escapeHTML(toolB.canonicalName)} if...</h3>
                <ul style="padding-left: 1.5rem;">
        `;
        def.chooseToolBIf.forEach(c => {
            const claim = resolveClaim(c.claimId, def);
            addSources(claim.sourceIds);
            contentHTML += `<li>${escapeHTML(c.condition)}</li>`;
        });
        contentHTML += `</ul></div>`;
    }

    contentHTML += `</div></section>`;

    // Pricing Snapshot
    if (def.pricingResearch) {
        contentHTML += `
            <section class="compare-section pricing-section" style="margin-bottom: 3rem;">
                <h2>Pricing Snapshot</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
        `;
        [
            { label: toolA.canonicalName, pd: def.pricingResearch.toolA },
            { label: toolB.canonicalName, pd: def.pricingResearch.toolB }
        ].forEach(t => {
            addSources([t.pd.sourceId]);
            let fp = t.pd.freePlan === true ? 'Free plan available' : (t.pd.freePlan === false ? 'No free plan confirmed' : 'Free-plan status not confirmed');
            let tr = t.pd.trial === true ? 'Trial available' : (t.pd.trial === false ? 'No trial confirmed' : 'Trial status not confirmed');
            let ep = t.pd.entryPaidPlan ? `From ${t.pd.currency} ${t.pd.entryPaidPlan} / ${t.pd.billingBasis}` : 'Entry paid price not confirmed';
            contentHTML += `
                <div class="pricing-card" style="background: var(--bg-surface); padding: 1.5rem; border-radius: 8px;">
                    <h3 style="margin-top: 0;">${escapeHTML(t.label)}</h3>
                    <ul style="list-style: none; padding-left: 0;">
                        <li>${escapeHTML(fp)}</li>
                        <li>${escapeHTML(tr)}</li>
                        <li><strong>${escapeHTML(ep)}</strong></li>
                    </ul>
                </div>
            `;
        });
        contentHTML += `
                </div>
                <p style="font-size: 0.9rem; color: var(--color-gray-400); margin-top: 1rem;">
                    Pricing research checked: ${escapeHTML(def.pricingResearch.toolA.checkedAt)}.
                    Pricing can change. Check the official pricing page before purchasing.
                </p>
            </section>
        `;
    }

    // Neither If
    if (def.neitherIf?.length > 0) {
        contentHTML += `
            <section class="compare-section neither-if-section" style="margin-bottom: 3rem;">
                <h2>Neither may be the best fit if...</h2>
                <ul style="padding-left: 1.5rem;">
        `;
        def.neitherIf.forEach(n => {
            contentHTML += `<li>${escapeHTML(n)}</li>`;
        });
        contentHTML += `</ul></section>`;
    }

    // Alternatives
    if (def.alternatives?.length > 0) {
        contentHTML += `
            <section class="compare-section alternatives-section" style="margin-bottom: 3rem;">
                <h2>Alternatives</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        `;
        def.alternatives.forEach(altId => {
            const altTool = tools.find(t => t.id === altId);
            if (altTool) {
                contentHTML += `
                    <div class="alt-card" style="background: var(--bg-surface); padding: 1rem; border-radius: 8px; flex: 1 1 200px;">
                        <a href="/tools/${escapeHTML(altTool.id)}/" style="color: var(--accent-cyan); font-weight: bold; text-decoration: none;">${escapeHTML(altTool.canonicalName)}</a>
                        <div style="font-size: 0.9rem; color: var(--color-gray-300); margin-top: 0.5rem;">${escapeHTML(altTool.primaryCategory)}</div>
                    </div>
                `;
            }
        });
        contentHTML += `</div></section>`;
    }

    // FAQ
    if (def.faqCandidates?.length > 0) {
        contentHTML += `
            <section class="compare-section faq-section" style="margin-bottom: 3rem;">
                <h2>Frequently Asked Questions</h2>
        `;
        def.faqCandidates.forEach(faq => {
            addSources(faq.sourceIds);
            contentHTML += `
                <div class="faq-item" style="margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${escapeHTML(faq.question)}</h3>
                    <p style="margin-top: 0; color: var(--color-gray-200);">${escapeHTML(faq.answer)}</p>
                </div>
            `;
        });
        contentHTML += `</section>`;
    }

    // Sources
    if (usedSourceIds.size > 0) {
        contentHTML += `
            <section class="compare-section sources-section" style="margin-bottom: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1);">
                <h2>Research Sources</h2>
                <ul style="list-style: none; padding-left: 0; font-size: 0.9rem;">
        `;
        Array.from(usedSourceIds).forEach(id => {
            const s = resolveSource(id);
            contentHTML += `
                <li style="margin-bottom: 0.5rem;">
                    <strong>${escapeHTML(s.publisher)}</strong> —
                    <a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--color-gray-300); text-decoration: underline;">${escapeHTML(s.title)}</a>
                    <span style="color: var(--color-gray-500); margin-left: 0.5rem;">(Checked: ${escapeHTML(s.checkedAt)})</span>
                </li>
            `;
        });
        contentHTML += `</ul></section>`;
    }

    // Methodology
    contentHTML += `
        <section class="compare-section methodology-section" style="margin-bottom: 3rem; font-size: 0.85rem; color: var(--color-gray-400);">
            <p>This comparison combines structured WhichAIPick catalogue data with current official product documentation. Unknown values are shown as unconfirmed rather than inferred. <a href="/review-methodology" style="color: inherit; text-decoration: underline;">Read our methodology</a>.</p>
        </section>
    </div>`;

    // FAQ Schema
    let faqSchemaStr = '';
    if (def.faqCandidates?.length > 0) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": def.faqCandidates.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.answer
                }
            }))
        };
        faqSchemaStr = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
    }

    let finalHTML = baseTemplate
        .replace(/<title>.*<\/title>/, `<title>${escapeHTML(def.title)}</title>`)
        .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${escapeHTML(def.metaDescription)}">`)
        .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${escapeHTML(def.metaDescription)}">`)
        .replace(/<meta property="og:title"[\s\S]*?>/, `<meta property="og:title" content="${escapeHTML(def.title)}">`)
        .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="${escapeHTML(def.metaDescription)}">`)
        .replace(/<meta property="twitter:title"[\s\S]*?>/, `<meta property="twitter:title" content="${escapeHTML(def.title)}">`)
        .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
        .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/compare/${escapeHTML(def.slug)}/">\n    <link rel="stylesheet" href="/css/pages/curated-comparison.css">`)
        .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-compare-page">${contentHTML}</main>`)
        .replace('</body>', `${faqSchemaStr}\n</body>`);

    fs.writeFileSync(path.join(dirPath, 'index.html'), finalHTML.split('\n').map(line => line.replace(/\s+$/, '')).join('\n'));
    console.log(`[GENERATED] /compare/${def.slug}/`);
}

publishManifest.approvedSlugs.forEach(slug => {
    const def = researchData.find(r => r.slug === slug);
    if (def) {
        buildPage(def);
    } else {
        console.error(`[ERROR] Slug ${slug} in manifest not found in research data.`);
    }
});
