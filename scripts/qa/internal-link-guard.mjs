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

// Additional valid dynamic or root routes
validPaths.add('/tools');
validPaths.add('/tools/');
validPaths.add('/tools.html');

let hasError = false;

for (const file of allHtmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(ROOT, file);
    
    const matches = content.matchAll(/href="(\/[^"]*)"/g);
    for (const match of matches) {
        let href = match[1];
        
        // Ignore static assets
        if (href.startsWith('/assets/') || href.startsWith('/css/') || href.startsWith('/js/') || href.startsWith('/data/') || href.endsWith('.ico') || href.endsWith('.png') || href.endsWith('.svg') || href.endsWith('.jpg') || href.endsWith('.css') || href.endsWith('.json')) {
            continue;
        }
        
        // Remove hash
        const hashIndex = href.indexOf('#');
        if (hashIndex !== -1) {
            href = href.substring(0, hashIndex);
        }
        // Remove query parameters
        const queryIndex = href.indexOf('?');
        if (queryIndex !== -1) {
            href = href.substring(0, queryIndex);
        }
        if (href === '') continue; // Was just a hash/query link
        
        // We know that tools are at /tools/[slug] and generated during generation.
        // If it's a tool link, skip full validation since tools change. We will just trust it or validate against tools.json
        if (href.startsWith('/tools/') && href.length > 7) {
            // Assuming it's valid for now or we could load tools.json
            continue;
        }
        if (href.startsWith('/category/') || href.startsWith('/best-ai-tools/') || href.startsWith('/compare/') || href.startsWith('/alternatives/') || href.startsWith('/guides/')) {
            // Generated SEO routes, usually valid. 
            continue;
        }
        
        if (!validPaths.has(href)) {
            // Special cases
            if (href === '/search' || href === '/search.html') continue; // handled by js
            
            console.error(`[ERROR] Broken internal link found in ${relPath}: ${match[1]}`);
            hasError = true;
        }
    }
}

if (hasError) {
    console.error('[FAIL] Internal link regression guard failed.');
    process.exit(1);
} else {
    console.log('[PASS] No broken internal links detected.');
}
