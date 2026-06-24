import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.join(__dirname, '..');

// AdSense script pattern to remove (accounts for variations in spacing/newlines)
const ADSENSE_REGEX = /<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-7088331504377019"\s*crossorigin="anonymous"><\/script>/gi;

function collectHtmlFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Skip node_modules, git, wrangler, etc.
    if (fullPath.includes('node_modules') || fullPath.includes('.git') || fullPath.includes('.wrangler') || fullPath.includes('.agent')) {
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

const allFiles = collectHtmlFiles(ROOT);
let removedCount = 0;

for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (ADSENSE_REGEX.test(content)) {
        const newContent = content.replace(ADSENSE_REGEX, '');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`[REMOVED] ${path.relative(ROOT, filePath)}`);
        removedCount++;
    }
}

console.log(`\nRemoved AdSense from ${removedCount} files.`);
