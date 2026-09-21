import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOOLS_JSON_PATH = path.join(__dirname, '../../data/tools.json');
const COMP_DEF_PATH = path.join(__dirname, '../../data/seo/comparisons.json');
const DIST_DIR = path.join(__dirname, '../../compare');
const TEMPLATE_PATH = path.join(__dirname, '../../category.html');
const SEO_HERO_PATH = path.join(__dirname, '../../partials/seo-hero.html');

const tools = JSON.parse(fs.readFileSync(TOOLS_JSON_PATH, 'utf-8'));
const compDefs = JSON.parse(fs.readFileSync(COMP_DEF_PATH, 'utf-8'));
let baseTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const seoHeroTemplate = fs.readFileSync(SEO_HERO_PATH, 'utf-8');

function generateBreadcrumbs(title, slug) {
    return `<span><a href="/">Home</a></span> 
            <span class="separator">/</span> 
            <span><a href="/compare/">Compare</a></span> 
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
                "name": "Compare",
                "item": "https://whichaipick.com/compare/"
              },{
                "@type": "ListItem",
                "position": 3,
                "name": "${title}",
                "item": "https://whichaipick.com/compare/${slug}/"
              }]
            }
            </script>`;
}

function buildPage(def) {
    const toolA = tools.find(t => t.id === def.toolA);
    const toolB = tools.find(t => t.id === def.toolB);

    if (!toolA || !toolB) {
        console.warn(`[WARNING] Missing tool for comparison ${def.slug}. Skipping.`);
        return;
    }
    
    // Both tools must be editorially complete
    if (toolA.contentReviewRequired || toolB.contentReviewRequired) {
        console.log(`[SKIP] /compare/${def.slug}/ - Tools are not editorially complete. Deferring generation (noindex condition).`);
        return;
    }

    const dirPath = path.join(DIST_DIR, def.slug);
    fs.mkdirSync(dirPath, { recursive: true });
    
    // Also create the reverse redirect directory!
    const reverseSlug = `${def.toolB}-vs-${def.toolA}`;
    const reverseDirPath = path.join(DIST_DIR, reverseSlug);
    fs.mkdirSync(reverseDirPath, { recursive: true });

    let hero = seoHeroTemplate
        .replace('{{BREADCRUMBS}}', generateBreadcrumbs(def.title, def.slug))
        .replace('{{TITLE}}', def.title)
        .replace('{{SUBTITLE}}', def.metaDescription)
        .replace('{{HAS_CTA}}', '')
        .replace('{{STATS}}', '');

    const contentHTML = `
        ${hero}
        <div class="container" style="padding-top: 2rem;">
            <div class="seo-editorial-guidance" style="margin-bottom: 3rem; padding: 2rem; background: var(--bg-surface); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <h2>Editorial Verdict</h2>
                <p>${def.editorialGuidance}</p>
            </div>
            
            <table class="compare-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <th style="padding: 1rem;">Feature</th>
                        <th style="padding: 1rem; width: 40%;">
                            <a href="/tools/${toolA.id}/" style="color: var(--accent-cyan); font-size: 1.5rem; text-decoration: none;">${toolA.name}</a>
                        </th>
                        <th style="padding: 1rem; width: 40%;">
                            <a href="/tools/${toolB.id}/" style="color: var(--accent-cyan); font-size: 1.5rem; text-decoration: none;">${toolB.name}</a>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-weight: bold;">Category</td>
                        <td style="padding: 1rem;">${toolA.category || 'N/A'}</td>
                        <td style="padding: 1rem;">${toolB.category || 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-weight: bold;">Pricing Model</td>
                        <td style="padding: 1rem;">${toolA.pricing_model || 'Unknown'}</td>
                        <td style="padding: 1rem;">${toolB.pricing_model || 'Unknown'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-weight: bold;">Free Tier</td>
                        <td style="padding: 1rem;">${toolA.has_free_tier ? '✅ Yes' : '❌ No'}</td>
                        <td style="padding: 1rem;">${toolB.has_free_tier ? '✅ Yes' : '❌ No'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-weight: bold;">Primary Use Cases</td>
                        <td style="padding: 1rem;">${toolA.primaryUseCases?.join(', ') || 'N/A'}</td>
                        <td style="padding: 1rem;">${toolB.primaryUseCases?.join(', ') || 'N/A'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem; font-weight: bold;">Target Users</td>
                        <td style="padding: 1rem;">${Array.isArray(toolA.targetUsers) ? toolA.targetUsers.join(', ') : (toolA.targetUsers || 'General')}</td>
                        <td style="padding: 1rem;">${Array.isArray(toolB.targetUsers) ? toolB.targetUsers.join(', ') : (toolB.targetUsers || 'General')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 1rem;"></td>
                        <td style="padding: 1rem;">
                            <a href="/tools/${toolA.id}/" class="btn btn-secondary">Read Review</a>
                        </td>
                        <td style="padding: 1rem;">
                            <a href="/tools/${toolB.id}/" class="btn btn-secondary">Read Review</a>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    let finalHTML = baseTemplate
        .replace(/<title>.*<\/title>/, `<title>${def.title}</title>`)
        .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${def.metaDescription}">`)
        .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${def.metaDescription}">`)
        .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="${def.metaDescription}">`)
        .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
        .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/compare/${def.slug}/">`)
        .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-compare-page">${contentHTML}</main>`)
        .replace('<script src="/js/browse.js"></script>', '');

    fs.writeFileSync(path.join(dirPath, 'index.html'), finalHTML);
    console.log(`[GENERATED] /compare/${def.slug}/`);
    
    // Generate reverse redirect page
    const redirectHTML = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=/compare/${def.slug}/">
    <link rel="canonical" href="https://whichaipick.com/compare/${def.slug}/">
    <title>Redirecting to ${def.title}</title>
    <meta name="description" content="Redirecting to ${def.title}">
    <meta name="robots" content="noindex">
</head>
<body>
    <h1>Redirecting to ${def.title}</h1>
    <p>Redirecting to <a href="/compare/${def.slug}/">${def.title}</a></p>
</body>
</html>`;
    fs.writeFileSync(path.join(reverseDirPath, 'index.html'), redirectHTML);
    console.log(`[REDIRECT] /compare/${reverseSlug}/ -> /compare/${def.slug}/`);
}

fs.mkdirSync(DIST_DIR, { recursive: true });

compDefs.forEach(buildPage);
