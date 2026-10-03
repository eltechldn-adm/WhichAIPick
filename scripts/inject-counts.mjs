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
const eligibleCount = tools.filter(t => t.recommendationEligible === true).length;
// We might round it or just use the exact eligible count. The user asked for accurate count.
const countStr = eligibleCount.toString();

const allFiles = collectHtmlFiles(ROOT);

let updatedCount = 0;
for (const filePath of allFiles) {
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;

  // Find occurrences of {{TOOL_COUNT}} and replace with exact count
  if (updated.includes('{{TOOL_COUNT}}')) {
    updated = updated.replace(/\{\{TOOL_COUNT\}\}/g, countStr);
  }
  
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[INJECTED] Updated count in ${path.relative(ROOT, filePath)}`);
    updatedCount++;
  }
}

console.log(`Done. ${updatedCount} file(s) updated with TOOL_COUNT=${countStr}.`);
