/**
 * generate-sitemap.mjs
 *
 * Generates sitemap.xml including:
 *  - All static hub/authority/legal pages
 *  - All blog/academy/use-cases/compare/make-money sub-pages (scanned from directories)
 *  - All Phase 3 generated tool pages  /tools/[id]/
 *  - All Phase 3 generated category pages  /category/[slug]/
 *
 * Run: node scripts/generate-sitemap.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const DOMAIN = 'https://whichaipick.com';

// ── Priority / Frequency ──────────────────────────────────────────────────────
const PRIORITY = {
    TOOLS: 1.0,
    HUBS: 0.9,
    AUTHORITY: 0.8,
    LEAVES: 0.7,
    LEGAL: 0.4
};

const CHANGEFREQ = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly'
};

// ── Static Routes ─────────────────────────────────────────────────────────────
const STATIC_ROUTES = [
    { loc: '/',                         priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/tools/',                   priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/category.html',            priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/academy.html',             priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/use-cases.html',           priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/compare.html',             priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/blog.html',                priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/make-money.html',          priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/start-here/',              priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/newsletter.html',          priority: PRIORITY.HUBS,      freq: CHANGEFREQ.WEEKLY },
    { loc: '/submit-tool.html',         priority: 0.7,                freq: CHANGEFREQ.MONTHLY },

    // Authority
    { loc: '/about.html',               priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/review-methodology.html',  priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/editorial-policy.html',    priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/affiliate-disclosure.html',priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/pricing-accuracy-policy.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/corrections-policy.html',  priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/data-transparency.html',   priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },

    // Legal
    { loc: '/contact.html',             priority: 0.5,                freq: CHANGEFREQ.MONTHLY },
    { loc: '/disclosure.html',          priority: 0.5,                freq: CHANGEFREQ.MONTHLY },
    { loc: '/privacy.html',             priority: PRIORITY.LEGAL,     freq: CHANGEFREQ.MONTHLY },
    { loc: '/terms.html',               priority: PRIORITY.LEGAL,     freq: CHANGEFREQ.MONTHLY },
    { loc: '/cookies.html',             priority: PRIORITY.LEGAL,     freq: CHANGEFREQ.MONTHLY },
    { loc: '/accessibility.html',       priority: PRIORITY.LEGAL,     freq: CHANGEFREQ.MONTHLY },
    { loc: '/report-misuse.html',       priority: PRIORITY.LEGAL,     freq: CHANGEFREQ.MONTHLY },
];

// ── Content directories (existing sub-pages) ──────────────────────────────────
const CONTENT_DIRS = ['academy', 'use-cases', 'compare', 'blog', 'make-money'];

function getFormattedDate() {
    return new Date().toISOString().split('T')[0];
}

function scanDirectory(dirName) {
    const dirPath = path.join(PROJECT_ROOT, dirName);
    if (!fs.existsSync(dirPath)) return [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    return items
        .filter(item => item.isDirectory())
        .map(item => ({
            loc: `/${dirName}/${item.name}/`,
            priority: PRIORITY.LEAVES,
            freq: CHANGEFREQ.WEEKLY
        }));
}

function scanGeneratedPages(subDir, priority) {
    const dir = path.join(PROJECT_ROOT, subDir);
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
        .filter(e => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'index.html')))
        .map(e => ({
            loc: `/${subDir}/${e.name}/`,
            priority,
            freq: CHANGEFREQ.WEEKLY
        }));
}

function generateSitemap() {
    console.log('Generating sitemap…');
    const today = getFormattedDate();
    let urls = [...STATIC_ROUTES];

    // Existing content sub-pages
    CONTENT_DIRS.forEach(dir => {
        urls = [...urls, ...scanDirectory(dir)];
    });

    // Phase 3: generated tool pages
    const toolPages = scanGeneratedPages('tools', PRIORITY.TOOLS);
    urls = [...urls, ...toolPages];
    console.log(`  Added ${toolPages.length} tool pages`);

    // Phase 3: generated category pages
    const catPages = scanGeneratedPages('category', PRIORITY.HUBS);
    urls = [...urls, ...catPages];
    console.log(`  Added ${catPages.length} category pages`);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    urls.forEach(url => {
        xml += '  <url>\n';
        xml += `    <loc>${DOMAIN}${url.loc}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${url.freq}</changefreq>\n`;
        xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
        xml += '  </url>\n';
    });

    xml += '</urlset>';

    const outputPath = path.join(PROJECT_ROOT, 'sitemap.xml');
    fs.writeFileSync(outputPath, xml);
    console.log(`Sitemap written: ${outputPath} — ${urls.length} URLs total.`);
}

generateSitemap();
