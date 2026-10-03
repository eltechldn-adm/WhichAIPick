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

// Patterns that indicate unfinished content
const PLACEHOLDER_PATTERNS = [
    /\bTODO\b/,
    /\bTBD\b/,
    /under construction/i,
    /replace later/i,
    /Coming Soon/i // Will filter out actual "Coming Soon" tool statuses below
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
    
    // Ignore Todoist or to-do because \b bounds protect TODO.
    
    for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(content)) {
            // Contextual exceptions
            if (pattern.source === 'Coming Soon' || pattern.source === 'Coming Soon/i') {
                // Remove known valid instances and re-test
                let tempContent = content
                    .replace(/<[^>]*>Coming Soon<\/[^>]*>/ig, '')
                    .replace(/Coming soon/ig, ''); // Just ignore "coming soon" entirely to avoid false positives on features/newsletter. Or let's only ignore specific phrases.
            }
            
            // Smarter check: remove known false positive phrases from the content before testing
            let cleanedContent = content
                .replace(/Newsletter updates coming soon/ig, '')
                .replace(/Newsletter functionality is coming soon/ig, '')
                .replace(/\(Coming Soon\)/ig, '')
                .replace(/marked coming soon/ig, '')
                .replace(/Coming soon\./ig, '');

            if (pattern.test(cleanedContent)) {
                console.error(`[ERROR] Unfinished placeholder content detected in ${relPath}: ${pattern}`);
                hasError = true;
            }
        }
    }
}

if (hasError) {
    console.error('[FAIL] Placeholder regression guard failed.');
    process.exit(1);
} else {
    console.log('[PASS] No unfinished placeholder content detected in public HTML.');
}
