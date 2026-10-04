import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Safety assertion loading
let toolsData;
try {
  toolsData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'tools.json'), 'utf8'));
} catch (e) {
  console.error('[PRUNE FATAL] Cannot read tools.json:', e);
  process.exit(1);
}

if (!Array.isArray(toolsData)) {
  console.error('[PRUNE FATAL] tools.json is not an array.');
  process.exit(1);
}

const activeToolIds = new Set(toolsData.map(t => t.id));
if (activeToolIds.size !== 882 || toolsData.length !== 882) {
  console.error(`[PRUNE FATAL] Expected 882 tools, got ${toolsData.length}. Active unique IDs: ${activeToolIds.size}`);
  process.exit(1);
}

// Categories
const activeCategories = new Set([
  'development', 'marketing', 'education', 'business', 'automation',
  'design', 'video-audio', 'content-creation', 'productivity', 'research'
]);

// SEO data
function getSeoIds(filename, idExtractor) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'seo', filename), 'utf8'));
    return new Set(data.flatMap(idExtractor));
  } catch (e) {
    console.error(`[PRUNE FATAL] Cannot read ${filename}:`, e);
    process.exit(1);
  }
}

const activeAlternatives = getSeoIds('alternatives.json', item => item.slug);
const activeBestTools = getSeoIds('best-tools.json', item => item.slug);
const publishManifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'seo', 'comparisons-v2.publish.json'), 'utf8'));
const activeComparisons = new Set(publishManifest.approvedSlugs);

function pruneDirectory(targetDir, activeSet, dirType) {
  const fullDirPath = path.join(ROOT_DIR, targetDir);
  if (!fs.existsSync(fullDirPath)) return;
  
  const entries = fs.readdirSync(fullDirPath, { withFileTypes: true });
  let prunedCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const slug = entry.name;
      const indexFile = path.join(fullDirPath, slug, 'index.html');
      
      // If the directory isn't in the active set AND it contains an index.html (generator owned)
      if (!activeSet.has(slug)) {
        if (fs.existsSync(indexFile)) {
          if (!process.env.DRY_RUN) {
            fs.rmSync(path.join(fullDirPath, slug), { recursive: true, force: true });
          }
          console.log(`[PRUNE] Removed obsolete ${dirType}: ${targetDir}/${slug}/`);
          prunedCount++;
        } else {
          // Unowned directory - leave it alone but warn
          console.log(`[PRUNE SKIP] Unrecognized/unowned directory found: ${targetDir}/${slug}/`);
        }
      }
    }
  }
  console.log(`[PRUNE] ${dirType} prune complete. Removed: ${prunedCount}`);
}

console.log('--- STARTING PRUNE DRY RUN ---');
process.env.DRY_RUN = 'true';
pruneDirectory('tools', activeToolIds, 'tool');
pruneDirectory('category', activeCategories, 'category');
pruneDirectory('alternatives', activeAlternatives, 'alternatives');
pruneDirectory('compare', activeComparisons, 'comparison');
pruneDirectory('best-ai-tools', activeBestTools, 'best-tools');

if (process.argv.includes('--execute')) {
  console.log('\n--- EXECUTING ACTUAL PRUNE ---');
  delete process.env.DRY_RUN;
  pruneDirectory('tools', activeToolIds, 'tool');
  pruneDirectory('category', activeCategories, 'category');
  pruneDirectory('alternatives', activeAlternatives, 'alternatives');
  pruneDirectory('compare', activeComparisons, 'comparison');
  pruneDirectory('best-ai-tools', activeBestTools, 'best-tools');
  console.log('[PRUNE SUCCESS] All obsolete generated directories removed.');
} else {
  console.log('\n[PRUNE INFO] Run with --execute to perform actual deletion.');
}
