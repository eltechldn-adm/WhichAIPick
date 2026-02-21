
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const DOMAIN = 'https://whichaipick.com';

// Configuration
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

// Static Routes Mapping
const STATIC_ROUTES = [
    { loc: '/', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/tools/', priority: PRIORITY.TOOLS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/academy.html', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/use-cases.html', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/compare.html', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/blog.html', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/make-money.html', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/start-here.html', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/newsletter', priority: PRIORITY.HUBS, freq: CHANGEFREQ.WEEKLY },
    { loc: '/submit-tool.html', priority: 0.7, freq: CHANGEFREQ.MONTHLY },

    // Authority Pages
    { loc: '/about.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/review-methodology.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/editorial-policy.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/affiliate-disclosure.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/pricing-accuracy-policy.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/corrections-policy.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },
    { loc: '/data-transparency.html', priority: PRIORITY.AUTHORITY, freq: CHANGEFREQ.MONTHLY },

    // Legal / Low Priority
    { loc: '/contact', priority: 0.5, freq: CHANGEFREQ.MONTHLY },
    { loc: '/disclosure', priority: 0.5, freq: CHANGEFREQ.MONTHLY },
    { loc: '/privacy', priority: PRIORITY.LEGAL, freq: CHANGEFREQ.MONTHLY },
    { loc: '/terms', priority: PRIORITY.LEGAL, freq: CHANGEFREQ.MONTHLY },
    { loc: '/cookies', priority: PRIORITY.LEGAL, freq: CHANGEFREQ.MONTHLY },
    { loc: '/accessibility', priority: PRIORITY.LEGAL, freq: CHANGEFREQ.MONTHLY },
    { loc: '/report-misuse', priority: PRIORITY.LEGAL, freq: CHANGEFREQ.MONTHLY },
];

// Content Directories to Scan (Leaf Pages)
const CONTENT_DIRS = [
    'academy',
    'use-cases',
    'compare',
    'blog',
    'make-money'
];

function getFormattedDate() {
    return new Date().toISOString().split('T')[0];
}

function scanDirectory(dirName) {
    const dirPath = path.join(PROJECT_ROOT, dirName);
    if (!fs.existsSync(dirPath)) return [];

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const urls = [];

    items.forEach(item => {
        if (item.isDirectory()) {
            // Canonical leaf URL always uses trailing slash (clean folder route)
            const slug = `${dirName}/${item.name}/`;
            urls.push({
                loc: `/${slug}`,
                priority: PRIORITY.LEAVES,
                freq: CHANGEFREQ.WEEKLY
            });
        }
    });

    return urls;
}

function generateSitemap() {
    console.log('Generating sitemap...');
    const today = getFormattedDate();
    let urls = [...STATIC_ROUTES];

    // Scan content directories
    CONTENT_DIRS.forEach(dir => {
        const scanned = scanDirectory(dir);
        urls = [...urls, ...scanned];
    });

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
    console.log(`Sitemap generated at ${outputPath} with ${urls.length} URLs.`);
}

generateSitemap();
