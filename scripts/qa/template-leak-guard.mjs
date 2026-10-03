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
    'partials',      // Partials are expected to have templates
    'scripts',       // Scripts contain the template strings
    'js'             // JS contains template string constants
];

const LEAK_PATTERNS = [
    /\{\{#/,
    /\{\{\//,
    /\{\{[A-Z0-9_]+\}\}/
];

const EXCEPTIONS = [
    // Add documented exceptions here if any
    { file: 'review-methodology.html', match: '{{' } // Just an example, ideally empty.
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
let hasError = false;

for (const file of allHtmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(ROOT, file);
    
    // We expect generated files or source files to not have unrendered tags
    for (const pattern of LEAK_PATTERNS) {
        if (pattern.test(content)) {
            // Check if it's an exception
            let isException = false;
            // E.g., we could check if relPath matches an exception and the match is ignored
            // For now, strict failure
            
            console.error(`[ERROR] Template leak detected in ${relPath}: ${pattern}`);
            hasError = true;
        }
    }
}

if (hasError) {
    console.error('[FAIL] Template leak regression guard failed. Unresolved placeholders found.');
    process.exit(1);
} else {
    console.log('[PASS] No template leaks detected in public HTML.');
}
