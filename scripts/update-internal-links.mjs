import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Skip directories
const SKIP_DIRS = ['node_modules', '.git', '.wrangler', '.agent', 'data', 'scripts'];

function categorySlug(cat) {
    return cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function processFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.html', '.js'].includes(ext)) return;

    const original = fs.readFileSync(filePath, 'utf8');
    let updated = original;

    // 1. Replace tool links: /tool.html?id=xxx -> /tools/xxx/
    // This regex looks for href="/tool.html?id=xxx" or similar
    // Note: in JS template literals it might be /tool.html?id=${...}
    
    // Replace hardcoded HTML links
    updated = updated.replace(/href="\/tool\.html\?id=([^"]+)"/g, (match, id) => {
        // If it's a template literal variable, leave it as is or change to /tools/${...}/
        if (id.includes('${')) {
            return `href="/tools/${id}/"`;
        }
        return `href="/tools/${id}/"`;
    });
    
    updated = updated.replace(/href='\/tool\.html\?id=([^']+)'/g, (match, id) => {
        if (id.includes('${')) {
            return `href='/tools/${id}/'`;
        }
        return `href='/tools/${id}/'`;
    });

    // 2. Replace category links: /category.html?c=xxx -> /category/slug/
    updated = updated.replace(/href="\/category\.html\?c=([^"]+)"/g, (match, c) => {
        if (c.includes('${')) {
            // we can't easily slugify a template var at build time, so we leave it or replace it if it's a simple encodeURIComponent
            return match; // Better to leave dynamic JS category links or handle manually
        }
        const decoded = decodeURIComponent(c).replace(/&amp;/g, '&');
        const slug = categorySlug(decoded);
        return `href="/category/${slug}/"`;
    });

    if (updated !== original) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log(`Updated: ${path.relative(ROOT, filePath)}`);
    }
}

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (SKIP_DIRS.includes(entry.name)) continue;
        
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

console.log('Updating internal links...');
walk(ROOT);
console.log('Done.');
