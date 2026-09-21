import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GUIDES_DEF_PATH = path.join(__dirname, '../../data/seo/guides.json');
const DIST_DIR = path.join(__dirname, '../../guides');
const TEMPLATE_PATH = path.join(__dirname, '../../category.html');
const SEO_HERO_PATH = path.join(__dirname, '../../partials/seo-hero.html');

const guidesDefs = JSON.parse(fs.readFileSync(GUIDES_DEF_PATH, 'utf-8'));
let baseTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const seoHeroTemplate = fs.readFileSync(SEO_HERO_PATH, 'utf-8');

function generateBreadcrumbs(title, slug) {
    return `<span><a href="/">Home</a></span> 
            <span class="separator">/</span> 
            <span><a href="/guides/">Guides</a></span> 
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
                "name": "Guides",
                "item": "https://whichaipick.com/guides/"
              },{
                "@type": "ListItem",
                "position": 3,
                "name": "${title}",
                "item": "https://whichaipick.com/guides/${slug}/"
              }]
            }
            </script>`;
}

function buildPage(def) {
    const dirPath = path.join(DIST_DIR, def.slug);
    fs.mkdirSync(dirPath, { recursive: true });

    let hero = seoHeroTemplate
        .replace('{{BREADCRUMBS}}', generateBreadcrumbs(def.title, def.slug))
        .replace('{{TITLE}}', def.title)
        .replace('{{SUBTITLE}}', def.metaDescription)
        .replace('{{HAS_CTA}}', '')
        .replace('{{STATS}}', '');

    const contentHTML = `
        ${hero}
        <div class="container" style="padding-top: 2rem;">
            <article class="seo-guide-content" style="max-width: 800px; margin: 0 auto; line-height: 1.8; font-size: 1.1rem;">
                ${def.contentHTML}
            </article>
        </div>
        <style>
        .seo-guide-content h2 { margin-top: 2.5rem; margin-bottom: 1rem; color: var(--accent-cyan); }
        .seo-guide-content p { margin-bottom: 1.5rem; }
        </style>
    `;

    let finalHTML = baseTemplate
        .replace(/<title>.*<\/title>/, `<title>${def.title} | WhichAIPick Guides</title>`)
        .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${def.metaDescription}">`)
        .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${def.metaDescription}">`)
        .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="${def.metaDescription}">`)
        .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
        .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/guides/${def.slug}/">`)
        .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-guide-page">${contentHTML}</main>`)
        .replace('<script src="/js/browse.js"></script>', '');

    fs.writeFileSync(path.join(dirPath, 'index.html'), finalHTML);
    console.log(`[GENERATED] /guides/${def.slug}/`);
}

fs.mkdirSync(DIST_DIR, { recursive: true });

const rootHTML = baseTemplate
    .replace(/<title>.*<\/title>/, `<title>AI Guides & Decision Intelligence | WhichAIPick</title>`)
    .replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="Expert guides to help you make informed decisions when choosing AI software for your workflow.">`)
    .replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="Expert guides to help you make informed decisions when choosing AI software for your workflow.">`)
    .replace(/<meta property="twitter:description"[\s\S]*?>/, `<meta property="twitter:description" content="Expert guides to help you make informed decisions when choosing AI software for your workflow.">`)
    .replace(/<meta name="robots" content="noindex,follow">/, `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://whichaipick.com/guides/">`)
    .replace(/<main class="page-shell">[\s\S]*?<\/main>/, `<main class="seo-guide-page"><div class="container" style="padding: 6rem 0;"><div class="seo-breadcrumbs" style="margin-bottom: 2rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; align-items: center; font-size: 0.875rem; color: var(--text-muted);"><span><a href="/" style="color: var(--accent-cyan); text-decoration: none;">Home</a></span> <span class="separator" style="opacity: 0.5;">/</span> <span style="color: var(--text-color);">Guides</span><script type="application/ld+json">{"@context": "https://schema.org","@type": "BreadcrumbList","itemListElement": [{"@type": "ListItem","position": 1,"name": "Home","item": "https://whichaipick.com/"},{"@type": "ListItem","position": 2,"name": "Guides","item": "https://whichaipick.com/guides/"}]}</script></div><h1>AI Decision Guides</h1><ul>${guidesDefs.map(d => `<li><a href="/guides/${d.slug}/" style="color: var(--accent-cyan);">${d.title}</a></li>`).join('')}</ul></div></main>`)
    .replace('<script src="/js/browse.js"></script>', '');

fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rootHTML);
console.log(`[GENERATED] /guides/ (index)`);

guidesDefs.forEach(buildPage);
