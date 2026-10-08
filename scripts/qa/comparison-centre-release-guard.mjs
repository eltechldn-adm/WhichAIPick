import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const EXPECTED_CURATED_PAGES = 8;
const CURATED_DIRS = [
  'chatgpt-vs-claude',
  'chatgpt-vs-gemini',
  'chatgpt-vs-perplexity',
  'cursor-vs-github-copilot',
  'lovable-vs-bolt',
  'midjourney-vs-chatgpt-images',
  'midjourney-vs-leonardo-ai',
  'replit-vs-lovable'
];

function runGuard() {
  let errors = 0;

  // 1. Hub exists
  const hubPath = path.join(ROOT, 'compare.html');
  if (!fs.existsSync(hubPath)) {
    console.error('[ERROR] Hub /compare.html does not exist.');
    errors++;
  } else {
    const hubContent = fs.readFileSync(hubPath, 'utf8');
    if (!hubContent.includes('<title>Compare AI Tools | WhichAIPick</title>')) errors++, console.error('[ERROR] Hub missing correct title');
    if (!hubContent.includes('CollectionPage')) errors++, console.error('[ERROR] Hub missing CollectionPage schema');
  }

  // 2. Curated pages count and validity
  const compareDir = path.join(ROOT, 'compare');
  const dirs = fs.readdirSync(compareDir, { withFileTypes: true })
                 .filter(dirent => dirent.isDirectory())
                 .map(d => d.name);

  if (dirs.length !== EXPECTED_CURATED_PAGES) {
    console.error(`[ERROR] Expected ${EXPECTED_CURATED_PAGES} curated pages, found ${dirs.length}`);
    errors++;
  }

  const titles = new Set();
  const descriptions = new Set();

  dirs.forEach(dir => {
    if (!CURATED_DIRS.includes(dir)) {
      console.error(`[ERROR] Unexpected curated page: ${dir}`);
      errors++;
    }
    const indexPath = path.join(compareDir, dir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error(`[ERROR] Missing index.html in ${dir}`);
      errors++;
      return;
    }

    const content = fs.readFileSync(indexPath, 'utf8');

    // Metadata uniqueness
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const descMatch = content.match(/<meta name="description" content="(.*?)">/);
    if (titleMatch) {
      if (titles.has(titleMatch[1])) { console.error(`[ERROR] Duplicate title: ${titleMatch[1]}`); errors++; }
      titles.add(titleMatch[1]);
    } else {
      console.error(`[ERROR] Missing title in ${dir}`); errors++;
    }
    if (descMatch) {
      if (descriptions.has(descMatch[1])) { console.error(`[ERROR] Duplicate description: ${descMatch[1]}`); errors++; }
      descriptions.add(descMatch[1]);
    } else {
      console.error(`[ERROR] Missing description in ${dir}`); errors++;
    }

    // Canonical
    const canonical = `https://whichaipick.com/compare/${dir}/`;
    if (!content.includes(`<link rel="canonical" href="${canonical}">`)) {
      console.error(`[ERROR] Missing or incorrect canonical in ${dir}`); errors++;
    }

    // Indexable
    if (content.includes('noindex')) {
      console.error(`[ERROR] Page ${dir} contains noindex`); errors++;
    }

    // Legacy copy check
    const legacyTerms = ['requires Discord', 'Discord-only', 'gold standard', 'widely preferred by developers', 'superior coding abilities'];
    legacyTerms.forEach(term => {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        console.error(`[ERROR] Legacy term found in ${dir}: ${term}`); errors++;
      }
    });
  });

  if (errors > 0) {
    console.error(`[FAIL] Comparison Centre Release Guard failed with ${errors} errors.`);
    process.exit(1);
  } else {
    console.log('[PASS] Comparison Centre Release Guard passed.');
  }
}

runGuard();
