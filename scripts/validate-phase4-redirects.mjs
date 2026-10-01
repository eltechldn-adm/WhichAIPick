import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const REDIRECTS_PATH = path.join(PROJECT_ROOT, '_redirects');

const redirectsContent = fs.readFileSync(REDIRECTS_PATH, 'utf8');

const lines = redirectsContent.split('\n');
const redirects = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 3) {
    redirects.push({
      source: parts[0],
      destination: parts[1],
      code: parseInt(parts[2], 10)
    });
  }
}

const expectedRules = [
  { s: '/tools/bing-chat/', d: '/tools/microsoft-copilot/' },
  { s: '/tools/breeze-ai/', d: '/tools/hubspot-ai/' },
  { s: '/tools/framer-ai/', d: '/tools/framer/' },
  { s: '/tools/replit-ai/', d: '/tools/replit/' },
  { s: '/tools/perplexity/', d: '/tools/perplexity-ai/' },
  { s: '/tools/canva/', d: '/tools/canva-ai/' },
  { s: '/tools/pika-labs/', d: '/tools/pika/' },
  { s: '/tools/fig/', d: '/tools/amazon-q/' },
  { s: '/tools/dall-e-3/', d: '/tools/chatgpt/' },
  { s: '/category/sales/', d: '/category/business/' },
  { s: '/category/customer-support/', d: '/category/business/' }
];

let failed = false;

// 1. Verify all expected rules are present
for (const expected of expectedRules) {
  const match = redirects.find(r => r.source === expected.s);
  if (!match) {
    console.error(`[ERROR] Missing expected redirect for ${expected.s}`);
    failed = true;
  } else if (match.destination !== expected.d) {
    console.error(`[ERROR] Incorrect destination for ${expected.s}. Expected ${expected.d}, got ${match.destination}`);
    failed = true;
  } else if (match.code !== 301) {
    console.error(`[ERROR] Redirect for ${expected.s} is not 301 permanent.`);
    failed = true;
  } else {
    console.log(`[PASS] ${expected.s} -> ${expected.d} (301)`);
  }
}

// 2. Check for redirect loops or multi-hops
for (const rule of redirects) {
  if (rule.source === rule.destination) {
    console.error(`[ERROR] Redirect loop detected: ${rule.source} -> ${rule.destination}`);
    failed = true;
  }
  
  const chained = redirects.find(r => r.source === rule.destination);
  if (chained) {
    console.error(`[ERROR] Redirect chain detected: ${rule.source} -> ${rule.destination} -> ${chained.destination}`);
    failed = true;
  }
}

// 3. Verify destinations exist in staged JSON or as valid directories
const stagedData = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'data/tools.phase11.staged.json'), 'utf8'));
const stagedIds = new Set(stagedData.map(t => t.id));

for (const rule of redirects) {
  if (rule.source.startsWith('/tools/') && rule.destination.startsWith('/tools/')) {
    const destId = rule.destination.replace('/tools/', '').replace('/', '');
    if (!stagedIds.has(destId)) {
      console.error(`[ERROR] Destination tool ${destId} does NOT exist in staged catalogue.`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\n[FAIL] Redirect validation failed.');
  process.exit(1);
} else {
  console.log('\n[SUCCESS] All expected Phase 4.5 redirects are valid, direct, and point to existing tools.');
}
