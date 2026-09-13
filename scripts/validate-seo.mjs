import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const DOMAIN = 'https://whichaipick.com';

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'scratch') {
        walkDir(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.html')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const htmlFiles = walkDir(PROJECT_ROOT);
const errors = [];
const warnings = [];

const allCanonicals = new Map();
const allTitles = new Map();
const allDescriptions = new Map();

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(PROJECT_ROOT, file);
  
  if (relativePath.startsWith('partials/')) continue;

  const isAdminOrPrivate = relativePath.startsWith('admin/') || relativePath === '404.html';

  if (isAdminOrPrivate) {
    if (!content.includes('noindex')) {
        errors.push(`[${relativePath}] Missing noindex for private page`);
    }
    continue; // Skip normal SEO checks for private pages
  }

  const isRedirect = content.includes('http-equiv="refresh"') || content.includes('window.location.replace');
  
  // Title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  if (!titleMatch && !isRedirect) {
    errors.push(`[${relativePath}] Missing <title>`);
  } else if (titleMatch && !isRedirect) {
      const title = titleMatch[1];
      if (allTitles.has(title)) {
          warnings.push(`[${relativePath}] Duplicate title: "${title}" (also in ${allTitles.get(title)})`);
      } else {
          allTitles.set(title, relativePath);
      }
  }
  
  // Meta description
  const descMatch = content.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) || content.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i);
  if (!descMatch && !isRedirect) {
    errors.push(`[${relativePath}] Missing meta description`);
  } else if (descMatch && !isRedirect) {
      const desc = descMatch[1];
      if (desc.trim().length < 10) {
          warnings.push(`[${relativePath}] Trivial meta description (too short)`);
      }
      if (allDescriptions.has(desc)) {
          warnings.push(`[${relativePath}] Duplicate meta description (also in ${allDescriptions.get(desc)})`);
      } else {
          allDescriptions.set(desc, relativePath);
      }
  }
  
  // Canonical
  const canonMatch = content.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i);
  if (!canonMatch) {
    errors.push(`[${relativePath}] Missing canonical URL`);
  } else {
    const canonical = canonMatch[1];
    if (!canonical.startsWith(DOMAIN)) {
        errors.push(`[${relativePath}] Malformed canonical: ${canonical}`);
    }
    
    // Exception for tool.html legacy JS redirect
    if (relativePath !== 'tool.html' && relativePath !== 'browse.html') {
        if (allCanonicals.has(canonical) && allCanonicals.get(canonical) !== relativePath) {
            errors.push(`[${relativePath}] Duplicate canonical URL with ${allCanonicals.get(canonical)}: ${canonical}`);
        } else {
            allCanonicals.set(canonical, relativePath);
        }
    }
  }
  
  // H1
  const h1Matches = content.match(/<h1[^>]*>.*?<\/h1>/gi);
  if (!h1Matches && !isRedirect) {
    errors.push(`[${relativePath}] Missing H1 tag`);
  } else if (h1Matches && h1Matches.length > 1 && !isRedirect) {
    warnings.push(`[${relativePath}] Multiple H1 tags (${h1Matches.length})`);
  }
}

console.log(`[SEO VALIDATION] Audited ${htmlFiles.length} HTML files.`);
if (warnings.length > 0) {
    console.warn(`\n[SEO VALIDATION] Found ${warnings.length} Warnings:`);
    warnings.forEach(w => console.warn('  ⚠️ ' + w));
}

if (errors.length > 0) {
    console.error(`\n[SEO VALIDATION] Found ${errors.length} Errors:`);
    errors.forEach(e => console.error('  ❌ ' + e));
    console.error(`\n[SEO VALIDATION] ❌ Build failed due to SEO errors.`);
    process.exit(1);
} else {
    console.log(`\n[SEO VALIDATION] ✅ All Strict SEO checks passed.`);
}
