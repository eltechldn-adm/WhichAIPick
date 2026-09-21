import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '../');

let errors = 0;
let warnings = 0;

function checkHTMLFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check canonical
    const canonicalMatch = content.match(/<link rel="canonical" href="([^"]+)">/);
    if (!canonicalMatch) {
        console.error(`[ERROR] Missing canonical in ${filePath}`);
        errors++;
    } else {
        const canonicalUrl = canonicalMatch[1];
        // Ensure it doesn't have query params for SEO pages
        if (canonicalUrl.includes('?') && filePath.includes('/seo/')) {
            console.error(`[ERROR] Canonical URL contains query params in ${filePath}: ${canonicalUrl}`);
            errors++;
        }
    }

    // Check title
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    if (!titleMatch || !titleMatch[1].trim()) {
        console.error(`[ERROR] Missing or empty <title> in ${filePath}`);
        errors++;
    }

    // Check meta description
    const descMatch = content.match(/<meta name="description" content="([^"]+)">/);
    if (!descMatch || !descMatch[1].trim()) {
        console.warn(`[WARNING] Missing or empty meta description in ${filePath}`);
        warnings++;
    }

    // Check H1
    const h1Matches = [...content.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)];
    if (h1Matches.length === 0) {
        console.error(`[ERROR] Missing <h1> in ${filePath}`);
        errors++;
    } else if (h1Matches.length > 1) {
        console.error(`[ERROR] Multiple <h1> tags in ${filePath}`);
        errors++;
    }
}

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.html')) {
            callback(dirPath);
        }
    });
}

console.log('🔍 Running SEO Validation (Phase 6G)...');

// Check all new SEO directories
['best-ai-tools', 'alternatives', 'compare', 'guides'].forEach(d => {
    walkDir(path.join(ROOT_DIR, d), checkHTMLFile);
});

console.log(`\n==================================================`);
console.log(`SEO Validation Complete. Errors: ${errors}, Warnings: ${warnings}`);
console.log(`==================================================`);

if (errors > 0) {
    console.error('\n[FAILED] SEO validation failed. Fix errors before deployment.');
    process.exit(1);
} else {
    console.log('\n[SUCCESS] SEO validation passed.');
    process.exit(0);
}
