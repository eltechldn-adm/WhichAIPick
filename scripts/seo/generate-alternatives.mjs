import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOOLS_JSON_PATH = path.join(__dirname, '../../data/tools.json');
const ALTS_DEF_PATH = path.join(__dirname, '../../data/seo/alternatives.json');
const DIST_DIR = path.join(__dirname, '../../alternatives');
const TEMPLATE_PATH = path.join(__dirname, '../../category.html');
const SEO_HERO_PATH = path.join(__dirname, '../../partials/seo-hero.html');

const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf-8'));
const altDefs = JSON.parse(fs.readFileSync(ALTS_DEF_PATH, 'utf-8'));
let baseTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const seoHeroTemplate = fs.readFileSync(SEO_HERO_PATH, 'utf-8');

function generateToolCard(tool, editorialContext) {
    const priceBadgeHTML = tool.has_free_tier ? `<div class="tool-card-badge">Free Tier</div>` : '';
    const useCasesHTML = Array.isArray(tool.primaryUseCases) 
        ? tool.primaryUseCases.slice(0, 3).map(uc => `<span class="use-case-tag">${uc}</span>`).join('') 
        : '';

    return `<div class="tool-card">
      ${priceBadgeHTML}
      <div class="tool-card-top ${priceBadgeHTML ? '' : 'tool-card-top--no-badge'}">
        <div class="tool-card-meta">
          <div class="tool-card-meta-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <h2 class="tool-card-title"><a href="/tools/${tool.id}/">${tool.name}</a></h2>
            <button class="save-tool-btn" data-tool-id="${tool.id}" aria-label="Save ${tool.name}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>
          <div class="tool-card-category">${tool.category || 'Uncategorized'}</div>
          <p class="tool-card-desc">${tool.short_description || tool.long_description?.substring(0, 100) + '...' || ''}</p>
          <div class="tool-card-tags">${useCasesHTML}</div>
          <div class="seo-tool-context" style="margin-top: 1rem; padding: 1rem; background: rgba(0, 240, 255, 0.05); border-left: 2px solid var(--accent-cyan); border-radius: 0 8px 8px 0; font-size: 0.875rem;">
            <strong>Alternative Edge:</strong> ${editorialContext}
          </div>
        </div>
      </div>
      <div class="tool-card-actions">
        <a href="/tools/${tool.id}/" class="btn btn-secondary">View Details</a>
        <button class="btn btn-outline compare-btn" data-tool-id="${tool.id}">Compare</button>
      </div>
    </div>`;
}

function generateBreadcrumbs(title, slug) {
    return `<span><a href="/">Home</a></span> 
            <span class="separator">/</span> 
            <span><a href="/alternatives/">Alternatives</a></span> 
            <span class="separator">/</span> 
            <span style="color: var(--text-color);">${title}</span>
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
                "name": "Alternatives",
                "item": "https://whichaipick.com/alternatives/"
              },{
                "@type": "ListItem",
                "position": 3,
                "name": "${title}",
                "item": "https://whichaipick.com/alternatives/${slug}/"
              }]
            }
            </script>`;
}

function buildPage(def) {
    const targetTool = tools.find(t => t.id === def.targetTool);
    if (!targetTool) {
        console.warn(`[WARNING] Target tool ${def.targetTool} not found for alternatives page ${def.slug}. Skipping.`);
        return;
    }

    let matchedTools = tools.filter(t => {
        if (!t.primaryUseCases) return false;
        if (t.contentReviewRequired) return false;
        if (t.id === targetTool.id) return false; // Don't match itself
        
        const uses = t.primaryUseCases.map(u => u.toLowerCase());
        const cats = (t.category || '').toLowerCase();
        
        return def.searchTerms.some(term => 
            uses.some(u => u.includes(term)) || cats.includes(term)
        );
    });

    if (matchedTools.length < def.minToolsToMap) {
        console.log(`[SKIP] /alternatives/${def.slug}/ - Found ${matchedTools.length} tools, needs ${def.minToolsToMap}. Deferring generation (noindex condition).`);
        return;
    }

    const dirPath = path.join(DIST_DIR, def.slug);
    fs.mkdirSync(dirPath, { recursive: true });

    let hero = seoHeroTemplate
        .replace('{{BREADCRUMBS}}', generateBreadcrumbs(def.title, def.slug))
        .replace('{{TITLE}}', def.title)
        .replace('{{SUBTITLE}}', def.intentDescription)
        .replace('{{HAS_CTA}}', 'true')
        .replace('{{CTA_PRIMARY_TEXT}}', 'View Alternatives')
        .replace('{{CTA_PRIMARY_LINK}}', '#tools')
        .replace('{{CTA_SECONDARY_TEXT}}', '')
        .replace('{{CTA_SECONDARY_LINK}}', '')
        .replace('{{STATS}}', `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${matchedTools.length} alternatives found</span>`);

    let toolsHTML = matchedTools.map(t => {
        const context = `A strong alternative in the ${t.category || 'AI'} space. Overlaps with ${targetTool.name} on ${t.primaryUseCases[0] || 'core'} capabilities.`;
        return generateToolCard(t, context);
    }).join('');

    const contentHTML = `
        ${hero}
        <div class="container" style="padding-top: 2rem;">
            <div id="tools" class="tools-grid" style="margin-top: 2rem;">
                ${toolsHTML}
            </div>
        </div>
    `;

    let finalHTML = baseTemplate
        .replace(/<title>.*<\/title>/, `<title>${def.title} | WhichAIPick</title>`)
        .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${def.metaDescription}">`)
        .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${def.metaDescription}">`)
        .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="${def.metaDescription}">`)
        .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
        .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/alternatives/${def.slug}/">`)
        .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-alternatives-page">${contentHTML}</main>`)
        .replace('<script src="/js/browse.js"></script>', '');

    fs.writeFileSync(path.join(dirPath, 'index.html'), finalHTML);
    console.log(`[GENERATED] /alternatives/${def.slug}/ (${matchedTools.length} tools)`);
}

fs.mkdirSync(DIST_DIR, { recursive: true });

const rootHTML = baseTemplate
    .replace(/<title>.*<\/title>/, `<title>AI Tool Alternatives | WhichAIPick</title>`)
    .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="Find the best alternatives to popular AI tools to fit your budget, privacy needs, and workflow.">`)
    .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="Find the best alternatives to popular AI tools to fit your budget, privacy needs, and workflow.">`)
    .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="Find the best alternatives to popular AI tools to fit your budget, privacy needs, and workflow.">`)
    .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/alternatives/">`)
    .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-alternatives-page"><div class="container" style="padding: 6rem 0;"><div class="seo-breadcrumbs" style="margin-bottom: 2rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; align-items: center; font-size: 0.875rem; color: var(--text-muted);"><span><a href="/" style="color: var(--accent-cyan); text-decoration: none;">Home</a></span> <span class="separator" style="opacity: 0.5;">/</span> <span style="color: var(--text-color);">Alternatives</span><script type="application/ld+json">{"@context": "https://schema.org","@type": "BreadcrumbList","itemListElement": [{"@type": "ListItem","position": 1,"name": "Home","item": "https://whichaipick.com/"},{"@type": "ListItem","position": 2,"name": "Alternatives","item": "https://whichaipick.com/alternatives/"}]}</script></div><h1>AI Tool Alternatives</h1><ul>${altDefs.map(d => `<li><a href="/alternatives/${d.slug}/" style="color: var(--accent-cyan);">${d.title}</a></li>`).join('')}</ul></div></main>`)
    .replace('<script src="/js/browse.js"></script>', '');

fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rootHTML);
console.log(`[GENERATED] /alternatives/ (index)`);

altDefs.forEach(buildPage);
