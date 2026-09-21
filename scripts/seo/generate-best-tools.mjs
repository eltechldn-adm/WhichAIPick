import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOOLS_JSON_PATH = path.join(__dirname, '../../data/tools.json');
const BEST_TOOLS_DEF_PATH = path.join(__dirname, '../../data/seo/best-tools.json');
const DIST_DIR = path.join(__dirname, '../../best-ai-tools');
const TEMPLATE_PATH = path.join(__dirname, '../../category.html'); // We can reuse the category template as a base shell
const SEO_HERO_PATH = path.join(__dirname, '../../partials/seo-hero.html');

// Read data
const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf-8'));
const bestToolsDefs = JSON.parse(fs.readFileSync(BEST_TOOLS_DEF_PATH, 'utf-8'));
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
          
          <div class="tool-card-tags">
            ${useCasesHTML}
          </div>
          
          <!-- SEO Editorial Context -->
          <div class="seo-tool-context" style="margin-top: 1rem; padding: 1rem; background: rgba(0, 240, 255, 0.05); border-left: 2px solid var(--accent-cyan); border-radius: 0 8px 8px 0; font-size: 0.875rem;">
            <strong>Why it fits:</strong> ${editorialContext}
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
            <span><a href="/best-ai-tools/">Best AI Tools</a></span> 
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
                "name": "Best AI Tools",
                "item": "https://whichaipick.com/best-ai-tools/"
              },{
                "@type": "ListItem",
                "position": 3,
                "name": "${title}",
                "item": "https://whichaipick.com/best-ai-tools/${slug}/"
              }]
            }
            </script>`;
}

function buildPage(def) {
    // 1. Find relevant tools
    let matchedTools = tools.filter(t => {
        if (!t.primaryUseCases) return false;
        if (t.contentReviewRequired) return false; // MUST be editorially complete
        const uses = t.primaryUseCases.map(u => u.toLowerCase());
        const cats = (t.category || '').toLowerCase();
        
        return def.searchTerms.some(term => 
            uses.some(u => u.includes(term)) || cats.includes(term)
        );
    });

    if (matchedTools.length < def.minToolsToMap) {
        console.log(`[SKIP] /best-ai-tools/${def.slug}/ - Found ${matchedTools.length} tools, needs ${def.minToolsToMap}. Deferring generation (noindex condition).`);
        return; // Skip generation to avoid thin content
    }

    const dirPath = path.join(DIST_DIR, def.slug);
    fs.mkdirSync(dirPath, { recursive: true });

    // 2. Generate Hero
    let hero = seoHeroTemplate
        .replace('{{BREADCRUMBS}}', generateBreadcrumbs(def.title, def.slug))
        .replace('{{TITLE}}', def.title)
        .replace('{{SUBTITLE}}', def.intentDescription)
        .replace('{{HAS_CTA}}', 'true')
        .replace('{{CTA_PRIMARY_TEXT}}', 'Find the right tool')
        .replace('{{CTA_PRIMARY_LINK}}', '#tools')
        .replace('{{CTA_SECONDARY_TEXT}}', 'Compare tools')
        .replace('{{CTA_SECONDARY_LINK}}', '/compare/')
        .replace('{{STATS}}', `<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${matchedTools.length} verified tools</span>`);

    // 3. Generate Tool Cards with Context
    let toolsHTML = matchedTools.map(t => {
        const context = `Recommended for ${def.title.replace('Best AI Tools for ', '').replace(' in 2026', '')} workflows. Highlighted use cases include ${t.primaryUseCases.slice(0,2).join(' and ')}.`;
        return generateToolCard(t, context);
    }).join('');

    const editorialHTML = `<div class="seo-editorial-guidance" style="margin: 4rem 0; padding: 2rem; background: var(--bg-surface); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
        <h2>How to Choose</h2>
        <p>${def.editorialGuidance}</p>
    </div>`;

    const contentHTML = `
        ${hero}
        <div class="container" style="padding-top: 2rem;">
            ${editorialHTML}
            <div id="tools" class="tools-grid" style="margin-top: 2rem;">
                ${toolsHTML}
            </div>
        </div>
    `;

    // 4. Inject into base template
    let finalHTML = baseTemplate
        .replace(/<title>.*<\/title>/, `<title>${def.title} | WhichAIPick</title>`)
        .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${def.metaDescription}">`)
        .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${def.metaDescription}">`)
        .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="${def.metaDescription}">`)
        .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
        .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/best-ai-tools/${def.slug}/">`)
        .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-best-tools-page">${contentHTML}</main>`)
        .replace('<script src="/js/browse.js"></script>', ''); // Remove standard browse logic to keep static

    fs.writeFileSync(path.join(dirPath, 'index.html'), finalHTML);
    console.log(`[GENERATED] /best-ai-tools/${def.slug}/ (${matchedTools.length} tools)`);
}

// Ensure base dir exists
fs.mkdirSync(DIST_DIR, { recursive: true });

// Create a root index page (required so /best-ai-tools/ doesn't 404, even if it's basic)
const rootHTML = baseTemplate
    .replace(/<title>.*<\/title>/, `<title>Best AI Tools by Workflow | WhichAIPick</title>`)
    .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="Discover the best AI tools organized by profession, workflow, and use case.">`)
    .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="Discover the best AI tools organized by profession, workflow, and use case.">`)
    .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="Discover the best AI tools organized by profession, workflow, and use case.">`)
    .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/best-ai-tools/">`)
    .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-best-tools-page"><div class="container" style="padding: 6rem 0;"><div class="seo-breadcrumbs" style="margin-bottom: 2rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; align-items: center; font-size: 0.875rem; color: var(--text-muted);"><span><a href="/" style="color: var(--accent-cyan); text-decoration: none;">Home</a></span> <span class="separator" style="opacity: 0.5;">/</span> <span style="color: var(--text-color);">Best AI Tools</span><script type="application/ld+json">{"@context": "https://schema.org","@type": "BreadcrumbList","itemListElement": [{"@type": "ListItem","position": 1,"name": "Home","item": "https://whichaipick.com/"},{"@type": "ListItem","position": 2,"name": "Best AI Tools","item": "https://whichaipick.com/best-ai-tools/"}]}</script></div><h1>Best AI Tools Guides</h1><ul>${bestToolsDefs.map(d => `<li><a href="/best-ai-tools/${d.slug}/" style="color: var(--accent-cyan);">${d.title}</a></li>`).join('')}</ul></div></main>`)
    .replace('<script src="/js/browse.js"></script>', '');

fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rootHTML);
console.log(`[GENERATED] /best-ai-tools/ (index)`);

bestToolsDefs.forEach(buildPage);
