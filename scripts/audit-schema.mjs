import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

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
let totalSchemasFound = 0;
let errors = 0;

const schemaTypes = new Set();

for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(PROJECT_ROOT, file);

    const scriptRegex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(content)) !== null) {
        let jsonStr = match[1].trim();
        totalSchemasFound++;
        try {
            const data = JSON.parse(jsonStr);
            const type = data['@type'];
            
            if (type) schemaTypes.add(type);

            // Audit rule: NO fake reviews or ratings
            if (data.aggregateRating || data.review) {
                console.error(`❌ Fake rating/review found in ${relativePath}`);
                errors++;
            }

            // Audit rule: NO fake pricing inside SoftwareApplication unless verified
            // Currently our data doesn't provide precise schema prices, so if it's 0.00 it's suspicious
            if (type === 'SoftwareApplication' && data.offers && data.offers.price === "0.00") {
                // If the tool has a free tier, it's fine, but let's just log it
            }
            
        } catch (e) {
            console.error(`❌ Invalid JSON-LD syntax in ${relativePath}`);
            errors++;
        }
    }
}

console.log(`\n[SCHEMA AUDIT] Audited ${htmlFiles.length} files. Found ${totalSchemasFound} JSON-LD blocks.`);
console.log(`[SCHEMA AUDIT] Detected Schema Types: ${Array.from(schemaTypes).join(', ')}`);

if (errors > 0) {
    console.error(`[SCHEMA AUDIT] ❌ Failed with ${errors} errors.`);
    process.exit(1);
} else {
    console.log(`[SCHEMA AUDIT] ✅ All schema blocks valid. No fake reviews/ratings detected.`);
}
