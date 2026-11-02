/**
 * scripts/qa/test-redirects-coverage.mjs
 * 
 * Validates Cloudflare Pages _redirects file:
 * - Syntax and status code compliance (301/302)
 * - Slash and unslashed variant coverage
 * - Loop detection (direct and indirect)
 * - Chain detection (ensuring all redirects are direct 1-hop)
 * - Destination resolution against local static files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

console.log('======================================================');
console.log('WHICHAIPICK REDIRECTS ARCHITECTURE & COVERAGE AUDIT');
console.log('======================================================\n');

const redirectsPath = path.join(ROOT_DIR, '_redirects');
if (!fs.existsSync(redirectsPath)) {
  console.error(`[FAIL] Missing _redirects file at ${redirectsPath}`);
  process.exit(1);
}

const content = fs.readFileSync(redirectsPath, 'utf8');
const lines = content.split('\n');

const rules = [];
const ruleMap = new Map();
let parseErrors = 0;

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    console.error(`[FAIL] Line ${lineNum}: malformed line "${trimmed}"`);
    parseErrors++;
    return;
  }

  const [src, dest, codeStr = '301'] = parts;
  const code = parseInt(codeStr, 10);

  if (![301, 302, 307, 308, 200, 404].includes(code)) {
    console.error(`[FAIL] Line ${lineNum}: invalid status code "${codeStr}" for rule ${src} -> ${dest}`);
    parseErrors++;
    return;
  }

  if (ruleMap.has(src)) {
    console.error(`[FAIL] Line ${lineNum}: duplicate source path "${src}"`);
    parseErrors++;
    return;
  }

  const rule = { lineNum, src, dest, code };
  rules.push(rule);
  ruleMap.set(src, rule);
});

console.log(`Parsed ${rules.length} valid redirect rules (Errors: ${parseErrors})`);
if (parseErrors > 0) {
  process.exit(1);
}

// 1. Loop and Self-Redirect Detection
let loopErrors = 0;
rules.forEach(rule => {
  if (rule.src === rule.dest) {
    console.error(`[FAIL] Self-redirect detected: ${rule.src} -> ${rule.dest}`);
    loopErrors++;
  }

  // Check 2-hop loop
  const secondHop = ruleMap.get(rule.dest);
  if (secondHop && secondHop.dest === rule.src) {
    console.error(`[FAIL] 2-hop redirect loop detected: ${rule.src} -> ${rule.dest} -> ${secondHop.dest}`);
    loopErrors++;
  }
});

// 2. Chain Detection (All redirects should be single-hop)
let chainErrors = 0;
rules.forEach(rule => {
  if (ruleMap.has(rule.dest)) {
    console.warn(`[WARN] Redirect chain detected: ${rule.src} -> ${rule.dest} -> ${ruleMap.get(rule.dest).dest}`);
    chainErrors++;
  }
});

// 3. Slash & No-Slash Pairing Verification for directory routes
let pairingErrors = 0;
rules.forEach(rule => {
  // If rule is an extension-less path or directory path
  if (!rule.src.includes('.')) {
    const isSlashed = rule.src.endsWith('/');
    const counterpart = isSlashed ? rule.src.slice(0, -1) : rule.src + '/';
    
    if (!ruleMap.has(counterpart)) {
      console.error(`[FAIL] Missing pairing counterpart: "${rule.src}" has no counterpart "${counterpart}"`);
      pairingErrors++;
    } else {
      const counterpartRule = ruleMap.get(counterpart);
      if (counterpartRule.dest !== rule.dest) {
        console.error(`[FAIL] Mismatched destination between "${rule.src}" (${rule.dest}) and "${counterpart}" (${counterpartRule.dest})`);
        pairingErrors++;
      }
    }
  }
});

// 4. Destination Local Existence Verification
let destErrors = 0;
rules.forEach(rule => {
  // Ignore external URLs if any
  if (rule.dest.startsWith('http://') || rule.dest.startsWith('https://')) return;

  // Resolve local path
  let cleanDest = rule.dest.split('?')[0].split('#')[0];
  let targetFile = null;

  if (cleanDest.endsWith('/')) {
    targetFile = path.join(ROOT_DIR, cleanDest, 'index.html');
  } else if (cleanDest.endsWith('.html')) {
    targetFile = path.join(ROOT_DIR, cleanDest);
  } else {
    // Might be file or directory
    const asFile = path.join(ROOT_DIR, cleanDest + '.html');
    const asDir = path.join(ROOT_DIR, cleanDest, 'index.html');
    if (fs.existsSync(asFile)) {
      targetFile = asFile;
    } else if (fs.existsSync(asDir)) {
      targetFile = asDir;
    } else {
      targetFile = asFile;
    }
  }

  if (!fs.existsSync(targetFile)) {
    console.error(`[FAIL] Rule ${rule.src} -> ${rule.dest}: Target file "${path.relative(ROOT_DIR, targetFile)}" does not exist locally`);
    destErrors++;
  }
});

console.log('\n--- AUDIT SUMMARY ---');
console.log(`Total Rules:       ${rules.length}`);
console.log(`Loop Errors:       ${loopErrors}`);
console.log(`Chain Errors:      ${chainErrors}`);
console.log(`Pairing Errors:    ${pairingErrors}`);
console.log(`Target Errors:     ${destErrors}`);

if (loopErrors === 0 && chainErrors === 0 && pairingErrors === 0 && destErrors === 0) {
  console.log('\n🎉 ALL REDIRECT ARCHITECTURE CHECKS PASSED WITH ZERO DEFECTS!');
  process.exit(0);
} else {
  console.error('\n❌ REDIRECT ARCHITECTURE CHECKS FAILED');
  process.exit(1);
}
