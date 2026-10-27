import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');
const TOOLS_FILE = path.join(ROOT, 'data/tools.json');

const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  '.wrangler',
  '.agent',
];

function collectHtmlFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_PATTERNS.some(p => fullPath.includes(p))) continue;
      collectHtmlFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      if (SKIP_PATTERNS.some(p => fullPath.includes(p))) continue;
      results.push(fullPath);
    }
  }
  return results;
}

if (!fs.existsSync(TOOLS_FILE)) {
    console.error('[ERROR] data/tools.json not found.');
    process.exit(1);
}

const tools = JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8'));
const catalogueToolCount = tools.length.toString();
const recommendationEligibleCount = tools.filter(t => t.recommendationEligible === true).length.toString();

const categories = new Set();
tools.forEach(t => {
  if (t.category) categories.add(t.category);
});
const categoryCount = categories.size.toString();

const allFiles = collectHtmlFiles(ROOT);

let updatedCount = 0;
for (const filePath of allFiles) {
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;

  const catRegex = /(<span[^>]*?data-catalogue-tool-count[^>]*?>)(.*?)(<\/span>)/g;
  const recRegex = /(<span[^>]*?data-recommendation-tool-count[^>]*?>)(.*?)(<\/span>)/g;
  const catgRegex = /(<span[^>]*?data-category-count[^>]*?>)(.*?)(<\/span>)/g;

  updated = updated.replace(catRegex, `$1${catalogueToolCount}$3`);
  updated = updated.replace(recRegex, `$1${recommendationEligibleCount}$3`);
  updated = updated.replace(catgRegex, `$1${categoryCount}$3`);
  
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[INJECTED] Updated count(s) in ${path.relative(ROOT, filePath)}`);
    updatedCount++;
  }
}

console.log(`Done. ${updatedCount} file(s) updated. (catalogue: ${catalogueToolCount}, recommendation: ${recommendationEligibleCount}, categories: ${categoryCount})`);
