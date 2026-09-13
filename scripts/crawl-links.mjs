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
const validLocalPaths = new Set();
const redirects = new Map();
const inboundLinks = new Map(); // path -> Set of source pages

// First pass: identify all valid paths and redirects
for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let localPath = '/' + path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    
    // Normalize index.html
    if (localPath.endsWith('/index.html')) {
        localPath = localPath.replace('/index.html', '/');
    }
    
    validLocalPaths.add(localPath);
    inboundLinks.set(localPath, new Set());

    // Check if redirect
    if (content.includes('http-equiv="refresh"') || content.includes('window.location.replace')) {
        // Find destination
        const canonMatch = content.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i);
        if (canonMatch) {
            let dest = canonMatch[1].replace(DOMAIN, '');
            redirects.set(localPath, dest);
        } else {
             // Try to extract from redirect
             const refreshMatch = content.match(/url='?([^'">]+)'?/i);
             if (refreshMatch) {
                 let dest = refreshMatch[1];
                 if (dest.startsWith(DOMAIN)) dest = dest.replace(DOMAIN, '');
                 redirects.set(localPath, dest);
             }
        }
    }
}

// Additional legacy redirects from _redirects
const redirectsContent = fs.readFileSync(path.join(PROJECT_ROOT, '_redirects'), 'utf8');
const redirectLines = redirectsContent.split('\n');
for (const line of redirectLines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
        redirects.set(parts[0], parts[1]);
    }
}

console.log(`[CRAWLER] Index initialized. ${validLocalPaths.size} local paths found.`);

let totalLinksChecked = 0;
let brokenLinks = 0;
let redirectLinks = 0;

// Second pass: extract links and check
for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let sourcePath = '/' + path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    if (sourcePath.endsWith('/index.html')) {
        sourcePath = sourcePath.replace('/index.html', '/');
    }

    const hrefRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
    let match;

    while ((match = hrefRegex.exec(content)) !== null) {
        let href = match[2];
        
        // Skip external, anchors, mailto, etc, and JS templates
        if (href.startsWith('http') && !href.startsWith(DOMAIN)) continue;
        if (href.startsWith('#')) continue;
        if (href.startsWith('mailto:')) continue;
        if (href.startsWith('javascript:')) continue;
        if (href.includes('${')) continue;

        totalLinksChecked++;

        // Normalize
        let targetPath = href;
        if (targetPath.startsWith(DOMAIN)) {
            targetPath = targetPath.replace(DOMAIN, '');
        }
        
        // Strip query string and hash for checking existence
        targetPath = targetPath.split('?')[0].split('#')[0];
        
        if (!targetPath.startsWith('/')) {
            // Relative path
            const sourceDir = path.dirname(sourcePath);
            targetPath = path.resolve(sourceDir, targetPath);
        }

        // Add to inbound links
        if (inboundLinks.has(targetPath)) {
            inboundLinks.get(targetPath).add(sourcePath);
        }

        // Check if redirect
        if (redirects.has(targetPath)) {
            console.warn(`⚠️ Redirecting link in ${sourcePath}: ${href} -> ${redirects.get(targetPath)}`);
            redirectLinks++;
        }
        // Check if broken
        else if (!validLocalPaths.has(targetPath) && targetPath !== '/') {
            // Wait, we need to handle special cases where assets exist that aren't HTML
            const absoluteTarget = path.join(PROJECT_ROOT, targetPath);
            if (!fs.existsSync(absoluteTarget)) {
                console.error(`❌ Broken link in ${sourcePath}: ${href}`);
                brokenLinks++;
            }
        }
    }
}

console.log(`\n[CRAWLER] Checked ${totalLinksChecked} internal links.`);
console.log(`[CRAWLER] Broken links: ${brokenLinks}`);
console.log(`[CRAWLER] Links pointing to redirects: ${redirectLinks}`);

// Third pass: Orphan detection
let orphans = 0;
for (const [path, sources] of inboundLinks.entries()) {
    // Ignore partials, admin, etc
    if (path.startsWith('/partials/') || path.startsWith('/admin/') || path === '/404.html') continue;
    
    // Ignore redirects from being flagged as orphans
    if (redirects.has(path)) continue;

    if (sources.size === 0 && path !== '/') {
        console.warn(`⚠️ Orphan page detected (0 inbound links): ${path}`);
        orphans++;
    }
}

console.log(`\n[CRAWLER] Orphan pages found: ${orphans}`);

if (brokenLinks > 0) {
    process.exit(1);
}
