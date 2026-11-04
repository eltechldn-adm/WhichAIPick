import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '../..');

const SKIP_DIRS = [
  'node_modules',
  '.git',
  '.wrangler',
  '.agent',
  '.agents',
  'scratch',
  'partials',
  'scripts',
  'js',
  'css',
  'data'
];

function collectHtmlFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath);

    if (SKIP_DIRS.some(d => relPath === d || relPath.startsWith(`${d}/`))) {
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

const FORBIDDEN_CARD_PATTERNS = [
  {
    name: 'Nested <p> inside tool-card-desc',
    regex: /<p[^>]*class=["'][^"']*tool-card-desc[^"']*["'][^>]*>\s*<p/i
  },
  {
    name: 'Nested <p> inside tool-description',
    regex: /<p[^>]*class=["'][^"']*tool-description[^"']*["'][^>]*>\s*<p/i
  },
  {
    name: 'Unescaped nested paragraph pattern',
    regex: /<p class="tool-card-desc"><p>/i
  }
];

console.log('[START] Card Markup Integrity Guard...');
const htmlFiles = collectHtmlFiles(ROOT);
console.log(`[INFO] Scanning ${htmlFiles.length} public HTML files for invalid nested paragraph markup...`);

let violations = 0;

for (const file of htmlFiles) {
  const relPath = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  for (const pattern of FORBIDDEN_CARD_PATTERNS) {
    if (pattern.regex.test(content)) {
      console.error(`❌ [ERROR] Violation in ${relPath}: Detected ${pattern.name}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n❌ [FAILED] Card Markup Guard detected ${violations} invalid card description nesting violation(s).`);
  process.exit(1);
} else {
  console.log(`\n✅ [PASSED] All ${htmlFiles.length} public HTML files verified free of nested card description markup.`);
  process.exit(0);
}
