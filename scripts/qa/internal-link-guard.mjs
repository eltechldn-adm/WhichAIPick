import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '../..');

const SKIP_PATTERNS = [
    'node_modules',
    '.git',
    '.wrangler',
    '.agent',
    'scripts'
];

function collectHtmlFiles(dir, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(ROOT, fullPath);
        
        if (SKIP_PATTERNS.some(p => relPath.startsWith(p) || relPath.includes(`/${p}/`))) {
            continue;
        }

        if (entry.isDirectory()) {
            collectHtmlFiles(fullPath, results);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            results.push(fullPath);
        }
    }
    return results;
}

const allHtmlFiles = collectHtmlFiles(ROOT);

// Valid routes built from existing files/folders
const validPaths = new Set();
validPaths.add('/');

for (const file of allHtmlFiles) {
    const relPath = path.relative(ROOT, file);
    if (relPath === 'index.html') continue; // Covered by '/'
    if (relPath.startsWith('partials/')) continue;
    
    // e.g. about.html -> /about or /about.html
    const route = '/' + relPath.replace(/\.html$/, '');
    validPaths.add(route);
    validPaths.add(route + '/');
    validPaths.add(route + '.html'); // In case of explicit links
    
    if (relPath.endsWith('index.html')) {
        const dirRoute = '/' + path.dirname(relPath);
        validPaths.add(dirRoute);
        validPaths.add(dirRoute + '/');
    }
}

// Build Valid Routes from authoritative JSON data
const toolsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tools.json'), 'utf8'));
const canonicalToolIds = Object.keys(toolsData);
for (const id of canonicalToolIds) {
    validPaths.add(`/tools/${id}`);
    validPaths.add(`/tools/${id}/`);
    validPaths.add(`/tools/${id}.html`);
}
validPaths.add('/tools');
validPaths.add('/tools/');
validPaths.add('/tools.html');

const categories = [
    'development', 'marketing', 'education', 'business', 
    'automation', 'design', 'video-audio', 'content-creation', 
    'productivity', 'research'
];
for (const cat of categories) {
    validPaths.add(`/category/${cat}`);
    validPaths.add(`/category/${cat}/`);
}
validPaths.add('/category');
validPaths.add('/category/');
validPaths.add('/category.html');

const seoBestTools = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seo/best-tools.json'), 'utf8'));
for (const item of seoBestTools) {
    validPaths.add(`/best-ai-tools/${item.slug}`);
    validPaths.add(`/best-ai-tools/${item.slug}/`);
}
validPaths.add('/best-ai-tools');
validPaths.add('/best-ai-tools/');

const seoAlternatives = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seo/alternatives.json'), 'utf8'));
for (const item of seoAlternatives) {
    validPaths.add(`/alternatives/${item.slug}`);
    validPaths.add(`/alternatives/${item.slug}/`);
}
validPaths.add('/alternatives');
validPaths.add('/alternatives/');

const publishManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seo/comparisons-v2.publish.json'), 'utf8'));
for (const slug of publishManifest.approvedSlugs) {
    validPaths.add(`/compare/${slug}`);
    validPaths.add(`/compare/${slug}/`);
}
validPaths.add('/compare');
validPaths.add('/compare/');

const seoGuides = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seo/guides.json'), 'utf8'));
for (const item of seoGuides) {
    validPaths.add(`/guides/${item.slug}`);
    validPaths.add(`/guides/${item.slug}/`);
}
validPaths.add('/guides');
validPaths.add('/guides/');

// Read _redirects for aliases (these should fail/warn when linked directly)
const redirectsRaw = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
const redirectSources = new Set();
for (const line of redirectsRaw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            redirectSources.add(parts[0]);
            // add variations
            if (parts[0].endsWith('/')) {
                redirectSources.add(parts[0].slice(0, -1));
            } else {
                redirectSources.add(parts[0] + '/');
            }
        }
    }
}

// Known aliases to check explicitly in tests
const forbiddenToolLinks = [
    'bing-chat', 'breeze-ai', 'framer-ai', 'replit-ai', 'perplexity', 'canva', 'pika-labs', 'fig', 'dall-e-3',
    'bildr', 'diagram', 'memorable', 'phind', 'quizlet-q-chat', 'relay', 'sora', 'supertone', 'tome', 'woebot', 'youper'
];
const forbiddenCategories = ['sales', 'customer-support', 'uncategorized', 'coding'];


// 13. CREATE NEGATIVE TESTS
const negativeTests = [
    '/tools/not-a-real-tool/',
    '/tools/sora/',
    '/tools/bing-chat/',
    '/category/coding/',
    '/compare/not-a-real-comparison/',
    '/alternatives/not-a-real-tool/',
    '/guides/not-a-real-guide/',
    ...forbiddenToolLinks.map(id => `/tools/${id}/`),
    ...forbiddenCategories.map(c => `/category/${c}/`)
];

for (const testHref of negativeTests) {
    let cleanHref = testHref.split('#')[0].split('?')[0];
    if (validPaths.has(cleanHref) && !redirectSources.has(cleanHref)) {
        console.error(`[FATAL] Negative test passed (it should fail): ${testHref}`);
        process.exit(1);
    }
}
console.log(`[PASS] Negative tests failed correctly.`);

// 14. CREATE POSITIVE TESTS
const positiveTests = [
    '/tools/chatgpt/',
    '/tools/claude/',
    '/category/development/',
    '/compare/chatgpt-vs-claude/',
    '/alternatives/chatgpt/',
    '/guides/free-vs-paid-ai-tools/'
];
for (const testHref of positiveTests) {
    let cleanHref = testHref.split('#')[0].split('?')[0];
    if (!validPaths.has(cleanHref)) {
        console.error(`[FATAL] Positive test failed (it should pass): ${testHref}`);
        process.exit(1);
    }
}
console.log(`[PASS] Positive tests passed correctly.`);

let hasError = false;

// 15. RUN THE FULL GUARD
let stats = {
    brokenLinks: 0,
    retiredToolLinks: 0,
    legacyAliasLinks: 0,
    invalidCategoryLinks: 0,
    invalidSeoLinks: 0
};

for (const file of allHtmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(ROOT, file);
    
    const matches = content.matchAll(/href="([^"]+)"/g);
    for (const match of matches) {
        let href = match[1];
        
        if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || href.startsWith('http://') || href.startsWith('https://')) {
            continue;
        }
        
        // Ignore static assets
        if (href.startsWith('/assets/') || href.startsWith('/css/') || href.startsWith('/js/') || href.startsWith('/data/') || href.match(/\.(ico|png|svg|jpg|jpeg|css|json|zip|pdf|webp)$/i)) {
            continue;
        }
        
        // Handle relative parsing
        if (!href.startsWith('/')) {
            if (href.startsWith('#') || href.startsWith('?')) {
                continue;
            }
            href = '/' + path.posix.join(path.dirname(relPath), href);
        }
        
        // Remove hash and query params
        const hashIndex = href.indexOf('#');
        if (hashIndex !== -1) href = href.substring(0, hashIndex);
        
        const queryIndex = href.indexOf('?');
        if (queryIndex !== -1) href = href.substring(0, queryIndex);
        
        if (href === '') continue; // Was just a hash/query link
        
        // Ignore JS template literals
        if (href.includes('${')) {
            continue;
        }
        
        // Check for redirect aliases
        if (redirectSources.has(href)) {
            console.error(`[ERROR] Internal link points to a redirect alias instead of canonical in ${relPath}: ${match[1]} (resolved to ${href})`);
            
            if (href.startsWith('/tools/')) stats.legacyAliasLinks++;
            else if (href.startsWith('/category/')) stats.invalidCategoryLinks++;
            else stats.brokenLinks++;
            
            hasError = true;
            continue;
        }

        if (!validPaths.has(href)) {
            // Special case bypass
            if (href === '/search' || href === '/search.html') continue;
            
            console.error(`[ERROR] Broken internal link found in ${relPath}: ${match[1]} (resolved to ${href})`);
            
            if (href.startsWith('/tools/')) {
                const slug = href.split('/')[2];
                if (forbiddenToolLinks.includes(slug)) {
                    if (['sora','bildr','diagram','memorable','phind','quizlet-q-chat','relay','supertone','tome','woebot','youper'].includes(slug)) {
                        stats.retiredToolLinks++;
                    } else {
                        stats.legacyAliasLinks++;
                    }
                } else {
                    stats.brokenLinks++;
                }
            }
            else if (href.startsWith('/category/')) stats.invalidCategoryLinks++;
            else if (href.match(/^\/(best-ai-tools|compare|alternatives|guides)\//)) stats.invalidSeoLinks++;
            else stats.brokenLinks++;

            hasError = true;
        }
    }
}

if (hasError) {
    console.error('[FAIL] Internal link regression guard failed.');
    console.error(JSON.stringify(stats, null, 2));
    process.exit(1);
} else {
    console.log('[PASS] No broken internal links detected.');
    console.log(`broken internal links = ${stats.brokenLinks}`);
    console.log(`retired internal tool links = ${stats.retiredToolLinks}`);
    console.log(`legacy alias internal links = ${stats.legacyAliasLinks}`);
    console.log(`invalid category links = ${stats.invalidCategoryLinks}`);
    console.log(`invalid generated SEO links = ${stats.invalidSeoLinks}`);
}
